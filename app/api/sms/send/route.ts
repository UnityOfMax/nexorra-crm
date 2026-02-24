import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAccountAccess } from '@/lib/auth/require-account-access';

export async function POST(request: NextRequest) {
  try {
    const { accountId, to, message, contactId } = await request.json();

    const auth = await requireAccountAccess(request, accountId);
    if (auth instanceof NextResponse) return auth;
    const { userId } = auth;

    if (!accountId || !to || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get Twilio credentials from environment
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;

    if (!twilioAccountSid || !twilioAuthToken) {
      return NextResponse.json(
        { error: 'Twilio not configured. Please add credentials to environment variables.' },
        { status: 500 }
      );
    }

    // Get account settings to find selected phone number
    const { data: account, error: accountError } = await supabaseAdmin
      .from('accounts')
      .select('settings')
      .eq('id', accountId)
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    const twilioPhoneNumber = account.settings?.twilio_phone_number;

    if (!twilioPhoneNumber) {
      return NextResponse.json(
        { error: 'No Twilio phone number selected for this account. Please select one in Settings.' },
        { status: 400 }
      );
    }

    // Initialize Twilio client
    const client = twilio(twilioAccountSid, twilioAuthToken);

    // Send SMS
    const twilioMessage = await client.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: to,
    });

    // Save message to messages table
    const { error: messageError } = await supabaseAdmin
      .from('messages')
      .insert({
        account_id: accountId,
        contact_id: contactId || null,
        direction: 'outbound',
        type: 'sms',
        content: message,
        from_address: twilioPhoneNumber,
        to_address: to,
        status: twilioMessage.status,
        external_id: twilioMessage.sid,
      });

    if (messageError) {
      console.error('Error saving message:', messageError);
    }

    // Also log the activity (for backward compatibility)
    const { error: activityError } = await supabaseAdmin
      .from('activities')
      .insert({
        account_id: accountId,
        contact_id: contactId || null,
        type: 'sms',
        subject: `SMS to ${to}`,
        description: message,
        completed: true,
        created_by: userId,
      });

    if (activityError) {
      console.error('Error logging SMS activity:', activityError);
    }

    return NextResponse.json({
      success: true,
      messageSid: twilioMessage.sid,
      status: twilioMessage.status,
    });
  } catch (error: any) {
    console.error('Error sending SMS:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send SMS' },
      { status: 500 }
    );
  }
}
