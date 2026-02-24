import { NextRequest, NextResponse } from 'next/server';
import { twilioClient } from '@/lib/twilio/client';

export async function GET(request: NextRequest) {
  try {
    if (!twilioClient) {
      return NextResponse.json(
        { error: 'Twilio credentials not configured in environment' },
        { status: 500 }
      );
    }

    // Fetch all phone numbers from Twilio
    const phoneNumbers = await twilioClient.incomingPhoneNumbers.list();

    const numbers = phoneNumbers.map((num) => ({
      sid: num.sid,
      phoneNumber: num.phoneNumber,
      friendlyName: num.friendlyName,
      capabilities: {
        voice: num.capabilities.voice,
        sms: num.capabilities.sms,
        mms: num.capabilities.mms,
      },
    }));

    return NextResponse.json({ numbers });
  } catch (error: any) {
    console.error('Error fetching Twilio numbers:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch Twilio numbers' },
      { status: 500 }
    );
  }
}
