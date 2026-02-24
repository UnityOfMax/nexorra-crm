import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAccountAccess } from '@/lib/auth/require-account-access';

const ALLOWED_FIELDS = [
  'ai_enabled',
  'first_name',
  'last_name',
  'email',
  'phone',
  'company',
  'status',
  'source',
  'tags',
  'custom_fields',
];

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  const { data: contact, error: fetchError } = await supabaseAdmin
    .from('contacts')
    .select('account_id')
    .eq('id', id)
    .single();

  if (fetchError || !contact) {
    return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
  }

  const auth = await requireAccountAccess(request, contact.account_id);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();

  // Only allow safe fields
  const updates: Record<string, any> = {};
  for (const key of ALLOWED_FIELDS) {
    if (key in body) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('contacts')
    .update(updates)
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
