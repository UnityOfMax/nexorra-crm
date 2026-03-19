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

  // Configurable limits (env vars or sensible defaults for Max plan)
  const dailyLimit = parseInt(process.env.DAILY_TOKEN_LIMIT || '5000000', 10);
  const weeklyLimit = parseInt(process.env.WEEKLY_TOKEN_LIMIT || '25000000', 10);

  return NextResponse.json({
    daily: dailyTokens,
    weekly: weeklyTokens,
    dailyLimit,
    weeklyLimit,
    dailyRuns: dailyRuns?.length || 0,
    weeklyRuns: weeklyRuns?.length || 0,
  });
}
