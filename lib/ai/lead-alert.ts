import { sendMessage } from '@/lib/telegram/client';
import { supabaseAdmin } from '@/lib/supabase';
import type { LeadIntent } from '@/lib/ai/intent-classifier';

const INTENT_EMOJI: Record<LeadIntent, string> = {
  interested: '✅',
  qualifying: '🔍',
  objection: '⚠️',
  booking_signal: '📅',
  stop_request: '🛑',
  neutral: '💬',
};

export async function maybeSendLeadAlert({
  accountId,
  contactId,
  channel,
  messageContent,
  intent,
}: {
  accountId: string;
  contactId: string;
  channel: 'sms' | 'email';
  messageContent: string;
  intent: LeadIntent;
}): Promise<void> {
  // Never alert on stop requests or neutral replies
  if (intent === 'stop_request' || intent === 'neutral') return;

  const [accountResult, contactResult] = await Promise.all([
    supabaseAdmin.from('accounts').select('settings').eq('id', accountId).single(),
    supabaseAdmin.from('contacts').select('first_name, last_name, lead_score, funnel_stage').eq('id', contactId).single(),
  ]);

  const chatId = accountResult.data?.settings?.telegram_chat_id;
  if (!chatId) return;

  const threshold = accountResult.data?.settings?.hot_lead_threshold ?? 40;
  const contact = contactResult.data;
  if (!contact) return;

  const score = contact.lead_score ?? 0;
  // Always alert on booking_signal/interested; otherwise require score threshold
  const shouldAlert = ['interested', 'booking_signal'].includes(intent) || score >= threshold;
  if (!shouldAlert) return;

  const name = [contact.first_name, contact.last_name].filter(Boolean).join(' ') || 'Unknown';
  const preview = messageContent.length > 120 ? messageContent.slice(0, 120) + '…' : messageContent;
  const emoji = INTENT_EMOJI[intent];

  const text = `${emoji} *${name}* replied via ${channel.toUpperCase()}\n\nScore: ${score}/100 | Stage: ${contact.funnel_stage || 'lead'} | Intent: ${intent}\n\n_"${preview}"_`;

  await sendMessage(chatId, text).catch(err =>
    console.error('[lead-alert] Telegram send failed:', err)
  );
}
