import { spawn, ChildProcess } from 'child_process';
import { readFileSync, createWriteStream, mkdirSync, existsSync } from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

const CRM_ROOT = path.resolve(__dirname, '../..');
const CLAUDE_CLI = '/home/max/.npm-global/bin/claude';
const LOG_DIR = path.join(CRM_ROOT, 'logs', 'runs');

// Ensure log directory exists
if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });

// In-memory tracking
const runningProcesses = new Map<string, { pid: number; child: ChildProcess; agentId: string; startTime: number }>();

export function getRunningAgents(): Array<{ runId: string; agentId: string; pid: number; uptime: number }> {
  const now = Date.now();
  return Array.from(runningProcesses.entries()).map(([runId, info]) => ({
    runId,
    agentId: info.agentId,
    pid: info.pid,
    uptime: Math.round((now - info.startTime) / 1000),
  }));
}

export async function spawnAgent(params: {
  agentId: string;
  promptFile: string;
  model: string;
  maxTurns: number;
  trigger: string;
}): Promise<{ runId: string; status: string }> {
  const { agentId, promptFile, model, maxTurns, trigger } = params;

  // Read prompt file
  const promptPath = path.join(CRM_ROOT, promptFile);
  if (!existsSync(promptPath)) {
    throw new Error(`Prompt file not found: ${promptFile}`);
  }
  const promptContent = readFileSync(promptPath, 'utf-8');
  if (!promptContent) {
    throw new Error('Agent prompt file is empty');
  }

  // Check for already-running (with 2h stale timeout)
  const { data: runningRun } = await supabaseAdmin
    .from('agent_runs')
    .select('id, started_at')
    .eq('agent_id', agentId)
    .eq('status', 'running')
    .maybeSingle();

  if (runningRun) {
    const age = Date.now() - new Date(runningRun.started_at).getTime();
    if (age > 2 * 60 * 60 * 1000) {
      // Stale run — mark as failed and allow new run
      await supabaseAdmin
        .from('agent_runs')
        .update({ status: 'failed', finished_at: new Date().toISOString(), error_message: 'Timed out (exceeded 2h)' })
        .eq('id', runningRun.id);
      console.log(`[daemon] Cleaned up stale run ${runningRun.id} for ${agentId}`);
    } else {
      return { runId: runningRun.id, status: 'already_running' };
    }
  }

  // Insert run record
  const { data: run, error: runError } = await supabaseAdmin
    .from('agent_runs')
    .insert({ agent_id: agentId, status: 'running', trigger })
    .select()
    .single();

  if (runError || !run) {
    throw new Error(`Failed to create run: ${runError?.message}`);
  }

  const logFile = path.join(LOG_DIR, `${run.id}.jsonl`);

  await supabaseAdmin
    .from('agent_runs')
    .update({ log_file: `logs/runs/${run.id}.jsonl` })
    .eq('id', run.id);

  // Spawn Claude CLI
  const startTime = Date.now();
  const child = spawn(
    CLAUDE_CLI,
    [
      '-p', promptContent,
      '--model', model,
      '--allowedTools', 'Bash,Read,Write,Edit,Grep,Glob',
      '--max-turns', String(maxTurns),
      '--verbose',
      '--output-format', 'stream-json',
    ],
    {
      cwd: CRM_ROOT,
      env: {
        ...process.env,
        PATH: `/home/max/.npm-global/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH || ''}`,
      },
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );

  if (child.pid) {
    runningProcesses.set(run.id, { pid: child.pid, child, agentId, startTime });
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

    console.log(`[daemon] Agent ${agentId} (${run.id}) ${status} in ${duration}s`);
  });

  child.unref();

  console.log(`[daemon] Spawned agent ${agentId} (${run.id}) pid=${child.pid}`);
  return { runId: run.id, status: 'running' };
}

export async function stopAgent(runId: string): Promise<boolean> {
  const info = runningProcesses.get(runId);
  if (info) {
    try {
      process.kill(-info.pid, 'SIGTERM');
    } catch {
      try {
        process.kill(info.pid, 'SIGTERM');
      } catch { /* process may already be dead */ }
    }
    runningProcesses.delete(runId);
  }

  // Always update DB — even if process wasn't in memory (orphaned/stale)
  await supabaseAdmin
    .from('agent_runs')
    .update({
      status: 'failed',
      finished_at: new Date().toISOString(),
      error_message: info ? 'Stopped via daemon' : 'Stopped (orphaned run)',
    })
    .eq('id', runId)
    .eq('status', 'running');

  return true;
}

export async function cleanupOrphanedRuns(): Promise<number> {
  const { data } = await supabaseAdmin
    .from('agent_runs')
    .update({
      status: 'failed',
      finished_at: new Date().toISOString(),
      error_message: 'Orphaned by daemon restart',
    })
    .eq('status', 'running')
    .select('id');
  return data?.length ?? 0;
}
