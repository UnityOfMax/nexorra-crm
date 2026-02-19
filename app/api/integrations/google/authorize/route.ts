export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';

// GET /api/integrations/google/authorize - Start Google OAuth flow
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const userId = searchParams.get('userId') || '';

    if (!accountId) {
      return NextResponse.json(
        { error: 'accountId is required' },
        { status: 400 }
      );
    }

    const oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // Encode accountId and userId in state so callback can store connected_user_id
    const state = userId ? `${accountId}:${userId}` : accountId;

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events'
      ],
      state,
      prompt: 'consent' // Force consent screen to get refresh token
    });

    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error('Error starting Google OAuth:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to start authorization' },
      { status: 500 }
    );
  }
}
