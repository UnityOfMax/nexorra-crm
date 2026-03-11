import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth/require-account-access';

export const dynamic = 'force-dynamic';

async function authenticateCronOrUser(request: NextRequest): Promise<{ userId: string } | NextResponse> {
  const cronSecret = request.headers.get('x-cron-secret');
  if (cronSecret && cronSecret === process.env.CRON_SECRET) {
    return { userId: 'cron' };
  }
  return requireAuth(request);
}

// GET /api/agents — all agent configs with latest run
export async function GET(request: NextRequest) {
  const auth = await authenticateCronOrUser(request);
  if (auth instanceof NextResponse) return auth;

  const { data: agents, error } = await supabaseAdmin
    .from('agent_configs')
    .select('*')
    .neq('category', 'hidden')
    .order('category')
    .order('name');

  if (error) {
    console.error('Agent configs fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
  }

  // Fetch latest run per agent
  const agentIds = (agents || []).map(a => a.id);
  const { data: latestRuns } = await supabaseAdmin
    .from('agent_runs')
    .select('*')
    .in('agent_id', agentIds)
    .order('started_at', { ascending: false });

  // Build map of agent_id -> latest run
  const latestRunMap: Record<string, any> = {};
  for (const run of latestRuns || []) {
    if (!latestRunMap[run.agent_id]) {
      latestRunMap[run.agent_id] = run;
    }
  }

  // Compute avg_duration from last 5 completed runs per agent
  const { data: recentRuns } = await supabaseAdmin
    .from('agent_runs')
    .select('agent_id, duration_seconds')
    .in('agent_id', agentIds)
    .eq('status', 'completed')
    .not('duration_seconds', 'is', null)
    .order('started_at', { ascending: false })
    .limit(agentIds.length * 5);

  const durationMap: Record<string, number[]> = {};
  for (const run of recentRuns || []) {
    if (!durationMap[run.agent_id]) durationMap[run.agent_id] = [];
    if (durationMap[run.agent_id].length < 5) {
      durationMap[run.agent_id].push(run.duration_seconds);
    }
  }

  const avgDurationMap: Record<string, number> = {};
  for (const [agentId, durations] of Object.entries(durationMap)) {
    avgDurationMap[agentId] = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
  }

  const agentsWithRuns = (agents || []).map(agent => ({
    ...agent,
    latest_run: latestRunMap[agent.id] || null,
    avg_duration: avgDurationMap[agent.id] || (agent.max_turns ? agent.max_turns * 3 : 120),
  }));

  return NextResponse.json({ agents: agentsWithRuns });
}

// PATCH /api/agents?id=lead-gen — update is_enabled
export async function PATCH(request: NextRequest) {
  const auth = await authenticateCronOrUser(request);
  if (auth instanceof NextResponse) return auth;

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const updates = await request.json();
  const allowedFields = ['is_enabled', 'max_turns', 'model'];
  const safeUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
  for (const key of allowedFields) {
    if (key in updates) safeUpdates[key] = updates[key];
  }

  const { data, error } = await supabaseAdmin
    .from('agent_configs')
    .update(safeUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Agent config update error:', error);
    return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 });
  }

  return NextResponse.json({ agent: data });
}
