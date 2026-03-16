import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth/require-account-access';
import { spawn } from 'child_process';
import { readFileSync, createWriteStream, mkdirSync, existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { AGENT_DEFINITIONS } from '@/lib/agents/definitions';

export const dynamic = 'force-dynamic';
// Allow up to 5 minutes for long-running agents on Vercel Pro
export const maxDuration = 300;

// In-memory PID map for stopping processes (only works on same server instance)
const runningProcesses = new Map<string, number>(); // runId -> pid

async function authenticateCronOrUser(request: NextRequest): Promise<{ userId: string } | NextResponse> {
  const cronSecret = request.headers.get('x-cron-secret');
  if (cronSecret && cronSecret === process.env.CRON_SECRET) {
    return { userId: 'cron' };
  }
  return requireAuth(request);
}

// GET /api/agents/runs?agentId=lead-gen&limit=20
export async function GET(request: NextRequest) {
  const auth = await authenticateCronOrUser(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = request.nextUrl;
  const agentId = searchParams.get('agentId');
  const limit = Math.min(Number(searchParams.get('limit') ?? 20), 100);

  let query = supabaseAdmin
    .from('agent_runs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit);

  if (agentId) query = query.eq('agent_id', agentId);

  const { data, error } = await query;

  if (error) {
    console.error('Agent runs fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch runs' }, { status: 500 });
  }

  return NextResponse.json({ runs: data || [] });
}

// POST /api/agents/runs — trigger a manual run
export async function POST(request: NextRequest) {
  const auth = await authenticateCronOrUser(request);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const { agentId, trigger = 'manual' } = body;

  if (!agentId) {
    return NextResponse.json({ error: 'agentId required' }, { status: 400 });
  }

  // Resolve agent definition: static map first, DB override for model/max_turns
  const staticDef = AGENT_DEFINITIONS[agentId];
  if (!staticDef) {
    return NextResponse.json({ error: `Unknown agent: ${agentId}` }, { status: 404 });
  }

  // Optional DB override for model/max_turns (non-fatal if table missing)
  const { data: dbAgent } = await supabaseAdmin
    .from('agent_configs')
    .select('model, max_turns')
    .eq('id', agentId)
    .maybeSingle();

  const agentModel = dbAgent?.model || staticDef.model;
  const agentMaxTurns = dbAgent?.max_turns || staticDef.maxTurns;

  // If DAEMON_URL is set (Vercel production), proxy to daemon — daemon handles dedup
  const daemonUrl = process.env.DAEMON_URL;
  if (daemonUrl) {
    const proxyBody = JSON.stringify({ agentId, trigger });
    const proxyHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-cron-secret': process.env.CRON_SECRET || '',
    };
    const signingKey = process.env.DAEMON_SIGNING_KEY;
    if (signingKey) {
      proxyHeaders['x-signature'] = crypto.createHmac('sha256', signingKey).update(proxyBody).digest('hex');
    }
    try {
      const res = await fetch(`${daemonUrl}/run`, { method: 'POST', headers: proxyHeaders, body: proxyBody });
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    } catch (err: any) {
      return NextResponse.json({ error: `Daemon unreachable: ${err.message}` }, { status: 502 });
    }
  }

  // Local execution: check for already-running runs (daemon handles its own dedup)
  const { data: runningRun } = await supabaseAdmin
    .from('agent_runs')
    .select('id')
    .eq('agent_id', agentId)
    .eq('status', 'running')
    .maybeSingle();

  if (runningRun) {
    return NextResponse.json({ error: 'Agent is already running' }, { status: 409 });
  }

  // Read agent prompt file from static definition
  let promptContent = '';
  try {
    const promptPath = path.join(process.cwd(), staticDef.promptFile);
    promptContent = readFileSync(promptPath, 'utf-8');
  } catch {
    return NextResponse.json({ error: `Prompt file not found: ${staticDef.promptFile}` }, { status: 500 });
  }

  if (!promptContent) {
    return NextResponse.json({ error: 'Agent prompt file is empty' }, { status: 400 });
  }

  // Ensure logs/runs directory exists
  const logDir = path.join(process.cwd(), 'logs', 'runs');
  const tmpLogDir = '/tmp/logs/runs';
  const effectiveLogDir = process.env.VERCEL ? tmpLogDir : logDir;
  if (!existsSync(effectiveLogDir)) mkdirSync(effectiveLogDir, { recursive: true });

  // Insert new run
  const { data: run, error: runError } = await supabaseAdmin
    .from('agent_runs')
    .insert({
      agent_id: agentId,
      status: 'running',
      trigger,
    })
    .select()
    .single();

  if (runError) {
    console.error('Agent run insert error:', runError);
    return NextResponse.json({ error: 'Failed to create run' }, { status: 500 });
  }

  const logFile = path.join(effectiveLogDir, `${run.id}.jsonl`);

  await supabaseAdmin
    .from('agent_runs')
    .update({ log_file: `logs/runs/${run.id}.jsonl` })
    .eq('id', run.id);

  // Local: spawn claude CLI with stream-json output (detached, non-blocking)
  const claudeCli = '/home/max/.npm-global/bin/claude';
  if (!existsSync(claudeCli)) {
    // No CLI available and no daemon — can't run agents
    await supabaseAdmin
      .from('agent_runs')
      .update({ status: 'failed', finished_at: new Date().toISOString(), error_message: 'Daemon bridge not configured and CLI not available' })
      .eq('id', run.id);
    return NextResponse.json({ error: 'Daemon bridge not configured. Set DAEMON_URL to route agents through the daemon.' }, { status: 503 });
  }

  // Local: spawn claude CLI with stream-json output (detached, non-blocking)
  // Strip ANTHROPIC_API_KEY so CLI uses subscription auth instead of API credits
  const { ANTHROPIC_API_KEY: _ak, ...cliEnv } = process.env;
  const startTime = Date.now();
  const child = spawn(
    claudeCli,
    [
      '-p', promptContent,
      '--model', agentModel,
      '--allowedTools', 'Bash,Read,Write,Edit,Grep,Glob',
      '--max-turns', String(agentMaxTurns),
      '--verbose',
      '--output-format', 'stream-json',
    ],
    {
      cwd: process.cwd(),
      env: {
        ...cliEnv,
        PATH: `/home/max/.npm-global/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH || ''}`,
      },
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );

  if (child.pid) {
    runningProcesses.set(run.id, child.pid);
  }

  const ws = createWriteStream(logFile, { flags: 'a' });
  let lastLine = '';

  child.stdout?.on('data', (data: Buffer) => {
    const text = data.toString();
    ws.write(text);
    const lines = text.split('\n').filter((l: string) => l.trim());
    if (lines.length > 0) lastLine = lines[lines.length - 1];
  });

  child.stderr?.on('data', (data: Buffer) => {
    const errText = data.toString().trim();
    if (errText) {
      ws.write(JSON.stringify({ type: 'stderr', text: errText }) + '\n');
    }
  });

  child.on('close', async (code) => {
    ws.end();
    runningProcesses.delete(run.id);
    const duration = Math.round((Date.now() - startTime) / 1000);
    const status = code === 0 ? 'completed' : 'failed';

    let costUsd: number | null = null;
    let inputTokens: number | null = null;
    let outputTokens: number | null = null;
    let numTurns: number | null = null;

    try {
      const result = JSON.parse(lastLine);
      if (result.type === 'result') {
        costUsd = result.cost_usd ?? result.total_cost_usd ?? null;
        numTurns = result.num_turns ?? null;
        if (result.usage) {
          inputTokens = result.usage.input_tokens ?? null;
          outputTokens = result.usage.output_tokens ?? null;
        }
      }
    } catch { /* ignore */ }

    await supabaseAdmin
      .from('agent_runs')
      .update({
        status,
        finished_at: new Date().toISOString(),
        duration_seconds: duration,
        cost_usd: costUsd,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        num_turns: numTurns,
        error_message: status === 'failed' && code !== null ? `Exit code: ${code}` : null,
      })
      .eq('id', run.id);
  });

  child.unref();

  return NextResponse.json({ runId: run.id, status: 'running' });
}

// DELETE /api/agents/runs?id=<runId> — stop a running agent
export async function DELETE(request: NextRequest) {
  const auth = await authenticateCronOrUser(request);
  if (auth instanceof NextResponse) return auth;

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  // Proxy to daemon if DAEMON_URL is set
  const daemonUrl = process.env.DAEMON_URL;
  if (daemonUrl) {
    const proxyHeaders: Record<string, string> = { 'x-cron-secret': process.env.CRON_SECRET || '' };
    const signingKey = process.env.DAEMON_SIGNING_KEY;
    if (signingKey) {
      proxyHeaders['x-signature'] = crypto.createHmac('sha256', signingKey).update(id).digest('hex');
    }
    try {
      const res = await fetch(`${daemonUrl}/runs/${id}`, { method: 'DELETE', headers: proxyHeaders });
      const data = await res.json();
      if (data.success) {
        return NextResponse.json(data, { status: res.status });
      }
    } catch { /* daemon unreachable — fall through to direct DB update */ }

    // Fallback: directly update DB if daemon couldn't stop the process
    await supabaseAdmin
      .from('agent_runs')
      .update({
        status: 'failed',
        finished_at: new Date().toISOString(),
        error_message: 'Force-stopped from UI',
      })
      .eq('id', id)
      .eq('status', 'running');

    return NextResponse.json({ success: true, message: 'Force-stopped' });
  }

  // Check the run exists and is running
  const { data: run, error } = await supabaseAdmin
    .from('agent_runs')
    .select('*')
    .eq('id', id)
    .eq('status', 'running')
    .maybeSingle();

  if (error || !run) {
    return NextResponse.json({ error: 'Running run not found' }, { status: 404 });
  }

  // Try to kill the process
  const pid = runningProcesses.get(id);
  if (pid) {
    try {
      // Kill the entire process group (detached processes)
      process.kill(-pid, 'SIGTERM');
    } catch {
      try {
        process.kill(pid, 'SIGTERM');
      } catch { /* process may already be dead */ }
    }
    runningProcesses.delete(id);
  }

  // Update the run record
  await supabaseAdmin
    .from('agent_runs')
    .update({
      status: 'failed',
      finished_at: new Date().toISOString(),
      error_message: 'Manually stopped by user',
    })
    .eq('id', id);

  return NextResponse.json({ success: true, message: 'Agent stopped' });
}

// PATCH /api/agents/runs?id=<runId> — update run status (used by cron wrapper)
export async function PATCH(request: NextRequest) {
  const auth = await authenticateCronOrUser(request);
  if (auth instanceof NextResponse) return auth;

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const updates = await request.json();
  const allowedFields = ['status', 'finished_at', 'duration_seconds', 'summary', 'error_message', 'cost_usd', 'input_tokens', 'output_tokens', 'num_turns'];
  const safeUpdates: Record<string, any> = {};
  for (const key of allowedFields) {
    if (key in updates) safeUpdates[key] = updates[key];
  }

  if (safeUpdates.status && safeUpdates.status !== 'running' && !safeUpdates.finished_at) {
    safeUpdates.finished_at = new Date().toISOString();
  }

  const { data, error } = await supabaseAdmin
    .from('agent_runs')
    .update(safeUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Agent run update error:', error);
    return NextResponse.json({ error: 'Failed to update run' }, { status: 500 });
  }

  return NextResponse.json({ run: data });
}
