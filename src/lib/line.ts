/**
 * LINE Messaging API helpers.
 */

const LINE_API = 'https://api.line.me/v2/bot';

export type LineMessage =
  | { type: 'text'; text: string }
  | { type: 'flex'; altText: string; contents: unknown };

export async function pushMessage(to: string, messages: LineMessage[]) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) throw new Error('LINE_CHANNEL_ACCESS_TOKEN is not set');
  const res = await fetch(`${LINE_API}/message/push`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ to, messages }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LINE push failed (${res.status}): ${text}`);
  }
  return res.json().catch(() => ({}));
}

export async function replyMessage(replyToken: string, messages: LineMessage[]) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) throw new Error('LINE_CHANNEL_ACCESS_TOKEN is not set');
  await fetch(`${LINE_API}/message/reply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ replyToken, messages }),
  });
}
