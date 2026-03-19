import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { triggerAgentRun } from '@/lib/agents/trigger-run';

export const dynamic = 'force-dynamic';

/**
 * POST /api/webhooks/instantly
 *
 * Receives Instantly `reply_received` webhook events.
 * Handles multiple payload formats (v1 flat, v2 nested, event wrapper).
 */
export async function POST(request: NextRequest) {
  let raw: any;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Log raw payload for debugging
  console.log('[instantly-webhook] Raw payload:', JSON.stringify(raw).slice(0, 2000));

  // Normalize: Instantly may wrap in { event_type, data } or send flat
  const payload = raw.data || raw;

  // Extract fields — try multiple field name conventions
  const lead_email = payload.lead_email || payload.email || payload.from_email ||
    payload.reply_from || payload.lead?.email || null;
  const campaign_id = payload.campaign_id || payload.campaign?.id || null;
  const campaign_name = payload.campaign_name || payload.campaign?.name || null;
  const email_account = payload.email_account || payload.sending_account ||
    payload.from_account || payload.account_email || null;
  const reply_text = payload.reply_text || payload.text || payload.body ||
    payload.email_body || payload.message || '';
  const reply_subject = payload.reply_subject || payload.subject || null;
  const reply_html = payload.reply_html || payload.html || payload.body_html || null;
  const timestamp = payload.timestamp || payload.reply_timestamp ||
    payload.received_at || payload.created_at || new Date().toISOString();

  if (!lead_email) {
    console.error('[instantly-webhook] No lead_email found in payload:', JSON.stringify(raw).slice(0, 500));
    // Still return 200 to prevent Instantly from retrying — log the payload for manual review
    void supabaseAdmin.from('conversation_messages').insert({
      conversation_id: null,
      direction: 'inbound',
      content: `[UNMATCHED WEBHOOK] ${JSON.stringify(raw).slice(0, 4000)}`,
      subject: 'Instantly webhook — missing lead_email',
      sender_email: 'system@instantly.ai',
      sent_at: new Date().toISOString(),
    }).then(() => {}, () => {});
    return NextResponse.json({ ok: true, warning: 'no lead_email found' });
  }

  try {
    // 1. Look up lead_id by email
    const { data: lead } = await supabaseAdmin
      .from('leads')
      .select('id, timezone')
      .eq('email', lead_email)
      .maybeSingle();

    // 2. Upsert lead_conversations
    // If no campaign_id, use a fallback so the unique constraint still works
    const effectiveCampaignId = campaign_id || 'unknown';

    const { data: conversation, error: convError } = await supabaseAdmin
      .from('lead_conversations')
      .upsert(
        {
          lead_id: lead?.id ?? null,
          lead_email,
          campaign_id: effectiveCampaignId,
          campaign_name: campaign_name ?? null,
          timezone: lead?.timezone ?? null,
          instantly_email_acct: email_account ?? null,
          status: 'needs_reply',
          last_reply_at: timestamp,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'lead_email,campaign_id' }
      )
      .select('id')
      .single();

    if (convError || !conversation) {
      console.error('[instantly-webhook] Conversation upsert error:', convError);
      return NextResponse.json({ error: 'Failed to upsert conversation' }, { status: 500 });
    }

    // 3. Insert inbound message
    const { error: msgError } = await supabaseAdmin
      .from('conversation_messages')
      .insert({
        conversation_id: conversation.id,
        direction: 'inbound',
        content: reply_text,
        subject: reply_subject,
        sender_email: lead_email,
        raw_html: reply_html,
        sent_at: timestamp,
      });

    if (msgError) {
      console.error('[instantly-webhook] Message insert error:', msgError);
    }

    console.log(`[instantly-webhook] Processed reply from ${lead_email} (conv: ${conversation.id})`);

    // Trigger cold email reply agent
    triggerAgentRun('cold-email-replies').catch(() => {});

    return NextResponse.json({ ok: true, conversation_id: conversation.id });
  } catch (err: any) {
    console.error('[instantly-webhook] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
