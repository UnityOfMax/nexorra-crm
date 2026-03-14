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

  const globalAdAccountId = process.env.META_AD_ACCOUNT_ID;
  if (!globalAdAccountId) {
    return NextResponse.json({ error: 'META_AD_ACCOUNT_ID not configured' }, { status: 500 });
  }

  // Build list of (accountId, adAccountId) pairs to sync
  const toSync: Array<{ accountId: string | null; adAccountId: string }> = [
    { accountId: null, adAccountId: globalAdAccountId },
  ];

  const { data: clientAccounts } = await supabaseAdmin
    .from('accounts')
    .select('id, settings')
    .not('settings->campaign->meta_ad_account_id', 'is', null);

  for (const acct of clientAccounts || []) {
    const clientAdAccountId = acct.settings?.campaign?.meta_ad_account_id;
    if (clientAdAccountId && clientAdAccountId !== globalAdAccountId) {
      toSync.push({ accountId: acct.id, adAccountId: clientAdAccountId });
    }
  }

  const results: Array<{ adAccountId: string; synced: number; errors: number }> = [];

  for (const { accountId, adAccountId } of toSync) {
    let synced = 0;
    let errors = 0;

    try {
      const metrics = await fetchAdSetInsights({ adAccountId, since, until });

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
