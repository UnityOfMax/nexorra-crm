import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const INSTANTLY_API_KEY = process.env.INSTANTLY_API_KEY!;
const CAMPAIGN_ID = 'f5a6f6cc-af7d-4db9-b5c6-a21ede5319fc';

// Instantly interest status mapping
const INTEREST_MAP: Record<string, number> = {
  'unsubscribe': -2, // Do Not Contact
  'hostile': -2,
  'decline': -1,    // Not Interested
  'irrelevant': -1,
  'ooo': 0,         // Keep as Lead (temporary)
  'positive': 1,    // Interested
  'curious': 1,
  'booked': 1,
  'follow_up_request': 1,
  'proof_request': 1,
  'delayed_reply': 0,
  'objection': 0,
};

// Custom tag IDs (created in Instantly)
const TAG_MAP: Record<string, string> = {
  'unsubscribe': '3354d320-9a18-40ec-9d9e-e7577d367bc2',
  'decline': '92ff2f95-7518-4388-8a12-ebafe06d6244',
  'hostile': '00a5f2cc-9f45-4b4a-9800-1b161161f248',
  'ooo': '4d1da1ff-76ca-4633-937d-a33e40e4b83b',
  'positive': 'edb05211-b292-4b8e-bf2f-dd805f0ccc0d',
  'curious': 'edb05211-b292-4b8e-bf2f-dd805f0ccc0d',
  'booked': 'd1cc603c-06bf-4dac-8d8c-478ad6568507',
  'irrelevant': '9eb77a2c-0312-42c1-8e60-84413e0b1667',
};

