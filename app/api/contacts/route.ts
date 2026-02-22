import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/contacts?accountId=X
// Uses supabaseAdmin to bypass RLS so agency owners can view sub-account contacts.
export async function GET(request: NextRequest) {
  const accountId = request.nextUrl.searchParams.get('accountId');
  if (!accountId) {
    return NextResponse.json({ error: 'accountId required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('contacts')
    .select('*')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Contacts fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
  }

  return NextResponse.json({ contacts: data || [] });
}

// PATCH /api/contacts?id=X&accountId=Y
export async function PATCH(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  const accountId = request.nextUrl.searchParams.get('accountId');
  if (!id || !accountId) {
    return NextResponse.json({ error: 'id and accountId required' }, { status: 400 });
  }

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
  if (!id || !accountId) {
    return NextResponse.json({ error: 'id and accountId required' }, { status: 400 });
  }

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
