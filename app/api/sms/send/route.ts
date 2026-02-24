import { NextRequest, NextResponse } from 'next/server';
import { twilioClient } from '@/lib/twilio/client';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAccountAccess } from '@/lib/auth/require-account-access';
import { normalizePhone } from '@/lib/utils/phone';

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

    if (!twilioClient) {
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

    // Normalize the destination number to E.164
    const normalizedTo = normalizePhone(to);

    // Send SMS
    const twilioMessage = await twilioClient.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: normalizedTo,
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
        to_address: normalizedTo,
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
        subject: `SMS to ${normalizedTo}`,
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
