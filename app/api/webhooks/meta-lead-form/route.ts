export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { enrollNewLead } from '@/lib/automations/enrollment';
import { triggerContactCreated } from '@/lib/workflow-engine/triggers';
import { sendPushToAccountOwnerIfEnabled } from '@/lib/push/send-notification';
import { normalizePhone, phoneVariants } from '@/lib/utils/phone';
import { sendCapiEvent } from '@/lib/meta/capi';
import { updateLeadScore } from '@/lib/ai/lead-scoring';

/**
 * Meta Lead Form Webhook
 *
 * Receives real-time lead form submission notifications from Meta.
 * Fetches full lead data from Graph API, creates/updates contact,
 * and triggers the same workflow + automation pipeline as landing page form submissions.
 *
 * Setup in Meta Business Suite:
 * 1. Go to Business Settings → Integrations → Webhooks
 * 2. Subscribe to: Page → leadgen field
 * 3. Callback URL: https://app.ainexorra.com/api/webhooks/meta-lead-form
 * 4. Verify token: value of CRON_SECRET in .env.local
 * 5. In each client's account settings, save their Meta Page ID
 */

// GET — Webhook verification (Meta sends this once on setup)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode      = searchParams.get('hub.mode');
  const token     = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.META_LEAD_FORM_VERIFY_TOKEN || process.env.CRON_SECRET;

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('[meta-lead-form] Webhook verification successful');
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

// POST — Incoming lead form submission
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Meta sends { object: 'page', entry: [{ id, changes: [{ field: 'leadgen', value: {...} }] }] }
    if (body.object !== 'page') {
      return NextResponse.json({ received: true });
    }

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== 'leadgen') continue;

        const { leadgen_id, page_id, form_id, ad_id } = change.value || {};
        if (!leadgen_id || !page_id) continue;

        await processLeadFormSubmission({ leadgen_id, page_id, form_id, ad_id });
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('[meta-lead-form] POST error:', err.message);
    // Always return 200 to Meta — otherwise it retries aggressively
    return NextResponse.json({ received: true });
  }
}

// ─── Core processing ──────────────────────────────────────────────────────────

