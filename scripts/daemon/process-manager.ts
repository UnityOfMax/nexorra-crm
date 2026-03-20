import { spawn, ChildProcess } from 'child_process';
import { readFileSync, writeFileSync, createWriteStream, mkdirSync, existsSync } from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

const CRM_ROOT = path.resolve(__dirname, '../..');
const CLAUDE_CLI = '/home/max/.npm-global/bin/claude';
const LOG_DIR = path.join(CRM_ROOT, 'logs', 'runs');
const MCP_CONFIG_DIR = path.join(CRM_ROOT, 'tmp', 'mcp-configs');

// ─── MCP Server Definitions (built from project .mcp.json) ─────────────────

const MCP_SERVERS: Record<string, object> = {
  'supabase': {
    type: 'http',
    url: `https://mcp.supabase.com/mcp?project_ref=nhflmisklsanfiiywrfo&features=docs,database,debugging,development,functions,branching,storage`,
  },
  'filesystem': {
    command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem', '/home/max/crm'],
  },
  'memory': {
    command: 'npx', args: ['-y', '@modelcontextprotocol/server-memory'],
  },
  'fetch': {
    command: 'npx', args: ['-y', '@modelcontextprotocol/server-fetch'],
  },
  'sequential-thinking': {
    command: 'npx', args: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
  },
  'context7': {
    command: 'npx', args: ['-y', '@upstash/context7-mcp'],
  },
  '21st-magic': {
    command: 'npx', args: ['-y', '@21st-dev/magic@latest'],
    env: { API_KEY: '85bc56f3e4ca90ffc742c37fa868a68aad3012ff2a185297de493d2bbb39fe55' },
  },
};

/**
 * Build a temporary MCP config file for an agent and return the path.
 */
function buildMcpConfig(agentId: string, mcps: string[]): string | null {
  if (!mcps || mcps.length === 0) return null;

  if (!existsSync(MCP_CONFIG_DIR)) mkdirSync(MCP_CONFIG_DIR, { recursive: true });

  const config: Record<string, object> = {};
  for (const mcp of mcps) {
    if (MCP_SERVERS[mcp]) config[mcp] = MCP_SERVERS[mcp];
  }

  if (Object.keys(config).length === 0) return null;

  const configPath = path.join(MCP_CONFIG_DIR, `${agentId}.json`);
  writeFileSync(configPath, JSON.stringify({ mcpServers: config }, null, 2));
  return configPath;
}

/**
 * Load skill content to prepend to agent prompt.
 */
