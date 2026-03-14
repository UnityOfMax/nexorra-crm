import crypto from 'crypto';

/**
 * Trigger an agent run from a webhook or API route.
 *
 * Routes to either:
 * 1. The local daemon via cloudflared tunnel (if DAEMON_URL is set — Vercel production)
 * 2. The local API route (development)
 *
 * Fire-and-forget: errors are logged but never thrown.
 */
export async function triggerAgentRun(agentId: string): Promise<void> {
  const daemonUrl = process.env.DAEMON_URL;
  const cronSecret = process.env.CRON_SECRET;
  const signingKey = process.env.DAEMON_SIGNING_KEY;

  if (!cronSecret) {
    console.warn(`[trigger-run] CRON_SECRET not set, cannot trigger agent: ${agentId}`);
    return;
  }

  // Determine endpoint: daemon (Vercel prod) or local API (dev)
  const endpoint = daemonUrl
    ? `${daemonUrl}/run`
    : `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/agents/runs`;

  const body = JSON.stringify({ agentId, trigger: 'webhook' });

  // Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-cron-secret': cronSecret,
  };

  // Add HMAC signature when calling daemon
  if (daemonUrl && signingKey) {
    headers['x-signature'] = crypto.createHmac('sha256', signingKey).update(body).digest('hex');
  }

  try {
    const res = await fetch(endpoint, { method: 'POST', headers, body });

    if (res.status === 409) {
      // Agent already running — it will pick up the new work
      return;
    }

    if (!res.ok) {
      const text = await res.text();
      console.error(`[trigger-run] Failed to trigger ${agentId}: ${res.status} ${text}`);
    }
  } catch (err: any) {
    console.error(`[trigger-run] Error triggering ${agentId}:`, err.message);
  }
}
