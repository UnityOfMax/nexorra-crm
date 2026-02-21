import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  console.log('=== WEBHOOK CALLED ===');
  console.log('Time:', new Date().toISOString());
  console.log('Headers:', Object.fromEntries(request.headers.entries()));
  
  try {
    const formData = await request.formData();
    console.log('Form Data received:', Object.fromEntries(formData.entries()));
    
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const body = formData.get('Body') as string;
    const messageSid = formData.get('MessageSid') as string;

    console.log('Parsed data:', { from, to, body, messageSid });

    if (!from || !to || !body) {
      console.error('Missing required fields:', { from, to, body });
      return new NextResponse('Missing required fields', { status: 400 });
    }

    // Find the account that has this Twilio number selected
    console.log('Querying accounts...');
    const { data: accounts, error: accountsError } = await supabaseAdmin
      .from('accounts')
      .select('id, settings');

    console.log('All accounts:', accounts);
    console.log('Accounts error:', accountsError);

    if (!accounts || accounts.length === 0) {
      console.error('No accounts found in database');
      return new NextResponse('No accounts found', { status: 404 });
    }

    // Log all twilio numbers
    accounts.forEach(acc => {
      console.log(`Account ${acc.id} has Twilio number:`, acc.settings?.twilio_phone_number);
    });

    const account = accounts?.find(
      (acc) => acc.settings?.twilio_phone_number === to
    );

    console.log('Looking for account with number:', to);
    console.log('Found account:', account?.id);

    if (!account) {
      console.error('No account found for Twilio number:', to);
      console.error('Available numbers:', accounts.map(a => a.settings?.twilio_phone_number));
      return new NextResponse('Account not found for this number', { status: 404 });
    }

    console.log('Found account:', account.id);

    // Find or create contact by phone number
    console.log('Looking for contact with phone:', from);
    let { data: contact, error: contactError } = await supabaseAdmin
      .from('contacts')
      .select('id')
      .eq('account_id', account.id)
      .eq('phone', from)
      .single();

    console.log('Contact query result:', contact);
    console.log('Contact query error:', contactError);

    if (!contact) {
      console.log('Creating new contact for:', from);
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
      
      console.log('New contact created:', newContact);
      console.log('Create error:', createError);
      
      if (createError) {
        console.error('Error creating contact:', createError);
      }
      
      contact = newContact;
    }

    if (!contact) {
      console.error('Failed to create contact');
      return new NextResponse('Failed to create contact', { status: 500 });
    }

    console.log('Contact ID:', contact.id);

    // Save incoming message
    console.log('Saving message to database...');
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

    console.log('Message save result:', savedMessage);
    console.log('Message save error:', messageError);

    if (messageError) {
      console.error('Error saving message:', messageError);
      return new NextResponse('Error saving message: ' + messageError.message, { status: 500 });
    } else {
      console.log('✅ Message saved successfully!');
    }

    // Also log as activity
    console.log('Logging activity...');
    const { error: activityError } = await supabaseAdmin.from('activities').insert({
      account_id: account.id,
      contact_id: contact.id,
      type: 'sms',
      subject: `SMS from ${from}`,
      description: body,
      completed: true,
      created_by: account.id,
    });

    if (activityError) {
      console.error('Activity error:', activityError);
    }

    console.log('=== WEBHOOK COMPLETED SUCCESSFULLY ===');

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