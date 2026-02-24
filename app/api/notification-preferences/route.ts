import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('accountId');

  if (!accountId) {
    return NextResponse.json({ error: 'accountId is required' }, { status: 400 });
  }

  const supabaseAuth = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabaseAuth.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from('account_members')
    .select('notification_preferences')
    .eq('user_id', session.user.id)
    .eq('account_id', accountId)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ preferences: data.notification_preferences });
}

export async function PATCH(request: NextRequest) {
  const supabaseAuth = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabaseAuth.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { accountId, preferences } = await request.json();

  if (!accountId || !preferences) {
    return NextResponse.json({ error: 'accountId and preferences are required' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('account_members')
    .update({ notification_preferences: preferences })
    .eq('user_id', session.user.id)
    .eq('account_id', accountId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
