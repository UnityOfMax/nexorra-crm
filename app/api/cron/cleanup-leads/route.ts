import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/cron/cleanup-leads — auto-delete expired leads across all 3 categories
// Schedule: daily via cron
export async function GET(request: NextRequest) {
  const cronSecret = request.headers.get('x-cron-secret');
  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString();

  const results: Record<string, number> = {};

  // 1. Email leads: delete 2 days after pushed to Instantly
  const { data: emailDeleted } = await supabaseAdmin
    .from('leads')
    .delete()
    .eq('lead_category', 'email')
    .eq('pushed_to_instantly', true)
    .lt('scraped_at', twoDaysAgo)
    .select('id');
  results.email_deleted = emailDeleted?.length ?? 0;

  // 2. Calling leads: delete 1 hour after CSV download
  const { data: callingDeleted } = await supabaseAdmin
    .from('leads')
    .delete()
    .eq('lead_category', 'calling')
    .not('csv_downloaded_at', 'is', null)
    .lt('csv_downloaded_at', oneHourAgo)
    .select('id');
  results.calling_deleted = callingDeleted?.length ?? 0;

  // 3. Instagram leads: delete 15 days after DM sent with no reply
  const { data: igDeleted } = await supabaseAdmin
    .from('leads')
    .delete()
    .eq('lead_category', 'instagram')
    .eq('instagram_dm_sent', true)
    .not('instagram_status', 'in', '("replied","engaged","booked")')
    .lt('instagram_dm_sent_at', fifteenDaysAgo)
    .select('id');
  results.instagram_deleted = igDeleted?.length ?? 0;

  console.log('[cleanup-leads]', results);

  return NextResponse.json({
    success: true,
    cleaned: results,
    total: Object.values(results).reduce((a, b) => a + b, 0),
  });
}
