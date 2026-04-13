import { supabaseAdmin } from '@/lib/supabase';
import { generateWithOllama } from '@/lib/ai/ollama-client';

export interface AIContext {
  summary: string;
  recentMessages: Array<{
    direction: 'inbound' | 'outbound';
    type: string;
    content: string;
    created_at: string;
  }>;
  upcomingSlots: string; // compact human-readable calendar availability
}

/**
 * Build AI context for a contact:
 *   - rolling summary (compressed notes on older messages)
 *   - last 5 messages (inbound + outbound, all channels)
 *   - upcoming booked calendar slots for the next 5 business days
 */
export async function buildAIContext(accountId: string, contactId: string): Promise<AIContext> {
  const now = new Date();
  // Look 60 days ahead to catch any future bookings for this contact
  const sixtyDaysOut = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

  const [summaryResult, messagesResult, calendarResult] = await Promise.all([
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
      .limit(5),
    // Filter by contact_id so we see THIS contact's scheduled calls
    supabaseAdmin
      .from('activities')
      .select('subject, due_date')
      .eq('account_id', accountId)
      .eq('contact_id', contactId)
      .eq('type', 'meeting')
      .eq('completed', false)
      .gte('due_date', now.toISOString())
      .lte('due_date', sixtyDaysOut.toISOString())
      .order('due_date', { ascending: true })
      .limit(5),
  ]);

  const summary = summaryResult.data?.summary ?? '';
  const recentMessages = (messagesResult.data ?? []).reverse() as AIContext['recentMessages'];

  // Format upcoming slots as compact human-readable text
  const slots = calendarResult.data ?? [];
  const upcomingSlots = slots.length > 0
    ? slots
        .map((s) => {
          const d = new Date(s.due_date);
          return `${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}${s.subject ? ` (${s.subject})` : ''}`;
        })
        .join(', ')
    : '';

  return { summary, recentMessages, upcomingSlots };
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

  const result = await generateWithOllama({
    system: 'You summarize CRM conversations concisely for an AI sales agent. Be brief and factual.',
    messages: [
      {
        role: 'user',
        content: `Summarize this conversation in 2-3 sentences. Focus on: what the lead is looking for, their timeline, any objections, and any commitments made.\n\n${transcript}`,
      },
    ],
    maxTokens: 200,
  });

  const summary = result.text;

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
