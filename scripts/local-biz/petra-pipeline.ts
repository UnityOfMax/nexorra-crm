#!/usr/bin/env npx tsx
/**
 * Petra Pipeline Coordinator
 * Spawns N worker processes, each running the full scout→build→outreach loop.
 * Workers share a daily cap of 300 demos.
 *
 * Worker ports (reusing Derek's freed slots + Petra's existing):
 *   5 workers: 9232, 9233, 9234, 9235, 9236
 *   7 workers: + 9237, 9238
 *
 * Usage:
 *   npx tsx scripts/local-biz/petra-pipeline.ts [--workers 5] [--daily-cap 300] [--dry-run]
 *
 * The cron script (petra-pipeline.sh) launches Chrome on each port first,
 * then calls this coordinator.
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(__dirname, '../../.env.local') });

import { createClient } from '@supabase/supabase-js';
import { spawn } from 'child_process';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// ── CLI args ─────────────────────────────────────────────────────────────────

function getArg(flag: string, fallback: string): string {
  const idx = process.argv.indexOf(flag);
  return idx >= 0 ? (process.argv[idx + 1] || fallback) : fallback;
}

const WORKER_COUNT = parseInt(getArg('--workers',    '5'));
const DAILY_CAP    = parseInt(getArg('--daily-cap',  '300'));
const DRY_RUN      = process.argv.includes('--dry-run');

// Chrome ports for Petra workers — 9232 is existing, 9233-9238 are new
const WORKER_PORTS = [9232, 9233, 9234, 9235, 9236, 9237, 9238].slice(0, WORKER_COUNT);

// ── Daily cap check ───────────────────────────────────────────────────────────

async function countBuiltToday(): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  const { count } = await supabaseAdmin
    .from('local_biz_leads')
    .select('id', { count: 'exact', head: true })
    .not('demo_page_id', 'is', null)
    .gte('created_at', `${today}T00:00:00Z`);
  return count || 0;
}

// ── Spawn a worker subprocess ─────────────────────────────────────────────────

function spawnWorker(workerId: number, port: number, cap: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = [
      'tsx',
      'scripts/local-biz/petra-worker.ts',
      '--worker', String(workerId),
      '--port',   String(port),
      '--cap',    String(cap),
    ];
    if (DRY_RUN) args.push('--dry-run');

    console.log(`[petra] Spawning worker ${workerId} on port ${port} (cap ${cap}${DRY_RUN ? ', dry-run' : ''})`);

    const child = spawn('npx', args, {
      cwd:   resolve(__dirname, '../..'),
      stdio: 'inherit',  // workers log directly to the same stdout/stderr
      env:   { ...process.env },
    });

    child.on('exit', (code) => {
      if (code === 0 || code === null) {
        console.log(`[petra] Worker ${workerId} finished.`);
        resolve();
      } else {
        console.error(`[petra] Worker ${workerId} exited with code ${code}.`);
        resolve(); // Don't reject — one worker failing shouldn't abort others
      }
    });

    child.on('error', (err) => {
      console.error(`[petra] Worker ${workerId} spawn error: ${err.message}`);
      resolve();
    });
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const t0 = Date.now();
  console.log(`[petra] Pipeline starting — ${WORKER_COUNT} workers, daily cap ${DAILY_CAP}`);

  // Check how many demos were already built today (e.g. from a prior run)
  const alreadyBuilt = await countBuiltToday();
  const remaining = DAILY_CAP - alreadyBuilt;

  if (remaining <= 0) {
    console.log(`[petra] Daily cap already reached (${alreadyBuilt}/${DAILY_CAP}). Nothing to do.`);
    return;
  }

  console.log(`[petra] ${alreadyBuilt} demos already built today. ${remaining} remaining.`);

  // Distribute remaining budget evenly across workers
  const perWorkerCap = Math.ceil(remaining / WORKER_COUNT);

  // Launch all workers in parallel
  const workerPromises = WORKER_PORTS.map((port, i) =>
    spawnWorker(i, port, perWorkerCap)
  );

  await Promise.all(workerPromises);

  const elapsedMin = ((Date.now() - t0) / 60000).toFixed(1);

  // Final tally
  const finalBuilt = await countBuiltToday();
  console.log(`[petra] Pipeline complete — ${finalBuilt} demos built today (${elapsedMin} min)`);
}

main().catch(err => {
  console.error('[petra] FATAL:', err.message);
  process.exit(1);
});
