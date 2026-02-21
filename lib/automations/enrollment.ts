import { supabaseAdmin } from '@/lib/supabase';
import {
  NEW_LEAD_TEMPLATES,
  BOOKING_TEMPLATES,
  BOOKING_SWITCH_SMS,
  NURTURING_TEMPLATES,
  applyTokens,
} from './templates';

const D = 24 * 60 * 60 * 1000;

// ── Types ────────────────────────────────────────────────────

interface EnrollNewLeadParams {
  accountId: string;
  contactId: string;
  contactName: string;
  agentName: string;
}

interface EnrollBookingParams {
  accountId: string;
  contactId: string;
  contactName: string;
  agentName: string;
  callTimeUtc: string;   // ISO string
  callTimeDisplay: string; // human-readable e.g. "Mon, Jan 20 at 3:00 PM"
}

// ── Helpers ──────────────────────────────────────────────────

function buildTokens(params: { contactName: string; agentName: string; callTimeDisplay?: string }) {
  // Use first name only for casual feel
  const firstName = params.contactName.split(' ')[0] || params.contactName;
  return {
    name: firstName,
    agentName: params.agentName,
    callTime: params.callTimeDisplay || '',
  };
}

// ── Enroll new lead ──────────────────────────────────────────

export async function enrollNewLead(params: EnrollNewLeadParams) {
  const { accountId, contactId, contactName, agentName } = params;
  try {
    // Check if already enrolled in an active automation — skip if so
    const { data: existing } = await supabaseAdmin
      .from('automation_enrollments')
      .select('id')
      .eq('account_id', accountId)
      .eq('contact_id', contactId)
      .eq('status', 'active')
      .maybeSingle();

    if (existing) {
      console.log('[automation] Contact already enrolled, skipping new_lead enrollment', contactId);
      return;
    }

    const tokens = buildTokens({ contactName, agentName });
    const now = Date.now();

    // Insert enrollment
    const { data: enrollment, error: enrollError } = await supabaseAdmin
      .from('automation_enrollments')
      .insert({
        account_id: accountId,
        contact_id: contactId,
        automation_id: 'new_lead',
        metadata: { agentName, contactName },
        status: 'active',
      })
      .select('id')
      .single();

    if (enrollError || !enrollment) {
      console.error('[automation] Failed to create new_lead enrollment:', enrollError);
      return;
    }

    // Schedule all messages
    const messages = NEW_LEAD_TEMPLATES.map((t) => ({
      enrollment_id: enrollment.id,
      account_id: accountId,
      contact_id: contactId,
      send_at: new Date(now + t.delayMs).toISOString(),
      type: t.type,
      subject: t.type === 'email' ? applyTokens(t.subject || '', tokens) : null,
      body: t.type === 'nurturing_escalation' ? '__escalate__' : applyTokens(t.body, tokens),
      status: 'pending',
    }));

    const { error: msgError } = await supabaseAdmin
      .from('automation_messages')
      .insert(messages);

    if (msgError) {
      console.error('[automation] Failed to schedule new_lead messages:', msgError);
    } else {
      console.log(`[automation] Enrolled ${contactId} in new_lead (${messages.length} messages)`);
    }
  } catch (err) {
    console.error('[automation] enrollNewLead error:', err);
  }
}

// ── Enroll booking reminders ─────────────────────────────────

