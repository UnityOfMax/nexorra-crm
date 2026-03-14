import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAccountAccess } from '@/lib/auth/require-account-access';

export const dynamic = 'force-dynamic';

// GET /api/contacts?accountId=X&limit=50&offset=0
// Uses supabaseAdmin to bypass RLS so agency owners can view sub-account contacts.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const accountId = searchParams.get('accountId');
  const auth = await requireAccountAccess(request, accountId);
  if (auth instanceof NextResponse) return auth;

  const limit = Math.min(Number(searchParams.get('limit') ?? 50), 200);
  const offset = Number(searchParams.get('offset') ?? 0);

  const { data, error, count } = await supabaseAdmin
    .from('contacts')
    .select('*', { count: 'exact' })
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Contacts fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
  }

  return NextResponse.json({ contacts: data || [], total: count ?? 0, limit, offset });
}

// POST /api/contacts — create a new contact (uses supabaseAdmin to bypass RLS)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountId } = body;

    if (!accountId) return NextResponse.json({ error: 'accountId required' }, { status: 400 });

    const auth = await requireAccountAccess(request, accountId);
    if (auth instanceof NextResponse) return auth;

    const { id: _id, created_at: _ca, accountId: _aid, ...contactFields } = body;

    const { data, error } = await supabaseAdmin
      .from('contacts')
      .insert({ ...contactFields, account_id: accountId })
      .select()
      .single();

    if (error) {
      console.error('Contact insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ contact: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/contacts?id=X&accountId=Y
export async function PATCH(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  const accountId = request.nextUrl.searchParams.get('accountId');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const auth = await requireAccountAccess(request, accountId);
  if (auth instanceof NextResponse) return auth;

  const updates = await request.json();
  // Strip fields that shouldn't be updated directly
  const { id: _id, account_id: _aid, created_at: _ca, ...safeUpdates } = updates;

  const { data, error } = await supabaseAdmin
    .from('contacts')
    .update(safeUpdates)
    .eq('id', id)
    .eq('account_id', accountId)
    .select()
    .single();

  if (error) {
    console.error('Contact update error:', error);
    return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 });
  }

  return NextResponse.json({ contact: data });
}

// DELETE /api/contacts?id=X&accountId=Y
export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  const accountId = request.nextUrl.searchParams.get('accountId');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const auth = await requireAccountAccess(request, accountId);
  if (auth instanceof NextResponse) return auth;

  const { error } = await supabaseAdmin
    .from('contacts')
    .delete()
    .eq('id', id)
    .eq('account_id', accountId);

  if (error) {
    console.error('Contact delete error:', error);
    return NextResponse.json({ error: 'Failed to delete contact' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
