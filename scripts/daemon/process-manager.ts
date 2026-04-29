import { spawn, ChildProcess } from 'child_process';
import { readFileSync, writeFileSync, appendFileSync, createWriteStream, mkdirSync, existsSync } from 'fs';
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
    env: { API_KEY: process.env.TWENTYFIRST_API_KEY || '' },
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
  } catch (_e) {}

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

  // Insert run record — retry once on transient network errors (stale connection pool)
  let run: any = null;
  let runError: any = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await (attempt === 0
      ? supabaseAdmin
      : createClient(supabaseUrl, supabaseKey)
    ).from('agent_runs')
      .insert({ agent_id: agentId, status: 'running', trigger })
      .select()
      .single();
    run = result.data;
    runError = result.error;
    if (!runError) break;
    if (attempt === 0 && runError.message?.includes('fetch failed')) {
      console.warn('[daemon] Supabase insert failed with network error, retrying with fresh client...');
      await new Promise(r => setTimeout(r, 2000));
    } else {
      break;
    }
  }

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

  // Inject latest vault briefing into prompt context
  try {
    const brain = require(path.join(CRM_ROOT, 'lib/obsidian/brain')).default;
    const briefing = brain.latestBriefing();
    if (briefing) {
      const condensed = briefing.split('\n').slice(0, 15).join('\n');
      promptContent += `\n\n--- TODAY'S BRIEFING (from Obsidian vault) ---\n${condensed}\n--- END BRIEFING ---\n`;
    }
  } catch (_e) { /* Vault not available */ }

  // Inject Mulch learnings into prompt context
  try {
    const mulchClient = require(path.join(CRM_ROOT, 'lib/mulch/client'));
    const learnings = mulchClient.querySync ? mulchClient.querySync(extraContext || agentId, { agent: agentId, limit: 5 }) : null;
    if (learnings && learnings.entries && learnings.entries.length > 0) {
      const mulchContext = learnings.entries.map((e: any) => `[${e.domain}] ${e.content}`).join('\n');
      promptContent += `\n\n--- RELEVANT LEARNINGS (from past runs) ---\n${mulchContext}\n--- END LEARNINGS ---\n`;
    }
  } catch (mulchErr) {
    // Mulch not available — continue without learnings
  }

  // Write prompt to temp file to avoid CLI arg size limits and --- parsing issues
  const { writeFileSync, unlinkSync } = require('fs');
  const { join } = require('path');
  const tmpPromptPath = join(CRM_ROOT, 'tmp', `prompt-${run.id}.md`);
  try { require('fs').mkdirSync(join(CRM_ROOT, 'tmp'), { recursive: true }); } catch (_e) {}
  writeFileSync(tmpPromptPath, promptContent, 'utf-8');

  // Build CLI args — read prompt from file via stdin redirect
  const cliArgs = [
    '--model', model,
    '--allowedTools', 'Bash,Read,Write,Edit,Grep,Glob',
    '--max-turns', String(maxTurns),
    '--verbose',
    '--output-format', 'stream-json',
    '--print',
  ];

  // Add MCP config if agent has MCPs defined
  const mcpConfigPath = buildMcpConfig(agentId, mcps || []);
  if (mcpConfigPath) {
    cliArgs.push('--mcp-config', mcpConfigPath);
  }

  // Use shell to pipe prompt file into claude CLI stdin
  const shellCmd = `cat "${tmpPromptPath}" | ${CLAUDE_CLI} ${cliArgs.map(a => `"${a}"`).join(' ')}`;
  const child = spawn(
    'bash',
    ['-c', shellCmd],
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

  // Clean up prompt file after process starts
  setTimeout(() => { try { unlinkSync(tmpPromptPath); } catch (_e) {} }, 30000);

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
    } catch (_e) { /* ignore */ }

    const status = (code === 0 && !resultError) ? 'completed' : 'failed';

    const { error: updateError } = await supabaseAdmin
      .from('agent_runs')
      .update({
        status,
        finished_at: new Date().toISOString(),
        duration_seconds: duration,
        summary: `${agentId} ${status} in ${duration}s`,
        error_message: resultError || (status === 'failed' && code !== null ? `Exit code: ${code}` : null),
      })
      .eq('id', run.id);

    if (updateError) {
      console.error(`[daemon] DB update FAILED for ${agentId} (${run.id}):`, updateError.message);
    }

    console.log(`[daemon] Agent ${agentId} (${run.id}) ${status} in ${duration}s`);

    // Post-run: record learnings to Mulch
    if (status === 'completed') {
      try {
        const mulchClient = require(path.join(CRM_ROOT, 'lib/mulch/client'));
        const summary = resultError || `${agentId} completed in ${duration}s`;
        if (mulchClient.recordSync) {
          mulchClient.recordSync({
            agent: agentId,
            domain: agentId,
            content: summary,
            tags: [agentId, trigger || 'manual'],
            classification: 'tactical' as const,
          });
        }
      } catch (_e) { /* Mulch not available */ }

      // Post-run: write to Obsidian vault as KNOWLEDGE, not logs
      try {
        const logPath = path.join(CRM_ROOT, 'logs', 'runs', `${run.id}.jsonl`);
        let agentOutput = '';
        if (existsSync(logPath)) {
          const lines = readFileSync(logPath, 'utf-8').trim().split('\n');
          for (let i = lines.length - 1; i >= Math.max(0, lines.length - 20); i--) {
            try {
              const d = JSON.parse(lines[i]);
              if (d.type === 'assistant') {
                const msg = d.message?.content;
                if (Array.isArray(msg)) {
                  for (const block of msg) {
                    if (block.type === 'text' && block.text.length > 50) {
                      agentOutput = block.text;
                      break;
                    }
                  }
                } else if (typeof msg === 'string' && msg.length > 50) {
                  agentOutput = msg;
                }
                if (agentOutput) break;
              }
            } catch (_e) {}
          }
        }

        if (agentOutput.length > 3000) agentOutput = agentOutput.slice(0, 3000) + '\n\n*[Truncated]*';

      } catch (_e) { /* output read optional */ }
      // Post-run: regenerate BRIEFING.md for new Claude Code instances
      try {
        require('child_process').execSync(
          'npx tsx scripts/generate-briefing.ts',
          { cwd: CRM_ROOT, timeout: 20000, stdio: 'ignore' }
        );
      } catch (_e) { /* Briefing generation optional */ }
    }
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
    } catch (_e) {
      try {
        process.kill(info.pid, 'SIGTERM');
      } catch (_e) { /* process may already be dead */ }
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
  // Only clean up runs that are ACTUALLY orphaned — older than 2 hours
  // Short-lived runs might still be completing during a daemon restart
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const { data } = await supabaseAdmin
    .from('agent_runs')
    .update({
      status: 'failed',
      finished_at: new Date().toISOString(),
      error_message: 'Orphaned — running for over 2 hours with no daemon tracking',
    })
    .eq('status', 'running')
    .lt('started_at', twoHoursAgo)
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

  // For queries, use a MINIMAL prompt — not the full agent workflow file (which can be 20KB+)
  // Just identity + primer + question. The agent uses tools to find the answer.
  const primerPath = path.join(CRM_ROOT, 'agents', 'primers', `${agentId}.md`);
  let primer = '';
  if (existsSync(primerPath)) {
    primer = readFileSync(primerPath, 'utf-8').trim();
  }

  const promptContent = `You are ${agentId} at Nexorra CRM. This is a QUICK QUERY from Lena (Max's PA).
Your working directory is /home/max/crm. You have access to Bash, Read, Write, Edit, Grep, Glob.
Read CLAUDE.md for project context if needed. Supabase admin client uses SUPABASE_SERVICE_ROLE_KEY from .env.local.

${primer ? `Your current state:\n${primer}\n` : ''}
QUESTION: ${question}

Answer concisely. Use your tools to look up real data. Do NOT start long workflows or make changes. Just find the answer and report it.`;

  // Build MCP config
  const mcpConfigPath = buildMcpConfig(`query-${agentId}`, mcps || []);

  const cliArgs = [
    '-p', promptContent,
    '--model', model,
    '--allowedTools', 'Bash,Read,Write,Edit,Grep,Glob',
    '--max-turns', String(maxTurns),
    '--verbose',
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
      try { child.kill('SIGTERM'); } catch (_e) {}
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
        } catch (_e) {}
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
