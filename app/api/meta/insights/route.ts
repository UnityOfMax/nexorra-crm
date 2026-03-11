import { NextRequest, NextResponse } from 'next/server';
import { requireAccountAccess } from '@/lib/auth/require-account-access';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/meta/insights?accountId=X&days=30
 *
 * Returns ad set metrics from the local meta_ad_metrics table (not live from Meta).
 * Data is populated daily by the meta-sync cron.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('accountId');
  const days = parseInt(searchParams.get('days') || '30', 10);

  const auth = await requireAccountAccess(request, accountId);
  if (auth instanceof NextResponse) return auth;

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

  return NextResponse.json({ data: data || [] });
}
