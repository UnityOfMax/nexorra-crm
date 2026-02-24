import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { stopAutomation } from '@/lib/automations/enrollment';
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
    }
  }

  // Always return valid TwiML — no reply
  return new NextResponse('<Response/>', {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  });
}
