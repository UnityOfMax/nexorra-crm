/**
 * Serverless-compatible agent runner using the Anthropic SDK.
 * Used when the claude CLI is not available (e.g. Vercel production).
 * Implements the same Bash/Read/Write/Grep/Glob tool set as Claude Code.
 */

import Anthropic from '@anthropic-ai/sdk';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';

const MODEL_MAP: Record<string, string> = {
  haiku:  'claude-haiku-4-5-20251001',
  sonnet: 'claude-sonnet-4-6',
  opus:   'claude-opus-4-6',
};

const AGENT_TOOLS: Anthropic.Tool[] = [
  {
    name: 'Bash',
    description: 'Execute a bash command. curl, grep, sed, awk and standard Unix tools are available.',
    input_schema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Bash command to run' },
        timeout: { type: 'number', description: 'Timeout in ms (default 30000)' },
      },
      required: ['command'],
    },
  },
  {
    name: 'Read',
    description: 'Read a file from the filesystem.',
    input_schema: {
      type: 'object',
      properties: {
        file_path: { type: 'string', description: 'Absolute or project-relative path' },
      },
      required: ['file_path'],
    },
  },
  {
    name: 'Write',
    description: 'Write content to a file.',
    input_schema: {
      type: 'object',
      properties: {
        file_path: { type: 'string' },
        content: { type: 'string' },
      },
      required: ['file_path', 'content'],
    },
  },
  {
    name: 'Grep',
    description: 'Search for a regex pattern in files.',
    input_schema: {
      type: 'object',
      properties: {
        pattern: { type: 'string' },
        path: { type: 'string', description: 'File or directory to search' },
        flags: { type: 'string', description: 'grep flags (default: -r -n)' },
      },
      required: ['pattern'],
    },
  },
  {
    name: 'Glob',
    description: 'List files matching a name pattern.',
    input_schema: {
      type: 'object',
      properties: {
        pattern: { type: 'string' },
        path: { type: 'string', description: 'Base directory' },
      },
      required: ['pattern'],
    },
  },
];

const isVercel = !!process.env.VERCEL;
const cwd = process.cwd();

function resolvePath(filePath: string): string {
  return path.isAbsolute(filePath) ? filePath : path.join(cwd, filePath);
}

function executeTool(name: string, input: Record<string, string>): string {
  const baseEnv = {
    ...process.env,
    // Ensure CRM_BASE_URL is available for agents that call internal API routes
    CRM_BASE_URL:
      process.env.CRM_BASE_URL ||
      (isVercel ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'),
  };

  switch (name) {
    case 'Bash': {
      try {
        const out = execSync(input.command, {
          cwd,
          timeout: input.timeout ? parseInt(input.timeout) : 30000,
          maxBuffer: 1024 * 1024 * 10,
          env: baseEnv,
          shell: '/bin/bash',
        });
        return out.toString();
      } catch (err: any) {
        return [
          `Exit code: ${err.status}`,
          err.stdout?.toString(),
          err.stderr?.toString(),
        ]
          .filter(Boolean)
          .join('\n');
      }
    }

    case 'Read': {
      try {
        const abs = resolvePath(input.file_path);
        // On Vercel, a prior Write in this session lands in /tmp — check there first
        if (isVercel) {
          const tmp = path.join('/tmp', path.relative(cwd, abs));
          if (existsSync(tmp)) return readFileSync(tmp, 'utf-8');
        }
        if (!existsSync(abs)) return `Error: File not found: ${input.file_path}`;
        return readFileSync(abs, 'utf-8');
      } catch (err: any) {
        return `Error reading file: ${err.message}`;
      }
    }

    case 'Write': {
      try {
        let target = resolvePath(input.file_path);
        // On Vercel, project root is read-only — redirect writes to /tmp
        if (isVercel && !target.startsWith('/tmp')) {
          target = path.join('/tmp', path.relative(cwd, target));
        }
        const dir = path.dirname(target);
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
        writeFileSync(target, input.content, 'utf-8');
        return `Written ${input.content.length} chars to ${target}`;
      } catch (err: any) {
        return `Error writing: ${err.message}`;
      }
    }

    case 'Grep': {
      try {
        const searchPath = input.path ? path.join(cwd, input.path) : cwd;
        const flags = input.flags || '-r -n';
        // Single-quote the pattern to avoid shell injection
        const safe = input.pattern.replace(/'/g, "'\\''");
        const out = execSync(`grep ${flags} '${safe}' "${searchPath}" 2>/dev/null || true`, {
          cwd,
          timeout: 10000,
          maxBuffer: 1024 * 1024,
          shell: '/bin/bash',
        });
        return out.toString() || '(no matches)';
      } catch {
        return '(no matches)';
      }
    }

    case 'Glob': {
      try {
        const searchPath = input.path ? path.join(cwd, input.path) : cwd;
        const out = execSync(
          `find "${searchPath}" -name "${input.pattern}" 2>/dev/null | head -200`,
          { cwd, timeout: 10000, maxBuffer: 1024 * 1024, shell: '/bin/bash' }
        );
        return out.toString() || '(no files found)';
      } catch {
        return '(no files found)';
      }
    }

    default:
      return `Unknown tool: ${name}`;
  }
}

export interface AgentRunResult {
  success: boolean;
  numTurns: number;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  error?: string;
}

export async function runAgentWithSDK(params: {
  promptContent: string;
  model: string;
  maxTurns: number;
  onEvent?: (event: Record<string, unknown>) => void;
}): Promise<AgentRunResult> {
  const { promptContent, model, maxTurns, onEvent } = params;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const modelId = MODEL_MAP[model] || model;

  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: promptContent }];

  let numTurns = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  try {
    for (let i = 0; i < maxTurns; i++) {
      numTurns++;

      const response = await client.messages.create({
        model: modelId,
        max_tokens: 8096,
        tools: AGENT_TOOLS,
        messages,
      });

      totalInputTokens += response.usage.input_tokens;
      totalOutputTokens += response.usage.output_tokens;

      // Emit text blocks for logging
      for (const block of response.content) {
        if (block.type === 'text' && block.text) {
          onEvent?.({
            type: 'text',
            turn: numTurns,
            text: block.text.slice(0, 2000),
          });
        }
      }

      if (response.stop_reason === 'end_turn') break;

      if (response.stop_reason === 'tool_use') {
        messages.push({ role: 'assistant', content: response.content });

        const toolResults: Anthropic.ToolResultBlockParam[] = [];

        for (const block of response.content) {
          if (block.type === 'tool_use') {
            onEvent?.({
              type: 'tool_use',
              tool: block.name,
              input: JSON.stringify(block.input).slice(0, 300),
            });

            const result = executeTool(block.name, block.input as Record<string, string>);

            onEvent?.({
              type: 'tool_result',
              tool: block.name,
              result: result.slice(0, 500),
            });

            toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result });
          }
        }

        messages.push({ role: 'user', content: toolResults });
      }
    }
  } catch (err: any) {
    return {
      success: false,
      numTurns,
      costUsd: 0,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      error: err.message,
    };
  }

  // Approximate cost (haiku rates; close enough for tracking)
  const costUsd =
    (totalInputTokens / 1_000_000) * 0.8 + (totalOutputTokens / 1_000_000) * 4.0;

  return {
    success: true,
    numTurns,
    costUsd,
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens,
  };
}
