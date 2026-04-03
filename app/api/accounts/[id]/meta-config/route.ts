import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAccountAccess } from '@/lib/auth/require-account-access';

// GET /api/accounts/[id]/meta-config
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const accountId = params.id;

  const auth = await requireAccountAccess(request, accountId);
  if (auth instanceof NextResponse) return auth;

  const { data, error } = await supabaseAdmin
    .from('accounts')
    .select('meta_page_id, meta_ad_account_id')
    .eq('id', accountId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

// PATCH /api/accounts/[id]/meta-config
// Body: { meta_page_id?: string, meta_ad_account_id?: string }
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const accountId = params.id;

  const auth = await requireAccountAccess(request, accountId);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const update: Record<string, string | null> = {};

  if ('meta_page_id' in body)       update.meta_page_id       = body.meta_page_id || null;
  if ('meta_ad_account_id' in body) update.meta_ad_account_id = body.meta_ad_account_id || null;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('accounts')
    .update(update)
    .eq('id', accountId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
