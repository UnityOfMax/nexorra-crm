import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/agents/daemon-status — running agents from daemon + DB
export async function GET() {
  const agents: Array<{ agentId: string; runId: string; uptime: number }> = [];
  const seenIds = new Set<string>();

  // Source 1: daemon in-memory (agents started via /run)
  try {
    const daemonUrl = process.env.DAEMON_URL || 'http://localhost:4200';
    const cronSecret = process.env.CRON_SECRET || '';
    const res = await fetch(`${daemonUrl}/status`, {
      headers: { 'x-cron-secret': cronSecret },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      for (const a of data.agents || []) {
        agents.push({ agentId: a.agentId, runId: a.runId, uptime: a.uptime || 0 });
        seenIds.add(a.agentId);
      }
    }
  } catch {}

  // Source 2: DB agent_runs with status=running (catches Telegram/external spawns)
  try {
    const { data: dbRunning } = await supabaseAdmin
      .from('agent_runs')
      .select('id, agent_id, started_at')
      .eq('status', 'running');
    if (dbRunning) {
      for (const run of dbRunning) {
        if (!seenIds.has(run.agent_id)) {
          const uptime = Math.round((Date.now() - new Date(run.started_at).getTime()) / 1000);
          if (uptime < 7200) { // ignore runs older than 2h (truly stale)
            agents.push({ agentId: run.agent_id, runId: run.id, uptime });
            seenIds.add(run.agent_id);
          }
        }
      }
    }
  } catch {}

  return NextResponse.json({ running: agents.length, agents });
}
