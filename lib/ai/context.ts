import { supabaseAdmin } from '@/lib/supabase';
import { callKimi } from '@/lib/kimi/client';

export interface AIContext {
  summary: string;
  recentMessages: Array<{
    direction: 'inbound' | 'outbound';
    type: string;
    content: string;
    created_at: string;
    metadata?: Record<string, string>;
  }>;
  upcomingSlots: string;    // contact's booked calls
  availableSlots: string;   // account's open slots to offer
  lastInboundIntent?: string;
  fbc?: string;             // Meta click ID (?fbclid= param)
  fbp?: string;             // Meta browser pixel ID
}

// Build a Date representing `hour:00:00` in the given timezone on the same
// calendar day as `baseDate`. Works correctly on Vercel (server = UTC).
function slotInTimezone(baseDate: Date, hour: number, timezone: string): Date {
  // Get the calendar date in the target timezone
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone: timezone,
  }).formatToParts(baseDate);
  const y = parts.find(p => p.type === 'year')!.value;
  const mo = parts.find(p => p.type === 'month')!.value;
  const d = parts.find(p => p.type === 'day')!.value;
  // Parse the target local datetime as UTC-naive, then apply the TZ offset
  const naiveMs = Date.parse(`${y}-${mo}-${d}T${String(hour).padStart(2, '0')}:00:00Z`);
  const naiveDate = new Date(naiveMs);
  // Offset = UTC interpretation of the local-in-TZ time minus UTC-naive parse
  const asUTC = new Date(naiveDate.toLocaleString('en-US', { timeZone: 'UTC' }));
  const asTZ  = new Date(naiveDate.toLocaleString('en-US', { timeZone: timezone }));
  return new Date(naiveMs + (asUTC.getTime() - asTZ.getTime()));
}

function computeAvailableSlots(
  existingMeetings: Array<{ due_date: string }>,
  timezone: string,
  maxSlots: number = 3
): string {
  const busyMs = existingMeetings.map(m => new Date(m.due_date).getTime());
  const slots: string[] = [];
  const now = new Date();
  const dowFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: timezone });

  for (let dayOffset = 0; dayOffset <= 14 && slots.length < maxSlots; dayOffset++) {
    const day = new Date(now);
    day.setUTCDate(day.getUTCDate() + dayOffset);
    // Weekend check in account timezone
    const dow = dowFmt.format(day);
    if (dow === 'Sat' || dow === 'Sun') continue;

    for (const hour of [9, 10, 11, 13, 14, 15]) {
      const slot = slotInTimezone(day, hour, timezone);

      // Must be at least 2 hours from now
      if (slot.getTime() < now.getTime() + 2 * 60 * 60 * 1000) continue;

      // Check for conflicts within 60 min buffer
      const conflict = busyMs.some(bt => Math.abs(bt - slot.getTime()) < 60 * 60 * 1000);
      if (conflict) continue;

      const label = slot.toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric', timeZone: timezone,
      }) + ' at ' + slot.toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit', hour12: true, timeZone: timezone,
      });
      slots.push(label);
      if (slots.length >= maxSlots) break;
    }
  }

  return slots.join(', ');
}

/**
 * Build AI context for a contact:
 *   - rolling summary
 *   - last 5 messages
 *   - contact's booked calls (upcomingSlots)
 *   - account's available slots to offer (availableSlots)
 */
export async function buildAIContext(accountId: string, contactId: string): Promise<AIContext> {
  const now = new Date();
  const sixtyDaysOut = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
  const fourteenDaysOut = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const [summaryResult, messagesResult, calendarResult, accountResult, accountMeetingsResult, contactMetaResult] = await Promise.all([
    supabaseAdmin
      .from('ai_conversation_summaries')
      .select('summary')
      .eq('account_id', accountId)
      .eq('contact_id', contactId)
      .maybeSingle(),
    supabaseAdmin
      .from('messages')
      .select('direction, type, content, created_at, metadata')
      .eq('account_id', accountId)
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false })
      .limit(5),
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
    supabaseAdmin
      .from('accounts')
      .select('settings')
      .eq('id', accountId)
      .single(),
    // Account-wide meetings to compute free slots
    supabaseAdmin
      .from('activities')
      .select('due_date')
      .eq('account_id', accountId)
      .eq('type', 'meeting')
      .eq('completed', false)
      .gte('due_date', now.toISOString())
      .lte('due_date', fourteenDaysOut.toISOString()),
    // Meta attribution fields
    supabaseAdmin
      .from('contacts')
      .select('fbc, fbp')
      .eq('id', contactId)
      .maybeSingle(),
  ]);

  const summary = summaryResult.data?.summary ?? '';
  const recentMessages = (messagesResult.data ?? []).reverse() as AIContext['recentMessages'];
  const lastInboundMsg = recentMessages.findLast(m => m.direction === 'inbound');
  const lastInboundIntent = (lastInboundMsg?.metadata?.intent as string | undefined) ?? undefined;

  const slots = calendarResult.data ?? [];
  const upcomingSlots = slots.length > 0
    ? slots
        .map(s => {
          const d = new Date(s.due_date);
          return `${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}${s.subject ? ` (${s.subject})` : ''}`;
        })
        .join(', ')
    : '';

  // Compute available slots only if Google Calendar is connected
  const gcal = accountResult.data?.settings?.google_calendar;
  const timezone = accountResult.data?.settings?.timezone || 'America/New_York';
  const availableSlots = gcal?.enabled
    ? computeAvailableSlots(accountMeetingsResult.data ?? [], timezone)
    : '';

  const fbc = contactMetaResult.data?.fbc ?? undefined;
  const fbp = contactMetaResult.data?.fbp ?? undefined;

  return { summary, recentMessages, upcomingSlots, availableSlots, lastInboundIntent, fbc, fbp };
}

/**
 * Regenerate and store the rolling conversation summary for a contact.
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

  const result = await callKimi({
    messages: [
      { role: 'system', content: 'You summarize CRM conversations concisely for an AI sales agent. Be brief and factual.' },
      {
        role: 'user',
        content: `Summarize this conversation in 2-3 sentences. Focus on: what the lead is looking for, their timeline, any objections, and any commitments made.\n\n${transcript}`,
      },
    ],
    maxTokens: 200,
  });

  const summary = result.reply;
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
