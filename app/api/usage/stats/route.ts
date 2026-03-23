import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/usage/stats — daily and weekly token usage stats
export async function GET(_request: NextRequest) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  // Start of week (Monday)
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset).toISOString();

  // Daily runs
  const { data: dailyRuns } = await supabaseAdmin
    .from('agent_runs')
    .select('input_tokens, output_tokens')
    .gte('started_at', todayStart)
    .not('input_tokens', 'is', null);

  // Weekly runs
  const { data: weeklyRuns } = await supabaseAdmin
    .from('agent_runs')
    .select('input_tokens, output_tokens')
    .gte('started_at', weekStart)
    .not('input_tokens', 'is', null);

  const sumTokens = (runs: any[] | null) => {
    if (!runs) return 0;
    return runs.reduce((acc, r) => acc + (r.input_tokens || 0) + (r.output_tokens || 0), 0);
  };

  const dailyTokens = sumTokens(dailyRuns);
  const weeklyTokens = sumTokens(weeklyRuns);

  // Claude Max subscription: 5-hour rolling window
  // No API to read actual remaining — we track our own usage
  const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();
  const { data: windowRuns } = await supabaseAdmin
    .from('agent_runs')
    .select('input_tokens, output_tokens, cost_usd, duration_seconds')
    .gte('started_at', fiveHoursAgo)
    .not('input_tokens', 'is', null);

  const windowTokens = sumTokens(windowRuns);
  const windowCost = (windowRuns || []).reduce((acc, r) => acc + (r.cost_usd || 0), 0);
  const windowRuns5h = windowRuns?.length || 0;

  // Also count runs even if tokens are null (they still consumed quota)
  const { count: dailyRunCount } = await supabaseAdmin
    .from('agent_runs')
    .select('id', { count: 'exact', head: true })
    .gte('started_at', todayStart);

  const { count: windowRunCount } = await supabaseAdmin
    .from('agent_runs')
    .select('id', { count: 'exact', head: true })
    .gte('started_at', fiveHoursAgo);

  // Soft limits — estimate based on Max plan tier
  const windowLimit = parseInt(process.env.WINDOW_TOKEN_LIMIT || '2000000', 10);
  const dailyLimit = parseInt(process.env.DAILY_TOKEN_LIMIT || '5000000', 10);

  return NextResponse.json({
    // 5-hour rolling window (matches Claude's rate limit window)
    window: windowTokens,
    windowLimit,
    windowRuns: windowRuns5h,
    windowRunCount: windowRunCount || 0,
    windowCost: Math.round(windowCost * 1000) / 1000,
    // Daily
    daily: dailyTokens,
    dailyLimit,
    dailyRuns: dailyRuns?.length || 0,
    dailyRunCount: dailyRunCount || 0,
    // Weekly
    weekly: weeklyTokens,
    weeklyRuns: weeklyRuns?.length || 0,
  });
}
