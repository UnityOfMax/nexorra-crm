import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth/require-account-access';
import { spawn } from 'child_process';
import { readFileSync, createWriteStream, mkdirSync, existsSync } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 min max

// POST /api/agents/chat — send a prompt to Shannon, returns run ID
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { prompt } = await request.json();
  if (!prompt || typeof prompt !== 'string') {
    return NextResponse.json({ error: 'prompt required' }, { status: 400 });
  }

  // Read Shannon's system prompt
  const shannonPath = path.join(process.cwd(), '.claude/commands/ops/shannon.md');
  let systemPrompt: string;
  try {
    systemPrompt = readFileSync(shannonPath, 'utf-8');
  } catch {
    return NextResponse.json({ error: 'Shannon prompt not found' }, { status: 500 });
  }

  // Ensure logs/runs directory exists
  const logDir = path.join(process.cwd(), 'logs', 'runs');
  if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true });

  // Create a run record
  const { data: run, error: runError } = await supabaseAdmin
    .from('agent_runs')
    .insert({
      agent_id: 'shannon',
      status: 'running',
      trigger: 'manual',
      summary: prompt.slice(0, 200),
      log_file: '', // will update after we have the ID
    })
    .select()
    .single();

  if (runError) {
    console.error('Shannon run insert error:', runError);
    return NextResponse.json({ error: 'Failed to create run' }, { status: 500 });
  }

  const runId = run.id;
  const logFile = path.join(logDir, `${runId}.jsonl`);
  const fullPrompt = `${systemPrompt}\n\n---\n\nUser task: ${prompt}`;

  // Update run with log file path
  await supabaseAdmin
    .from('agent_runs')
    .update({ log_file: `logs/runs/${runId}.jsonl` })
    .eq('id', runId);

  // Spawn Claude CLI with Shannon's prompt using stream-json
  const startTime = Date.now();
  const child = spawn(
    '/home/max/.npm-global/bin/claude',
    [
      '-p', fullPrompt,
      '--model', 'sonnet',
      '--allowedTools', 'Bash,Read,Write,Edit,Grep,Glob',
      '--max-turns', '100',
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

  // Stream output to JSONL log file
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

    // Update run record
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
        error_message: status === 'failed' ? `Exit code: ${code}` : null,
      })
      .eq('id', runId);
  });

  child.unref();

  return NextResponse.json({ runId, status: 'running' });
}

// GET /api/agents/chat?runId=xxx — poll for Shannon's response
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const runId = request.nextUrl.searchParams.get('runId');
  if (!runId) {
    return NextResponse.json({ error: 'runId required' }, { status: 400 });
  }

  // Get run status
  const { data: run, error } = await supabaseAdmin
    .from('agent_runs')
    .select('*')
    .eq('id', runId)
    .single();

  if (error || !run) {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 });
  }

  // Read structured log file
  let events: any[] = [];
  try {
    const logFile = path.join(process.cwd(), 'logs', 'runs', `${runId}.jsonl`);
    const content = readFileSync(logFile, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim());
    for (const line of lines) {
      try {
        events.push(JSON.parse(line));
      } catch { /* skip malformed lines */ }
    }
  } catch {
    // Log file not yet written
  }

  return NextResponse.json({
    run,
    events,
  });
}
