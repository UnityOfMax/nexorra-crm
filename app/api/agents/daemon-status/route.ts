import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/agents/daemon-status — poll daemon directly for running agents
export async function GET() {
  try {
    const daemonUrl = process.env.DAEMON_URL || 'http://localhost:4200';
    const cronSecret = process.env.CRON_SECRET || '';
    const res = await fetch(`${daemonUrl}/status`, {
      headers: { 'x-cron-secret': cronSecret },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({
        running: data.running || 0,
        agents: (data.agents || []).map((a: any) => ({
          agentId: a.agentId,
          runId: a.runId,
          uptime: a.uptime || 0,
        })),
      });
    }
    return NextResponse.json({ running: 0, agents: [] });
  } catch {
    return NextResponse.json({ running: 0, agents: [] });
  }
}
