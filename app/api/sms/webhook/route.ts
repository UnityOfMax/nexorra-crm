import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { twilio } from '@/lib/twilio/client';

const DEBUG = process.env.NODE_ENV === 'development';

export async function POST(request: NextRequest) {
  if (DEBUG) console.log('=== WEBHOOK CALLED ===', new Date().toISOString());

  try {
    const formData = await request.formData();
    if (DEBUG) console.log('Form Data received:', Object.fromEntries(formData.entries()));

    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const body = formData.get('Body') as string;
    const messageSid = formData.get('MessageSid') as string;

    if (DEBUG) console.log('Parsed data:', { from, to, body, messageSid });

    if (!from || !to || !body) {
      console.error('Missing required fields:', { from, to, body });
      return new NextResponse('Missing required fields', { status: 400 });
    }

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

    // Validate Twilio signature before processing
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

    // Find or create contact by phone number
    if (DEBUG) console.log('Looking for contact with phone:', from);
    let { data: contact, error: contactError } = await supabaseAdmin
      .from('contacts')
      .select('id')
      .eq('account_id', account.id)
      .eq('phone', from)
      .single();

    if (DEBUG) console.log('Contact query result:', contact, 'error:', contactError);

    if (!contact) {
      if (DEBUG) console.log('Creating new contact for:', from);
      // Create new contact
      const { data: newContact, error: createError } = await supabaseAdmin
        .from('contacts')
        .insert({
          account_id: account.id,
          phone: from,
          first_name: from, // Use phone as temporary name
          status: 'lead',
        })
        .select('id')
        .single();

      if (createError) {
        console.error('Error creating contact:', createError);
      }

      contact = newContact;
    }

    if (!contact) {
      console.error('Failed to create contact');
      return new NextResponse('Failed to create contact', { status: 500 });
    }

    if (DEBUG) console.log('Contact ID:', contact.id);

    // Save incoming message
    const { data: savedMessage, error: messageError } = await supabaseAdmin
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
      })
      .select();

    if (messageError) {
      console.error('Error saving message:', messageError);
      return new NextResponse('Error saving message: ' + messageError.message, { status: 500 });
    }

    if (DEBUG) console.log('Message saved successfully');

    // Also log as activity
    const { data: ownerMember } = await supabaseAdmin
      .from('account_members')
      .select('user_id')
      .eq('account_id', account.id)
      .eq('role', 'owner')
      .single();

    const { error: activityError } = ownerMember?.user_id
      ? await supabaseAdmin.from('activities').insert({
          account_id: account.id,
          contact_id: contact.id,
          type: 'sms',
          subject: `SMS from ${from}`,
          description: body,
          completed: true,
          created_by: ownerMember.user_id,
        })
      : { error: null };

    if (activityError) {
      console.error('Activity error:', activityError);
    }

    if (DEBUG) console.log('=== WEBHOOK COMPLETED SUCCESSFULLY ===');

    // Cancel any pending AI follow-up for this contact (they replied)
    Promise.resolve(
      supabaseAdmin
        .from('ai_follow_up_queue')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('account_id', account.id)
        .eq('contact_id', contact.id)
        .eq('channel', 'sms')
        .eq('status', 'pending')
    ).catch((err: unknown) => console.error('[webhook] cancel follow-up error:', err));

    // Debounced AI auto-respond: batch messages within 15-second window
    if (contact) {
      const { data: aiConfig } = await supabaseAdmin
        .from('ai_agent_configs')
        .select('enabled, mode, channels')
        .eq('account_id', account.id)
        .single();

      if (aiConfig?.enabled && aiConfig?.mode === 'auto' && aiConfig?.channels?.sms) {
        const processAfter = new Date(Date.now() + 15_000).toISOString();
        const newMsg = { body, received_at: new Date().toISOString() };

        // Check for existing pending batch for this contact
        const { data: existing } = await supabaseAdmin
          .from('ai_sms_batches')
          .select('id, messages')
          .eq('account_id', account.id)
          .eq('contact_id', contact.id)
          .eq('status', 'pending')
          .maybeSingle();

        if (existing) {
          // Extend the debounce timer and append the new message
          await supabaseAdmin
            .from('ai_sms_batches')
            .update({
              messages: [...(existing.messages as any[]), newMsg],
              process_after: processAfter,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
        } else {
          // Create a new pending batch
          await supabaseAdmin.from('ai_sms_batches').insert({
            account_id: account.id,
            contact_id: contact.id,
            messages: [newMsg],
            process_after: processAfter,
          });
        }
      }
    }

    // Respond to Twilio with empty TwiML (no auto-reply)
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        status: 200,
        headers: {
          'Content-Type': 'text/xml',
        },
      }
    );
  } catch (error: any) {
    console.error('=== WEBHOOK ERROR ===');
    console.error('Error:', error);
    console.error('Stack:', error.stack);
    return new NextResponse('Internal Server Error: ' + error.message, { status: 500 });
  }
}
