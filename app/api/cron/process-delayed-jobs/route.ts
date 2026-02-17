import { NextRequest, NextResponse } from 'next/server';
import { processDelayedJobs } from '@/lib/workflow-engine/scheduler';

// GET /api/cron/process-delayed-jobs - Process pending delayed workflow jobs
export async function GET(request: NextRequest) {
  try {
    // Optional: Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[CRON] Processing delayed jobs...');
    const processed = await processDelayedJobs();

    return NextResponse.json({
      success: true,
      processed,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[CRON] Error processing delayed jobs:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process delayed jobs' },
      { status: 500 }
    );
  }
}

// Also support POST for flexibility
export async function POST(request: NextRequest) {
  return GET(request);
}
