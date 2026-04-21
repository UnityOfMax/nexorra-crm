import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAccountAccess } from '@/lib/auth/require-account-access';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const accountId = params.id;
  const auth = await requireAccountAccess(request, accountId);
  if (auth instanceof NextResponse) return auth;

  const { data: account, error } = await supabaseAdmin
    .from('accounts')
    .select('name, settings')
    .eq('id', accountId)
    .single();

  if (error || !account) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 });
  }

  return NextResponse.json({ name: account.name, ...(account.settings || {}) });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const accountId = params.id;

  const auth = await requireAccountAccess(request, accountId);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();

  // Fetch current settings to merge
  const { data: account, error: fetchError } = await supabaseAdmin
    .from('accounts')
    .select('settings')
    .eq('id', accountId)
    .single();

  if (fetchError || !account) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 });
  }

  const { error } = await supabaseAdmin
    .from('accounts')
    .update({
      settings: {
        ...account.settings,
        ...body.settings,
      },
    })
    .eq('id', accountId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
