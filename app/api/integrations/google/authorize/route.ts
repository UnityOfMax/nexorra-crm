export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';

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

    // Generate a random nonce to prevent CSRF attacks on the callback
    const nonce = crypto.randomUUID();

    // Encode nonce, accountId and userId in state
    const state = `${nonce}:${accountId}:${userId}`;

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events'
      ],
      state,
      prompt: 'consent' // Force consent screen to get refresh token
    });

    // Redirect to Google and set the nonce in an HttpOnly cookie
    const response = NextResponse.redirect(authUrl);
    response.cookies.set('oauth_state_nonce', nonce, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Error starting Google OAuth:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to start authorization' },
      { status: 500 }
    );
  }
}
