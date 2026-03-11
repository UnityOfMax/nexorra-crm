/**
 * Claude Haiku 4.5 API client with prompt caching.
 * Used for reply generation in both cold email and client reply agents.
 *
 * Previously used Moonshot AI (Kimi K2.5). Migrated to Claude Haiku 4.5
 * with Anthropic prompt caching for cost efficiency.
 */

import Anthropic from '@anthropic-ai/sdk';
import { anthropicClient } from '@/lib/ai/client';

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

export async function callKimi(options: KimiRequestOptions): Promise<KimiResponse> {
  if (!anthropicClient) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  // Extract system message from messages array
  const systemMessages = options.messages.filter((m) => m.role === 'system');
  const conversationMessages = options.messages.filter((m) => m.role !== 'system');

  const systemContent = systemMessages.map((m) => m.content).join('\n\n');

  // Build Anthropic messages (must alternate user/assistant)
  const messages: Anthropic.MessageParam[] = conversationMessages.map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  // Ensure at least one user message
  if (messages.length === 0) {
    messages.push({ role: 'user', content: 'Hello' });
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await anthropicClient.messages.create({
        model: options.model || DEFAULT_MODEL,
        max_tokens: options.maxTokens || 500,
        temperature: options.temperature ?? 0.7,
        // System prompt with cache_control for prompt caching
        system: systemContent
          ? [
              {
                type: 'text' as const,
                text: systemContent,
                cache_control: { type: 'ephemeral' as const },
              },
            ]
          : undefined,
        messages,
      });

      const responseText = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('');

      const usage = response.usage as any;

      return {
        reply: responseText,
        tokensUsed: {
          input: usage?.input_tokens || 0,
          output: usage?.output_tokens || 0,
          total: (usage?.input_tokens || 0) + (usage?.output_tokens || 0),
          cacheCreation: usage?.cache_creation_input_tokens || 0,
          cacheRead: usage?.cache_read_input_tokens || 0,
        },
      };
    } catch (err: any) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Retry on rate limit
      if (err?.status === 429 && attempt < MAX_RETRIES) {
        const retryAfter = parseInt(err?.headers?.['retry-after'] || '10', 10);
        await new Promise((r) => setTimeout(r, retryAfter * 1000));
        continue;
      }

      // Retry on transient errors
      if (attempt < MAX_RETRIES && err?.status !== 429) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
    }
  }

  throw lastError || new Error('Haiku call failed');
}
