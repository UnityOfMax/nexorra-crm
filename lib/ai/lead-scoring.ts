/**
 * Lead scoring algorithm — 0 to 100.
 *
 * Called on:
 *   - form submit (contact creation)
 *   - every inbound message
 *   - every AI reply sent
 *
 * Max 3 DB queries per invocation.
 */

import { supabaseAdmin } from '@/lib/supabase';

// ─── Score weights ─────────────────────────────────────────────────────────

const WEIGHTS = {
  // Contact completeness
  HAS_PHONE_AND_EMAIL: 15,
  ALL_FIELDS_COMPLETE: 15, // first_name, last_name, phone, email all present

  // Engagement
  HAS_INBOUND_REPLY: 20,
  MULTIPLE_INBOUND_REPLIES: 10, // 2+ inbound messages

  // Intent / funnel stage
  BOOKING_PAGE_VIEWED: 10,
  CALL_BOOKED: 20,

  // Recency (last activity)
  ACTIVE_WITHIN_24H: 10,
  ACTIVE_WITHIN_72H: 6,
  ACTIVE_WITHIN_7D: 3,
};

// ─── Main export ──────────────────────────────────────────────────────────────

export async function updateLeadScore(contactId: string): Promise<number> {
  // Query 1: contact data + funnel_stage
  const { data: contact } = await supabaseAdmin
    .from('contacts')
    .select('id, first_name, last_name, email, phone, funnel_stage, account_id')
    .eq('id', contactId)
    .single();

  if (!contact) return 0;

  // Query 2: message counts (inbound)
  const { count: inboundCount } = await supabaseAdmin
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('contact_id', contactId)
    .eq('direction', 'inbound');

  // Query 3: last activity timestamp (latest message or funnel event)
  const { data: latestMessage } = await supabaseAdmin
    .from('messages')
    .select('created_at')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // ── Scoring ──

  let score = 0;

  // Contact completeness
  if (contact.phone && contact.email) score += WEIGHTS.HAS_PHONE_AND_EMAIL;
  if (contact.first_name && contact.last_name && contact.phone && contact.email) {
    score += WEIGHTS.ALL_FIELDS_COMPLETE;
  }

  // Engagement
  const replies = inboundCount || 0;
  if (replies >= 1) score += WEIGHTS.HAS_INBOUND_REPLY;
  if (replies >= 2) score += WEIGHTS.MULTIPLE_INBOUND_REPLIES;

  // Intent / funnel stage
  const stage = contact.funnel_stage || 'lead';
  if (stage === 'booking_page_viewed') score += WEIGHTS.BOOKING_PAGE_VIEWED;
  if (stage === 'call_booked' || stage === 'showed' || stage === 'client') {
    score += WEIGHTS.CALL_BOOKED;
  }

  // Recency
  if (latestMessage?.created_at) {
    const lastActivityMs = new Date(latestMessage.created_at).getTime();
    const now = Date.now();
    const hoursAgo = (now - lastActivityMs) / (1000 * 60 * 60);

    if (hoursAgo <= 24) score += WEIGHTS.ACTIVE_WITHIN_24H;
    else if (hoursAgo <= 72) score += WEIGHTS.ACTIVE_WITHIN_72H;
    else if (hoursAgo <= 168) score += WEIGHTS.ACTIVE_WITHIN_7D;
  }

  // Cap at 100
  const finalScore = Math.min(100, score);

  // Persist
  await supabaseAdmin
    .from('contacts')
    .update({
      lead_score: finalScore,
      lead_score_updated_at: new Date().toISOString(),
    })
    .eq('id', contactId);

  return finalScore;
}
