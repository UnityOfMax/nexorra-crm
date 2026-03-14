import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth/require-account-access';
import { fetchAdSetInsights } from '@/lib/meta/marketing-api';

export const dynamic = 'force-dynamic';

/**
 * POST /api/meta/sync-all?days=30
 *
 * Pulls Meta ad metrics for all configured accounts and upserts into
 * meta_ad_metrics. Used by the Agency Overview "Pull Data from Meta" button.
 *
 * Auth: any authenticated user (agency owner).
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const days = parseInt(new URL(request.url).searchParams.get('days') || '30', 10);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const until = new Date().toISOString().slice(0, 10);

  // Build list of (accountId, adAccountId, accessToken) pairs to sync.
  // Sources (in priority order):
  //   1. Per-account OAuth connections in facebook_integrations table
  //   2. Per-account meta_ad_account_id in settings.campaign (uses global token)
  //   3. Global META_AD_ACCOUNT_ID env var (uses global token)
  const seenAdAccounts = new Set<string>();
  const toSync: Array<{ accountId: string | null; adAccountId: string; accessToken?: string }> = [];

  // Source 1: OAuth-connected accounts with ad_account_id set
  const { data: fbIntegrations } = await supabaseAdmin
    .from('facebook_integrations')
    .select('account_id, ad_account_id, access_token')
    .not('ad_account_id', 'is', null);

  for (const fb of fbIntegrations || []) {
    if (!fb.ad_account_id) continue;
    const key = `${fb.account_id}:${fb.ad_account_id}`;
    if (seenAdAccounts.has(key)) continue;
    seenAdAccounts.add(key);
    toSync.push({ accountId: fb.account_id, adAccountId: fb.ad_account_id, accessToken: fb.access_token });
  }

  // Source 2: accounts.settings.campaign.meta_ad_account_id (uses global token)
  const { data: clientAccounts } = await supabaseAdmin
    .from('accounts')
    .select('id, settings')
    .not('settings->campaign->meta_ad_account_id', 'is', null);

  for (const acct of clientAccounts || []) {
    const clientAdAccountId = acct.settings?.campaign?.meta_ad_account_id;
    if (!clientAdAccountId) continue;
    const key = `${acct.id}:${clientAdAccountId}`;
    if (seenAdAccounts.has(key)) continue;
    seenAdAccounts.add(key);
    toSync.push({ accountId: acct.id, adAccountId: clientAdAccountId });
  }

  // Source 3: global META_AD_ACCOUNT_ID fallback (null accountId = agency-level)
  const globalAdAccountId = process.env.META_AD_ACCOUNT_ID;
  if (globalAdAccountId && !seenAdAccounts.has(`null:${globalAdAccountId}`)) {
    toSync.push({ accountId: null, adAccountId: globalAdAccountId });
  }

  if (toSync.length === 0) {
    return NextResponse.json({
      error: 'No Meta ad accounts configured. Connect Facebook in account Settings or set META_AD_ACCOUNT_ID.',
    }, { status: 400 });
  }

  const results: Array<{ adAccountId: string; synced: number; errors: number }> = [];

  for (const { accountId, adAccountId, accessToken } of toSync) {
    let synced = 0;
    let errors = 0;

    try {
      const metrics = await fetchAdSetInsights({ adAccountId, since, until, accessToken });

      for (const row of metrics) {
        const cpl = row.leads > 0 ? row.spend / row.leads : null;

        const { error } = await supabaseAdmin
          .from('meta_ad_metrics')
          .upsert(
            {
              account_id: accountId,
              date: row.date_start,
              campaign_id: row.campaign_id,
              campaign_name: row.campaign_name,
              adset_id: row.adset_id,
              adset_name: row.adset_name,
              impressions: row.impressions,
              reach: row.reach,
              clicks: row.clicks,
              spend: row.spend,
              leads: row.leads,
              page_views: row.page_views,
              cpl: cpl != null ? Math.round(cpl * 100) / 100 : null,
              cpm: row.cpm,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'date,adset_id' }
          );

        if (error) {
          console.error('[sync-all] upsert error:', error.message);
          errors++;
        } else {
          synced++;
        }
      }
    } catch (err: any) {
      console.error(`[sync-all] fetch error for ${adAccountId}:`, err.message);
      errors++;
    }

    results.push({ adAccountId, synced, errors });
  }

  return NextResponse.json({ ok: true, results });
}
