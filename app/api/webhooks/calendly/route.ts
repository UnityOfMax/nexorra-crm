import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import crypto from 'crypto';
import { sendCapiEvent } from '@/lib/meta/capi';
import { updateLeadScore } from '@/lib/ai/lead-scoring';
import { syncActivityToGoogle } from '@/lib/google-calendar/sync';
import { sendPushToUser } from '@/lib/push/send-notification';

export const dynamic = 'force-dynamic';

/**
 * POST /api/webhooks/calendly
 *
 * Receives Calendly `invitee.created` webhook events.
 * Marks the matching lead_conversation as booked.
 *
 * Register this URL in: calendly.com → Integrations → Webhooks → invitee.created
 * Set CALENDLY_WEBHOOK_SECRET in .env.local (Calendly signing key).
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  // Verify Calendly webhook signature
  const signingKey = process.env.CALENDLY_WEBHOOK_SECRET;
  if (signingKey) {
    const signature = request.headers.get('calendly-webhook-signature');
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }
    // Calendly uses: t=timestamp,v1=hmac_sha256
    const parts = Object.fromEntries(
      signature.split(',').map(p => p.split('=') as [string, string])
    );
    const timestamp = parts['t'];
    const expectedSig = crypto
      .createHmac('sha256', signingKey)
      .update(`${timestamp}.${rawBody}`)
      .digest('hex');
    if (parts['v1'] !== expectedSig) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Only handle invitee.created
  if (payload.event !== 'invitee.created') {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const inviteeUri: string = payload.payload?.uri;
  const eventUri: string = payload.payload?.event;

  if (!inviteeUri) {
    return NextResponse.json({ error: 'Missing invitee URI' }, { status: 400 });
  }

  try {
    // Fetch invitee details from Calendly to get their email
    const calendlyRes = await fetch(inviteeUri, {
      headers: {
        Authorization: `Bearer ${process.env.CALENDLY_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!calendlyRes.ok) {
      console.error('Failed to fetch Calendly invitee:', calendlyRes.status);
      return NextResponse.json({ error: 'Failed to fetch invitee' }, { status: 500 });
    }

    const inviteeData = await calendlyRes.json();
    const inviteeEmail: string = inviteeData.resource?.email;

    if (!inviteeEmail) {
      return NextResponse.json({ error: 'No email in invitee data' }, { status: 400 });
    }

    // Find matching conversation by lead email
    const { data: conversation } = await supabaseAdmin
      .from('lead_conversations')
      .select('id')
      .eq('lead_email', inviteeEmail)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!conversation) {
      // Lead booked but no conversation tracked — not an error (could be direct booking)
      console.log('Calendly booking: no conversation found for', inviteeEmail);
      return NextResponse.json({ ok: true, matched: false });
    }

    // Mark as booked
    await supabaseAdmin
      .from('lead_conversations')
      .update({
        status: 'booked',
        calendly_booked: true,
        calendly_event_uri: eventUri ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversation.id);

    // ── Sync to CRM calendar ──
    const agencyAccountId = process.env.NEXORRA_AGENCY_ACCOUNT_ID;
    const agencyUserId = process.env.NEXORRA_AGENCY_USER_ID;

    if (agencyAccountId && agencyUserId && eventUri) {
      try {
        // Fetch event details from Calendly to get start_time and name
        const eventRes = await fetch(eventUri, {
          headers: {
            Authorization: `Bearer ${process.env.CALENDLY_API_KEY}`,
            'Content-Type': 'application/json',
          },
        });

        if (eventRes.ok) {
          const eventData = await eventRes.json();
          const startTime = eventData.resource?.start_time;
          const eventName = eventData.resource?.name || 'Calendly Booking';
          const endTime = eventData.resource?.end_time;

          // Calculate duration
          let durationMinutes = 30; // default
          if (startTime && endTime) {
            durationMinutes = Math.round(
              (new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000
            );
          }

          // Insert activity into CRM calendar
          const { data: calActivity } = await supabaseAdmin.from('activities').insert({
            account_id: agencyAccountId,
            created_by: agencyUserId,
            type: 'meeting',
            subject: `Calendly: ${eventName} - ${inviteeEmail}`,
            due_date: startTime || new Date().toISOString(),
            duration_minutes: durationMinutes,
          }).select('id').single();

          // Sync to Google Calendar
          if (calActivity) {
            syncActivityToGoogle(calActivity.id, agencyAccountId, durationMinutes).catch(err => {
              console.error('[calendly] Google Calendar sync error:', err);
            });
          }

          // Push notification for Calendly booking
          sendPushToUser(agencyUserId, {
            title: '📅 Calendly Booking',
            body: `${inviteeEmail} booked: ${eventName}`,
            tag: 'booking',
            url: '/calendar',
          }).catch(() => {});
        }
      } catch (calErr) {
        // Don't fail the webhook if calendar sync fails
        console.error('Calendly → calendar sync error:', calErr);
      }
    }

    // ── Create pipeline deal for Booked Appointment ──
    const AGENCY_ID = 'da99b768-79dd-48f8-af86-abf95e61a69f';
    ;(async () => {
      try {
        const { data: pipeline } = await supabaseAdmin
          .from('pipelines')
          .select('id')
          .eq('account_id', AGENCY_ID)
          .eq('is_default', true)
          .maybeSingle();
        if (!pipeline) return;

        const { data: stage } = await supabaseAdmin
          .from('pipeline_stages')
          .select('id')
          .eq('pipeline_id', pipeline.id)
          .eq('name', 'Booked Appointment')
          .maybeSingle();
        if (!stage) return;

        const { data: contact } = await supabaseAdmin
          .from('contacts')
          .select('id')
          .eq('account_id', AGENCY_ID)
          .eq('email', inviteeEmail)
          .maybeSingle();

        const inviteeName = (inviteeData.resource?.name as string) || inviteeEmail;
        await supabaseAdmin.from('deals').insert({
          account_id: AGENCY_ID,
          pipeline_id: pipeline.id,
          pipeline_stage_id: stage.id,
          contact_id: contact?.id ?? null,
          title: `${inviteeName} - Discovery Call`,
          value: 5000,
          stage: 'Booked Appointment',
          probability: 40,
          status: 'open',
          custom_fields: { source: 'calendly', calendly_event_uri: eventUri ?? null },
        });
      } catch (dealErr) {
        console.error('[calendly] Pipeline deal creation error:', dealErr);
      }
    })();

    // ── Client sub-account funnel tracking + CAPI ──
    // Search for a contact across all client accounts with this email (non-blocking)
    ;(async () => {
      try {
        const { data: contact } = await supabaseAdmin
          .from('contacts')
          .select('id, account_id, fbc, fbp')
          .eq('email', inviteeEmail)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (contact) {
          // Update funnel stage
          await supabaseAdmin
            .from('contacts')
            .update({ funnel_stage: 'call_booked' })
            .eq('id', contact.id);

          // Insert funnel event
          await supabaseAdmin.from('funnel_events').insert({
            account_id: contact.account_id,
            contact_id: contact.id,
            event_type: 'booking_confirmed',
            channel: 'web',
            metadata: { calendly_event_uri: eventUri || null },
          });

          // CAPI Schedule event
          sendCapiEvent({
            eventName: 'Schedule',
            eventId: crypto.randomUUID(),
            userData: {
              email: inviteeEmail,
              fbc: contact.fbc || undefined,
              fbp: contact.fbp || undefined,
              externalId: contact.id,
            },
            accountId: contact.account_id,
            contactId: contact.id,
          }).catch((err) => console.error('[calendly] CAPI error:', err));

          // Update lead score
          updateLeadScore(contact.id).catch(() => {});
        }
      } catch (err) {
        console.error('[calendly] client contact funnel tracking error:', err);
      }
    })();

    return NextResponse.json({ ok: true, matched: true });
  } catch (err) {
    console.error('Calendly webhook error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
