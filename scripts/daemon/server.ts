import http from 'http';
import crypto from 'crypto';
import { readFileSync, existsSync } from 'fs';
import { spawn } from 'child_process';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { AGENT_DEFINITIONS, resolveAgent } from '../../lib/agents/definitions';
import { spawnAgent, stopAgent, getRunningAgents, cleanupOrphanedRuns } from './process-manager';

const CLAUDE_CLI = '/home/max/.npm-global/bin/claude';

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

    // POST /generate — AI text generation via CLI (subscription auth)
    if (method === 'POST' && url.pathname === '/generate') {
      const rawBody = await parseBody(req);
      if (!verifyHmac(rawBody, req.headers['x-signature'] as string)) {
        return json(res, { error: 'Invalid signature' }, 403);
      }

      const { model, system, messages, maxTokens } = JSON.parse(rawBody);

      // Format prompt: system instructions + conversation history
      const promptParts: string[] = [];
      if (system) {
        promptParts.push(`<system>\n${system}\n</system>`);
      }
      if (messages && messages.length > 0) {
        const conv = messages
          .map((m: any) => `${m.role === 'user' ? 'Human' : 'Assistant'}: ${typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}`)
          .join('\n\n');
        promptParts.push(conv);
      }
      promptParts.push('\nRespond with only the next assistant message. No labels, no "Assistant:" prefix, no meta-commentary.');
      const prompt = promptParts.join('\n\n');

      // Map SDK model names to CLI shortnames
      let cliModel = 'haiku';
      if (model?.includes('sonnet')) cliModel = 'sonnet';
      else if (model?.includes('opus')) cliModel = 'opus';

      const { ANTHROPIC_API_KEY: _ak, ...cliEnv } = process.env;

      return new Promise<void>((resolve) => {
        let settled = false;
        const child = spawn(CLAUDE_CLI, [
          '-p', prompt,
          '--model', cliModel,
          '--max-turns', '1',
          '--output-format', 'stream-json',
        ], {
          cwd: CRM_ROOT,
          env: {
            ...cliEnv,
            PATH: `/home/max/.npm-global/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH || ''}`,
          },
        });

        let stdout = '';
        let stderr = '';
        child.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
        child.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });

        child.on('close', (code) => {
          if (settled) return;
          settled = true;

          // Parse stream-json output for the result text
          let resultText = '';
          const lines = stdout.split('\n').filter(Boolean);
          for (const line of lines) {
            try {
              const event = JSON.parse(line);
              if (event.type === 'result') {
                resultText = event.result || '';
              }
            } catch {}
          }

          if (!resultText && code !== 0) {
            json(res, { error: stderr || `CLI exited with code ${code}` }, 500);
          } else {
            json(res, { text: resultText, usage: { input: 0, output: 0 } });
          }
          resolve();
        });

        // Timeout after 2 minutes
        const timeout = setTimeout(() => {
          if (settled) return;
          settled = true;
          child.kill();
          json(res, { error: 'Generate timed out (120s)' }, 504);
          resolve();
        }, 120_000);

        child.on('close', () => clearTimeout(timeout));
      });
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

// ─── Agent Message Poller ──────────────────────────────────────────────────
// Watches agent_messages table for pending tasks and spawns the target agent.
// When complete, updates the message and notifies via Telegram.

const POLL_INTERVAL_MS = 15_000; // 15 seconds
const processingMessages = new Set<string>(); // prevent double-processing