async function processLeadFormSubmission({
  leadgen_id,
  page_id,
  form_id,
  ad_id,
}: {
  leadgen_id: string;
  page_id: string;
  form_id?: string;
  ad_id?: string;
}) {
  // 1. Look up which account owns this Meta page
  const { data: account } = await supabaseAdmin
    .from('accounts')
    .select('id, name')
    .eq('meta_page_id', page_id)
    .maybeSingle();

  if (!account) {
    console.warn(`[meta-lead-form] No account found for page_id ${page_id} — configure it in account settings`);
    return;
  }

  const accountId = account.id;

  // 2. Fetch lead form data from Meta Graph API
  const accessToken = process.env.META_ACCESS_TOKEN;
  if (!accessToken) {
    console.error('[meta-lead-form] META_ACCESS_TOKEN not set');
    return;
  }

  const graphRes = await fetch(
    `https://graph.facebook.com/v19.0/${leadgen_id}?fields=field_data,created_time,ad_id,form_id&access_token=${accessToken}`
  );
  if (!graphRes.ok) {
    const err = await graphRes.text();
    console.error(`[meta-lead-form] Graph API error for lead ${leadgen_id}:`, err);
    return;
  }

  const leadData = await graphRes.json();
  const fieldData: Array<{ name: string; values: string[] }> = leadData.field_data || [];

  // 3. Map standard Meta lead form fields to contact fields
  const fields = mapLeadFormFields(fieldData);

  const normalizedPhone = fields.phone ? normalizePhone(fields.phone) : null;

  // 4. Dedup: check for existing contact by phone or email
  let existingContact: { id: string; custom_fields: Record<string, any> } | null = null;

  if (normalizedPhone) {
    const variants = phoneVariants(fields.phone!);
    const orFilter = variants.map((v) => `phone.eq.${v}`).join(',');
    const { data } = await supabaseAdmin
      .from('contacts')
      .select('id, custom_fields')
      .eq('account_id', accountId)
      .or(orFilter)
      .limit(1)
      .maybeSingle();
    existingContact = data;
  }

  if (!existingContact && fields.email) {
    const { data } = await supabaseAdmin
      .from('contacts')
      .select('id, custom_fields')
      .eq('account_id', accountId)
      .eq('email', fields.email)
      .maybeSingle();
    existingContact = data;
  }

  // 5. Create or update contact
  let contactId: string;

  const customFields: Record<string, any> = { ...fields.custom };
  if (form_id)  customFields.meta_form_id  = form_id;
  if (ad_id)    customFields.meta_ad_id    = ad_id;
  if (leadgen_id) customFields.meta_leadgen_id = leadgen_id;

  if (existingContact) {
    const mergedFields = { ...(existingContact.custom_fields || {}), ...customFields };
    const { error } = await supabaseAdmin
      .from('contacts')
      .update({
        first_name: fields.first_name || undefined,
        last_name:  fields.last_name  || undefined,
        phone:      normalizedPhone   || undefined,
        email:      fields.email      || undefined,
        source:     'Meta Lead Form',
        custom_fields: mergedFields,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingContact.id);

    if (error) throw error;
    contactId = existingContact.id;
  } else {
    const { data, error } = await supabaseAdmin
      .from('contacts')
      .insert({
        account_id:   accountId,
        first_name:   fields.first_name || null,
        last_name:    fields.last_name  || null,
        phone:        normalizedPhone   || null,
        email:        fields.email      || null,
        status:       'lead',
        source:       'Meta Lead Form',
        funnel_stage: 'lead',
        custom_fields: customFields,
      })
      .select('id')
      .single();

    if (error) throw error;
    contactId = data.id;
  }

  const contactName = [fields.first_name, fields.last_name].filter(Boolean).join(' ') || 'there';
  console.log(`[meta-lead-form] ${existingContact ? 'Updated' : 'Created'} contact ${contactId} (${contactName}) for account ${account.name}`);

  // 6. CAPI Lead event (non-blocking)
  sendCapiEvent({
    eventName: 'Lead',
    eventId: crypto.randomUUID(),
    userData: {
      email:      fields.email      || undefined,
      phone:      normalizedPhone   || undefined,
      firstName:  fields.first_name || undefined,
      lastName:   fields.last_name  || undefined,
      externalId: contactId,
    },
    accountId,
    contactId,
  }).catch((err) => console.error('[meta-lead-form] CAPI error:', err));

  // 7. Funnel event (non-blocking)
  void supabaseAdmin.from('funnel_events').insert({
    account_id:  accountId,
    contact_id:  contactId,
    event_type:  'form_submit',
    channel:     'meta',
    metadata:    { source: 'lead_form', form_id, ad_id, leadgen_id },
  });

  // 8. Lead score (non-blocking)
  updateLeadScore(contactId).catch((err) =>
    console.error('[meta-lead-form] lead score error:', err)
  );

  // 9. Automation enrollment (non-blocking)
  enrollNewLead({
    accountId,
    contactId,
    contactName,
    agentName: 'Your Agent',
  }).catch((err) => console.error('[meta-lead-form] enrollment error:', err));

  // 10. Workflow trigger + push — new contacts only (non-blocking)
  if (!existingContact) {
    triggerContactCreated(accountId, contactId).catch((err) =>
      console.error('[meta-lead-form] workflow trigger error:', err)
    );

    sendPushToAccountOwnerIfEnabled(accountId, 'new_leads', {
      title: '🔥 New Lead',
      body:  `${contactName} submitted a Meta lead form`,
      tag:   'new-lead',
      url:   `/contacts/${contactId}`,
    }).catch((err) => console.error('[meta-lead-form] push error:', err));
  }
}

// ─── Field mapping ────────────────────────────────────────────────────────────

interface MappedFields {
  first_name?: string;
  last_name?:  string;
  phone?:      string;
  email?:      string;
  custom:      Record<string, string>;
}

/**
 * Map Meta lead form field_data to contact fields.
 * Standard field names: https://developers.facebook.com/docs/marketing-api/guides/lead-ads/create
 */
function mapLeadFormFields(fieldData: Array<{ name: string; values: string[] }>): MappedFields {
  const result: MappedFields = { custom: {} };

  for (const field of fieldData) {
    const value = field.values?.[0] || '';
    if (!value) continue;

    switch (field.name.toLowerCase()) {
      case 'first_name':
        result.first_name = value;
        break;
      case 'last_name':
        result.last_name = value;
        break;
      case 'full_name': {
        const parts = value.trim().split(/\s+/);
        result.first_name = result.first_name || parts[0];
        result.last_name  = result.last_name  || (parts.length > 1 ? parts.slice(1).join(' ') : undefined);
        break;
      }
      case 'phone_number':
      case 'phone':
        result.phone = value;
        break;
      case 'email':
        result.email = value;
        break;
      default:
        // All other questions (custom fields) go into custom_fields
        result.custom[field.name] = value;
    }
  }

  return result;
}
