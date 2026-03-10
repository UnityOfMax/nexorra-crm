/**
 * Trigger an agent run from a webhook.
 *
 * This makes an internal HTTP call to POST /api/agents/runs which
 * spawns the agent as a detached process. If the agent is already
 * running, the 409 response is silently ignored — the running agent
 * will pick up the new work.
 *
 * Fire-and-forget: errors are logged but never thrown.
 */
export async function triggerAgentRun(agentId: string): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.warn(`[trigger-run] CRON_SECRET not set, cannot trigger agent: ${agentId}`);
    return;
  }

  try {
    const res = await fetch(`${baseUrl}/api/agents/runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': cronSecret,
      },
      body: JSON.stringify({ agentId, trigger: 'webhook' }),
    });

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
