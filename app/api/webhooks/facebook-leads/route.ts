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

  // Facebook sends: { object: "page", entry: [{ id: PAGE_ID, changes: [{ value: { leadgen_id, form_id, page_id }, field: "leadgen" }] }] }
  const entries = body?.entry || [];

  for (const entry of entries) {
    const pageId  = entry.id as string;
    const changes = entry.changes || [];

    for (const change of changes) {
      if (change.field !== 'leadgen') continue;

      const { leadgen_id: leadgenId, form_id: formId } = change.value || {};
      if (!leadgenId) continue;

      try {
        await processLead({ pageId, leadgenId, formId });
      } catch (err) {
        console.error('[fb-leads] processLead error:', err);
      }
    }
  }

  // Facebook requires a 200 response quickly
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
  // 1. Look up which CRM account owns this Facebook page
  const account = await resolveAccount(pageId, formId);
  if (!account) {
    console.warn(`[fb-leads] No account found for page_id=${pageId} form_id=${formId}`);
    return;
  }

  // 2. Fetch lead field data from Graph API
  const accessToken = process.env.META_ACCESS_TOKEN;
  if (!accessToken) {
    console.error('[fb-leads] META_ACCESS_TOKEN not set — cannot fetch lead data');
    return;
  }

  const leadRes = await fetch(
    `${GRAPH_API}/${leadgenId}?fields=field_data,created_time&access_token=${accessToken}`,
  );
  if (!leadRes.ok) {
    const err = await leadRes.text();
    console.error('[fb-leads] Graph API error:', err);
    return;
  }
  const leadData = await leadRes.json();
  const fieldData: Array<{ name: string; values: string[] }> = leadData.field_data || [];

  // 3. Parse fields (Facebook uses snake_case names matching the form fields)
  const get = (key: string) =>
    fieldData.find(f => f.name === key || f.name === key.replace(/_/g, ' '))?.values?.[0] || '';

  const first_name   = get('first_name')   || get('firstname');
  const last_name    = get('last_name')    || get('lastname');
  const email        = get('email');
  const phone        = get('phone_number') || get('phone') || get('mobile_phone');
  const city         = get('city');
  const zip          = get('zip')          || get('zip_code') || get('postal_code');

  if (!email && !phone) {
    console.warn('[fb-leads] Lead has no email or phone — skipping');
    return;
  }

  // 4. Create or update contact in the CRM account
  const normalizedPhone = phone ? normalizePhone(phone) : null;
  const custom_fields: Record<string, string> = {};
  if (city)  custom_fields.city    = city;
  if (zip)   custom_fields.zip     = zip;
  if (formId) custom_fields.fb_form_id = formId;
  // Store any extra fields
  for (const f of fieldData) {
    const key = f.name.toLowerCase().replace(/\s+/g, '_');
    if (!['first_name', 'last_name', 'email', 'phone_number', 'phone', 'mobile_phone', 'city', 'zip', 'zip_code', 'postal_code'].includes(key)) {
      custom_fields[key] = f.values?.[0] || '';
    }
  }

  // Check for existing contact
  let existingContact: { id: string } | null = null;
  if (normalizedPhone) {
    const { data } = await supabaseAdmin
      .from('contacts')
      .select('id')
      .eq('account_id', account.id)
      .or(`phone.eq.${normalizedPhone}`)
      .limit(1)
      .maybeSingle();
    existingContact = data;
  }
  if (!existingContact && email) {
    const { data } = await supabaseAdmin
      .from('contacts')
      .select('id')
      .eq('account_id', account.id)
      .eq('email', email)
      .limit(1)
      .maybeSingle();
    existingContact = data;
  }

  let contactId: string;

  if (existingContact) {
    await supabaseAdmin
      .from('contacts')
      .update({
        first_name: first_name || undefined,
        last_name:  last_name  || undefined,
        phone:      normalizedPhone || undefined,
        email:      email || undefined,
        custom_fields,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingContact.id);
    contactId = existingContact.id;
    console.log(`[fb-leads] Updated contact ${contactId} in account ${account.id}`);
  } else {
    const { data, error } = await supabaseAdmin
      .from('contacts')
      .insert({
        account_id:    account.id,
        first_name:    first_name || null,
        last_name:     last_name  || null,
        phone:         normalizedPhone || null,
        email:         email || null,
        status:        'lead',
        source:        'Facebook Lead Ad',
        funnel_stage:  'lead',
        custom_fields,
      })
      .select('id')
      .single();

    if (error) { console.error('[fb-leads] Contact insert error:', error); return; }
    contactId = data.id;
    console.log(`[fb-leads] Created contact ${contactId} in account ${account.id}`);
  }

  // 5. Create / advance deal to New Lead stage
  if (account.new_lead_stage_id) {
    const { data: existingDeal } = await supabaseAdmin
      .from('deals')
      .select('id, pipeline_stage_id')
      .eq('account_id', account.id)
      .eq('contact_id', contactId)
      .eq('status', 'open')
      .limit(1)
      .maybeSingle();

    const contactName = [first_name, last_name].filter(Boolean).join(' ') || 'Lead';

    if (!existingDeal) {
      await supabaseAdmin
        .from('deals')
        .insert({
          account_id:        account.id,
          contact_id:        contactId,
          pipeline_id:       account.pipeline_id || null,
          pipeline_stage_id: account.new_lead_stage_id,
          title:             `${contactName} — Facebook Lead Ad`,
          stage:             'New Lead',
          probability:       10,
          status:            'open',
        });
      console.log(`[fb-leads] Created New Lead deal for ${contactId}`);
      // Trigger New Lead workflow (non-blocking)
      triggerDealStageChanged(
        account.id,
        'new',
        contactId,
        '',
        account.new_lead_stage_id,
      ).catch(err => console.error('[fb-leads] workflow trigger error:', err));
    }
  }

  // 6. Funnel event
  void supabaseAdmin
    .from('funnel_events')
    .insert({
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
