/**
 * Claude Haiku 4.5 client for reply generation.
 *
 * Fast path: direct Anthropic SDK with prompt caching (requires ANTHROPIC_API_KEY).
 * Fallback: daemon bridge (Claude CLI subscription auth) — slower, no caching.
 *
 * To enable fast path: add ANTHROPIC_API_KEY to .env.local + Vercel env vars.
 * Cache saves ~90% on input tokens for repeated system prompts (min 2048 tokens to activate).
 */

import Anthropic from '@anthropic-ai/sdk';
import { generateText } from '@/lib/ai/daemon-client';

interface KimiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface KimiRequestOptions {
  model?: string;
  messages: KimiMessage[];
  maxTokens?: number;
  temperature?: number;
}

interface KimiResponse {
  reply: string;
  tokensUsed: {
    input: number;
    output: number;
    total: number;
    cacheCreation?: number;
    cacheRead?: number;
  };
}

const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';
const MAX_RETRIES = 2;

// Lazy singleton — only created when API key is present
let _client: Anthropic | null = null;
function getClient(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  if (!_client) _client = new Anthropic({ apiKey: key });
  return _client;
}

export async function callKimi(options: KimiRequestOptions): Promise<KimiResponse> {
  const client = getClient();
  if (client) {
    return callKimiDirect(client, options);
  }
  return callKimiDaemon(options);
}

/**
 * Direct Anthropic SDK path — fastest, supports prompt caching.
 * Cache activates when system prompt >= 2048 tokens.
 */
async function callKimiDirect(client: Anthropic, options: KimiRequestOptions): Promise<KimiResponse> {
  const systemMessages = options.messages.filter((m) => m.role === 'system');
  const conversationMessages = options.messages.filter((m) => m.role !== 'system');
  const systemContent = systemMessages.map((m) => m.content).join('\n\n');

  const messages = conversationMessages.map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  if (messages.length === 0) {
    messages.push({ role: 'user' as const, content: 'Hello' });
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await client.messages.create({
        model: options.model || DEFAULT_MODEL,
        max_tokens: options.maxTokens || 500,
        temperature: options.temperature ?? 0.7,
        system: [
          {
            type: 'text',
            text: systemContent,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages,
      });

      const reply = response.content
        .filter((b) => b.type === 'text')
        .map((b) => (b as Anthropic.TextBlock).text)
        .join('');

      const usage = response.usage as Anthropic.Usage & {
        cache_creation_input_tokens?: number;
        cache_read_input_tokens?: number;
      };

      return {
        reply,
        tokensUsed: {
          input: usage.input_tokens,
          output: usage.output_tokens,
          total: usage.input_tokens + usage.output_tokens,
          cacheCreation: usage.cache_creation_input_tokens || 0,
          cacheRead: usage.cache_read_input_tokens || 0,
        },
      };
    } catch (err: any) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
    }
  }

  throw lastError || new Error('Haiku direct call failed');
}

/**
 * Daemon fallback — routes through Claude CLI (subscription auth).
 * Slower due to process spawn overhead, no prompt caching.
 */
async function callKimiDaemon(options: KimiRequestOptions): Promise<KimiResponse> {
  const systemMessages = options.messages.filter((m) => m.role === 'system');
  const conversationMessages = options.messages.filter((m) => m.role !== 'system');

  const systemContent = systemMessages.map((m) => m.content).join('\n\n');

  const messages = conversationMessages.map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  if (messages.length === 0) {
    messages.push({ role: 'user' as const, content: 'Hello' });
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await generateText({
        model: options.model || DEFAULT_MODEL,
        system: systemContent,
        messages,
        maxTokens: options.maxTokens || 500,
        temperature: options.temperature ?? 0.7,
      });

      return {
        reply: result.text,
        tokensUsed: {
          input: result.usage.input,
          output: result.usage.output,
          total: result.usage.input + result.usage.output,
          cacheCreation: 0,
          cacheRead: 0,
        },
      };
    } catch (err: any) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
    }
  }

  throw lastError || new Error('Haiku daemon call failed');
}
