import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

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
    const { data: accounts } = await supabaseAdmin
      .from('accounts')
      .select('id, settings');

    const account = accounts?.find(
      (acc) => acc.settings?.email_config?.from_email?.toLowerCase() === toEmail
    );

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

    // Save inbound message
    await supabaseAdmin.from('messages').insert({
      account_id: account.id,
      contact_id: contact.id,
      direction: 'inbound',
      type: 'email',
      content: text || '(no text content)',
      from_address: fromEmail,
      to_address: toEmail,
      status: 'received',
      metadata: { subject },
    });

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
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.ainexorra.com';
      fetch(`${baseUrl}/api/ai/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: account.id,
          contactId: contact.id,
          channel: 'email',
        }),
      }).catch((err) => console.error('[resend-inbound] AI auto-respond error:', err));
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('[resend-inbound] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