async function pollAgentMessages() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: pending } = await supabase
      .from('agent_messages')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(5);

    if (!pending || pending.length === 0) return;

    for (const msg of pending) {
      if (processingMessages.has(msg.id)) continue;

      const resolved = resolveAgent(msg.to_agent);
      if (!resolved) {
        console.log(`[poller] Unknown agent: ${msg.to_agent} — skipping message ${msg.id}`);
        await supabase.from('agent_messages').update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          result: { error: `Unknown agent: ${msg.to_agent}` },
        }).eq('id', msg.id);
        continue;
      }

      // Check if this agent is already running
      const running = getRunningAgents();
      if (running.some(r => r.agentId === resolved.agentId)) {
        continue; // Wait for it to finish
      }

      processingMessages.add(msg.id);
      console.log(`[poller] Processing message ${msg.id} → ${resolved.def.displayName} (${resolved.agentId})`);

      // Mark as acknowledged
      await supabase.from('agent_messages').update({ status: 'acknowledged' }).eq('id', msg.id);

      // Build context from the message payload
      const taskText = msg.payload?.text || JSON.stringify(msg.payload);
      const taskContext = `\n\n---\nYou have a new task from ${msg.from_agent}:\n${taskText}\n\nPriority: ${msg.payload?.urgency || 'normal'}\nMessage ID: ${msg.id}\n---`;

      try {
        // Spawn the agent with the task context appended to the prompt
        const result = await spawnAgent({
          agentId: resolved.agentId,
          promptFile: resolved.def.promptFile,
          model: resolved.def.model,
          maxTurns: Math.min(resolved.def.maxTurns, 30), // Cap at 30 for message-triggered tasks
          trigger: 'message',
          extraContext: taskContext,
        });

        console.log(`[poller] Spawned ${resolved.def.displayName} — run ${result.runId}`);

        // Watch for completion (poll every 5s for up to 10 min)
        const watchCompletion = async () => {
          for (let i = 0; i < 120; i++) {
            await new Promise(r => setTimeout(r, 5000));
            const still = getRunningAgents().find(r => r.runId === result.runId);
            if (!still) {
              // Agent finished — get the run result
              const { data: run } = await supabase
                .from('agent_runs')
                .select('status, summary, error_message, duration_seconds')
                .eq('id', result.runId)
                .maybeSingle();

              const resultPayload = {
                run_id: result.runId,
                status: run?.status || 'completed',
                summary: run?.summary || null,
                error: run?.error_message || null,
                duration: run?.duration_seconds || null,
              };

              await supabase.from('agent_messages').update({
                status: run?.status === 'failed' ? 'failed' : 'completed',
                completed_at: new Date().toISOString(),
                result: resultPayload,
              }).eq('id', msg.id);

              // Notify via Telegram as Lena (she's the single point of contact)
              if (msg.payload?.chat_id) {
                const botToken = process.env.TELEGRAM_BOT_TOKEN;
                if (botToken) {
                  const agentName = resolved.def.displayName;
                  const failed = run?.status === 'failed';
                  const duration = run?.duration_seconds;
                  const summary = run?.summary
                    ? run.summary.slice(0, 500)
                    : (run?.error_message || null);

                  // Lena speaks naturally — not like a system notification
                  const successPhrases = [
                    `${agentName} just finished up.`,
                    `Done — ${agentName} handled it.`,
                    `${agentName}'s wrapped up on this.`,
                    `All done. ${agentName} took care of it.`,
                  ];
                  const failPhrases = [
                    `${agentName} ran into an issue.`,
                    `Heads up — ${agentName} hit a problem.`,
                    `${agentName} couldn't finish this one.`,
                  ];

                  const phrases = failed ? failPhrases : successPhrases;
                  const opener = phrases[Math.floor(Math.random() * phrases.length)];
                  let text = opener;
                  if (duration) text += ` (${duration}s)`;
                  if (summary) text += `\n\n${summary}`;
                  if (failed && run?.error_message) text += `\n\nError: ${run.error_message.slice(0, 300)}`;

                  fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      chat_id: msg.payload.chat_id,
                      text,
                      parse_mode: 'Markdown',
                    }),
                  }).catch(() => {});
                }
              }

              processingMessages.delete(msg.id);
              return;
            }
          }
          // Timed out watching
          processingMessages.delete(msg.id);
        };

        // Fire and forget the watcher
        watchCompletion().catch(e => {
          console.error(`[poller] Watch error for ${msg.id}:`, e);
          processingMessages.delete(msg.id);
        });

      } catch (err: any) {
        console.error(`[poller] Failed to spawn ${resolved.agentId}:`, err.message);
        await supabase.from('agent_messages').update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          result: { error: err.message },
        }).eq('id', msg.id);
        processingMessages.delete(msg.id);
      }
    }
  } catch (err: any) {
    console.error('[poller] Poll error:', err.message);
  }
}

// Start polling
setInterval(pollAgentMessages, POLL_INTERVAL_MS);
console.log(`[daemon] Message poller active (every ${POLL_INTERVAL_MS / 1000}s)`);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[daemon] Shutting down...');
  server.close(() => process.exit(0));
});
process.on('SIGINT', () => {
  console.log('[daemon] Shutting down...');
  server.close(() => process.exit(0));
});
