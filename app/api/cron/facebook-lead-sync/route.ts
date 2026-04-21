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
 * Facebook Lead Ads Sync
 *
 * Polls Graph API for new lead form submissions across all connected accounts.
 * Runs every 5 minutes via cron.
 *
 * Flow per account:
 *  1. Derive page token from stored user/system token
 *  2. List all active lead forms on the page
 *  3. Fetch leads created since last_sync_at
 *  4. For each new lead: dedup → upsert contact → trigger workflows + automation
 *  5. Update last_sync_at
 *
 * No webhooks needed — leads_retrieval OAuth permission handles authorization.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: integrations, error } = await supabaseAdmin
    .from('facebook_integrations')
    .select('account_id, access_token, page_id, last_sync_at, selected_form_ids, field_mappings')
    .not('page_id', 'is', null);

  if (error) {
    console.error('[fb-lead-sync] DB error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!integrations?.length) {
    return NextResponse.json({ synced: 0, message: 'No connected pages' });
  }

  let totalSynced = 0;

  for (const integration of integrations) {
    try {
      const count = await syncAccountLeads(integration);
      totalSynced += count;
    } catch (err: any) {
      console.error(`[fb-lead-sync] Error for account ${integration.account_id}:`, err.message);
    }
  }

  return NextResponse.json({ synced: totalSynced, accounts: integrations.length });
}

// ─── Per-account sync ─────────────────────────────────────────────────────────

async function syncAccountLeads(integration: {
  account_id: string;
  access_token: string;
  page_id: string;
  last_sync_at: string | null;
  selected_form_ids: string[] | null;
  field_mappings: Record<string, string> | null;
}): Promise<number> {
  const { account_id, access_token, page_id, last_sync_at, selected_form_ids, field_mappings } = integration;

  // 1. Get page-scoped token (works with both user tokens and system user tokens)
  const pageTokenRes = await fetch(
    `https://graph.facebook.com/v21.0/${page_id}?fields=access_token&access_token=${access_token}`
  );
  const pageTokenData = await pageTokenRes.json();

  if (pageTokenData.error || !pageTokenData.access_token) {
    console.error(`[fb-lead-sync] Could not get page token for ${page_id}:`, pageTokenData.error?.message);
    return 0;
  }
  const pageToken = pageTokenData.access_token;

  // 2. Determine which forms to sync
  // If the user has selected specific forms, only sync those.
  // Otherwise fall back to all active forms on the page.
  let formsToSync: Array<{ id: string; name: string }> = [];

  if (selected_form_ids && selected_form_ids.length > 0) {
    // Fetch details for each selected form
    formsToSync = await Promise.all(
      selected_form_ids.map(async (formId) => {
        const r = await fetch(`https://graph.facebook.com/v21.0/${formId}?fields=id,name&access_token=${pageToken}`);
        const d = await r.json();
        return d.error ? null : { id: d.id, name: d.name };
      })
    ).then(results => results.filter(Boolean) as Array<{ id: string; name: string }>);
  } else {
    const formsRes = await fetch(
      `https://graph.facebook.com/v21.0/${page_id}/leadgen_forms?fields=id,name,status&filtering=[{"field":"status","operator":"IN","value":["ACTIVE"]}]&access_token=${pageToken}`
    );
    const formsData = await formsRes.json();
    if (formsData.error || !formsData.data?.length) {
      console.log(`[fb-lead-sync] No active forms for page ${page_id}:`, formsData.error?.message || 'none');
      return 0;
    }
    formsToSync = formsData.data;
  }

  if (!formsToSync.length) return 0;

  // Sync window: last_sync_at (default: 30 min ago for first run)
  const since = last_sync_at
    ? Math.floor(new Date(last_sync_at).getTime() / 1000)
    : Math.floor((Date.now() - 30 * 60 * 1000) / 1000);

  let syncedCount = 0;

  for (const form of formsToSync) {
    const formLeads = await fetchFormLeads(form.id, pageToken, since);

    for (const lead of formLeads) {
      try {
        const processed = await processLead(lead, form, account_id, field_mappings || {});
        if (processed) syncedCount++;
      } catch (err: any) {
        console.error(`[fb-lead-sync] Error processing lead ${lead.id}:`, err.message);
      }
    }
  }

  // 3. Update last_sync_at
  await supabaseAdmin
    .from('facebook_integrations')
    .update({ last_sync_at: new Date().toISOString() })
    .eq('account_id', account_id);

  if (syncedCount > 0) {
    console.log(`[fb-lead-sync] Account ${account_id}: synced ${syncedCount} new leads`);
  }

  return syncedCount;
}

