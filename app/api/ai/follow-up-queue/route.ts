import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAccountAccess } from '@/lib/auth/require-account-access';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const accountId = request.nextUrl.searchParams.get('accountId');
  if (!accountId) {
    return NextResponse.json({ error: 'accountId required' }, { status: 400 });
  }

  const auth = await requireAccountAccess(request, accountId);
  if (auth instanceof NextResponse) return auth;

  const { data, error } = await supabaseAdmin
    .from('ai_follow_up_queue')
    .select('id, contact_id, channel, follow_up_count, next_follow_up_at, status, contacts(first_name, last_name, phone)')
    .eq('account_id', accountId)
    .eq('status', 'pending')
    .order('next_follow_up_at', { ascending: true })
    .limit(20);

  if (error) {
    console.error('[follow-up-queue] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch follow-up queue' }, { status: 500 });
  }

  return NextResponse.json({ queue: data ?? [] });
}
