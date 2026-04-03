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

    if (adAccountsData.error) {
      console.error('[facebook/accounts] Ad accounts error:', JSON.stringify(adAccountsData.error));
    }

    // ── Pages: try two paths and merge ──────────────────────────────────────
    // Path 1: direct page roles (/me/accounts) — works for pages the user directly admins
    const directRes = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,instagram_business_account{id,username}&limit=200&access_token=${accessToken}`
    );
    const directData = await directRes.json();
    if (directData.error) {
      console.error('[facebook/accounts] /me/accounts error:', JSON.stringify(directData.error));
    }

    // Path 2: Business Manager owned + client pages
    // Many users manage pages through a Business Manager rather than directly
    const bizRes = await fetch(
      `https://graph.facebook.com/v21.0/me/businesses?fields=id,name,owned_pages{id,name,instagram_business_account{id,username}},client_pages{id,name,instagram_business_account{id,username}}&limit=50&access_token=${accessToken}`
    );
    const bizData = await bizRes.json();
    if (bizData.error) {
      console.error('[facebook/accounts] /me/businesses error:', JSON.stringify(bizData.error));
    }

    // Merge all pages, deduplicate by id
    const pageMap = new Map<string, any>();
    for (const p of (directData.data || [])) {
      pageMap.set(p.id, p);
    }
    for (const biz of (bizData.data || [])) {
      for (const p of (biz.owned_pages?.data || [])) pageMap.set(p.id, p);
      for (const p of (biz.client_pages?.data || [])) pageMap.set(p.id, p);
    }
    const pages = Array.from(pageMap.values());

    return NextResponse.json({
      adAccounts: adAccountsData.data || [],
      pages,
      debug: {
        adAccountsError: adAccountsData.error || null,
        directPagesError: directData.error || null,
        directPagesCount: (directData.data || []).length,
        bizError: bizData.error || null,
        bizCount: (bizData.data || []).length,
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
