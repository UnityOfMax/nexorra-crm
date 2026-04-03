export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/integrations/facebook/authorize - Start Facebook OAuth flow
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json(
        { error: 'accountId is required' },
        { status: 400 }
      );
    }

    const facebookAppId = process.env.FACEBOOK_APP_ID;
    const redirectUri = process.env.FACEBOOK_REDIRECT_URI;

    if (!facebookAppId || !redirectUri) {
      return NextResponse.json(
        { error: 'Facebook credentials not configured' },
        { status: 500 }
      );
    }

    // Facebook OAuth scopes — only request what the app needs and has approved.
    // Meta integration is for ad metrics + campaign management.
    // Instagram DMs are handled via Chrome/Peoples DM (no Graph API needed).
    const scopes = [
      'public_profile',
      'pages_show_list',
      'pages_read_engagement',
      'pages_manage_metadata',
      'pages_manage_ads',
      'ads_read',
      'ads_management',
      'leads_retrieval',
    ].join(',');

    const authUrl = new URL('https://www.facebook.com/v21.0/dialog/oauth');
    authUrl.searchParams.set('client_id', facebookAppId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('state', accountId);
    authUrl.searchParams.set('response_type', 'code');

    return NextResponse.redirect(authUrl.toString());
  } catch (error: any) {
    console.error('Error starting Facebook OAuth:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to start authorization' },
      { status: 500 }
    );
  }
}
