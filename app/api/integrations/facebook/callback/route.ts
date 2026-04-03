export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/integrations/facebook/callback - Handle Facebook OAuth callback
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('state');

  try {
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Handle OAuth errors
    if (error) {
      console.error('Facebook OAuth error:', error, errorDescription);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/?view=settings&facebook=error&message=${encodeURIComponent(errorDescription || error)}`
      );
    }

    if (!code || !accountId) {
      return NextResponse.json(
        { error: 'Missing code or accountId' },
        { status: 400 }
      );
    }

    const facebookAppId = process.env.FACEBOOK_APP_ID;
    const facebookAppSecret = process.env.FACEBOOK_APP_SECRET;
    const redirectUri = process.env.FACEBOOK_REDIRECT_URI;

    if (!facebookAppId || !facebookAppSecret || !redirectUri) {
      throw new Error('Facebook credentials not configured');
    }

    // Exchange code for access token
    const tokenUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token');
    tokenUrl.searchParams.set('client_id', facebookAppId);
    tokenUrl.searchParams.set('client_secret', facebookAppSecret);
    tokenUrl.searchParams.set('redirect_uri', redirectUri);
    tokenUrl.searchParams.set('code', code);

    const tokenResponse = await fetch(tokenUrl.toString());
    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || tokenData.error) {
      throw new Error(tokenData.error?.message || 'Failed to get access token');
    }

    const accessToken = tokenData.access_token;
    const expiresIn = tokenData.expires_in || 5184000; // Default 60 days

    // Get user info
    const userResponse = await fetch(
      `https://graph.facebook.com/v21.0/me?fields=id,name,email&access_token=${accessToken}`
    );
    const userData = await userResponse.json();

    if (!userResponse.ok || userData.error) {
      throw new Error(userData.error?.message || 'Failed to get user info');
    }

    // Resolve a user ID for this account (same fallback strategy as other integrations)
    let resolvedUserId: string | null = null;

    // Strategy 1: direct member of this account (any role)
    const { data: directMember } = await supabaseAdmin
      .from('account_members')
      .select('user_id')
      .eq('account_id', accountId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (directMember) resolvedUserId = directMember.user_id;

    // Strategy 2: parent agency owner/admin (sub-accounts often have no direct members)
    if (!resolvedUserId) {
      const { data: accountRow } = await supabaseAdmin
        .from('accounts')
        .select('parent_account_id')
        .eq('id', accountId)
        .maybeSingle();

      if (accountRow?.parent_account_id) {
        const { data: agencyMember } = await supabaseAdmin
          .from('account_members')
          .select('user_id')
          .eq('account_id', accountRow.parent_account_id)
          .in('role', ['agency_owner', 'agency_admin', 'owner'])
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();
        if (agencyMember) resolvedUserId = agencyMember.user_id;
      }
    }

    if (!resolvedUserId) {
      throw new Error('Account not found — no members associated with this account');
    }

    const accountData = { user_id: resolvedUserId };

    // Store integration in database
    const { error: dbError } = await supabaseAdmin
      .from('facebook_integrations')
      .upsert({
        account_id: accountId,
        user_id: accountData.user_id,
        access_token: accessToken,
        token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
        facebook_user_id: userData.id,
        facebook_user_name: userData.name,
        last_sync_at: new Date().toISOString()
      }, {
        onConflict: 'account_id'
      });

    if (dbError) {
      console.error('Error saving Facebook integration:', dbError);
      throw new Error('Failed to save Facebook integration');
    }

    console.log('Facebook connected successfully for account:', accountId);

    // Look up account slug to redirect back to the correct subaccount
    const { data: accountRow } = await supabaseAdmin
      .from('accounts')
      .select('slug')
      .eq('id', accountId)
      .maybeSingle();

    const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const successUrl = accountRow?.slug
      ? `${base}/account/${accountRow.slug}?view=settings&facebook=connected`
      : `${base}/?view=settings&facebook=connected`;

    return NextResponse.redirect(successUrl);
  } catch (error: any) {
    console.error('Error in Facebook OAuth callback:', error);
    // Best-effort: try to redirect back to the initiating account
    const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    let errorUrl = `${base}/?view=settings&facebook=error&message=${encodeURIComponent(error.message)}`;
    if (accountId) {
      const { data: accountRow } = await supabaseAdmin
        .from('accounts')
        .select('slug')
        .eq('id', accountId)
        .maybeSingle();
      if (accountRow?.slug) {
        errorUrl = `${base}/account/${accountRow.slug}?view=settings&facebook=error&message=${encodeURIComponent(error.message)}`;
      }
    }
    return NextResponse.redirect(errorUrl);
  }
}
