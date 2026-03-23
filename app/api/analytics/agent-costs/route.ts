import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth/require-account-access';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const days = parseInt(request.nextUrl.searchParams.get('days') || '7', 10);
  const since = new Date(Date.now() - days * 86400000).toISOString();

  // Per-agent totals
  const { data: agentTotals, error: err1 } = await supabaseAdmin
    .from('agent_runs')
    .select('agent_id, input_tokens, output_tokens, cost_usd, duration_seconds, status')
    .gte('started_at', since);

  if (err1) return NextResponse.json({ error: err1.message }, { status: 500 });

  const byAgent: Record<string, {
    agent_id: string;
    runs: number;
    completed: number;
    failed: number;
    total_input_tokens: number;
    total_output_tokens: number;
    total_cost_usd: number;
    total_duration_seconds: number;
  }> = {};

  for (const r of agentTotals || []) {
    if (!byAgent[r.agent_id]) {
      byAgent[r.agent_id] = {
        agent_id: r.agent_id, runs: 0, completed: 0, failed: 0,
        total_input_tokens: 0, total_output_tokens: 0, total_cost_usd: 0, total_duration_seconds: 0,
      };
    }
    const a = byAgent[r.agent_id];
    a.runs++;
    if (r.status === 'completed') a.completed++;
    if (r.status === 'failed') a.failed++;
    a.total_input_tokens += r.input_tokens || 0;
    a.total_output_tokens += r.output_tokens || 0;
    a.total_cost_usd += r.cost_usd || 0;
    a.total_duration_seconds += r.duration_seconds || 0;
  }

  // Per-day totals
  const { data: dailyRuns } = await supabaseAdmin
    .from('agent_runs')
    .select('started_at, input_tokens, output_tokens, cost_usd')
    .gte('started_at', since);

  const byDay: Record<string, { date: string; tokens: number; cost: number; runs: number }> = {};
  for (const r of dailyRuns || []) {
    const date = r.started_at?.slice(0, 10) || 'unknown';
    if (!byDay[date]) byDay[date] = { date, tokens: 0, cost: 0, runs: 0 };
    byDay[date].tokens += (r.input_tokens || 0) + (r.output_tokens || 0);
    byDay[date].cost += r.cost_usd || 0;
    byDay[date].runs++;
  }

  return NextResponse.json({
    period: { days, since },
    byAgent: Object.values(byAgent).sort((a, b) => b.total_cost_usd - a.total_cost_usd),
    byDay: Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date)),
    totals: {
      runs: (agentTotals || []).length,
      tokens: (agentTotals || []).reduce((sum, r) => sum + (r.input_tokens || 0) + (r.output_tokens || 0), 0),
      cost: (agentTotals || []).reduce((sum, r) => sum + (r.cost_usd || 0), 0),
    },
  });
}
