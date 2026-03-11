/**
 * Meta Conversions API (CAPI) client.
 *
 * Sends server-side events to Meta to complement pixel events for better
 * attribution and ad optimization. All PII is SHA256-hashed before transmission.
 *
 * Security: Only hashed data is sent to Meta. No raw contact info, no API keys
 * are ever included in payloads beyond the token in the query string (HTTPS only).
 */

import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';

const PIXEL_ID = process.env.META_DATASET_ID || '954504506917003';
const META_API_VERSION = 'v19.0';
const META_CAPI_URL = `https://graph.facebook.com/${META_API_VERSION}/${PIXEL_ID}/events`;

// ─── Types ───────────────────────────────────────────────────────────────────

export type CapiEventName = 'Lead' | 'Schedule' | 'Contact';

interface CapiUserData {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  fbc?: string;   // Facebook click ID (from ?fbclid= URL param)
  fbp?: string;   // Facebook browser pixel cookie (_fbp)
  externalId?: string; // CRM contact UUID
}

export interface SendCapiEventParams {
  eventName: CapiEventName;
  eventId: string;        // UUID — must match browser fbq eventID for Lead deduplication
  eventTime?: number;     // Unix epoch seconds; defaults to now
  userData: CapiUserData;
  customData?: {
    value?: number;
    currency?: string;
    contentName?: string;
  };
  sourceUrl?: string;
  accountId?: string;
  contactId?: string;
}

// ─── Hashing helpers ─────────────────────────────────────────────────────────

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function hashEmail(email: string): string {
  return sha256(email.toLowerCase().trim());
}

function hashPhone(phone: string): string {
  // Strip all non-digit characters, then hash
  return sha256(phone.replace(/\D/g, ''));
}

function hashName(name: string): string {
  return sha256(name.toLowerCase().trim());
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function sendCapiEvent(params: SendCapiEventParams): Promise<{ success: boolean; error?: string }> {
  const accessToken = process.env.META_ACCESS_TOKEN;
  if (!accessToken) {
    console.warn('[capi] META_ACCESS_TOKEN not configured — skipping CAPI event');
    return { success: false, error: 'META_ACCESS_TOKEN not set' };
  }

  const eventTime = params.eventTime ?? Math.floor(Date.now() / 1000);

  // Build hashed user_data — only include fields that are present
  const user_data: Record<string, string | string[]> = {};
  if (params.userData.email) user_data.em = [hashEmail(params.userData.email)];
  if (params.userData.phone) user_data.ph = [hashPhone(params.userData.phone)];
  if (params.userData.firstName) user_data.fn = [hashName(params.userData.firstName)];
  if (params.userData.lastName) user_data.ln = [hashName(params.userData.lastName)];
  // fbc / fbp are NOT hashed — sent as-is per Meta spec
  if (params.userData.fbc) user_data.fbc = params.userData.fbc;
  if (params.userData.fbp) user_data.fbp = params.userData.fbp;
  // external_id is hashed
  if (params.userData.externalId) user_data.external_id = [sha256(params.userData.externalId)];

  const eventPayload: Record<string, any> = {
    event_name: params.eventName,
    event_time: eventTime,
    event_id: params.eventId,
    action_source: 'website',
    user_data,
  };

  if (params.customData && Object.keys(params.customData).length > 0) {
    const cd: Record<string, any> = {};
    if (params.customData.value !== undefined) cd.value = params.customData.value;
    if (params.customData.currency) cd.currency = params.customData.currency;
    if (params.customData.contentName) cd.content_name = params.customData.contentName;
    eventPayload.custom_data = cd;
  }

  if (params.sourceUrl) {
    eventPayload.event_source_url = params.sourceUrl;
  }

  // Log to meta_events BEFORE calling Meta (record exists even if Meta errors)
  let dbEventId: string | null = null;
  try {
    const { data } = await supabaseAdmin
      .from('meta_events')
      .insert({
        account_id: params.accountId || null,
        contact_id: params.contactId || null,
        event_name: params.eventName,
        event_id: params.eventId,
        event_time: new Date(eventTime * 1000).toISOString(),
        fbc: params.userData.fbc || null,
        fbp: params.userData.fbp || null,
        value: params.customData?.value || null,
        sent_to_meta: false,
      })
      .select('id')
      .single();
    dbEventId = data?.id || null;
  } catch (dbErr: any) {
    // Don't block CAPI send if DB insert fails
    console.error('[capi] DB insert error (non-blocking):', dbErr.message);
  }

  // Send to Meta
  try {
    const body = {
      data: [eventPayload],
    };

    const url = `${META_CAPI_URL}?access_token=${accessToken}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });

    const responseData = await res.json();

    // Update DB record with Meta response
    if (dbEventId) {
      await supabaseAdmin
        .from('meta_events')
        .update({
          sent_to_meta: res.ok,
          meta_response: responseData,
        })
        .eq('id', dbEventId);
    }

    if (!res.ok) {
      const errMsg = responseData?.error?.message || `HTTP ${res.status}`;
      console.error(`[capi] Meta API error for ${params.eventName}:`, errMsg);
      return { success: false, error: errMsg };
    }

    return { success: true };
  } catch (err: any) {
    console.error(`[capi] Network error for ${params.eventName}:`, err.message);

    if (dbEventId) {
      await supabaseAdmin
        .from('meta_events')
        .update({ sent_to_meta: false, meta_response: { error: err.message } })
        .eq('id', dbEventId);
    }

    return { success: false, error: err.message };
  }
}
