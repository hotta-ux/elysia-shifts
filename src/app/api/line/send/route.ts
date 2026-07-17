import { NextRequest, NextResponse } from 'next/server';
import { pushMessage } from '@/lib/line';

/**
 * Cron endpoint: sends the monthly shift reminder to each LINE_RECIPIENT_IDS entry.
 *
 * Called by Vercel Cron on the 10th (募集開始), 17th (期限当日), and 19th (期限後) of every month.
 * The day-of-month is used to pick which of two message templates to send.
 *
 * Protection: Vercel Cron adds `Authorization: Bearer <CRON_SECRET>`.
 * Manual test calls should pass `?secret=<CRON_SECRET>` or set the header.
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get('authorization') || '';
    const url = new URL(req.url);
    const q = url.searchParams.get('secret');
    if (auth !== `Bearer ${cronSecret}` && q !== cronSecret) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  const idsRaw = process.env.LINE_RECIPIENT_IDS || '';
  const ids = idsRaw.split(',').map((s) => s.trim()).filter(Boolean);
  if (ids.length === 0) {
    return NextResponse.json({ error: 'LINE_RECIPIENT_IDS not configured' }, { status: 400 });
  }

  // Determine which template to send based on today's JST day-of-month.
  // ?day=10 / ?day=23 overrides for manual testing.
  const url = new URL(req.url);
  const override = url.searchParams.get('day');
  const jstDay = override
    ? parseInt(override, 10)
    : new Date(Date.now() + 9 * 60 * 60 * 1000).getUTCDate();

  const jstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const currentMonth = jstNow.getUTCMonth() + 1; // 1-12
  const targetMonth = currentMonth === 12 ? 1 : currentMonth + 1;
  const targetYear = currentMonth === 12 ? jstNow.getUTCFullYear() + 1 : jstNow.getUTCFullYear();

  const submitUrl = 'https://elysia-shifts.vercel.app/submit';

  let text: string;
  if (jstDay === 19) {
    text = `【厳守】${targetYear}年${targetMonth}月分シフト希望\n\n17日の提出期限を過ぎています。\n未提出の方は本日中に必ず提出してください。\n以降の提出は反映できません🙏\n\n▼ 提出はこちら\n${submitUrl}`;
  } else if (jstDay === 17) {
    text = `【本日締切】${targetYear}年${targetMonth}月分シフト希望\n\nシフト希望の提出期限は本日17日までです。\nまだの方は本日中に提出をお願いします🙏\n\n▼ 提出はこちら\n${submitUrl}`;
  } else {
    text = `【シフト希望募集】${targetYear}年${targetMonth}月分\n\n下記のリンクから ○（出勤可） / △（どちらでも） / ✕（不可）を入力して送信してください。\n\n▼ 提出はこちら\n${submitUrl}\n\n締切は 17日 まで。19日以降は反映できませんのでご注意ください🙌`;
  }

  const results: { to: string; ok: boolean; error?: string }[] = [];
  for (const to of ids) {
    try {
      await pushMessage(to, [{ type: 'text', text }]);
      results.push({ to, ok: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ to, ok: false, error: msg });
    }
  }

  return NextResponse.json({
    sent_at: jstNow.toISOString(),
    day: jstDay,
    target: `${targetYear}-${String(targetMonth).padStart(2, '0')}`,
    results,
  });
}
