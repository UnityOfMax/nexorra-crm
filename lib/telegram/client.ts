/**
 * Telegram Bot API client for Lena (PA).
 * Uses TELEGRAM_BOT_TOKEN from env — never hardcode.
 */

const API_BASE = 'https://api.telegram.org/bot';

function getToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN not set');
  return token;
}

function url(method: string): string {
  return `${API_BASE}${getToken()}/${method}`;
}

export async function sendMessage(chatId: string | number, text: string, options?: { parse_mode?: string; reply_markup?: any }) {
  const res = await fetch(url('sendMessage'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: options?.parse_mode || 'Markdown',
      reply_markup: options?.reply_markup,
    }),
  });
  return res.json();
}

export async function editMessage(chatId: string | number, messageId: number, text: string) {
  const res = await fetch(url('editMessageText'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: 'Markdown',
    }),
  });
  return res.json();
}

export async function setWebhook(webhookUrl: string) {
  const res = await fetch(url('setWebhook'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: webhookUrl }),
  });
  return res.json();
}

export async function getMe() {
  const res = await fetch(url('getMe'));
  return res.json();
}
