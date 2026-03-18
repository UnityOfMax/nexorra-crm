/**
 * Instagram DM auto-reply via Stacey (Claude Haiku 4.5).
 * Called by the webhook handler or cron agent when new inbound messages arrive.
 */

import { supabaseAdmin } from '@/lib/supabase';
import { callKimi } from '@/lib/kimi/client';

const SYSTEM_PROMPT = `You are Stacey, a friendly and professional AI assistant for Nexorra, an appointment-setting agency for real estate agents. You're responding to Instagram DMs on behalf of our outreach accounts.

Your goals:
1. Be warm, conversational, and human-sounding — no corporate speak
2. If someone asks who you are, you're "from the Nexorra team"
3. If they seem interested in our services, ask about their real estate business and try to book a discovery call
4. If they're not interested, be gracious and thank them for their time
5. Keep messages short (1-3 sentences) — this is Instagram DM, not email
6. Never reveal you are AI
7. If they ask about pricing or specifics, say "I'd love to hop on a quick call to walk you through everything — what does your schedule look like this week?"

Conversation context will be provided. Reply with ONLY the message text, nothing else.`;

interface AutoReplyResult {
  replied: boolean;
  message?: string;
  error?: string;
}

/**
 * Generate and send an AI reply for an Instagram DM conversation.
 * Returns without replying if:
 * - No inbound messages to reply to
 * - Last message is outbound (already replied)
 * - Account has no access token
 */
export async function handleInstagramAutoReply(
  ourAccountId: string,
  senderId: string
): Promise<AutoReplyResult> {
  // Get conversation messages (last 20)
  const { data: messages } = await supabaseAdmin
    .from('instagram_unibox_messages')
    .select('direction, content, created_at')
    .eq('our_account_id', ourAccountId)
    .eq('sender_id', senderId)
    .order('created_at', { ascending: true })
    .limit(20);

  if (!messages || messages.length === 0) {
    return { replied: false, error: 'No messages found' };
  }

  // Don't reply if last message is already outbound
  const lastMsg = messages[messages.length - 1];
  if (lastMsg.direction === 'outbound') {
    return { replied: false, error: 'Last message is outbound — already replied' };
  }

  // Get account config with access token
  const { data: config } = await supabaseAdmin
    .from('instagram_account_configs')
    .select('username, access_token')
    .eq('ig_account_id', ourAccountId)
    .maybeSingle();

  if (!config?.access_token) {
    return { replied: false, error: 'No access token for account' };
  }

  // Build conversation history for Claude
  const conversationHistory = messages.map(m => ({
    role: (m.direction === 'inbound' ? 'user' : 'assistant') as 'user' | 'assistant',
    content: m.content || '(no text)',
  }));

  // Generate reply via Claude Haiku
  const result = await callKimi({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...conversationHistory,
    ],
    maxTokens: 200,
    temperature: 0.8,
  });

  const replyText = result.reply.trim();
  if (!replyText) {
    return { replied: false, error: 'Empty reply generated' };
  }

  // Send via Instagram API
  const res = await fetch('https://graph.instagram.com/v21.0/me/messages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      recipient: { id: senderId },
      message: { text: replyText },
    }),
  });

  const apiResult = await res.json();

  if (!res.ok) {
    console.error('[ig-auto-reply] Send failed:', apiResult);
    return { replied: false, error: apiResult.error?.message || 'API send failed' };
  }

  // Store outbound message
  await supabaseAdmin.from('instagram_unibox_messages').insert({
    our_account_id: ourAccountId,
    our_username: config.username,
    sender_id: senderId,
    direction: 'outbound',
    content: replyText,
    meta_message_id: apiResult.message_id || null,
    meta_raw: { ai_generated: true, tokens: result.tokensUsed, api_result: apiResult },
  });

  console.log(`[ig-auto-reply] Replied to ${senderId} via @${config.username}: "${replyText.slice(0, 50)}..."`);

  return { replied: true, message: replyText };
}

/**
 * Process all pending Instagram DM conversations that need AI replies.
 * Called by cron or webhook trigger.
 */
export async function processAllPendingReplies(): Promise<{ processed: number; errors: number }> {
  // Find conversations where the last message is inbound (needs reply)
  const { data: recentInbound } = await supabaseAdmin
    .from('instagram_unibox_messages')
    .select('our_account_id, sender_id, created_at')
    .eq('direction', 'inbound')
    .order('created_at', { ascending: false })
    .limit(50);

  if (!recentInbound || recentInbound.length === 0) {
    return { processed: 0, errors: 0 };
  }

  // Deduplicate by conversation (our_account_id + sender_id)
  const seen = new Set<string>();
  const pending: { our_account_id: string; sender_id: string }[] = [];

  for (const msg of recentInbound) {
    const key = `${msg.our_account_id}:${msg.sender_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    pending.push({ our_account_id: msg.our_account_id, sender_id: msg.sender_id });
  }

  let processed = 0;
  let errors = 0;

  for (const conv of pending) {
    try {
      const result = await handleInstagramAutoReply(conv.our_account_id, conv.sender_id);
      if (result.replied) processed++;
    } catch (e) {
      console.error('[ig-auto-reply] Error:', e);
      errors++;
    }
  }

  return { processed, errors };
}
