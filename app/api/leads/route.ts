import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth/require-account-access';

export const dynamic = 'force-dynamic';

// GET /api/leads?pushed=false&timezone=EST&brokerage=kw&limit=100&offset=0&country=US
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = request.nextUrl;
  const pushed = searchParams.get('pushed');      // 'true' | 'false' | null (all)
  const timezone = searchParams.get('timezone');  // 'EST' | 'CST' | 'MST' | 'PST' | null
  const brokerage = searchParams.get('brokerage');
  const country = searchParams.get('country');    // 'US' | 'CA' | null
  const limit = Math.min(Number(searchParams.get('limit') ?? 100), 500);
  const offset = Number(searchParams.get('offset') ?? 0);

  let query = supabaseAdmin
    .from('leads')
    .select('*', { count: 'exact' })
    .order('scraped_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (pushed === 'true') query = query.eq('pushed_to_instantly', true);
  if (pushed === 'false') query = query.eq('pushed_to_instantly', false);
  if (timezone) query = query.eq('timezone', timezone);
  if (brokerage) query = query.eq('source_brokerage', brokerage);
  if (country) query = query.eq('country', country);

  const { data, error, count } = await query;

  if (error) {
    console.error('Leads fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }

  return NextResponse.json({ leads: data || [], total: count ?? 0, limit, offset });
}

// PATCH /api/leads?id=X — update pushed_to_instantly or other fields
export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const updates = await request.json();
  const { id: _id, scraped_at: _sa, created_at: _ca, ...safeUpdates } = updates;

  const { data, error } = await supabaseAdmin
    .from('leads')
    .update(safeUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Lead update error:', error);
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 });
  }

  return NextResponse.json({ lead: data });
}
