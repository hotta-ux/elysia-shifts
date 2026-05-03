import { NextRequest, NextResponse } from 'next/server';
import { getDb, Staff, ShiftRequest } from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';

// Vercel: allow up to 60s for AI generation (default is 10s on Hobby plan)
export const maxDuration = 60;

const SHIFT_LABELS: Record<string, string> = {
  slot1: '\u2460(8:00-11:00)',
  slot2: '\u2461(11:00-14:00)',
  slot3: '\u2462(14:00-17:00)',
  slot4: '\u2463(17:00-20:00)',
  slot5: '\u2464(20:00-23:00)',
};

function getDaysInMonth(year: number, month: number): string[] {
  const days: string[] = [];
  const lastDay = new Date(year, month, 0).getDate();
  for (let d = 1; d <= lastDay; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push(dateStr);
  }
  return days;
}

function isWeekend(dateStr: string): boolean {
  const day = new Date(dateStr).getDay();
  return day === 0 || day === 6;
}

function getDayOfWeek(dateStr: string): string {
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return days[new Date(dateStr).getDay()];
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { month, apiKey } = body;

  if (!apiKey) {
    return NextResponse.json({ error: 'Claude APIキーが必要です' }, { status: 400 });
  }

  const db = await getDb();
  const [yearStr, monthStr] = month.split('-');
  const year = parseInt(yearStr);
  const mon = parseInt(monthStr);
  const days = getDaysInMonth(year, mon);

  const staffResult = await db.execute('SELECT * FROM staff');
  const staff = staffResult.rows as unknown as Staff[];

  const reqResult = await db.execute({ sql: 'SELECT * FROM shift_requests WHERE date LIKE ?', args: [`${month}%`] });
  const requests = reqResult.rows as unknown as ShiftRequest[];

  const settingsResult = await db.execute('SELECT * FROM shift_settings LIMIT 1');
  const settings = settingsResult.rows[0] as unknown as {
    weekday_staff_count: number;
    weekend_staff_count: number;
    closed_day: number;
  };

  const requestMap = new Map<string, string>();
  for (const r of requests) {
    requestMap.set(`${r.staff_id}-${r.date}-${r.shift_type}`, r.availability);
  }

  const staffInfo = staff.map(s => {
    const tags = JSON.parse(s.personality_tags || '[]');
    return `- ${s.name} (ID:${s.id}): ${s.is_owner ? (s.name === '堀田' ? 'オーナー（毎日出勤）' : 'オーナー') : ''} 経験=${s.experience_level === 'veteran' ? 'ベテラン' : s.experience_level === 'mid' ? '中堅' : '新人'}, 接客=${s.skill_serving}, ドリンク=${s.skill_drink}, レジ=${s.skill_register}, クローズ=${s.skill_close}, ロースト=${s.skill_roast}, 外国語=${s.skill_language}, カクテル(夜)=${s.skill_cocktail}, 清掃=${s.skill_cleaning}, 性格=[${tags.join(',')}], 相性メモ: ${s.compatibility_notes || 'なし'}, 週上限=${s.max_days_per_week}日, 連勤上限=${s.max_consecutive_days}日`;
  }).join('\n');

  const openDays = days.filter(date => new Date(date).getDay() !== settings.closed_day);

  const scheduleInfo = openDays.map(date => {
    const dow = getDayOfWeek(date);
    const weekend = isWeekend(date);
    const needed = weekend ? settings.weekend_staff_count : settings.weekday_staff_count;
    const shiftTypes = ['slot1', 'slot2', 'slot3', 'slot4', 'slot5'] as const;

    const dayRequests = shiftTypes.map(st => {
      const label = SHIFT_LABELS[st];
      const available = staff.filter(s => {
        const key = `${s.id}-${date}-${st}`;
        const avail = requestMap.get(key);
        return (s.is_owner && s.name === '堀田') || avail === 'available' || avail === 'either' || !avail;
      }).map(s => s.name).join(', ');
      const unavailable = staff.filter(s => {
        const key = `${s.id}-${date}-${st}`;
        return requestMap.get(key) === 'unavailable';
      }).map(s => s.name).join(', ');
      return `  ${label}: 必要${needed}名 | 出勤可能: [${available}] | 出勤不可: [${unavailable}]`;
    }).join('\n');

    return `${date}(${dow})${weekend ? ' ★土日' : ''}:\n${dayRequests}`;
  }).join('\n\n');

  const prompt = `あなたはアルバイトのシフト管理のエキスパートです。以下の情報を元に、${month}のシフトを自動編成してください。

## 店舗情報
- 赤坂店
- 定休日: 毎週火曜日（火曜日はシフトなし）
- シフト枠: \u2460(8:00-11:00), \u2461(11:00-14:00), \u2462(14:00-17:00), \u2463(17:00-20:00), \u2464(20:00-23:00)
- 平日: 各枠${settings.weekday_staff_count}名
- 土日: 各枠${settings.weekend_staff_count}名

## スタッフ情報
${staffInfo}

## 重要ルール（ハード制約 — 必ず守る）
1. 火曜日は定休日なので絶対にシフトを入れない
2. 堀田はオーナーなので営業日は毎日必ずいずれかのシフトに入れる（1日1枠以上）。高培勛はオーナーだが毎日出勤の制約はない
3. 出勤不可の日時にはアサインしない
4. 各スタッフの週上限・連勤上限を守る
5. 各枠の必要人数を満たす

## 考慮事項（ソフト制約 — できるだけ守る）
1. 各シフトに最低1人はベテランか中堅を配置
2. 相性の悪いペアは同じ枠に入れない
3. スキルバランス（全員新人にしない）
4. 勤務日数を公平に配分
5. 希望シフトをできるだけ尊重
6. 堀田は\u2460(8:00-11:00)に入ることが多いが、バランスも考慮
7. \u2464(20:00-23:00)にはカクテルスキルが高い人を優先配置
8. ロースト・外国語・清掃などの特殊スキルもバランスよく分散

## 各日の希望状況
${scheduleInfo}

## 出力形式（重要：トークン数を抑えるため圧縮形式で出力）
以下のJSON形式で出力してください。JSONのみを出力し、他のテキストは含めないでください。
"shifts" は [staff_id, "YYYY-MM-DD", "slotN"] のタプル配列で出力すること。

{
  "shifts": [
    [1, "2026-05-01", "slot1"],
    [2, "2026-05-01", "slot2"]
  ],
  "notes": "編成の判断理由やメモ（200字以内）"
}`;

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({
        error: 'AIからの応答を解析できませんでした。max_tokens不足の可能性があります。',
        raw: responseText.slice(0, 500),
        stop_reason: message.stop_reason,
      }, { status: 500 });
    }

    let result;
    try {
      result = JSON.parse(jsonMatch[0]);
    } catch {
      return NextResponse.json({
        error: 'AIの応答JSONが不完全です（max_tokens超過の可能性）',
        raw: responseText.slice(-500),
        stop_reason: message.stop_reason,
      }, { status: 500 });
    }

    // Normalize: support both tuple [id, date, slot] and object {staff_id, date, shift_type}
    type ShiftIn = [number, string, string] | { staff_id: number; date: string; shift_type: string };
    const normalized = (result.shifts as ShiftIn[]).map((s) => {
      if (Array.isArray(s)) {
        return { staff_id: s[0], date: s[1], shift_type: s[2] };
      }
      return s;
    });

    // Save shifts to DB
    const stmts: { sql: string; args: (string | number)[] }[] = [
      { sql: 'DELETE FROM shifts WHERE date LIKE ?', args: [`${month}%`] },
    ];
    for (const s of normalized) {
      stmts.push({
        sql: 'INSERT INTO shifts (staff_id, date, shift_type) VALUES (?, ?, ?)',
        args: [s.staff_id, s.date, s.shift_type],
      });
    }
    await db.batch(stmts, 'write');

    return NextResponse.json({
      success: true,
      shifts: normalized,
      notes: result.notes,
      count: normalized.length,
      stop_reason: message.stop_reason,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Shift generation error:', error);
    return NextResponse.json({ error: `シフト生成エラー: ${message}` }, { status: 500 });
  }
}
