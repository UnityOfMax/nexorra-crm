export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/require-account-access';

// GET /api/daemon/status — Check daemon health
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const daemonUrl = process.env.DAEMON_URL;
  if (!daemonUrl) {
    return NextResponse.json({
      configured: false,
      message: 'DAEMON_URL not set — agents run locally or via SDK',
    });
  }

  try {
    const cronSecret = process.env.CRON_SECRET;
    const res = await fetch(`${daemonUrl}/status`, {
      headers: {
        'x-cron-secret': cronSecret || '',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return NextResponse.json({
        configured: true,
        online: false,
        error: `Daemon returned ${res.status}`,
      });
    }

    const data = await res.json();
    return NextResponse.json({
      configured: true,
      online: true,
      ...data,
    });
  } catch (err: any) {
    return NextResponse.json({
      configured: true,
      online: false,
      error: err.message,
    });
  }
}
