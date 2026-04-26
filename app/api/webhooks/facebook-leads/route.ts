import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { normalizePhone } from '@/lib/utils/phone';
import { triggerDealStageChanged } from '@/lib/workflow-engine/triggers';

export const dynamic = 'force-dynamic';

/**
 * Facebook Lead Ads webhook.
 *
 * GET  — webhook verification (Facebook sends hub.challenge)
 * POST — lead notification → fetch field data → create contact + deal
 *
 * Setup:
 *   1. Set FB_VERIFY_TOKEN in .env.local (any secret string)
 *   2. In Meta Business Suite → Webhooks → subscribe to `leadgen` field on your Page
 *   3. Use https://your-domain.com/api/webhooks/facebook-leads as callback URL
 *   4. On the account record, set settings->meta->fb_page_id to your Facebook Page ID
 *      so the webhook knows which CRM account to route leads to.
 */

const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || 'nexorra-fb-leads-2026';
const GRAPH_API = 'https://graph.facebook.com/v21.0';

// GET — Facebook webhook verification
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode      = searchParams.get('hub.mode');
  const token     = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[fb-leads] Webhook verified');
    return new NextResponse(challenge, { status: 200 });
  }

  console.warn('[fb-leads] Verification failed — wrong token');
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// POST — Lead notification
export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  console.log('[fb-leads] Payload:', JSON.stringify(body).slice(0, 1000));

  // Return 200 to Facebook immediately — if we await processing, Facebook retries
  // on timeout and every retry spawns a concurrent serverless function that races
  // past the dedup check and creates duplicate contacts.
  const entries = body?.entry || [];
  const leads: Array<{ pageId: string; leadgenId: string; formId?: string }> = [];

  for (const entry of entries) {
    const pageId  = entry.id as string;
    for (const change of (entry.changes || [])) {
      if (change.field !== 'leadgen') continue;
      const { leadgen_id: leadgenId, form_id: formId } = change.value || {};
      if (leadgenId) leads.push({ pageId, leadgenId, formId });
    }
  }

  // Fire-and-forget — 200 is already on its way to Facebook
  Promise.all(leads.map(l =>
    processLead(l).catch(err => console.error('[fb-leads] processLead error:', err))
  )).catch(() => {});

  return NextResponse.json({ received: true });
}

