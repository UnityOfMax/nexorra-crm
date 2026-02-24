import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Verifies the calling user is authenticated (no account-membership check).
 * Use for routes like push/subscribe where only a valid session is required.
 *
 * Usage:
 *   const auth = await requireAuth(request);
 *   if (auth instanceof NextResponse) return auth;
 *   const { userId } = auth;
 */
export async function requireAuth(
  request: NextRequest
): Promise<{ userId: string } | NextResponse> {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return { userId: user.id };
}

/**
 * Verifies the calling user is authenticated and is a member of the requested account.
 *
 * Returns the authenticated userId on success.
 * Throws a NextResponse (401 or 403) on failure — callers must return this immediately.
 *
 * Usage in a route handler:
 *   const authResult = await requireAccountAccess(request, accountId);
 *   if (authResult instanceof NextResponse) return authResult;
 *   const { userId } = authResult;
 */
export async function requireAccountAccess(
  request: NextRequest,
  accountId: string | null | undefined
): Promise<{ userId: string } | NextResponse> {
  if (!accountId) {
    return NextResponse.json({ error: 'accountId is required' }, { status: 400 });
  }

  // Get the current user from the session cookie
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 1. Direct membership — user belongs to this account
  const { data: directMembership } = await supabaseAdmin
    .from('account_members')
    .select('user_id')
    .eq('account_id', accountId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (directMembership) return { userId: user.id };

  // 2. Agency parent access — user belongs to the parent agency that owns this account
  const { data: account } = await supabaseAdmin
    .from('accounts')
    .select('parent_account_id')
    .eq('id', accountId)
    .maybeSingle();

  if (account?.parent_account_id) {
    const { data: agencyMembership } = await supabaseAdmin
      .from('account_members')
      .select('user_id')
      .eq('account_id', account.parent_account_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (agencyMembership) return { userId: user.id };
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
