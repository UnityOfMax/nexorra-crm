import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAccountAccess } from '@/lib/auth/require-account-access';

export async function POST(request: NextRequest) {
  const accountId = request.nextUrl.searchParams.get('accountId');
  if (!accountId) {
    return NextResponse.json({ error: 'accountId required' }, { status: 400 });
  }

  const auth = await requireAccountAccess(request, accountId);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const { id } = body as { id: string };
  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  // Verify the entry belongs to this account before cancelling (multi-tenant safety)
  const { data: entry } = await supabaseAdmin
    .from('ai_follow_up_queue')
    .select('id, account_id')
    .eq('id', id)
    .maybeSingle();

  if (!entry || entry.account_id !== accountId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { error } = await supabaseAdmin
    .from('ai_follow_up_queue')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('[follow-up-queue/cancel] error:', error);
    return NextResponse.json({ error: 'Failed to cancel' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
