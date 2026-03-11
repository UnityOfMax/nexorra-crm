import { NextRequest, NextResponse } from 'next/server';
import { requireAccountAccess } from '@/lib/auth/require-account-access';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/optimizer/actions?accountId=X&status=pending
 *
 * Returns optimizer_actions for the given account.
 * Query param `status`: all | pending | applied | rejected (default: all)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('accountId');
  const status = searchParams.get('status') || 'all';

  const auth = await requireAccountAccess(request, accountId);
  if (auth instanceof NextResponse) return auth;

  let query = supabaseAdmin
    .from('optimizer_actions')
    .select('*')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (status === 'pending') {
    query = query.eq('applied', false).eq('rejected', false).eq('approved', false);
  } else if (status === 'approved') {
    query = query.eq('approved', true).eq('applied', false).eq('rejected', false);
  } else if (status === 'applied') {
    query = query.eq('applied', true);
  } else if (status === 'rejected') {
    query = query.eq('rejected', true);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data || [] });
}
