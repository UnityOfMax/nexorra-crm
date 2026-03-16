import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAccountAccess } from '@/lib/auth/require-account-access';

export const dynamic = 'force-dynamic';

// GET /api/ab-tests?accountId=X&entityType=landing_page
export async function GET(request: NextRequest) {
  const accountId = request.nextUrl.searchParams.get('accountId');
  if (!accountId) return NextResponse.json({ error: 'accountId required' }, { status: 400 });

  const auth = await requireAccountAccess(request, accountId);
  if (auth instanceof NextResponse) return auth;

  const entityType = request.nextUrl.searchParams.get('entityType');

  let query = supabaseAdmin
    .from('ab_tests')
    .select('*, ab_results(*)')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false });

  if (entityType) query = query.eq('entity_type', entityType);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ tests: data || [] });
}

// POST /api/ab-tests — create a new A/B test
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { accountId, entityType, entityId, name, variants, trafficSplit } = body;

  if (!accountId || !entityType || !entityId || !name || !variants) {
    return NextResponse.json({ error: 'accountId, entityType, entityId, name, variants required' }, { status: 400 });
  }

  const auth = await requireAccountAccess(request, accountId);
  if (auth instanceof NextResponse) return auth;

  const { data: test, error } = await supabaseAdmin
    .from('ab_tests')
    .insert({
      account_id: accountId,
      entity_type: entityType,
      entity_id: entityId,
      name,
      variants,
      traffic_split: trafficSplit || { A: 50, B: 50 },
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Initialize result rows for each variant
  const variantIds = variants.map((v: any) => v.id || v.variant || 'A');
  for (const vid of variantIds) {
    await supabaseAdmin
      .from('ab_results')
      .insert({ test_id: test.id, variant: vid })
      .select();
  }

  return NextResponse.json({ test }, { status: 201 });
}

// PATCH /api/ab-tests?id=X — update test status/winner
export async function PATCH(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const body = await request.json();
  const { status, winner } = body;

  const updates: Record<string, any> = { updated_at: new Date().toISOString() };
  if (status) updates.status = status;
  if (winner) updates.winner = winner;

  const { data, error } = await supabaseAdmin
    .from('ab_tests')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ test: data });
}
