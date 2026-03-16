import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { stopAutomation } from '@/lib/automations/enrollment';
import { triggerAgentRun } from '@/lib/agents/trigger-run';
import { sendPushToAccountOwnerIfEnabled } from '@/lib/push/send-notification';
import twilio from 'twilio';

// Twilio sends form-encoded POST with From, Body, etc.
export async function POST(req: NextRequest) {
  // Read body once as text so we can both validate and parse
  const rawBody = await req.text();
  const params = new URLSearchParams(rawBody);
  const paramsObj: Record<string, string> = {};
  params.forEach((value, key) => { paramsObj[key] = value; });

  // Validate Twilio signature using the global auth token
  const globalAuthToken = process.env.TWILIO_AUTH_TOKEN;
  if (globalAuthToken) {
    const twilioSignature = req.headers.get('X-Twilio-Signature') || '';
    const isValid = twilio.validateRequest(globalAuthToken, twilioSignature, req.url, paramsObj);
    if (!isValid) {
      console.error('[twilio-inbound] Invalid Twilio signature');
      return new NextResponse('Forbidden', { status: 403 });
    }
  }

  const from = paramsObj['From'] ?? null;
  const body = paramsObj['Body'] ?? '';
  const toPhone = paramsObj['To'] ?? null;

  if (from) {
    // Normalize: strip non-digits, then match E.164 variants
    const digits = from.replace(/\D/g, '');

    // Find contact with this phone number across all accounts
    const { data: contacts } = await supabaseAdmin
      .from('contacts')
      .select('id, account_id, phone')
      .or(`phone.eq.${from},phone.eq.+${digits},phone.eq.${digits}`)
      .limit(10);

    if (contacts && contacts.length > 0) {
      await Promise.allSettled(
        contacts.map(c => stopAutomation(c.account_id, c.id))
      );
      // Save inbound SMS to messages table for each matched contact
      for (const c of contacts) {
        void supabaseAdmin.from('messages').insert({
          account_id: c.account_id,
          contact_id: c.id,
          direction: 'inbound',
          type: 'sms',
          content: body,
          from_address: from,
          to_address: toPhone,
          status: 'received',
        });
      }
      // Push notification to account owner for inbound SMS
      if (contacts.length > 0) {
        const first = contacts[0];
        sendPushToAccountOwnerIfEnabled(first.account_id, 'new_texts', {
          title: '💬 New SMS',
          body: `${from}: ${body.substring(0, 100)}`,
          tag: 'inbound-sms',
          url: `/contacts/${first.id}`,
        }).catch(() => {});
      }

      // Trigger client reply agent to handle this inbound SMS
      triggerAgentRun('client-reply').catch(() => {});
    }
  }

  // Always return valid TwiML — no reply
  return new NextResponse('<Response/>', {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  });
}
