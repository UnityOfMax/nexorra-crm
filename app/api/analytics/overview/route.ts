import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/require-account-access';
import { getAgencyOverview } from '@/lib/analytics/funnel';

export const dynamic = 'force-dynamic';

/**
 * GET /api/analytics/overview
 *
 * Returns agency-wide analytics across all client accounts.
 * Requires authenticated session (agency users only).
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const overview = await getAgencyOverview();
  return NextResponse.json(overview);
}
