import { NextRequest, NextResponse } from 'next/server';
import { processAllPendingReplies } from '@/lib/instagram/auto-reply';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// POST /api/instagram/auto-reply
// Triggered by webhook or cron to process pending Instagram DM replies
export async function POST(request: NextRequest) {
  // Accept cron secret or internal trigger
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const isInternal = request.headers.get('x-internal-trigger') === 'true';

  if (!isInternal && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await processAllPendingReplies();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[ig-auto-reply] Route error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
