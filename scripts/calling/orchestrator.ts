#!/usr/bin/env npx tsx
/**
 * orchestrator.ts — Calling outreach orchestrator.
 *
 * Runs during the calling window (cron starts at 2pm BST):
 *   1. Fetches next timezone-eligible calling lead
 *   2. Tells Audio Bridge to prepare a session
 *   3. Uses Claude computer use (dialer.ts) to initiate the call in OpenPhone
 *   4. Waits for call to end, records outcome
 *   5. Loops until calling window closes or no more leads
 *
 * Usage:
 *   npx tsx scripts/calling/orchestrator.ts              # normal run
 *   npx tsx scripts/calling/orchestrator.ts --test-lead <uuid>   # single test
 *   npx tsx scripts/calling/orchestrator.ts --dry-run           # fetch leads only
 */

import { execSync } from 'child_process';
import { randomUUID } from 'crypto';

// ─── Config ──────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CRON_SECRET  = process.env.CRON_SECRET!;
const OPENPHONE_NUMBER_1 = process.env.OPENPHONE_NUMBER_1 || '';
const AUDIO_BRIDGE_URL = 'http://127.0.0.1:5051';
const POLL_INTERVAL_MS = 30_000;    // 30s between lead fetches
const CALL_TIMEOUT_MS  = 5 * 60 * 1000;  // 5 min hard timeout per call

// Calling window: timezone → [BST start hour, BST end hour]
// When it's 9am–5pm in the prospect's local timezone, we call them
const TZ_WINDOWS: Record<string, [number, number]> = {
  EST: [14, 22],   // 9am-5pm EST = 2pm-10pm BST
  CST: [15, 23],   // 9am-5pm CST = 3pm-11pm BST
  MST: [16, 0],    // 9am-5pm MST = 4pm-12am BST (midnight)
  PST: [17, 1],    // 9am-5pm PST = 5pm-1am BST
};

// ─── Supabase helpers ─────────────────────────────────────────────────────────

function sbFetch(path: string, options: { method?: string; body?: object } = {}) {
  const method = options.method || 'GET';
  const bodyStr = options.body ? JSON.stringify(options.body) : undefined;

  const cmd = [
    'curl', '-s',
    '-X', method,
    `"${SUPABASE_URL}/rest/v1/${path}"`,
    '-H', `"apikey: ${SUPABASE_KEY}"`,
    '-H', `"Authorization: Bearer ${SUPABASE_KEY}"`,
    '-H', '"Content-Type: application/json"',
    '-H', '"Accept: application/json"',
    ...(bodyStr ? ['-d', `'${bodyStr.replace(/'/g, "'\\''")}'`] : []),
  ].join(' ');

  const result = execSync(cmd, { encoding: 'utf-8', timeout: 15_000 });
  return JSON.parse(result || '[]');
}

function patchLead(id: string, data: object) {
  execSync(
    `curl -s -X PATCH "${SUPABASE_URL}/rest/v1/leads?id=eq.${id}" ` +
    `-H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" ` +
    `-H "Content-Type: application/json" -H "Prefer: return=minimal" ` +
    `-d '${JSON.stringify(data).replace(/'/g, "'\\''")}'`,
    { encoding: 'utf-8', timeout: 10_000 },
  );
}

function insertCallSession(data: object): string {
  const result = execSync(
    `curl -s -X POST "${SUPABASE_URL}/rest/v1/call_sessions" ` +
    `-H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" ` +
    `-H "Content-Type: application/json" -H "Prefer: return=representation" ` +
    `-d '${JSON.stringify(data).replace(/'/g, "'\\''")}'`,
    { encoding: 'utf-8', timeout: 10_000 },
  );
  const rows = JSON.parse(result);
  return rows[0]?.id;
}

function updateCallSession(id: string, data: object) {
  execSync(
    `curl -s -X PATCH "${SUPABASE_URL}/rest/v1/call_sessions?id=eq.${id}" ` +
    `-H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" ` +
    `-H "Content-Type: application/json" -H "Prefer: return=minimal" ` +
    `-d '${JSON.stringify(data).replace(/'/g, "'\\''")}'`,
    { encoding: 'utf-8', timeout: 10_000 },
  );
}

// ─── Calling window check ─────────────────────────────────────────────────────

function isInCallingWindow(timezone: string): boolean {
  const window = TZ_WINDOWS[timezone];
  if (!window) return false;

  const bstHour = new Date().getUTCHours() + 1; // BST = UTC+1
  const [start, end] = window;

  if (end > start) {
    return bstHour >= start && bstHour < end;
  } else {
    // Wraps midnight
    return bstHour >= start || bstHour < end;
  }
}

// ─── Fetch next lead ──────────────────────────────────────────────────────────

function fetchNextLead(testLeadId?: string) {
  if (testLeadId) {
    const rows = sbFetch(`leads?id=eq.${testLeadId}&select=*`);
    return rows[0] || null;
  }

  // Fetch a batch and pick the first one in an active calling window
  const rows = sbFetch(
    'leads?lead_category=eq.calling&call_status=is.null&phone=not.is.null' +
    '&select=id,full_name,first_name,last_name,phone,city,state_province,timezone,source_brokerage' +
    '&order=scraped_at.asc&limit=50',
  );

  return rows.find((r: any) => isInCallingWindow(r.timezone)) ?? null;
}

