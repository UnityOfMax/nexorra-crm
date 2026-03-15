/**
 * AI text generation via daemon bridge.
 *
 * All AI text generation routes through the local daemon, which spawns
 * the Claude CLI (subscription auth). This replaces direct Anthropic SDK
 * calls so nothing uses the API key for generation.
 *
 * On Vercel: DAEMON_URL → cloudflared tunnel → daemon → Claude CLI
 * Locally:   localhost:4200 → daemon → Claude CLI
 */

import crypto from 'crypto';

interface GenerateTextOptions {
  model?: string;
  system: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  maxTokens?: number;
  temperature?: number;
}

interface GenerateTextResult {
  text: string;
  usage: { input: number; output: number };
}

export async function generateText(opts: GenerateTextOptions): Promise<GenerateTextResult> {
  const daemonUrl = process.env.DAEMON_URL || 'http://localhost:4200';

  const payload = JSON.stringify({
    model: opts.model || 'claude-haiku-4-5-20251001',
    system: opts.system,
    messages: opts.messages,
    maxTokens: opts.maxTokens || 500,
    temperature: opts.temperature,
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-cron-secret': process.env.CRON_SECRET || '',
  };

  const signingKey = process.env.DAEMON_SIGNING_KEY;
  if (signingKey) {
    headers['x-signature'] = crypto
      .createHmac('sha256', signingKey)
      .update(payload)
      .digest('hex');
  }

  const res = await fetch(`${daemonUrl}/generate`, {
    method: 'POST',
    headers,
    body: payload,
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(`Daemon generate failed: ${(err as any).error || res.status}`);
  }

  return res.json() as Promise<GenerateTextResult>;
}
