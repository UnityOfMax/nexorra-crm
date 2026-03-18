import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth/require-account-access';
import { subscribeAccountToWebhooks } from '@/lib/instagram/client';

export const dynamic = 'force-dynamic';

// POST /api/instagram/subscribe
// Subscribes all active Instagram accounts to the messages webhook field.
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const { data: accounts, error } = await supabaseAdmin
    .from('instagram_account_configs')
    .select('ig_account_id, username, access_token')
    .eq('active', true)
    .not('access_token', 'is', null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results: Array<{ username: string; success: boolean; error?: string }> = [];

  for (const acct of (accounts || [])) {
    if (acct.ig_account_id.startsWith('pending_')) {
      results.push({ username: acct.username, success: false, error: 'ig_account_id not yet set' });
      continue;
    }
    const result = await subscribeAccountToWebhooks(acct.ig_account_id);
    results.push({ username: acct.username, ...result });
  }

  return NextResponse.json({ results });
}
