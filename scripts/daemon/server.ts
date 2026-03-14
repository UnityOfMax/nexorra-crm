import http from 'http';
import crypto from 'crypto';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { AGENT_DEFINITIONS } from '../../lib/agents/definitions';
import { spawnAgent, stopAgent, getRunningAgents, cleanupOrphanedRuns } from './process-manager';

const CRM_ROOT = path.resolve(__dirname, '../..');

const PORT = parseInt(process.env.DAEMON_PORT || '4200', 10);
const CRON_SECRET = process.env.CRON_SECRET;
const SIGNING_KEY = process.env.DAEMON_SIGNING_KEY;

// Rate limiting: max 10 requests/minute
const requestLog: number[] = [];
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(): boolean {
  const now = Date.now();
  // Remove entries older than window
  while (requestLog.length > 0 && requestLog[0] < now - RATE_WINDOW_MS) {
    requestLog.shift();
  }
  if (requestLog.length >= RATE_LIMIT) return false;
  requestLog.push(now);
  return true;
}

function verifyHmac(body: string, signature: string | undefined): boolean {
  if (!SIGNING_KEY || !signature) return !SIGNING_KEY; // skip if no key configured
  const expected = crypto.createHmac('sha256', SIGNING_KEY).update(body).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

function verifyCronSecret(headerValue: string | undefined): boolean {
  if (!CRON_SECRET) {
    console.warn('[daemon] CRON_SECRET not set — rejecting all requests');
    return false;
  }
  return headerValue === CRON_SECRET;
}

function parseBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}

function json(res: http.ServerResponse, data: any, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://localhost:${PORT}`);
  const method = req.method?.toUpperCase();

  // Rate limiting
  if (!checkRateLimit()) {
    return json(res, { error: 'Rate limit exceeded (10/min)' }, 429);
  }

  // Auth: CRON_SECRET required on all requests
  if (!verifyCronSecret(req.headers['x-cron-secret'] as string)) {
    return json(res, { error: 'Unauthorized' }, 401);
  }

  try {
    // GET /status
    if (method === 'GET' && url.pathname === '/status') {
      const agents = getRunningAgents();
      return json(res, {
        status: 'ok',
        uptime: process.uptime(),
        running: agents.length,
        agents,
        availableAgents: Object.keys(AGENT_DEFINITIONS),
      });
    }

    // GET /runs/:id/logs — stream JSONL log file for a run
    if (method === 'GET' && url.pathname.match(/^\/runs\/[^/]+\/logs$/)) {
      const runId = url.pathname.split('/runs/')[1].split('/logs')[0];
      // Validate runId format (UUID)
      if (!/^[0-9a-f-]{36}$/.test(runId)) {
        return json(res, { error: 'Invalid runId' }, 400);
      }
      const logFile = path.join(CRM_ROOT, 'logs', 'runs', `${runId}.jsonl`);
      if (!existsSync(logFile)) {
        return json(res, { events: [], isComplete: false, summary: null });
      }
      try {
        const content = readFileSync(logFile, 'utf-8');
        // Return raw content — the API route handles parsing
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        return res.end(content);
      } catch (err: any) {
        return json(res, { error: err.message }, 500);
      }
    }

    // GET /runs/:id
    if (method === 'GET' && url.pathname.startsWith('/runs/')) {
      const runId = url.pathname.split('/runs/')[1];
      const agents = getRunningAgents();
      const running = agents.find((a) => a.runId === runId);
      return json(res, { runId, running: !!running, details: running || null });
    }

    // POST /run
    if (method === 'POST' && url.pathname === '/run') {
      const rawBody = await parseBody(req);

      // HMAC verification
      if (!verifyHmac(rawBody, req.headers['x-signature'] as string)) {
        return json(res, { error: 'Invalid signature' }, 403);
      }

      const body = JSON.parse(rawBody);
      const { agentId, trigger = 'daemon' } = body;

      if (!agentId) {
        return json(res, { error: 'agentId required' }, 400);
      }

      const def = AGENT_DEFINITIONS[agentId];
      if (!def) {
        return json(res, { error: `Unknown agent: ${agentId}`, available: Object.keys(AGENT_DEFINITIONS) }, 404);
      }

      const result = await spawnAgent({
        agentId,
        promptFile: def.promptFile,
        model: def.model,
        maxTurns: def.maxTurns,
        trigger,
      });

      const status = result.status === 'already_running' ? 409 : 200;
      return json(res, result, status);
    }

    // PATCH /runs/:id — update run status (used by cron wrapper scripts)
    if (method === 'PATCH' && url.pathname.startsWith('/runs/')) {
      const runId = url.pathname.split('/runs/')[1];
      const rawBody = await parseBody(req);
      const updates = JSON.parse(rawBody);
      const allowedFields = ['status', 'finished_at', 'duration_seconds', 'summary', 'error_message', 'cost_usd', 'input_tokens', 'output_tokens', 'num_turns'];
      const safeUpdates: Record<string, any> = {};
      for (const key of allowedFields) {
        if (key in updates) safeUpdates[key] = updates[key];
      }
      if (safeUpdates.status && safeUpdates.status !== 'running' && !safeUpdates.finished_at) {
        safeUpdates.finished_at = new Date().toISOString();
      }

      // Import supabaseAdmin from process-manager's module scope
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      const { data, error } = await supabase.from('agent_runs').update(safeUpdates).eq('id', runId).select().single();
      if (error) return json(res, { error: error.message }, 500);
      return json(res, { run: data });
    }

    // DELETE /runs/:id
    if (method === 'DELETE' && url.pathname.startsWith('/runs/')) {
      const runId = url.pathname.split('/runs/')[1];
      const stopped = await stopAgent(runId);
      return json(res, { success: stopped, runId });
    }

    // 404
    return json(res, { error: 'Not found' }, 404);
  } catch (err: any) {
    console.error('[daemon] Error:', err.message);
    return json(res, { error: err.message }, 500);
  }
});

// Clean up orphaned runs before accepting requests
cleanupOrphanedRuns().then((count) => {
  if (count > 0) console.log(`[daemon] Cleaned up ${count} orphaned run(s)`);

  server.listen(PORT, '127.0.0.1', () => {
    console.log(`[daemon] Nexorra Agent Daemon running on http://127.0.0.1:${PORT}`);
    console.log(`[daemon] Available agents: ${Object.keys(AGENT_DEFINITIONS).join(', ')}`);
    if (!CRON_SECRET) console.warn('[daemon] WARNING: CRON_SECRET not set — all requests will be rejected');
    if (!SIGNING_KEY) console.warn('[daemon] WARNING: DAEMON_SIGNING_KEY not set — HMAC verification disabled');
  });
}).catch((err) => {
  console.error('[daemon] Failed to clean up orphaned runs:', err.message);
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`[daemon] Nexorra Agent Daemon running on http://127.0.0.1:${PORT}`);
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[daemon] Shutting down...');
  server.close(() => process.exit(0));
});
process.on('SIGINT', () => {
  console.log('[daemon] Shutting down...');
  server.close(() => process.exit(0));
});