// ─── Audio Bridge helpers ─────────────────────────────────────────────────────

async function bridgeStatus(): Promise<{ active: boolean }> {
  try {
    const resp = await fetch(`${AUDIO_BRIDGE_URL}/status`);
    return resp.json();
  } catch {
    return { active: false };
  }
}

async function bridgeStart(lead: any, callSessionId: string) {
  await fetch(`${AUDIO_BRIDGE_URL}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lead, call_session_id: callSessionId }),
  });
}

async function bridgeEnd(outcome: string) {
  await fetch(`${AUDIO_BRIDGE_URL}/end`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ outcome }),
  });
}

// ─── Single call ──────────────────────────────────────────────────────────────

async function runCall(lead: any): Promise<string> {
  const callRef = randomUUID();
  const callSessionId = insertCallSession({
    lead_id: lead.id,
    phone_to: lead.phone,
    phone_from: OPENPHONE_NUMBER_1,
    call_ref: callRef,
    status: 'queued',
    attempt_number: (lead.call_attempts || 0) + 1,
    called_at: new Date().toISOString(),
  });

  console.log(`\n[call] ${lead.full_name} — ${lead.phone} (${lead.city}, ${lead.timezone})`);
  console.log(`[call] Session: ${callSessionId}`);

  // Mark lead as queued
  patchLead(lead.id, { call_status: 'queued', call_attempts: (lead.call_attempts || 0) + 1 });
  updateCallSession(callSessionId, { status: 'ringing' });

  // Start audio bridge for this call
  await bridgeStart(lead, callSessionId);

  // Dial via Claude computer use
  const { dialNumber, monitorCallEnd } = await import('./dialer.js');
  const dialResult = await dialNumber(lead.phone, lead);
  console.log(`[call] Dial result: ${JSON.stringify(dialResult)}`);

  if (dialResult.status === 'failed' || dialResult.status === 'busy') {
    const outcome = dialResult.status === 'busy' ? 'busy' : 'failed';
    await bridgeEnd(outcome);
    updateCallSession(callSessionId, { status: outcome, outcome });
    patchLead(lead.id, {
      call_status: outcome === 'busy' ? 'no_answer' : 'failed',
      last_called_at: new Date().toISOString(),
    });
    return outcome;
  }

  if (dialResult.status === 'no_answer') {
    await bridgeEnd('no_answer');
    updateCallSession(callSessionId, { status: 'completed', outcome: 'no_answer' });
    patchLead(lead.id, { call_status: 'no_answer', last_called_at: new Date().toISOString() });
    return 'no_answer';
  }

  // Call is ringing / in progress — monitor until it ends
  updateCallSession(callSessionId, { status: 'in_progress' });
  const callEndOutcome = await monitorCallEnd();
  console.log(`[call] Ended — ${callEndOutcome}`);

  // Bridge will POST /api/internal/call-completed with transcript
  await bridgeEnd(callEndOutcome);

  patchLead(lead.id, {
    call_status: callEndOutcome === 'no_answer' ? 'no_answer' : 'called',
    last_called_at: new Date().toISOString(),
  });

  return callEndOutcome;
}

// ─── Main loop ────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const testLeadIdx = args.indexOf('--test-lead');
  const dryRun = args.includes('--dry-run');
  const testLeadId = testLeadIdx >= 0 ? args[testLeadIdx + 1] : undefined;

  console.log('=== Calling Orchestrator ===');
  console.log(`Mode: ${testLeadId ? 'single test' : dryRun ? 'dry-run' : 'live'}`);
  console.log(`OpenPhone number: ${OPENPHONE_NUMBER_1 || '(not set)'}`);
  console.log(`Audio Bridge: ${AUDIO_BRIDGE_URL}`);

  if (dryRun) {
    const lead = fetchNextLead();
    console.log('Next lead:', lead ? `${lead.full_name} (${lead.timezone})` : 'None available');
    return;
  }

  // Single test
  if (testLeadId) {
    const lead = fetchNextLead(testLeadId);
    if (!lead) { console.error('Lead not found'); process.exit(1); }
    await runCall(lead);
    return;
  }

  // Normal continuous loop
  console.log('Starting calling loop...');
  let idleCount = 0;

  while (true) {
    // Check if bridge is already on a call
    const status = await bridgeStatus();
    if (status.active) {
      console.log('[loop] Call in progress — waiting...');
      await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
      continue;
    }

    const lead = fetchNextLead();
    if (!lead) {
      idleCount++;
      if (idleCount >= 5) {
        console.log('[loop] No leads for 2.5 minutes — checking if calling window is still open...');
        // Check if any timezone is still in window
        const anyActive = Object.keys(TZ_WINDOWS).some(tz => isInCallingWindow(tz));
        if (!anyActive) {
          console.log('[loop] All calling windows closed. Shutting down.');
          break;
        }
        idleCount = 0;
      }
      await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
      continue;
    }

    idleCount = 0;
    await runCall(lead);

    // Short gap between calls
    await new Promise(r => setTimeout(r, 5000));
  }

  console.log('=== Calling session complete ===');
}

main().catch(err => {
  console.error('Orchestrator error:', err);
  process.exit(1);
});
