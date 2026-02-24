import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { twilio } from '@/lib/twilio/client';
import { normalizePhone, phoneVariants } from '@/lib/utils/phone';
import { stopAutomation } from '@/lib/automations/enrollment';

const DEBUG = process.env.NODE_ENV === 'development';

export async function POST(request: NextRequest) {
  if (DEBUG) console.log('=== WEBHOOK CALLED ===', new Date().toISOString());

  try {
    const formData = await request.formData();
    if (DEBUG) console.log('Form Data received:', Object.fromEntries(formData.entries()));

    const rawFrom = formData.get('From') as string;
    const to = formData.get('To') as string;
    const body = formData.get('Body') as string;
    const messageSid = formData.get('MessageSid') as string;

    if (!rawFrom || !to || !body) {
      console.error('Missing required fields:', { from: rawFrom, to, body });
      return new NextResponse('Missing required fields', { status: 400 });
    }

    const from = normalizePhone(rawFrom);
    if (DEBUG) console.log('Parsed data:', { rawFrom, from, to, body, messageSid });

    // Find the account that has this Twilio number selected
    const { data: account, error: accountsError } = await supabaseAdmin
      .from('accounts')
      .select('id, settings')
      .filter('settings->>twilio_phone_number', 'eq', to)
      .maybeSingle();

    if (accountsError) {
      console.error('Accounts query error:', accountsError);
    }

    if (!account) {
      console.error('No account found for Twilio number:', to);
      return new NextResponse('Account not found for this number', { status: 404 });
    }

    if (DEBUG) console.log('Found account:', account.id);

    // Validate Twilio signature (skip in local development — request.url
    // doesn't match the public tunnel URL Twilio used to compute the signature)
    if (!DEBUG) {
      const twilioSignature = request.headers.get('X-Twilio-Signature') || '';
      const authToken =
        account.settings?.sms_config?.twilio_auth_token ||
        process.env.TWILIO_AUTH_TOKEN ||
        '';

      if (authToken) {
        const fullUrl = request.url;
        const params: Record<string, string> = {};
        formData.forEach((value, key) => {
          params[key] = value as string;
        });

        const isValid = twilio.validateRequest(authToken, twilioSignature, fullUrl, params);
        if (!isValid) {
          console.error('[sms/webhook] Invalid Twilio signature');
          return new NextResponse('Forbidden', { status: 403 });
        }
      }
    }

    // Find contact by phone — fuzzy match to handle format differences
    const variants = phoneVariants(rawFrom);
    const orFilter = variants.map((v) => `phone.eq.${v}`).join(',');

    if (DEBUG) console.log('Looking for contact with phone variants:', variants);

    let { data: contact } = await supabaseAdmin
      .from('contacts')
      .select('id, phone')
      .eq('account_id', account.id)
      .or(orFilter)
      .limit(1)
      .maybeSingle();

    if (DEBUG) console.log('Contact query result:', contact);

    if (contact) {
      // Normalize the stored phone to E.164 if it isn't already
      if (contact.phone !== from) {
        await supabaseAdmin
          .from('contacts')
          .update({ phone: from, updated_at: new Date().toISOString() })
          .eq('id', contact.id);
        if (DEBUG) console.log('Normalized contact phone from', contact.phone, 'to', from);
      }
    } else {
      if (DEBUG) console.log('Creating new contact for:', from);
      const { data: newContact, error: createError } = await supabaseAdmin
        .from('contacts')
        .insert({
          account_id: account.id,
          phone: from,
          first_name: from,
          status: 'lead',
        })
        .select('id, phone')
        .single();

      if (createError) {
        console.error('Error creating contact:', createError);
      }
      contact = newContact;
    }

    if (!contact) {
      console.error('Failed to find or create contact');
      return new NextResponse('Failed to create contact', { status: 500 });
    }

    if (DEBUG) console.log('Contact ID:', contact.id);

    // Save incoming message
    const { error: messageError } = await supabaseAdmin
      .from('messages')
      .insert({
        account_id: account.id,
        contact_id: contact.id,
        direction: 'inbound',
        type: 'sms',
        content: body,
        from_address: from,
        to_address: to,
        status: 'received',
        external_id: messageSid,
      });

    if (messageError) {
      console.error('Error saving message:', messageError);
      return new NextResponse('Error saving message: ' + messageError.message, { status: 500 });
    }

    if (DEBUG) console.log('Message saved successfully');

    // Log as activity
    const { data: ownerMember } = await supabaseAdmin
      .from('account_members')
      .select('user_id')
      .eq('account_id', account.id)
      .eq('role', 'owner')
      .single();

    if (ownerMember?.user_id) {
      const { error: activityError } = await supabaseAdmin.from('activities').insert({
        account_id: account.id,
        contact_id: contact.id,
        type: 'sms',
        subject: `SMS from ${from}`,
        description: body,
        completed: true,
        created_by: ownerMember.user_id,
      });
      if (activityError) console.error('Activity error:', activityError);
    }

    // Stop active automations for this contact (they replied)
    stopAutomation(account.id, contact.id).catch((err: unknown) =>
      console.error('[webhook] stopAutomation error:', err)
    );

    // Cancel pending AI follow-ups
    supabaseAdmin
      .from('ai_follow_up_queue')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('account_id', account.id)
      .eq('contact_id', contact.id)
      .eq('channel', 'sms')
      .eq('status', 'pending')
      .then(({ error }) => {
        if (error) console.error('[webhook] cancel follow-up error:', error);
      });

    if (DEBUG) console.log('=== WEBHOOK COMPLETED SUCCESSFULLY ===');

    // Debounced AI auto-respond: batch messages within 15-second window
    const { data: aiConfig } = await supabaseAdmin
      .from('ai_agent_configs')
      .select('enabled, mode, channels')
      .eq('account_id', account.id)
      .single();

    if (aiConfig?.enabled && aiConfig?.mode === 'auto' && aiConfig?.channels?.sms) {
      const processAfter = new Date(Date.now() + 15_000).toISOString();
      const newMsg = { body, received_at: new Date().toISOString() };

      const { data: existing } = await supabaseAdmin
        .from('ai_sms_batches')
        .select('id, messages')
        .eq('account_id', account.id)
        .eq('contact_id', contact.id)
        .eq('status', 'pending')
        .maybeSingle();

      if (existing) {
        await supabaseAdmin
          .from('ai_sms_batches')
          .update({
            messages: [...(existing.messages as any[]), newMsg],
            process_after: processAfter,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        await supabaseAdmin.from('ai_sms_batches').insert({
          account_id: account.id,
          contact_id: contact.id,
          messages: [newMsg],
          process_after: processAfter,
        });
      }
    }

    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { status: 200, headers: { 'Content-Type': 'text/xml' } }
    );
  } catch (error: any) {
    console.error('=== WEBHOOK ERROR ===');
    console.error('Error:', error);
    console.error('Stack:', error.stack);
    return new NextResponse('Internal Server Error: ' + error.message, { status: 500 });
  }
}