export async function enrollBookingReminders(params: EnrollBookingParams) {
  const { accountId, contactId, contactName, agentName, callTimeUtc, callTimeDisplay } = params;
  try {
    const tokens = buildTokens({ contactName, agentName, callTimeDisplay });
    const callTimeMs = new Date(callTimeUtc).getTime();
    const now = Date.now();

    // Check if contact was in new_lead and handle the switch
    const { data: activeEnrollment } = await supabaseAdmin
      .from('automation_enrollments')
      .select('id, automation_id')
      .eq('account_id', accountId)
      .eq('contact_id', contactId)
      .eq('status', 'active')
      .maybeSingle();

    if (activeEnrollment) {
      // Stop the existing enrollment and cancel all pending messages
      await supabaseAdmin
        .from('automation_enrollments')
        .update({ status: 'stopped', updated_at: new Date().toISOString() })
        .eq('id', activeEnrollment.id);

      await supabaseAdmin
        .from('automation_messages')
        .update({ status: 'cancelled' })
        .eq('enrollment_id', activeEnrollment.id)
        .eq('status', 'pending');

      console.log(`[automation] Stopped ${activeEnrollment.automation_id} enrollment for ${contactId} (booking switch)`);
    }

    // Create booking_reminders enrollment
    const { data: enrollment, error: enrollError } = await supabaseAdmin
      .from('automation_enrollments')
      .insert({
        account_id: accountId,
        contact_id: contactId,
        automation_id: 'booking_reminders',
        call_time: callTimeUtc,
        metadata: { agentName, contactName },
        status: 'active',
      })
      .select('id')
      .single();

    if (enrollError || !enrollment) {
      console.error('[automation] Failed to create booking_reminders enrollment:', enrollError);
      return;
    }

    const messages: any[] = [];

    // If switched from new_lead, send the "oh great" switch SMS immediately
    if (activeEnrollment?.automation_id === 'new_lead') {
      messages.push({
        enrollment_id: enrollment.id,
        account_id: accountId,
        contact_id: contactId,
        send_at: new Date(now).toISOString(),
        type: 'sms',
        subject: null,
        body: applyTokens(BOOKING_SWITCH_SMS, tokens),
        status: 'pending',
      });
    }

    // Schedule booking reminder messages (skip ones already in the past)
    for (const t of BOOKING_TEMPLATES) {
      const sendAt = t.isImmediate ? now : callTimeMs + t.offsetMs;

      // Skip past messages (with 30s buffer for immediate sends)
      if (!t.isImmediate && sendAt <= now + 30_000) {
        console.log(`[automation] Skipping past booking step (${t.type}, offset ${t.offsetMs}ms)`);
        continue;
      }

      messages.push({
        enrollment_id: enrollment.id,
        account_id: accountId,
        contact_id: contactId,
        send_at: new Date(sendAt).toISOString(),
        type: t.type,
        subject: t.type === 'email' ? applyTokens(t.subject || '', tokens) : null,
        body: applyTokens(t.body, tokens),
        status: 'pending',
      });
    }

    const { error: msgError } = await supabaseAdmin
      .from('automation_messages')
      .insert(messages);

    if (msgError) {
      console.error('[automation] Failed to schedule booking messages:', msgError);
    } else {
      console.log(`[automation] Enrolled ${contactId} in booking_reminders (${messages.length} messages)`);
    }
  } catch (err) {
    console.error('[automation] enrollBookingReminders error:', err);
  }
}

// ── Stop automation on reply ─────────────────────────────────

export async function stopAutomation(accountId: string, contactId: string) {
  try {
    const { data: enrollment } = await supabaseAdmin
      .from('automation_enrollments')
      .select('id')
      .eq('account_id', accountId)
      .eq('contact_id', contactId)
      .eq('status', 'active')
      .maybeSingle();

    if (!enrollment) return;

    await supabaseAdmin
      .from('automation_enrollments')
      .update({ status: 'stopped', updated_at: new Date().toISOString() })
      .eq('id', enrollment.id);

    await supabaseAdmin
      .from('automation_messages')
      .update({ status: 'cancelled' })
      .eq('enrollment_id', enrollment.id)
      .eq('status', 'pending');

    console.log(`[automation] Stopped automation for ${contactId} (response received)`);
  } catch (err) {
    console.error('[automation] stopAutomation error:', err);
  }
}

// ── Escalate to nurturing ────────────────────────────────────

export async function escalateToNurturing(
  enrollmentId: string,
  accountId: string,
  contactId: string,
  agentName: string,
  contactName: string,
) {
  try {
    // Mark old new_lead enrollment completed
    await supabaseAdmin
      .from('automation_enrollments')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', enrollmentId);

    // Create nurturing enrollment
    const { data: nurturingEnrollment, error: enrollError } = await supabaseAdmin
      .from('automation_enrollments')
      .insert({
        account_id: accountId,
        contact_id: contactId,
        automation_id: 'nurturing',
        metadata: { agentName, contactName },
        status: 'active',
      })
      .select('id')
      .single();

    if (enrollError || !nurturingEnrollment) {
      console.error('[automation] Failed to create nurturing enrollment:', enrollError);
      return;
    }

    const tokens = buildTokens({ contactName, agentName });
    const now = Date.now();

    const messages = NURTURING_TEMPLATES.map((t) => ({
      enrollment_id: nurturingEnrollment.id,
      account_id: accountId,
      contact_id: contactId,
      send_at: new Date(now + t.dayOffset * D).toISOString(),
      type: t.type,
      subject: t.type === 'email' ? applyTokens(t.subject || '', tokens) : null,
      body: applyTokens(t.body, tokens),
      status: 'pending',
    }));

    const { error: msgError } = await supabaseAdmin
      .from('automation_messages')
      .insert(messages);

    if (msgError) {
      console.error('[automation] Failed to schedule nurturing messages:', msgError);
    } else {
      console.log(`[automation] Escalated ${contactId} to nurturing (${messages.length} messages)`);
    }
  } catch (err) {
    console.error('[automation] escalateToNurturing error:', err);
  }
}
