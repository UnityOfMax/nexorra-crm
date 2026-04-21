import { NextRequest, NextResponse } from 'next/server';
import { requireAccountAccess } from '@/lib/auth/require-account-access';
import { supabaseAdmin } from '@/lib/supabase';
import { fetchAdSetInsights } from '@/lib/meta/marketing-api';

export const dynamic = 'force-dynamic';

/**
 * GET /api/meta/insights?accountId=X&days=30&live=true
 *
 * Returns ad set metrics + aggregated totals.
 * By default reads from local meta_ad_metrics table (populated by daily cron).
 * Pass ?live=true to fetch directly from Meta API and upsert into DB first.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('accountId');
  const days = parseInt(searchParams.get('days') || '30', 10);
  const live = searchParams.get('live') === 'true';

  const auth = await requireAccountAccess(request, accountId);
  if (auth instanceof NextResponse) return auth;

  // Live fetch: pull from Meta API and upsert into DB
  if (live) {
    try {
      const { data: accountRow } = await supabaseAdmin
        .from('accounts')
        .select('settings')
        .eq('id', accountId)
        .single();

      // Resolve ad account + access token: settings override → facebook_integrations → env fallback
      let adAccountId: string | undefined =
        accountRow?.settings?.campaign?.meta_ad_account_id ||
        process.env.META_AD_ACCOUNT_ID;

      let fbAccessToken: string | undefined;

      if (!adAccountId) {
        const { data: fbInt } = await supabaseAdmin
          .from('facebook_integrations')
          .select('ad_account_id, access_token')
          .eq('account_id', accountId)
          .not('ad_account_id', 'is', null)
          .limit(1)
          .maybeSingle();
        if (fbInt?.ad_account_id) {
          adAccountId = fbInt.ad_account_id;
          fbAccessToken = fbInt.access_token;
        }
      }

      if (adAccountId) {
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const until = new Date().toISOString().slice(0, 10);
        const metrics = await fetchAdSetInsights({ adAccountId, since, until, accessToken: fbAccessToken });

        for (const row of metrics) {
          const cpl = row.leads > 0 ? row.spend / row.leads : null;
          await supabaseAdmin.from('meta_ad_metrics').upsert(
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
        }
      }
    } catch (err: any) {
      console.error('[meta/insights] live fetch error:', err.message);
      // Fall through — return DB data even if live fetch fails
    }
  }

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const { data, error } = await supabaseAdmin
    .from('meta_ad_metrics')
    .select('*')
    .eq('account_id', accountId)
    .gte('date', since)
    .order('date', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data || [];

  // Aggregate totals across the date range
  const totals = rows.reduce(
    (acc, r) => ({
      spend: acc.spend + (r.spend || 0),
      impressions: acc.impressions + (r.impressions || 0),
      reach: acc.reach + (r.reach || 0),
      clicks: acc.clicks + (r.clicks || 0),
      leads: acc.leads + (r.leads || 0),
      page_views: acc.page_views + (r.page_views || 0),
      appointments: acc.appointments + (r.appointments || 0),
    }),
    { spend: 0, impressions: 0, reach: 0, clicks: 0, leads: 0, page_views: 0, appointments: 0 }
  );

  const aggCpl = totals.leads > 0 ? Math.round((totals.spend / totals.leads) * 100) / 100 : null;
  const aggCpm = totals.impressions > 0 ? Math.round((totals.spend / totals.impressions) * 1000 * 100) / 100 : null;
  const aggCpa = totals.appointments > 0 ? Math.round((totals.spend / totals.appointments) * 100) / 100 : null;

  return NextResponse.json({
    data: rows,
    totals: { ...totals, cpl: aggCpl, cpm: aggCpm, cpa: aggCpa },
  });
}
