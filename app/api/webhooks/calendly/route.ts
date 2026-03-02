import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import crypto from 'crypto';

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

    return NextResponse.json({ ok: true, matched: true });
  } catch (err) {
    console.error('Calendly webhook error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