// Simple classification based on content keywords
function classifyReply(content: string): string {
  const lower = (content || '').toLowerCase();
  if (!lower.trim() || lower.length < 3) return 'irrelevant';
  if (/unsubscribe|remove me|stop|take me off|opt out/.test(lower)) return 'unsubscribe';
  if (/no thanks?|not interested|no thank you|pass|decline/.test(lower)) return 'decline';
  if (/unprofessional|spam|scam|report|disgusting|how dare/.test(lower)) return 'hostile';
  if (/out of (the )?office|ooo|on vacation|on holiday|away from|currently out|will be out/.test(lower)) return 'ooo';
  if (/interested|tell me more|sounds good|let'?s talk|book|schedule|calendar|set up a call/.test(lower)) return 'positive';
  if (/how much|what'?s the cost|pricing|price|how does it work|more info|more details/.test(lower)) return 'curious';
  if (/already have|using|got a system|no need/.test(lower)) return 'objection';
  if (/thank you|auto.?reply|automated|this email is no longer/.test(lower)) return 'irrelevant';
  return 'curious'; // default to curious if unclear
}

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

let lastApiCall = 0;

async function instantlyRequest(method: string, path: string, body?: any) {
  // Rate limit: 5s between calls
  const now = Date.now();
  const wait = lastApiCall + 5000 - now;
  if (wait > 0) await sleep(wait);
  lastApiCall = Date.now();

  const opts: RequestInit = {
    method,
    headers: { 'Authorization': `Bearer ${INSTANTLY_API_KEY}`, 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`https://api.instantly.ai/api/v2${path}`, opts);
  if (res.status === 429) {
    console.log('[poller] Rate limited, waiting 60s...');
    await sleep(60000);
    lastApiCall = Date.now();
    return instantlyRequest(method, path, body);
  }
  if (!res.ok) throw new Error(`Instantly ${method} ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function main() {
  console.log(`[poller] Starting at ${new Date().toISOString()}`);

  // 1. Fetch received emails from Instantly (last 24h worth)
  const emails = await instantlyRequest('GET',
    `/emails?campaign_id=${CAMPAIGN_ID}&email_type=received&limit=50`);
  const items = emails.items || emails || [];
  console.log(`[poller] Found ${items.length} received emails in Instantly`);

  // 2. Get existing message IDs from our DB to find missing ones
  const { data: existing } = await supabase
    .from('conversation_messages')
    .select('instantly_msg_id')
    .not('instantly_msg_id', 'is', null);
  const existingIds = new Set((existing || []).map((m: any) => m.instantly_msg_id));

  let newCount = 0;
  let taggedCount = 0;

  for (const email of items) {
    // Skip if we already have this message
    if (existingIds.has(email.id)) continue;

    const fromEmail = email.from_address_json?.[0]?.address || email.from_address_email || '';
    const fromName = email.from_address_json?.[0]?.name || '';
    const content = email.body?.text || email.content_preview || '';
    const subject = email.subject || '';

    if (!fromEmail) continue;

    console.log(`[poller] New reply from ${fromEmail}: ${(content || '').slice(0, 50)}...`);

    // 3. Classify
    const classification = classifyReply(content);
    console.log(`[poller]   → classified as: ${classification}`);

    // 4. Look up lead for lead_id
    const { data: lead } = await supabase
      .from('leads')
      .select('id, timezone')
      .eq('email', fromEmail)
      .maybeSingle();

    // 5. Determine conversation status from classification
    const isNegative = classification === 'unsubscribe' || classification === 'hostile'
      || classification === 'decline' || classification === 'irrelevant';
    const convStatus = isNegative ? 'rejected'
      : classification === 'ooo' ? 'ooo_scheduled'
      : 'needs_reply';

    // 6. Upsert conversation
    const { data: convData, error: convError } = await supabase
      .from('lead_conversations')
      .upsert({
        lead_id: lead?.id ?? null,
        lead_email: fromEmail,
        campaign_id: CAMPAIGN_ID,
        instantly_email_acct: email.eaccount || '',
        timezone: lead?.timezone ?? null,
        status: convStatus,
        last_reply_at: email.timestamp_email || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'lead_email,campaign_id' })
      .select('id')
      .single();

    if (convError || !convData) {
      console.log(`[poller]   → failed to upsert conversation: ${convError?.message}`);
      continue;
    }

    // 7. Insert message with instantly_msg_id (for reply_to_uuid)
    const { error: msgError } = await supabase.from('conversation_messages').upsert({
      conversation_id: convData.id,
      direction: 'inbound',
      content,
      subject,
      sender_name: fromName,
      sender_email: fromEmail,
      instantly_msg_id: email.id, // THIS is the reply_to_uuid for sending replies
      classification,
      sent_at: email.timestamp_email || new Date().toISOString(),
    }, { onConflict: 'instantly_msg_id' });

    if (msgError) {
      console.log(`[poller]   → message insert error: ${msgError.message}`);
      continue;
    }
    newCount++;

    // 8. Tag lead in Instantly
    const leadResult = await instantlyRequest('POST', '/leads/list', {
      campaign_id: CAMPAIGN_ID, search: fromEmail, limit: 1
    });
    const instantlyLead = leadResult.items?.[0] || leadResult?.[0];
    if (instantlyLead) {
      const interest = INTEREST_MAP[classification] ?? 0;
      const tagId = TAG_MAP[classification];
      const updates: any = { lt_interest_status: interest };
      if (tagId) updates.custom_tag_ids = [tagId];

      await instantlyRequest('PATCH', `/leads/${instantlyLead.id}`, updates);
      taggedCount++;
      console.log(`[poller]   → tagged in Instantly: interest=${interest}`);
    }

    // 9. Update lead status in CRM if we have a match
    if (lead) {
      const instantlyStatus = isNegative ? 'Unsubscribed'
        : classification === 'ooo' ? 'Out of Office'
        : classification === 'positive' || classification === 'booked' ? 'Interested'
        : classification === 'curious' ? 'Interested'
        : 'Replied';

      await supabase
        .from('leads')
        .update({ instantly_status: instantlyStatus })
        .eq('id', lead.id);
      console.log(`[poller]   → CRM lead status: ${instantlyStatus}`);
    }
  }

  console.log(`[poller] Done. ${newCount} new messages stored, ${taggedCount} leads tagged in Instantly`);
}

main().catch(e => { console.error('[poller] Fatal:', e); process.exit(1); });
