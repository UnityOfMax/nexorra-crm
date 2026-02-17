import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

export async function GET(request: NextRequest) {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      return NextResponse.json(
        { error: 'Twilio credentials not configured in environment' },
        { status: 500 }
      );
    }

    const client = twilio(accountSid, authToken);

    // Fetch all phone numbers from Twilio
    const phoneNumbers = await client.incomingPhoneNumbers.list();

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