function loadSkills(skills: string[]): string {
  if (!skills || skills.length === 0) return '';

  const skillDir = path.join(process.env.HOME || '/home/max', '.claude', 'skills');
  const parts: string[] = [];

  for (const skill of skills) {
    const skillPath = path.join(skillDir, skill, 'SKILL.md');
    if (existsSync(skillPath)) {
      parts.push(`\n--- SKILL: ${skill} ---\n${readFileSync(skillPath, 'utf-8')}\n--- END SKILL ---\n`);
    }
  }

  return parts.join('\n');
}

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
  extraContext?: string;
  mcps?: string[];
  skills?: string[];
}): Promise<{ runId: string; status: string }> {
  const { agentId, promptFile, model, maxTurns, trigger, extraContext, mcps, skills } = params;

  // Read prompt file
  const promptPath = path.join(CRM_ROOT, promptFile);
  if (!existsSync(promptPath)) {
    throw new Error(`Prompt file not found: ${promptFile}`);
  }
  let promptContent = readFileSync(promptPath, 'utf-8');
  if (!promptContent) {
    throw new Error('Agent prompt file is empty');
  }

  // Layer 2: Prepend primer (agent's own state from last run)
  const primerPath = path.join(CRM_ROOT, 'agents', 'primers', `${agentId}.md`);
  if (existsSync(primerPath)) {
    const primer = readFileSync(primerPath, 'utf-8');
    if (primer.trim()) {
      promptContent = `--- YOUR CURRENT STATE (from your last run) ---\n${primer}\n--- END STATE ---\n\n${promptContent}`;
    }
  }

  // Layer 3: Run git context hook
  try {
    const gitHook = path.join(CRM_ROOT, 'scripts', 'hooks', 'git-context.sh');
    if (existsSync(gitHook)) {
      require('child_process').execSync(`bash ${gitHook}`, { cwd: CRM_ROOT, timeout: 5000 });
    }
  } catch {}

  // Prepend skills to prompt (so agent has skill context in its first turn)
  if (skills && skills.length > 0) {
    const skillContent = loadSkills(skills);
    if (skillContent) {
      promptContent = skillContent + '\n' + promptContent;
    }
  }

  // Append extra context (e.g. from agent_messages task)
  if (extraContext) {
    promptContent += extraContext;
  }

  // Append primer rewrite instruction (agent updates its own primer on completion)
  promptContent += `\n\n--- IMPORTANT: BEFORE YOU FINISH ---\nUpdate your primer file at agents/primers/${agentId}.md with:\n- What you just did\n- Current state\n- Next steps\n- Any blockers\nThis helps you and Lena know where things stand.\n---`;

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
  // Strip ANTHROPIC_API_KEY so CLI uses subscription auth instead of API credits
  const { ANTHROPIC_API_KEY: _ak, ...cliEnv } = process.env;
  const startTime = Date.now();

  // Build CLI args
  const cliArgs = [
    '-p', promptContent,
    '--model', model,
    '--allowedTools', 'Bash,Read,Write,Edit,Grep,Glob',
    '--max-turns', String(maxTurns),
    '--verbose',
    '--output-format', 'stream-json',
  ];

  // Add MCP config if agent has MCPs defined
  const mcpConfigPath = buildMcpConfig(agentId, mcps || []);
  if (mcpConfigPath) {
    cliArgs.push('--mcp-config', mcpConfigPath);
  }

  const child = spawn(
    CLAUDE_CLI,
    cliArgs,
    {
      cwd: CRM_ROOT,
      env: {
        ...cliEnv,
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

    let costUsd: number | null = null;
    let inputTokens: number | null = null;
    let outputTokens: number | null = null;
    let numTurns: number | null = null;
    let resultError: string | null = null;

    try {
      const result = JSON.parse(lastLine);
      if (result.type === 'result') {
        // Detect errors even when exit code is 0 (e.g. billing errors)
        if (result.is_error) {
          resultError = result.result || 'Agent returned an error';
        }
        costUsd = result.cost_usd ?? result.total_cost_usd ?? null;
        numTurns = result.num_turns ?? null;
        if (result.usage) {
          inputTokens = result.usage.input_tokens ?? null;
          outputTokens = result.usage.output_tokens ?? null;
        }
      }
    } catch { /* ignore */ }

    const status = (code === 0 && !resultError) ? 'completed' : 'failed';

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
        error_message: resultError || (status === 'failed' && code !== null ? `Exit code: ${code}` : null),
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

/**
 * Synchronous agent query — spawns an agent, WAITS for completion, returns output text.
 * Used by Lena for real-time queries (not async tasks).
 * Max 5 turns, 45s timeout. No DB recording (too noisy for lookups).
 */
export async function queryAgent(params: {
  agentId: string;
  promptFile: string;
  model: string;
  question: string;
  maxTurns?: number;
  timeout?: number;
  mcps?: string[];
  skills?: string[];
}): Promise<{ text: string; duration: number }> {
  const { agentId, promptFile, model, question, maxTurns = 5, timeout = 45000, mcps, skills } = params;

  const promptPath = path.join(CRM_ROOT, promptFile);
  if (!existsSync(promptPath)) throw new Error(`Prompt file not found: ${promptFile}`);

  let promptContent = readFileSync(promptPath, 'utf-8');

  // Prepend primer if it exists (Layer 2 memory)
  const primerPath = path.join(CRM_ROOT, 'agents', 'primers', `${agentId}.md`);
  if (existsSync(primerPath)) {
    const primer = readFileSync(primerPath, 'utf-8');
    promptContent = `--- YOUR CURRENT STATE (from your last run) ---\n${primer}\n--- END STATE ---\n\n${promptContent}`;
  }

  // Prepend skills
  if (skills && skills.length > 0) {
    const skillContent = loadSkills(skills);
    if (skillContent) promptContent = skillContent + '\n' + promptContent;
  }

  // Append the query
  promptContent += `\n\n---\nQUICK QUERY from Lena (Max's PA):\n${question}\n\nRespond concisely with the answer. Use your tools to look up real data. Max 2-3 turns. Don't start long workflows.\n---`;

  // Build MCP config
  const mcpConfigPath = buildMcpConfig(`query-${agentId}`, mcps || []);

  const cliArgs = [
    '-p', promptContent,
    '--model', model,
    '--allowedTools', 'Bash,Read,Write,Edit,Grep,Glob',
    '--max-turns', String(maxTurns),
    '--output-format', 'stream-json',
  ];
  if (mcpConfigPath) cliArgs.push('--mcp-config', mcpConfigPath);

  const { ANTHROPIC_API_KEY: _ak, ...cliEnv } = process.env;
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    let output = '';
    let lastAssistantText = '';

    const child = spawn(CLAUDE_CLI, cliArgs, {
      cwd: CRM_ROOT,
      env: {
        ...cliEnv,
        PATH: `/home/max/.npm-global/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH || ''}`,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const timer = setTimeout(() => {
      try { child.kill('SIGTERM'); } catch {}
      const duration = Math.round((Date.now() - startTime) / 1000);
      resolve({ text: lastAssistantText || 'Query timed out. The agent took too long.', duration });
    }, timeout);

    child.stdout?.on('data', (data: Buffer) => {
      const text = data.toString();
      output += text;
      // Parse JSONL for assistant messages
      for (const line of text.split('\n').filter((l: string) => l.trim())) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.type === 'assistant' && parsed.message?.content) {
            for (const block of parsed.message.content) {
              if (block.type === 'text') lastAssistantText = block.text;
            }
          }
        } catch {}
      }
    });

    child.stderr?.on('data', () => {}); // Suppress stderr

    child.on('close', () => {
      clearTimeout(timer);
      const duration = Math.round((Date.now() - startTime) / 1000);
      resolve({ text: lastAssistantText || 'Agent returned no output.', duration });
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}