// ─── Graph API: fetch leads from a form since a timestamp ────────────────────

interface GraphLead {
  id: string;
  created_time: string;
  field_data: Array<{ name: string; values: string[] }>;
  ad_id?: string;
  ad_name?: string;
  campaign_id?: string;
  campaign_name?: string;
}

async function fetchFormLeads(formId: string, pageToken: string, since: number): Promise<GraphLead[]> {
  // Use `since` param — the `filtering` array causes OAuthException on the /leads edge
  const url = `https://graph.facebook.com/v21.0/${formId}/leads`
    + `?fields=id,created_time,field_data,ad_id,ad_name,campaign_id,campaign_name`
    + `&since=${since}`
    + `&limit=100`
    + `&access_token=${pageToken}`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.error) {
    console.error(`[fb-lead-sync] Form ${formId} leads error:`, data.error.message);
    return [];
  }

  return data.data || [];
}

// ─── Process a single lead ────────────────────────────────────────────────────

async function processLead(
  lead: GraphLead,
  form: { id: string; name: string },
  accountId: string,
  fieldMappings: Record<string, string> = {}
): Promise<boolean> {
  // Map form fields first so we can use email/phone in dedup checks
  const fields = mapLeadFields(lead.field_data, fieldMappings);
  const normalizedPhone = fields.phone ? normalizePhone(fields.phone) : null;

  // Dedup by Facebook lead ID
  const { data: existingByLeadId } = await supabaseAdmin
    .from('facebook_ad_leads')
    .select('id')
    .eq('facebook_lead_id', lead.id)
    .maybeSingle();

  if (existingByLeadId) return false; // Already processed this exact submission

  // Secondary dedup by email — catches same person re-submitted via a different form
  if (fields.email) {
    const { data: existingByEmail } = await supabaseAdmin
      .from('facebook_ad_leads')
      .select('id')
      .eq('account_id', accountId)
      .eq('email', fields.email)
      .maybeSingle();
    if (existingByEmail) {
      // Record this lead_id so future runs skip it immediately via the primary dedup
      void supabaseAdmin.from('facebook_ad_leads').insert({
        account_id: accountId,
        contact_id: existingByEmail.id,
        facebook_lead_id: lead.id,
        form_id: form.id,
        lead_data: lead.field_data,
        email: fields.email,
        phone: normalizedPhone,
        first_name: fields.first_name || null,
        last_name: fields.last_name || null,
        created_time: lead.created_time,
      });
      return false;
    }
  }

  // Upsert contact (dedup by phone or email)
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

  let contactId: string;

  const customFields = {
    ...fields.custom,
    meta_form_id: form.id,
    meta_form_name: form.name,
    meta_lead_id: lead.id,
    meta_ad_id: lead.ad_id,
    meta_campaign_id: lead.campaign_id,
  };

  if (existingContact) {
    await supabaseAdmin
      .from('contacts')
      .update({
        first_name: fields.first_name || undefined,
        last_name: fields.last_name || undefined,
        phone: normalizedPhone || undefined,
        email: fields.email || undefined,
        source: 'Facebook Lead Ad',
        custom_fields: { ...(existingContact.custom_fields || {}), ...customFields },
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingContact.id);
    contactId = existingContact.id;
  } else {
    const { data, error } = await supabaseAdmin
      .from('contacts')
      .insert({
        account_id: accountId,
        first_name: fields.first_name || null,
        last_name: fields.last_name || null,
        phone: normalizedPhone || null,
        email: fields.email || null,
        status: 'lead',
        source: 'Facebook Lead Ad',
        funnel_stage: 'lead',
        custom_fields: customFields,
      })
      .select('id')
      .single();

    if (error) throw error;
    contactId = data.id;
  }

  // Record in facebook_ad_leads
  await supabaseAdmin.from('facebook_ad_leads').insert({
    account_id: accountId,
    contact_id: contactId,
    facebook_lead_id: lead.id,
    ad_id: lead.ad_id || null,
    ad_name: lead.ad_name || null,
    campaign_id: lead.campaign_id || null,
    campaign_name: lead.campaign_name || null,
    form_id: form.id,
    lead_data: lead.field_data,
    email: fields.email || null,
    phone: normalizedPhone || null,
    first_name: fields.first_name || null,
    last_name: fields.last_name || null,
    created_time: lead.created_time,
  });

  const contactName = [fields.first_name, fields.last_name].filter(Boolean).join(' ') || 'there';

  // CAPI Lead event (non-blocking)
  sendCapiEvent({
    eventName: 'Lead',
    eventId: crypto.randomUUID(),
    userData: {
      email: fields.email || undefined,
      phone: normalizedPhone || undefined,
      firstName: fields.first_name || undefined,
      lastName: fields.last_name || undefined,
      externalId: contactId,
    },
    accountId,
    contactId,
  }).catch(() => {});

  // Funnel event (non-blocking)
  void supabaseAdmin.from('funnel_events').insert({
    account_id: accountId,
    contact_id: contactId,
    event_type: 'form_submit',
    channel: 'meta',
    metadata: { source: 'lead_ad', form_id: form.id, ad_id: lead.ad_id, lead_id: lead.id },
  });

  updateLeadScore(contactId).catch(() => {});

  // Automation enrollment (non-blocking)
  enrollNewLead({ accountId, contactId, contactName, agentName: 'Your Agent' }).catch(() => {});

  // Workflow trigger + push — new contacts only (non-blocking)
  if (!existingContact) {
    triggerContactCreated(accountId, contactId).catch(() => {});
    sendPushToAccountOwnerIfEnabled(accountId, 'new_leads', {
      title: '🔥 New Lead',
      body: `${contactName} submitted a Facebook lead form`,
      tag: 'new-lead',
      url: `/contacts/${contactId}`,
    }).catch(() => {});
  }

  return true;
}

// ─── Field mapping ────────────────────────────────────────────────────────────

interface MappedFields {
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
  custom: Record<string, string>;
}

/**
 * Map Meta lead form field_data to contact fields.
 * fieldMappings: { questionKey -> crmField } from user configuration.
 * crmField is either a top-level field ('first_name', 'email', etc.)
 * or a custom field prefixed with 'custom:' ('custom:address').
 */
function mapLeadFields(
  fieldData: Array<{ name: string; values: string[] }>,
  fieldMappings: Record<string, string> = {}
): MappedFields {
  const result: MappedFields = { custom: {} };

  for (const field of fieldData) {
    const value = field.values?.[0] || '';
    if (!value) continue;

    const key = field.name.toLowerCase();

    // Check if user has mapped this question to a specific CRM field
    const userMapping = fieldMappings[field.name] || fieldMappings[key];
    if (userMapping) {
      if (userMapping.startsWith('custom:')) {
        result.custom[userMapping.slice(7)] = value;
      } else {
        (result as any)[userMapping] = value;
      }
      continue;
    }

    // Standard auto-mapping for common field names
    switch (key) {
      case 'first_name':
        result.first_name = value;
        break;
      case 'last_name':
        result.last_name = value;
        break;
      case 'full_name': {
        const parts = value.trim().split(/\s+/);
        result.first_name = result.first_name || parts[0];
        result.last_name = result.last_name || (parts.length > 1 ? parts.slice(1).join(' ') : undefined);
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
        // Unmapped custom questions go into custom_fields by their key
        result.custom[field.name] = value;
    }
  }

  return result;
}
