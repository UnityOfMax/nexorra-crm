import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/integrations/facebook/accounts - Get available ad accounts and pages
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

    // Get Facebook integration
    const { data: integration, error: integrationError } = await supabaseAdmin
      .from('facebook_integrations')
      .select('*')
      .eq('account_id', accountId)
      .single();

    if (integrationError || !integration) {
      return NextResponse.json(
        { error: 'Facebook not connected' },
        { status: 404 }
      );
    }

    const accessToken = integration.access_token;

    // Get ad accounts
    const adAccountsResponse = await fetch(
      `https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_status&access_token=${accessToken}`
    );
    const adAccountsData = await adAccountsResponse.json();

    // Get pages
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&access_token=${accessToken}`
    );
    const pagesData = await pagesResponse.json();

    // Log errors from Facebook for debugging
    if (adAccountsData.error) {
      console.error('[facebook/accounts] Ad accounts error:', JSON.stringify(adAccountsData.error));
    }
    if (pagesData.error) {
      console.error('[facebook/accounts] Pages error:', JSON.stringify(pagesData.error));
    }

    return NextResponse.json({
      adAccounts: adAccountsData.data || [],
      pages: pagesData.data || [],
      debug: {
        adAccountsError: adAccountsData.error || null,
        pagesError: pagesData.error || null,
      }
    });
  } catch (error: any) {
    console.error('Error fetching Facebook accounts:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch accounts' },
      { status: 500 }
    );
  }
}

// POST /api/integrations/facebook/accounts - Save selected ad account and page
export async function POST(request: NextRequest) {
  try {
    const { accountId, adAccountId, pageId } = await request.json();

    if (!accountId) {
      return NextResponse.json(
        { error: 'accountId is required' },
        { status: 400 }
      );
    }

    // Get Facebook integration
    const { data: integration, error: integrationError } = await supabaseAdmin
      .from('facebook_integrations')
      .select('*')
      .eq('account_id', accountId)
      .single();

    if (integrationError || !integration) {
      return NextResponse.json(
        { error: 'Facebook not connected' },
        { status: 404 }
      );
    }

    const accessToken = integration.access_token;

    // Get ad account details if selected
    let adAccountName = null;
    if (adAccountId) {
      const adResponse = await fetch(
        `https://graph.facebook.com/v21.0/${adAccountId}?fields=name&access_token=${accessToken}`
      );
      const adData = await adResponse.json();
      adAccountName = adData.name;
    }

    // Get page details if selected
    let pageName = null;
    let instagramAccountId = null;
    let instagramUsername = null;
    if (pageId) {
      const pageResponse = await fetch(
        `https://graph.facebook.com/v21.0/${pageId}?fields=name,instagram_business_account{id,username}&access_token=${accessToken}`
      );
      const pageData = await pageResponse.json();
      pageName = pageData.name;

      if (pageData.instagram_business_account) {
        instagramAccountId = pageData.instagram_business_account.id;
        instagramUsername = pageData.instagram_business_account.username;
      }
    }

    // Update integration with selected accounts
    const { error: updateError } = await supabaseAdmin
      .from('facebook_integrations')
      .update({
        ad_account_id: adAccountId,
        page_id: pageId,
        page_name: pageName,
        instagram_account_id: instagramAccountId,
        instagram_username: instagramUsername
      })
      .eq('account_id', accountId);

    if (updateError) {
      throw new Error('Failed to update Facebook integration');
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating Facebook accounts:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update accounts' },
      { status: 500 }
    );
  }
}
