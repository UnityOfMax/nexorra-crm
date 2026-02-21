import { supabaseAdmin } from '@/lib/supabase';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface AIContext {
  summary: string;
  recentMessages: Array<{
    direction: 'inbound' | 'outbound';
    type: string;
    content: string;
    created_at: string;
  }>;
}

/**
 * Build AI context for a contact: summary (if any) + last 10 messages (all channels).
 * This keeps token usage bounded regardless of conversation length.
 */
export async function buildAIContext(accountId: string, contactId: string): Promise<AIContext> {
  const [summaryResult, messagesResult] = await Promise.all([
    supabaseAdmin
      .from('ai_conversation_summaries')
      .select('summary')
      .eq('account_id', accountId)
      .eq('contact_id', contactId)
      .maybeSingle(),
    supabaseAdmin
      .from('messages')
      .select('direction, type, content, created_at')
      .eq('account_id', accountId)
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const summary = summaryResult.data?.summary ?? '';
  const recentMessages = (messagesResult.data ?? []).reverse() as AIContext['recentMessages'];

  return { summary, recentMessages };
}

/**
 * Regenerate and store the rolling conversation summary for a contact.
 * Skips if fewer than 10 messages exist (not worth summarizing yet).
 * Call this non-blocking after each AI response.
 */
export async function updateSummary(accountId: string, contactId: string): Promise<void> {
  const { data: messages } = await supabaseAdmin
    .from('messages')
    .select('direction, type, content, created_at')
    .eq('account_id', accountId)
    .eq('contact_id', contactId)
    .order('created_at', { ascending: true })
    .limit(200);

  if (!messages || messages.length < 10) return;

  const transcript = messages
    .map(m => `[${m.type.toUpperCase()} ${m.direction === 'inbound' ? 'Lead' : 'Agent'}]: ${m.content}`)
    .join('\n');

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    system: 'You summarize CRM conversations concisely for an AI sales agent.',
    messages: [
      {
        role: 'user',
        content: `Summarize this conversation in 2-3 sentences. Focus on: what the lead is looking for, their timeline, any objections, and any commitments made.\n\n${transcript}`,
      },
    ],
  });

  const summary = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('');

  if (!summary) return;

  await supabaseAdmin.from('ai_conversation_summaries').upsert(
    {
      account_id: accountId,
      contact_id: contactId,
      summary,
      message_count: messages.length,
      last_updated_at: new Date().toISOString(),
    },
    { onConflict: 'account_id,contact_id' }
  );
}
