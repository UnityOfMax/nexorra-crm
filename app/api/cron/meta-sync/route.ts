import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { fetchAdSetInsights } from '@/lib/meta/marketing-api';

export const dynamic = 'force-dynamic';

/**
 * POST /api/cron/meta-sync
 *
 * Pulls yesterday's adset performance from Meta Marketing API and upserts
 * into meta_ad_metrics. Runs daily at 6 AM via scripts/cron/meta-sync.sh.
 *
 * Auth: CRON_SECRET bearer token.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const globalAdAccountId = process.env.META_AD_ACCOUNT_ID;
  if (!globalAdAccountId) {
    return NextResponse.json(
      { error: 'META_AD_ACCOUNT_ID not configured' },
      { status: 500 }
    );
  }

  // Collect all ad account IDs to sync:
  // 1. Global Nexorra account
  // 2. Any client account with a custom meta_ad_account_id
  const adAccountsToSync: Array<{ accountId: string | null; adAccountId: string }> = [
    { accountId: null, adAccountId: globalAdAccountId },
  ];

  const { data: clientAccounts } = await supabaseAdmin
    .from('accounts')
    .select('id, settings')
    .not('settings->campaign->meta_ad_account_id', 'is', null);

  for (const acct of clientAccounts || []) {
    const clientAdAccountId = acct.settings?.campaign?.meta_ad_account_id;
    if (clientAdAccountId && clientAdAccountId !== globalAdAccountId) {
      adAccountsToSync.push({ accountId: acct.id, adAccountId: clientAdAccountId });
    }
  }

  const results: Array<{ adAccountId: string; synced: number; errors: number }> = [];

  for (const { accountId, adAccountId } of adAccountsToSync) {
    let synced = 0;
    let errors = 0;

    try {
      const metrics = await fetchAdSetInsights({
        adAccountId,
        datePreset: 'yesterday',
      });

      for (const row of metrics) {
        const cpl = row.leads > 0 ? row.spend / row.leads : null;
        const date = row.date_start; // YYYY-MM-DD

        const { error } = await supabaseAdmin
          .from('meta_ad_metrics')
          .upsert(
            {
              account_id: accountId,
              date,
              campaign_id: row.campaign_id,
              campaign_name: row.campaign_name,
              adset_id: row.adset_id,
              adset_name: row.adset_name,
              impressions: row.impressions,
              clicks: row.clicks,
              spend: row.spend,
              leads: row.leads,
              cpl: cpl != null ? Math.round(cpl * 100) / 100 : null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'date,adset_id' }
          );

        if (error) {
          console.error('[meta-sync] upsert error:', error.message);
          errors++;
        } else {
          synced++;
        }
      }
    } catch (err: any) {
      console.error(`[meta-sync] fetch error for ${adAccountId}:`, err.message);
      errors++;
    }

    results.push({ adAccountId, synced, errors });
  }

  return NextResponse.json({ ok: true, results });
}
