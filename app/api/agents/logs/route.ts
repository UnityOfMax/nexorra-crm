import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/require-account-access';
import { readFileSync, statSync } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

// GET /api/agents/logs?runId=xxx — structured JSONL events for a run
// GET /api/agents/logs?file=logs/lead-gen.log&lines=100 — legacy plain text
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const runId = request.nextUrl.searchParams.get('runId');
  const file = request.nextUrl.searchParams.get('file');
  const lines = Math.min(Number(request.nextUrl.searchParams.get('lines') ?? 100), 500);

  // Structured JSONL log for a specific run
  if (runId) {
    // Validate runId format (UUID only)
    if (!/^[0-9a-f-]{36}$/.test(runId)) {
      return NextResponse.json({ error: 'Invalid runId' }, { status: 400 });
    }

    // When DAEMON_URL is set (Vercel production), proxy log reads through the tunnel
    const daemonUrl = process.env.DAEMON_URL;
    if (daemonUrl) {
      try {
        const proxyRes = await fetch(`${daemonUrl}/runs/${runId}/logs`, {
          headers: { 'x-cron-secret': process.env.CRON_SECRET || '' },
        });
        if (!proxyRes.ok) {
          const errBody = await proxyRes.text().catch(() => '');
          console.error(`[logs] Daemon proxy failed: ${proxyRes.status} ${errBody.slice(0, 200)}`);
          return NextResponse.json({ events: [], isComplete: false, summary: null, debug: { status: proxyRes.status, daemonUrl } });
        }
        const content = await proxyRes.text();
        return parseAndReturnEvents(content);
      } catch (err: any) {
        console.error(`[logs] Daemon proxy error: ${err.message}`);
        return NextResponse.json({ events: [], isComplete: false, summary: null, debug: { error: err.message, daemonUrl } });
      }
    }

    // Local: read directly from filesystem
    try {
      const logFile = path.join(process.cwd(), 'logs', 'runs', `${runId}.jsonl`);
      const content = readFileSync(logFile, 'utf-8');
      return parseAndReturnEvents(content);
    } catch {
      return NextResponse.json({ events: [], isComplete: false, summary: null });
    }
  }

  // Legacy plain text log file
  if (!file) {
    return NextResponse.json({ error: 'file or runId parameter required' }, { status: 400 });
  }

  const normalized = path.normalize(file);
  if (!normalized.startsWith('logs/') || normalized.includes('..')) {
    return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
  }

  try {
    const filePath = path.join(process.cwd(), normalized);
    const stat = statSync(filePath);

    let content: string;
    if (stat.size > 100000) {
      const fs = require('fs');
      const buffer = Buffer.alloc(100000);
      const fd = fs.openSync(filePath, 'r');
      fs.readSync(fd, buffer, 0, 100000, stat.size - 100000);
      fs.closeSync(fd);
      content = buffer.toString('utf-8');
      const firstNewline = content.indexOf('\n');
      if (firstNewline > 0) content = content.slice(firstNewline + 1);
    } else {
      content = readFileSync(filePath, 'utf-8');
    }

    const allLines = content.split('\n');
    const lastLines = allLines.slice(-lines).join('\n');

    return NextResponse.json({
      content: lastLines,
      file: normalized,
      totalSize: stat.size,
    });
  } catch {
    return NextResponse.json({ content: 'Log file not found', file: normalized });
  }
}

function parseAndReturnEvents(content: string) {
  const rawLines = content.split('\n').filter(l => l.trim());
  const events: any[] = [];
  for (const line of rawLines) {
    try {
      const event = JSON.parse(line);
      events.push(parseEvent(event));
    } catch { /* skip malformed lines */ }
  }
  const resultEvent = events.find(e => e.type === 'result');
  return NextResponse.json({
    events,
    isComplete: !!resultEvent,
    summary: resultEvent ? {
      cost_usd: resultEvent.cost_usd,
      input_tokens: resultEvent.input_tokens,
      output_tokens: resultEvent.output_tokens,
      duration_ms: resultEvent.duration_ms,
      num_turns: resultEvent.num_turns,
    } : null,
  });
}

/**
 * Parse a raw Claude CLI stream-json event into a simplified format for the frontend.
 *
 * Claude CLI stream-json format:
 * - {"type":"system","subtype":"init",...} — session init
 * - {"type":"assistant","message":{"content":[{"type":"text",...},{"type":"tool_use",...}],...}} — assistant turn
 * - {"type":"user","message":{"content":[{"type":"tool_result",...}],...}} — tool results
 * - {"type":"result","cost_usd":...,"usage":...} — final result
 */
function parseEvent(raw: any): any {
  if (!raw || !raw.type) return { type: 'unknown', raw };

  // Final result event
  if (raw.type === 'result') {
    return {
      type: 'result',
      subtype: raw.subtype,
      cost_usd: raw.cost_usd ?? raw.total_cost_usd ?? null,
      input_tokens: raw.usage?.input_tokens ?? null,
      output_tokens: raw.usage?.output_tokens ?? null,
      duration_ms: raw.duration_ms ?? null,
      num_turns: raw.num_turns ?? null,
      is_error: raw.is_error ?? false,
      result_text: typeof raw.result === 'string' ? raw.result.slice(0, 500) : null,
    };
  }

  // System init event
  if (raw.type === 'system') {
    return {
      type: 'system',
      subtype: raw.subtype,
      session_id: raw.session_id,
    };
  }

  // Stderr from the process
  if (raw.type === 'stderr') {
    return { type: 'stderr', text: raw.text };
  }

  // Assistant message — extract content blocks
  if (raw.type === 'assistant' && raw.message?.content) {
    const blocks: any[] = [];
    for (const block of raw.message.content) {
      if (block.type === 'text') {
        blocks.push({ type: 'text', text: block.text });
      } else if (block.type === 'tool_use') {
        blocks.push({
          type: 'tool_use',
          tool: block.name,
          tool_id: block.id,
          input: summarizeToolInput(block.name, block.input),
          raw_input: block.input,
        });
      }
    }
    return {
      type: 'assistant',
      blocks,
      model: raw.message?.model,
    };
  }

  // User message (tool results)
  if (raw.type === 'user' && raw.message?.content) {
    const blocks: any[] = [];
    for (const block of raw.message.content) {
      if (block.type === 'tool_result') {
        const content = typeof block.content === 'string'
          ? block.content
          : Array.isArray(block.content)
            ? block.content.map((c: any) => c.text || '').join('\n')
            : JSON.stringify(block.content);
        blocks.push({
          type: 'tool_result',
          tool_use_id: block.tool_use_id,
          output: content?.slice(0, 2000) || '',
          is_error: block.is_error ?? false,
        });
      }
    }
    return { type: 'tool_results', blocks };
  }

  // Unknown event — pass through
  return { type: raw.type, raw };
}

/**
 * Create a human-readable summary of a tool's input
 */
function summarizeToolInput(tool: string, input: any): string {
  if (!input) return '';
  switch (tool) {
    case 'Bash':
      return input.command || '';
    case 'Read':
      return input.file_path || '';
    case 'Write':
      return input.file_path || '';
    case 'Edit':
      return input.file_path || '';
    case 'Grep':
      return `${input.pattern || ''}${input.path ? ` in ${input.path}` : ''}`;
    case 'Glob':
      return `${input.pattern || ''}${input.path ? ` in ${input.path}` : ''}`;
    default:
      return JSON.stringify(input).slice(0, 200);
  }
}
