import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateAndSendAI } from '@/lib/ai/generate-and-send';
import { triggerAgentRun } from '@/lib/agents/trigger-run';
import { stopContactWorkflows } from '@/lib/workflow-engine/stop-workflows';
import { classifyIntent } from '@/lib/ai/intent-classifier';
import { maybeSendLeadAlert } from '@/lib/ai/lead-alert';
import { triggerInboundMessage } from '@/lib/workflow-engine/triggers';

// POST /api/webhooks/resend-inbound
// Receives inbound emails from Resend's inbound email routing.
// Configure in Resend dashboard: Domains → your domain → Inbound → Webhook URL
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { from, to, subject, text } = data;

    if (!from || !to) {
      return NextResponse.json({ error: 'Missing from/to' }, { status: 400 });
    }

    // Normalize: extract plain email from "Name <email@domain.com>" format
    const fromEmail = (from.match(/<(.+?)>/) || [null, from])[1]?.toLowerCase().trim();
    const toEmail = (to.match(/<(.+?)>/) || [null, to])[1]?.toLowerCase().trim();

    if (!fromEmail || !toEmail) {
      return NextResponse.json({ error: 'Could not parse email addresses' }, { status: 400 });
    }

    // Find the account whose from_email matches the 'to' address
    const { data: account } = await supabaseAdmin
      .from('accounts')
      .select('id, settings')
      .filter('settings->email_config->>from_email', 'ilike', toEmail)
      .maybeSingle();

    if (!account) {
      console.warn('[resend-inbound] No account found for email:', toEmail);
      return NextResponse.json({ received: true }); // 200 so Resend doesn't retry
    }

    // Find or create contact by email
    let { data: contact } = await supabaseAdmin
      .from('contacts')
      .select('id, ai_enabled')
      .eq('account_id', account.id)
      .eq('email', fromEmail)
      .maybeSingle();

    if (!contact) {
      const namePart = from.includes('<') ? from.split('<')[0].trim() : fromEmail;
      const nameParts = namePart.split(' ');
      const { data: newContact } = await supabaseAdmin
        .from('contacts')
        .insert({
          account_id: account.id,
          email: fromEmail,
          first_name: nameParts[0] || fromEmail,
          last_name: nameParts.slice(1).join(' ') || '',
          status: 'lead',
        })
        .select('id, ai_enabled')
        .single();
      contact = newContact;
    }

    if (!contact) {
      console.error('[resend-inbound] Failed to find/create contact for:', fromEmail);
      return NextResponse.json({ received: true });
    }

    // Classify intent once for the email body
    const intent = await classifyIntent(text || '');

    // Save inbound message
    const { data: savedMsg } = await supabaseAdmin.from('messages').insert({
      account_id: account.id,
      contact_id: contact.id,
      direction: 'inbound',
      type: 'email',
      content: text || '(no text content)',
      from_address: fromEmail,
      to_address: toEmail,
      status: 'received',
      metadata: { subject, intent },
    }).select('id').single();

    // Fire intent-based workflow trigger
    if (savedMsg?.id) {
      triggerInboundMessage(account.id, contact.id, intent, 'email', savedMsg.id)
        .catch(err => console.error('[resend-inbound] intent workflow trigger error:', err));
    }

    // Fire hot lead alert if intent + score warrant it
    maybeSendLeadAlert({
      accountId: account.id,
      contactId: contact.id,
      channel: 'email',
      messageContent: text || '',
      intent,
    }).catch(err => console.error('[resend-inbound] lead-alert error:', err));

    // Stop any running workflow sequences (they replied)
    stopContactWorkflows(account.id, contact.id).catch(err =>
      console.error('[resend-inbound] stop-workflows error:', err)
    );

    // Cancel any pending email follow-up (they replied)
    await supabaseAdmin
      .from('ai_follow_up_queue')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('account_id', account.id)
      .eq('contact_id', contact.id)
      .eq('channel', 'email')
      .eq('status', 'pending');

    // Check AI config: enabled + auto mode + email channel
    const { data: aiConfig } = await supabaseAdmin
      .from('ai_agent_configs')
      .select('enabled, mode, channels')
      .eq('account_id', account.id)
      .single();

    if (
      aiConfig?.enabled &&
      aiConfig?.mode === 'auto' &&
      aiConfig?.channels?.email &&
      contact.ai_enabled !== false
    ) {
      generateAndSendAI({
        accountId: account.id,
        contactId: contact.id,
        channel: 'email',
      }).catch((err) => console.error('[resend-inbound] AI auto-respond error:', err));
    }

    // Trigger client reply agent for any messages not handled by auto-mode
    triggerAgentRun('client-reply').catch(() => {});

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('[resend-inbound] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
