import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth/require-account-access';
import { spawn } from 'child_process';
import { readFileSync, createWriteStream, mkdirSync, existsSync } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

// Static agent definitions — source of truth for prompt files and defaults.
// DB agent_configs can override model/max_turns but prompt_file falls back here.
const AGENT_DEFINITIONS: Record<string, { promptFile: string; model: string; maxTurns: number }> = {
  'lead-gen':                { promptFile: '.claude/commands/nexorra/lead-gen.md',                model: 'sonnet', maxTurns: 120 },
  'cold-email-upload':       { promptFile: '.claude/commands/nexorra/cold-email-upload.md',       model: 'haiku',  maxTurns: 60  },
  'cold-email-replies':      { promptFile: '.claude/commands/nexorra/cold-email-replies.md',      model: 'haiku',  maxTurns: 80  },
  'cold-email-maintenance':  { promptFile: '.claude/commands/nexorra/cold-email-maintenance.md',  model: 'haiku',  maxTurns: 60  },
  'campaign-review':         { promptFile: '.claude/commands/nexorra/campaign-review.md',         model: 'sonnet', maxTurns: 40  },
  'campaign-optimizer':      { promptFile: '.claude/commands/nexorra/campaign-optimizer.md',      model: 'sonnet', maxTurns: 60  },
  'client-reply':            { promptFile: '.claude/commands/client/reply.md',                    model: 'haiku',  maxTurns: 60  },
  'ops-report':              { promptFile: '.claude/commands/ops/report.md',                      model: 'haiku',  maxTurns: 40  },
};

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

  // Check for already-running runs
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
  if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true });

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

  const logFile = path.join(logDir, `${run.id}.jsonl`);

  // Update run with log file path
  await supabaseAdmin
    .from('agent_runs')
    .update({ log_file: `logs/runs/${run.id}.jsonl` })
    .eq('id', run.id);

  // Spawn claude directly with stream-json output
  const startTime = Date.now();
  const child = spawn(
    '/home/max/.npm-global/bin/claude',
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
        ...process.env,
        PATH: `/home/max/.npm-global/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH || ''}`,
      },
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );

  // Track PID for stop functionality
  if (child.pid) {
    runningProcesses.set(run.id, child.pid);
  }

  // Stream output to JSONL log file in real-time
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

    // Parse the result event for cost/token data
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
    } catch { /* ignore parse errors */ }

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
