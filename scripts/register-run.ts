#!/usr/bin/env npx tsx
/**
 * Register an agent run in the DB so the CRM can track it.
 * Usage: npx tsx scripts/register-run.ts <agentId> [start|complete|fail]
 *
 * Called by agents that run outside the daemon (e.g. via Telegram session).
 */
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const agentId = process.argv[2];
const action = process.argv[3] || 'start';

if (!agentId) {
  console.error('Usage: register-run.ts <agentId> [start|complete|fail]');
  process.exit(1);
}

async function main() {
  if (action === 'start') {
    const runId = randomUUID();
    await supabase.from('agent_runs').insert({
      id: runId,
      agent_id: agentId,
      status: 'running',
      trigger: 'telegram',
      started_at: new Date().toISOString(),
    });
    // Write run ID to tmp file so the agent can complete it later
    const { writeFileSync, mkdirSync } = await import('fs');
    mkdirSync('tmp', { recursive: true });
    writeFileSync(`tmp/current-run-${agentId}.txt`, runId);
    console.log(runId);
  } else {
    // Read the current run ID
    const { readFileSync, unlinkSync } = await import('fs');
    let runId: string;
    try {
      runId = readFileSync(`tmp/current-run-${agentId}.txt`, 'utf-8').trim();
    } catch {
      console.error(`No active run for ${agentId}`);
      process.exit(1);
    }

    const status = action === 'complete' ? 'completed' : 'failed';
    await supabase.from('agent_runs').update({
      status,
      finished_at: new Date().toISOString(),
    }).eq('id', runId);

    try { unlinkSync(`tmp/current-run-${agentId}.txt`); } catch {}
    console.log(`${runId} → ${status}`);
  }
}

main().catch(console.error);
