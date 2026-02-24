export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import { supabaseAdmin } from '@/lib/supabase';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// GET /api/integrations/google/callback - Handle Google OAuth callback
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const rawState = searchParams.get('state') || '';
    const error = searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      console.error('Google OAuth error:', error);
      return NextResponse.redirect(
        `${APP_URL}/?view=settings&calendar=error&message=${encodeURIComponent(error)}`
      );
    }

    // State format: "nonce:accountId:userId"
    const stateParts = rawState.split(':');
    if (stateParts.length < 2) {
      return NextResponse.redirect(
        `${APP_URL}/?view=settings&calendar=error&message=Invalid+state`
      );
    }

    const [stateNonce, accountId, connectedUserId] = stateParts.length === 3
      ? stateParts
      : ['', stateParts[0], ''];

    // CSRF check: verify the nonce matches the cookie
    const storedNonce = request.cookies.get('oauth_state_nonce')?.value;
    if (!storedNonce || stateNonce !== storedNonce) {
      console.error('[google/callback] CSRF check failed — nonce mismatch');
      return NextResponse.redirect(
        `${APP_URL}/?view=settings&calendar=error&message=CSRF+check+failed`
      );
    }

    if (!code || !accountId) {
      return NextResponse.redirect(
        `${APP_URL}/?view=settings&calendar=error&message=Missing+code+or+accountId`
      );
    }

    const oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error('Failed to get access or refresh token');
    }

    // Get user's primary calendar info
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const { data: calendarList } = await calendar.calendarList.list();

    const primaryCalendar = calendarList.items?.find(cal => cal.primary) || calendarList.items?.[0];

    if (!primaryCalendar) {
      throw new Error('No calendar found');
    }

    // Get existing account settings
    const { data: account, error: accountError } = await supabaseAdmin
      .from('accounts')
      .select('settings')
      .eq('id', accountId)
      .single();

    if (accountError || !account) {
      throw new Error('Account not found');
    }

    // Update account settings with Google Calendar integration
    const { error: updateError } = await supabaseAdmin
      .from('accounts')
      .update({
        settings: {
          ...account.settings,
          google_calendar: {
            enabled: true,
            user_email: primaryCalendar.summary || 'Unknown',
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : new Date(Date.now() + 3600000).toISOString(),
            calendar_id: primaryCalendar.id || 'primary',
            last_sync_at: new Date().toISOString(),
            // Store who connected Google Calendar — used as created_by fallback
            ...(connectedUserId ? { connected_user_id: connectedUserId } : {})
          }
        }
      })
      .eq('id', accountId);

    if (updateError) {
      console.error('Error updating account settings:', updateError);
      throw new Error('Failed to save calendar settings');
    }

    console.log('Google Calendar connected successfully for account:', accountId);

    // Redirect back to main page and clear the nonce cookie
    const response = NextResponse.redirect(
      `${APP_URL}/?view=settings&calendar=connected`
    );
    response.cookies.set('oauth_state_nonce', '', { maxAge: 0, path: '/' });
    return response;
  } catch (error: any) {
    console.error('Error in Google OAuth callback:', error);
    return NextResponse.redirect(
      `${APP_URL}/?view=settings&calendar=error&message=${encodeURIComponent(error.message)}`
    );
  }
}
