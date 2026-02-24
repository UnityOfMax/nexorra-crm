import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// POST /api/push/subscribe
// Body: { accountId, endpoint, keys: { p256dh, auth } }
// Upserts a push subscription for the currently authenticated user.
export async function POST(request: NextRequest) {
  try {
    // Identify the calling user via session cookie
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accountId, endpoint, keys } = await request.json();

    if (!accountId || !endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json(
        { error: 'accountId, endpoint, and keys (p256dh, auth) are required' },
        { status: 400 }
      );
    }

    // Upsert the subscription — one row per (user_id, endpoint) pair
    const { error } = await supabaseAdmin
      .from('push_subscriptions')
      .upsert(
        {
          user_id: user.id,
          account_id: accountId,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
        },
        { onConflict: 'user_id,endpoint' }
      );

    if (error) {
      console.error('[push/subscribe] DB error:', error.message);
      return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[push/subscribe] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
