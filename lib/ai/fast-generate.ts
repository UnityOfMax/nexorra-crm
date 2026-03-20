/**
 * Fast text generation using Anthropic SDK with OAuth token.
 * Used for latency-critical paths (Lena's Telegram responses).
 *
 * Reads the OAuth access token from ~/.claude/.credentials.json.
 * Falls back to ANTHROPIC_API_KEY env var if credentials file unavailable.
 * No CLI spawn overhead — direct API call (~1-3s vs ~50s).
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import { join } from 'path';

let cachedClient: Anthropic | null = null;
let cachedTokenExpiry = 0;

function getClient(): Anthropic {
  const now = Date.now();

  // Return cached client if token is still valid (with 5 min buffer)
  if (cachedClient && cachedTokenExpiry > now + 300_000) {
    return cachedClient;
  }

  // Option 1: ANTHROPIC_API_KEY env var (works on Vercel + locally)
  if (process.env.ANTHROPIC_API_KEY) {
    cachedClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    cachedTokenExpiry = now + 3600_000;
    return cachedClient;
  }

  // Option 2: OAuth token from credentials file (local dev only)
  try {
    const credsPath = join(process.env.HOME || '/home/max', '.claude', '.credentials.json');
    const creds = JSON.parse(readFileSync(credsPath, 'utf-8'));
    const oauth = creds.claudeAiOauth;

    if (oauth?.accessToken && oauth.expiresAt > now) {
      cachedClient = new Anthropic({
        apiKey: oauth.accessToken,
      });
      cachedTokenExpiry = oauth.expiresAt;
      return cachedClient;
    }
  } catch {}

  throw new Error('No OAuth token or API key available for fast generation');
}

interface FastGenerateOptions {
  system: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

interface FastGenerateResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

export async function fastGenerate(opts: FastGenerateOptions): Promise<FastGenerateResult> {
  const client = getClient();

  const response = await client.messages.create({
    model: opts.model || 'claude-haiku-4-5-20251001',
    max_tokens: opts.maxTokens || 300,
    temperature: opts.temperature ?? 0.8,
    system: [{ type: 'text', text: opts.system, cache_control: { type: 'ephemeral' } }],
    messages: opts.messages.map(m => ({
      role: m.role,
      content: m.content,
    })),
  });

  const text = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('');

  return {
    text,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}
