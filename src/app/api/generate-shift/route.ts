import { NextRequest, NextResponse } from 'next/server';
import { getDb, Staff, ShiftRequest } from '@/lib/db';
import { getShiftTypes } from '@/lib/shifts';
import Anthropic from '@anthropic-ai/sdk';

// Vercel: allow up to 60s for AI generation (default is 10s on Hobby plan)
export const maxDuration = 60;

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
  const shiftConfig = getShiftTypes(year, mon);
  const SHIFT_LABELS: Record<string, string> = Object.fromEntries(shiftConfig.map(s => [s.key, `${s.label}(${s.time})`]));
  const slotKeys = shiftConfig.map(s => s.key);
  const slotLabelsJoined = shiftConfig.map(s => `${s.label}(${s.time})`).join(', ');

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

  // No closed day — all days are open
  const openDays = days;

  const scheduleInfo = openDays.map(date => {
    const dow = getDayOfWeek(date);
    const weekend = isWeekend(date);
    const needed = weekend ? settings.weekend_staff_count : settings.weekday_staff_count;
    const shiftTypes = slotKeys;

    const dayRequests = shiftTypes.map(st => {
      const label = SHIFT_LABELS[st];
      const available = staff.filter(s => {
        const key = `${s.id}-${date}-${st}`;
        const avail = requestMap.get(key);
        // Only those who explicitly chose 'available' or 'either'.
        // Owner 堀田 is always available (daily attendance constraint).
        // Absence of submission is treated as unavailable.
        return (s.is_owner && s.name === '堀田') || avail === 'available' || avail === 'either';
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
- シフト枠: ${slotLabelsJoined}
- 平日: 各枠${settings.weekday_staff_count}名
- 土日: 各枠${settings.weekend_staff_count}名

## スタッフ情報
${staffInfo}

## 重要ルール（ハード制約 — 必ず守る）
1. 堀田はオーナーなので毎日必ずいずれかのシフトに入れる（1日1枠以上）。高培勛はオーナーだが毎日出勤の制約はない
2. **【絶対】「出勤可能」リストに名前がないスタッフは絶対にアサインしない**。シフト希望を提出していない、もしくは「不可」または未入力の枠には絶対に入れないこと。堀田のみ毎日出勤の制約で例外的に常に候補となる
3. 各スタッフの週上限・連勤上限を守る
4. 各枠の必要人数を満たす
5. **【最重要】同じスタッフが同日に複数枠に入る場合、必ず連続した枠にする**（例: \u2460\u2461\u2462はOK、\u2460\u2462や\u2461\u2463のような分断は絶対禁止）。一度帰宅して再出勤する分断シフトは通勤負担が大きく、絶対に避けること

## 考慮事項（ソフト制約 — できるだけ守る）
1. **連続シフトの推奨**: 同日に複数枠入る場合、できるだけ長い連続枠にする（例: \u2461\u2462\u2463の3連続が理想）。来てもらったらまとめて連続で入ってもらう方が交通費・通勤負担の観点で望ましい
2. **連続枠の優先順位**: 3連続 > 2連続 > 単発。可能な限り長い連続枠を組む
3. 1日の出勤者は少なく長く、を意識（例: 5枠を5人で1枠ずつ分けるより、3人で2-3枠ずつ担当する方が良い）
4. 各シフトに最低1人はベテランか中堅を配置
5. 相性の悪いペアは同じ枠に入れない
6. スキルバランス（全員新人にしない）
7. 勤務日数を公平に配分
8. 希望シフトをできるだけ尊重
9. 堀田は最も早い枠（早番）に入ることが多いが、バランスも考慮
10. 最も遅い枠（深夜枠）にはカクテルスキルが高い人を優先配置
11. ロースト・外国語・清掃などの特殊スキルもバランスよく分散
12. 体力配慮：同じスタッフを連日「最終枠（遅番）→翌日最初の枠（早番）」のような短間隔シフトに入れない

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

    // Server-side validation: drop assignments where the staff did not request availability.
    // 堀田 (owner with daily attendance constraint) is exempt.
    const hottaStaff = staff.find(s => s.is_owner && s.name === '堀田');
    const hottaId = hottaStaff?.id;
    const rejected: { staff_id: number; date: string; shift_type: string; reason: string }[] = [];
    const validated = normalized.filter(s => {
      if (s.staff_id === hottaId) return true;
      const avail = requestMap.get(`${s.staff_id}-${s.date}-${s.shift_type}`);
      if (avail === 'available' || avail === 'either') return true;
      rejected.push({ ...s, reason: avail ? `availability=${avail}` : 'no_request' });
      return false;
    });

    // Save shifts to DB (only validated entries)
    const stmts: { sql: string; args: (string | number)[] }[] = [
      { sql: 'DELETE FROM shifts WHERE date LIKE ?', args: [`${month}%`] },
    ];
    for (const s of validated) {
      stmts.push({
        sql: 'INSERT INTO shifts (staff_id, date, shift_type) VALUES (?, ?, ?)',
        args: [s.staff_id, s.date, s.shift_type],
      });
    }
    await db.batch(stmts, 'write');

    const noteSuffix = rejected.length > 0
      ? `
⚠ AIが希望未提出の枚に${rejected.length}件アサインしたためサーバー側で除外しました。`
      : '';

    return NextResponse.json({
      success: true,
      shifts: validated,
      notes: (result.notes || '') + noteSuffix,
      rejected,
      count: normalized.length,
      stop_reason: message.stop_reason,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Shift generation error:', error);
    return NextResponse.json({ error: `シフト生成エラー: ${message}` }, { status: 500 });
  }
}
