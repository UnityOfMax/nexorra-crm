import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/system/status
// Returns health of: daemon, Chrome (port 9222), cloudflared, Supabase
export async function GET(_request: NextRequest) {
  const daemonUrl = process.env.DAEMON_URL || 'http://localhost:4200';
  const cronSecret = process.env.CRON_SECRET || '';

  const [daemonResult, supabaseResult] = await Promise.allSettled([
    // Ping daemon
    fetch(`${daemonUrl}/status`, {
      headers: { 'x-cron-secret': cronSecret },
      signal: AbortSignal.timeout(3000),
    }).then(r => r.json()),
    // Ping Supabase (lightweight)
    supabaseAdmin.from('accounts').select('id').limit(1).single(),
  ]);

  const daemon = daemonResult.status === 'fulfilled';
  const daemonData = daemon ? (daemonResult.value as any) : null;

  // Chrome check: try to reach the DevTools protocol endpoint
  let chrome = false;
  try {
    const res = await fetch('http://localhost:9222/json/version', {
      signal: AbortSignal.timeout(1500),
    });
    chrome = res.ok;
  } catch {}

  // Cloudflared: check if daemon is reachable (implies cloudflared is up if DAEMON_URL is external)
  // On local: check if the cloudflared process is running via daemon status
  const cloudflared = daemon; // If daemon is up + accessible, cloudflared tunnel is up

  const supabase = supabaseResult.status === 'fulfilled' && !supabaseResult.value.error;

  return NextResponse.json({
    daemon,
    chrome,
    cloudflared,
    supabase,
    uptime: daemonData?.uptime ?? null,
    runningAgents: daemonData?.running ?? 0,
    agents: daemonData?.agents ?? [],
  });
}
