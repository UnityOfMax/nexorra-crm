import { NextRequest, NextResponse } from 'next/server';
import { requireAccountAccess } from '@/lib/auth/require-account-access';
import { getFunnelMetrics } from '@/lib/analytics/funnel';

export const dynamic = 'force-dynamic';

/**
 * GET /api/analytics/funnel?accountId=X&days=30
 *
 * Returns per-stage funnel metrics for the given account.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('accountId');
  const days = parseInt(searchParams.get('days') || '30', 10);

  const auth = await requireAccountAccess(request, accountId);
  if (auth instanceof NextResponse) return auth;

  const metrics = await getFunnelMetrics(accountId!, days);
  return NextResponse.json(metrics);
}
