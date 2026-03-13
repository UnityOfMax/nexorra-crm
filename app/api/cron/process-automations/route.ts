import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { escalateToNurturing } from '@/lib/automations/enrollment';
import { twilioClient } from '@/lib/twilio/client';
import { resendClient } from '@/lib/resend/client';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// GET /api/cron/process-automations
// Runs every minute via Vercel Cron.
// Sends pending automation_messages whose send_at has passed.
export async function GET(request: NextRequest) {
  try {
    // Auth check
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[CRON automations] Processing...');

    // Fetch up to 50 pending messages due now
    const { data: messages, error: fetchError } = await supabaseAdmin
      .from('automation_messages')
      .select('*')
      .eq('status', 'pending')
      .lte('send_at', new Date().toISOString())
      .order('send_at', { ascending: true })
      .limit(50);

    if (fetchError) {
      console.error('[CRON automations] Fetch error:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!messages || messages.length === 0) {
      return NextResponse.json({ success: true, processed: 0 });
    }

    let processed = 0;

    for (const msg of messages) {
      try {
        // Check enrollment is still active
        const { data: enrollment } = await supabaseAdmin
          .from('automation_enrollments')
          .select('id, status, metadata, automation_id')
          .eq('id', msg.enrollment_id)
          .maybeSingle();

        if (!enrollment || enrollment.status !== 'active') {
          // Enrollment stopped — cancel this message
          await supabaseAdmin
            .from('automation_messages')
            .update({ status: 'cancelled' })
            .eq('id', msg.id);
          continue;
        }

        // ── Nurturing escalation ─────────────────────────────
        if (msg.type === 'nurturing_escalation') {
          await escalateToNurturing(
            enrollment.id,
            msg.account_id,
            msg.contact_id,
            enrollment.metadata?.agentName || 'Your Agent',
            enrollment.metadata?.contactName || '',
          );
          await supabaseAdmin
            .from('automation_messages')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .eq('id', msg.id);
          processed++;
          continue;
        }

        // ── Load contact ─────────────────────────────────────
        const { data: contact } = await supabaseAdmin
          .from('contacts')
          .select('phone, email, first_name, last_name')
          .eq('id', msg.contact_id)
          .maybeSingle();

        if (!contact) {
          await markFailed(msg.id, 'Contact not found');
          continue;
        }

        // ── Load account settings ────────────────────────────
        const { data: account } = await supabaseAdmin
          .from('accounts')
          .select('settings')
          .eq('id', msg.account_id)
          .maybeSingle();

        const settings = account?.settings || {};

        // ── Send SMS ─────────────────────────────────────────
        if (msg.type === 'sms') {
          const toPhone = contact.phone;
          if (!toPhone) {
            await markFailed(msg.id, 'Contact has no phone number');
            continue;
          }

          // Flat key first, nested as fallback (Settings saves flat; legacy configs may use nested)
          const fromPhone = settings?.twilio_phone_number || settings?.sms_config?.twilio_phone_number;
          if (!fromPhone) {
            await markFailed(msg.id, 'Account has no Twilio phone number configured');
            continue;
          }

          if (!twilioClient) {
            await markFailed(msg.id, 'Twilio credentials not configured');
            continue;
          }

          try {
            await twilioClient.messages.create({
              body: msg.body,
              from: fromPhone,
              to: toPhone,
            });
            await supabaseAdmin
              .from('automation_messages')
              .update({ status: 'sent', sent_at: new Date().toISOString() })
              .eq('id', msg.id);
            void supabaseAdmin.from('messages').insert({
              account_id: msg.account_id,
              contact_id: msg.contact_id,
              direction: 'outbound',
              type: 'sms',
              content: msg.body,
              from_address: fromPhone,
              to_address: toPhone,
              status: 'sent',
            });
            console.log(`[CRON automations] SMS sent to ${toPhone}`);
            processed++;
          } catch (smsErr: any) {
            await markFailed(msg.id, smsErr.message || 'Twilio error');
          }
        }

        // ── Send Email ───────────────────────────────────────
        if (msg.type === 'email') {
          const toEmail = contact.email;
          if (!toEmail) {
            await markFailed(msg.id, 'Contact has no email address');
            continue;
          }

          if (!resendClient) {
            await markFailed(msg.id, 'Resend API key not configured');
            continue;
          }

          // Flat key first (set by Settings + agency clients route), nested as fallback
          const fromEmail = settings?.from_email || settings?.email_config?.from_email || 'noreply@contact.ourlimitedoffer.com';
          const fromName = settings?.from_name || settings?.email_config?.from_name || enrollment.metadata?.agentName || 'Your Agent';

          try {
            await resendClient.emails.send({
              from: `${fromName} <${fromEmail}>`,
              to: [toEmail],
              subject: msg.subject || '(no subject)',
              text: msg.body,
              html: `<div style="font-family:sans-serif;font-size:15px;line-height:1.7;color:#111827;max-width:560px;">${msg.body.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>')}</div>`,
            });
            await supabaseAdmin
              .from('automation_messages')
              .update({ status: 'sent', sent_at: new Date().toISOString() })
              .eq('id', msg.id);
            void supabaseAdmin.from('messages').insert({
              account_id: msg.account_id,
              contact_id: msg.contact_id,
              direction: 'outbound',
              type: 'email',
              content: msg.body,
              from_address: fromEmail,
              to_address: toEmail,
              status: 'sent',
              metadata: msg.subject ? { subject: msg.subject } : {},
            });
            console.log(`[CRON automations] Email sent to ${toEmail}`);
            processed++;
          } catch (emailErr: any) {
            await markFailed(msg.id, emailErr.message || 'Resend error');
          }
        }
      } catch (msgErr: any) {
        console.error(`[CRON automations] Error processing message ${msg.id}:`, msgErr);
        await markFailed(msg.id, msgErr.message || 'Unknown error');
      }
    }

    console.log(`[CRON automations] Done. Processed: ${processed}/${messages.length}`);
    return NextResponse.json({ success: true, processed, timestamp: new Date().toISOString() });
  } catch (error: any) {
    console.error('[CRON automations] Unexpected error:', error);
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}

async function markFailed(messageId: string, error: string) {
  console.warn(`[CRON automations] Message ${messageId} failed: ${error}`);
  await supabaseAdmin
    .from('automation_messages')
    .update({ status: 'failed', error, sent_at: new Date().toISOString() })
    .eq('id', messageId);
}
