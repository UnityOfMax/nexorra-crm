import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAccountAccess } from '@/lib/auth/require-account-access';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('accountId');

  if (!accountId) {
    return NextResponse.json({ error: 'accountId is required' }, { status: 400 });
  }

  const auth = await requireAccountAccess(request, accountId);
  if (auth instanceof NextResponse) return auth;

  const { data, error } = await supabaseAdmin
    .from('account_members')
    .select('user_id, role, users:user_id(id, email, full_name)')
    .eq('account_id', accountId)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const members = (data || []).map((m: any) => ({
    id: m.user_id,
    email: m.users?.email || '',
    full_name: m.users?.full_name || '',
    role: m.role,
  }));

  return NextResponse.json({ members });
}
