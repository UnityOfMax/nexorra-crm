import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { enrollNewLead } from '@/lib/automations/enrollment';
import { triggerContactCreated } from '@/lib/workflow-engine/triggers';
import { sendPushToAccountOwner } from '@/lib/push/send-notification';
import { normalizePhone, phoneVariants } from '@/lib/utils/phone';

// POST /api/landing-pages/form-submit
// Creates or updates a contact from landing page form submission
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      accountId,
      first_name,
      last_name,
      phone,
      email,
      source,
      custom_fields,
      agentName,
    } = body;

    if (!accountId || (!phone && !email)) {
      return NextResponse.json({ error: 'accountId and phone or email required' }, { status: 400 });
    }

    // Normalize phone to E.164 so lookups match regardless of input format
    const normalizedPhone = phone ? normalizePhone(phone) : null;

    // Check if contact already exists by phone or email
    let existingContact = null;

    if (normalizedPhone) {
      const variants = phoneVariants(phone);
      const orFilter = variants.map((v) => `phone.eq.${v}`).join(',');
      const { data } = await supabaseAdmin
        .from('contacts')
        .select('id, custom_fields')
        .eq('account_id', accountId)
        .or(orFilter)
        .limit(1)
        .maybeSingle();
      existingContact = data;
    }

    if (!existingContact && email) {
      const { data } = await supabaseAdmin
        .from('contacts')
        .select('id, custom_fields')
        .eq('account_id', accountId)
        .eq('email', email)
        .single();
      existingContact = data;
    }

    let contactId: string;

    if (existingContact) {
      // Update existing contact with new info
      const mergedFields = { ...(existingContact.custom_fields || {}), ...(custom_fields || {}) };
      const { error } = await supabaseAdmin
        .from('contacts')
        .update({
          first_name: first_name || undefined,
          last_name: last_name || undefined,
          phone: normalizedPhone || undefined,
          email: email || undefined,
          source: source || 'Landing Page',
          custom_fields: mergedFields,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingContact.id);

      if (error) throw error;
      contactId = existingContact.id;
    } else {
      // Create new contact
      const { data, error } = await supabaseAdmin
        .from('contacts')
        .insert({
          account_id: accountId,
          first_name: first_name || null,
          last_name: last_name || null,
          phone: normalizedPhone || null,
          email: email || null,
          status: 'lead',
          source: source || 'Landing Page',
          custom_fields: custom_fields || {},
        })
        .select('id')
        .single();

      if (error) throw error;
      contactId = data.id;
    }

    // Trigger new lead automation (non-blocking)
    const contactName = [first_name, last_name].filter(Boolean).join(' ') || 'there';
    enrollNewLead({
      accountId,
      contactId,
      contactName,
      agentName: agentName || 'Your Agent',
    }).catch((err) => console.error('[form-submit] automation enrollment error:', err));

    // Trigger custom workflows for new contacts only (non-blocking)
    if (!existingContact) {
      triggerContactCreated(accountId, contactId).catch((err) =>
        console.error('[form-submit] workflow trigger error:', err)
      );

      // Push notification to account owner for new leads (non-blocking)
      sendPushToAccountOwner(accountId, {
        title: '🔥 New Lead',
        body: `${contactName} just submitted a form`,
        tag: 'new-lead',
        url: `/contacts/${contactId}`,
      }).catch((err) => console.error('[form-submit] push notification error:', err));
    }

    return NextResponse.json({ success: true, contactId });
  } catch (error: any) {
    console.error('Form submit error:', error);
    return NextResponse.json({ error: error.message || 'Failed to submit form' }, { status: 500 });
  }
}
