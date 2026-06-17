// LINE Official Account (Messaging API) push helper.
//
// Env vars:
//   LINE_CHANNEL_ACCESS_TOKEN  (required) long-lived channel access token
//   LINE_TARGET_ID             (optional) user/group/room id to push to;
//                              when unset, the message is broadcast to all
//                              followers of the OA.

const PUSH_URL = 'https://api.line.me/v2/bot/message/push';
const BROADCAST_URL = 'https://api.line.me/v2/bot/message/broadcast';

export interface LineResult {
	ok: boolean;
	error?: string;
}

export async function sendLineText(text: string): Promise<LineResult> {
	const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
	if (!token) {
		return { ok: false, error: 'LINE_CHANNEL_ACCESS_TOKEN not configured' };
	}

	const target = process.env.LINE_TARGET_ID;
	const url = target ? PUSH_URL : BROADCAST_URL;
	const body = target
		? { to: target, messages: [{ type: 'text', text }] }
		: { messages: [{ type: 'text', text }] };

	try {
		const res = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(body),
		});

		if (res.ok) return { ok: true };
		const detail = await res.text();
		return { ok: false, error: `LINE API ${res.status}: ${detail}` };
	} catch (err) {
		return { ok: false, error: err instanceof Error ? err.message : String(err) };
	}
}
