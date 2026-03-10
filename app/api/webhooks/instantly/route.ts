import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { triggerAgentRun } from '@/lib/agents/trigger-run';

export const dynamic = 'force-dynamic';

/**
 * POST /api/webhooks/instantly
 *
 * Receives Instantly `reply_received` webhook events.
 * Upserts a lead_conversations row and inserts the inbound message.
 * Instantly requires a fast 200 response — all processing is synchronous but minimal.
 *
 * Register this URL in: Instantly → Settings → Webhooks → reply_received
 * Set INSTANTLY_WEBHOOK_SECRET in .env.local and in Instantly's webhook config.
 */
export async function POST(request: NextRequest) {
  // Verify webhook secret
  const secret = request.headers.get('x-instantly-signature') ||
                 request.headers.get('x-webhook-secret');
  const expectedSecret = process.env.INSTANTLY_WEBHOOK_SECRET;

  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const {
    lead_email,
    campaign_id,
    campaign_name,
    email_account,
    reply_text,
    reply_subject,
    reply_html,
    timestamp,
  } = payload;

  if (!lead_email || !campaign_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    // 1. Look up lead_id by email
    const { data: lead } = await supabaseAdmin
      .from('leads')
      .select('id, timezone')
      .eq('email', lead_email)
      .maybeSingle();

    // 2. Upsert lead_conversations (unique on lead_email + campaign_id)
    const { data: conversation, error: convError } = await supabaseAdmin
      .from('lead_conversations')
      .upsert(
        {
          lead_id: lead?.id ?? null,
          lead_email,
          campaign_id,
          campaign_name: campaign_name ?? null,
          timezone: lead?.timezone ?? null,
          instantly_email_acct: email_account ?? null,
          status: 'needs_reply',
          last_reply_at: timestamp ?? new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'lead_email,campaign_id',
          // On conflict: update status + last_reply_at, preserve existing fields
        }
      )
      .select('id')
      .single();

    if (convError || !conversation) {
      console.error('Conversation upsert error:', convError);
      return NextResponse.json({ error: 'Failed to upsert conversation' }, { status: 500 });
    }

    // 3. Insert inbound message
    const { error: msgError } = await supabaseAdmin
      .from('conversation_messages')
      .insert({
        conversation_id: conversation.id,
        direction: 'inbound',
        content: reply_text ?? '',
        subject: reply_subject ?? null,
        sender_email: lead_email,
        raw_html: reply_html ?? null,
        sent_at: timestamp ?? new Date().toISOString(),
      });

    if (msgError) {
      console.error('Message insert error:', msgError);
      // Don't fail — conversation row was created, this is recoverable
    }

    // Trigger cold email reply agent to classify and respond
    triggerAgentRun('cold-email-replies').catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Instantly webhook error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
