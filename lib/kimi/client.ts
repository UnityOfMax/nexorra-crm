/**
 * Claude Haiku 4.5 client for reply generation.
 * Routes through daemon bridge (subscription auth) instead of direct SDK.
 */

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

export async function callKimi(options: KimiRequestOptions): Promise<KimiResponse> {
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

  throw lastError || new Error('Haiku call failed');
}
