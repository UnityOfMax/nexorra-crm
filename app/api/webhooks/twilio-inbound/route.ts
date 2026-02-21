import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { stopAutomation } from '@/lib/automations/enrollment';

// Twilio sends form-encoded POST with From, Body, etc.
export async function POST(req: NextRequest) {
  let from: string | null = null;
  try {
    const form = await req.formData();
    from = (form.get('From') as string | null) ?? null;
  } catch {
    // fallback: try text body
    const text = await req.text();
    const params = new URLSearchParams(text);
    from = params.get('From');
  }

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
