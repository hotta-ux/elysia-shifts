import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { replyMessage } from '@/lib/line';

/**
 * LINE webhook endpoint.
 * - Verifies the signature using LINE_CHANNEL_SECRET.
 * - Logs source IDs (userId / groupId / roomId) so we can register them.
 * - Replies with the source ID on any incoming message so the operator
 *   can capture the group ID by messaging the bot from the group.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.LINE_CHANNEL_SECRET;
  const rawBody = await req.text();

  if (secret) {
    const signature = req.headers.get('x-line-signature') || '';
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
    if (signature !== expected) {
      return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
    }
  }

  let body: { events?: LineEvent[] };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  for (const ev of body.events || []) {
    try {
      const src = ev.source;
      const id = src.groupId || src.roomId || src.userId;
      const kind = src.type;
      console.log(`[LINE webhook] event=${ev.type} source=${kind} id=${id}`);

      if (ev.type === 'message' && ev.replyToken && ev.message?.type === 'text') {
        const text = (ev.message.text ?? '').trim().toLowerCase();
        // Any of these keywords triggers an ID reply.
        if (['id', 'アイディー', 'あいでぃー', 'groupid', 'グループid'].includes(text)) {
          try {
            await replyMessage(ev.replyToken, [
              { type: 'text', text: `このトークの ID:\n${id}\n(type: ${kind})` },
            ]);
            console.log(`[LINE webhook] replied ID ${id} for ${kind}`);
          } catch (e) {
            console.error(`[LINE webhook] reply failed:`, e);
          }
        }
      }

      if (ev.type === 'join' || ev.type === 'follow') {
        // Log join/follow so we can grab the id from logs.
        console.log(`[LINE webhook] joined/followed — id=${id} type=${kind}`);
      }
    } catch (e) {
      console.error('[LINE webhook] handler error:', e);
    }
  }

  return NextResponse.json({ ok: true });
}

type LineEvent = {
  type: string;
  replyToken?: string;
  source: { type: 'user' | 'group' | 'room'; userId?: string; groupId?: string; roomId?: string };
  message?: { type: string; text?: string };
};