async function processLead({
  pageId,
  leadgenId,
  formId,
}: {
  pageId: string;
  leadgenId: string;
  formId?: string;
}) {
  // ── Step 0: Fast dedup read ───────────────────────────────────────────────
  // If this leadgen_id was already processed (by this webhook or the cron),
  // skip immediately. For truly concurrent invocations that both pass this check,
  // the try-INSERT contact pattern + final facebook_ad_leads INSERT both have
  // 23505 handling that prevents any duplicate contact or double trigger.
  const { data: alreadyClaimed } = await supabaseAdmin
    .from('facebook_ad_leads')
    .select('facebook_lead_id')
    .eq('facebook_lead_id', leadgenId)
    .maybeSingle();

  if (alreadyClaimed) {
    console.log(`[fb-leads] Already processed ${leadgenId} — skipping`);
    return;
  }

  // ── Step 1: Resolve account ───────────────────────────────────────────────
  const account = await resolveAccount(pageId, formId);
  if (!account) {
    console.warn(`[fb-leads] No account found for page_id=${pageId} form_id=${formId}`);
    return;
  }

  // ── Step 2: Fetch lead field data from Graph API ──────────────────────────
  const accessToken = process.env.META_ACCESS_TOKEN;
  if (!accessToken) {
    console.error('[fb-leads] META_ACCESS_TOKEN not set');
    return;
  }

  const leadRes = await fetch(
    `${GRAPH_API}/${leadgenId}?fields=field_data,created_time&access_token=${accessToken}`,
  );
  if (!leadRes.ok) {
    console.error('[fb-leads] Graph API error:', await leadRes.text());
    return;
  }
  const leadData = await leadRes.json();
  const fieldData: Array<{ name: string; values: string[] }> = leadData.field_data || [];

  const get = (key: string) =>
    fieldData.find(f => f.name === key || f.name === key.replace(/_/g, ' '))?.values?.[0] || '';

  const first_name = get('first_name') || get('firstname');
  const last_name  = get('last_name')  || get('lastname');
  const email      = get('email');
  const phone      = get('phone_number') || get('phone') || get('mobile_phone');
  const city       = get('city');
  const zip        = get('zip') || get('zip_code') || get('postal_code');

  if (!email && !phone) {
    console.warn('[fb-leads] Lead has no email or phone — skipping');
    return;
  }

  const normalizedPhone = phone ? normalizePhone(phone) : null;
  const custom_fields: Record<string, string> = {};
  if (city)   custom_fields.city       = city;
  if (zip)    custom_fields.zip        = zip;
  if (formId) custom_fields.fb_form_id = formId;
  for (const f of fieldData) {
    const key = f.name.toLowerCase().replace(/\s+/g, '_');
    if (!['first_name','last_name','email','phone_number','phone','mobile_phone','city','zip','zip_code','postal_code'].includes(key)) {
      custom_fields[key] = f.values?.[0] || '';
    }
  }

  // ── Step 3: Create or update contact — race-proof pattern ─────────────────
  // Try INSERT. If the DB unique index fires (23505), the contact already exists —
  // fall back to SELECT + UPDATE. This works correctly with partial unique indexes
  // unlike Supabase .upsert() which requires a full constraint for ON CONFLICT.
  let contactId: string;
  let isNewContact = false;

  const contactPayload = {
    account_id:   account.id,
    first_name:   first_name || null,
    last_name:    last_name  || null,
    phone:        normalizedPhone || null,
    email:        email || null,
    status:       'lead',
    source:       'Facebook Lead Ad',
    funnel_stage: 'lead',
    custom_fields,
  };

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('contacts')
    .insert(contactPayload)
    .select('id')
    .single();

  if (!insertError) {
    contactId  = inserted.id;
    isNewContact = true;
    console.log(`[fb-leads] Created contact ${contactId}`);
  } else if (insertError.code === '23505') {
    // Contact already exists — find and update it
    const lookup = normalizedPhone
      ? supabaseAdmin.from('contacts').select('id').eq('account_id', account.id).eq('phone', normalizedPhone)
      : supabaseAdmin.from('contacts').select('id').eq('account_id', account.id).eq('email', email!);
    const { data: existing } = await lookup.maybeSingle();
    if (!existing) { console.error('[fb-leads] 23505 but contact not found'); return; }
    contactId    = existing.id;
    isNewContact = false;
    await supabaseAdmin.from('contacts').update({
      first_name:   first_name || undefined,
      last_name:    last_name  || undefined,
      email:        email      || undefined,
      phone:        normalizedPhone || undefined,
      custom_fields,
      updated_at:   new Date().toISOString(),
    }).eq('id', contactId);
    console.log(`[fb-leads] Updated existing contact ${contactId}`);
  } else {
    console.error('[fb-leads] Contact insert error:', insertError);
    return;
  }

  // ── Step 4: Finalise the facebook_ad_leads claim row ─────────────────────
  // Update the placeholder row we inserted in Step 0 with full data.
  // If Step 0 failed to insert (pre-existing row), this is a no-op.
  await supabaseAdmin.from('facebook_ad_leads').update({
    account_id:   account.id,
    contact_id:   contactId,
    form_id:      formId || null,
    lead_data:    fieldData,
    email:        email || null,
    phone:        normalizedPhone || null,
    first_name:   first_name || null,
    last_name:    last_name || null,
    created_time: leadData.created_time || new Date().toISOString(),
  }).eq('facebook_lead_id', leadgenId).is('account_id', null);

  // ── Step 5: New-contact-only actions ──────────────────────────────────────
  if (isNewContact && account.new_lead_stage_id) {
    const contactName = [first_name, last_name].filter(Boolean).join(' ') || 'Lead';
    await supabaseAdmin.from('deals').insert({
      account_id:        account.id,
      contact_id:        contactId,
      pipeline_id:       account.pipeline_id || null,
      pipeline_stage_id: account.new_lead_stage_id,
      title:             `${contactName} — Facebook Lead Ad`,
      stage:             'New Lead',
      probability:       10,
      status:            'open',
    });
    triggerDealStageChanged(account.id, 'new', contactId, '', account.new_lead_stage_id)
      .catch(err => console.error('[fb-leads] workflow trigger error:', err));
  }

  void supabaseAdmin.from('funnel_events').insert({
    account_id:  account.id,
    contact_id:  contactId,
    event_type:  'form_submit',
    channel:     'facebook_lead_ad',
  });
}

// ── Account resolution ──────────────────────────────────────────────────────
// Looks up the CRM account by FB page_id stored in accounts.settings->meta->fb_page_id
// Falls back to checking fb_form_configs table if it exists.
// Returns account id + pipeline info needed for deal creation.

interface ResolvedAccount {
  id: string;
  pipeline_id: string | null;
  new_lead_stage_id: string | null;
}

async function resolveAccount(
  pageId: string,
  formId?: string,
): Promise<ResolvedAccount | null> {
  // Try to find account with matching fb_page_id in settings
  const { data: accounts } = await supabaseAdmin
    .from('accounts')
    .select('id, settings')
    .not('settings', 'is', null);

  const match = accounts?.find(a => {
    const meta = (a.settings as any)?.meta;
    return meta?.fb_page_id === pageId || meta?.fb_form_id === formId;
  });

  if (!match) return null;

  // Get their pipeline + New Lead stage
  const { data: pipeline } = await supabaseAdmin
    .from('pipelines')
    .select('id')
    .eq('account_id', match.id)
    .limit(1)
    .maybeSingle();

  if (!pipeline) {
    return { id: match.id, pipeline_id: null, new_lead_stage_id: null };
  }

  const { data: stage } = await supabaseAdmin
    .from('pipeline_stages')
    .select('id')
    .eq('pipeline_id', pipeline.id)
    .ilike('name', '%new lead%')
    .limit(1)
    .maybeSingle();

  return {
    id:                match.id,
    pipeline_id:       pipeline.id,
    new_lead_stage_id: stage?.id || null,
  };
}
