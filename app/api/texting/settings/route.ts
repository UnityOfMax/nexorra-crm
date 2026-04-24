import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/require-account-access';
import { supabaseAdmin } from '@/lib/supabase';

const AGENCY_ACCOUNT_ID = 'da99b768-79dd-48f8-af86-abf95e61a69f';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { data, error } = await supabaseAdmin
    .from('accounts')
    .select('settings')
    .eq('id', AGENCY_ACCOUNT_ID)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }

  const settings = (data.settings as Record<string, unknown>) ?? {};
  const texting_enabled = settings.texting_enabled !== false;

  return NextResponse.json({ texting_enabled });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  let body: { texting_enabled?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof body.texting_enabled !== 'boolean') {
    return NextResponse.json({ error: 'texting_enabled must be a boolean' }, { status: 400 });
  }

  // Fetch existing settings first so we can merge
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('accounts')
    .select('settings')
    .eq('id', AGENCY_ACCOUNT_ID)
    .maybeSingle();

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Failed to fetch existing settings' }, { status: 500 });
  }

  const merged = {
    ...((existing.settings as Record<string, unknown>) ?? {}),
    texting_enabled: body.texting_enabled,
  };

  const { error: updateError } = await supabaseAdmin
    .from('accounts')
    .update({ settings: merged })
    .eq('id', AGENCY_ACCOUNT_ID);

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
