import { NextRequest, NextResponse } from 'next/server';
import { pushMessage } from '@/lib/line';

/**
 * Cron endpoint: sends the monthly shift reminder to each LINE_RECIPIENT_IDS entry.
 *
 * Called by Vercel Cron on the 10th and 17th of every month.
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

  const text =
    jstDay === 17
      ? `【シフト希望リマインド】\n${targetYear}年${targetMonth}月分のシフト希望、まだの方は今月末までに提出をお願いします🙏\n\n▼ 提出はこちら\n${submitUrl}`
      : `【シフト希望募集】\n${targetYear}年${targetMonth}月分のシフト希望を募集します！\n下記のリンクから ○（出勤可） / △（どちらでも） / ✕（不可）を入力して送信してください。\n\n▼ 提出はこちら\n${submitUrl}\n\n締切は今月末までにお願いします🙌`;

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
