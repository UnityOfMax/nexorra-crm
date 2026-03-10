/**
 * Moonshot AI (Kimi K2.5) API client.
 * Used for reply generation in both cold email and client reply agents.
 */

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
  };
}

const KIMI_BASE_URL = 'https://api.moonshot.cn/v1/chat/completions';
const DEFAULT_MODEL = 'kimi-k2-5';
const MAX_RETRIES = 2;

export async function callKimi(options: KimiRequestOptions): Promise<KimiResponse> {
  const apiKey = process.env.MOONSHOT_API_KEY;
  if (!apiKey) {
    throw new Error('MOONSHOT_API_KEY not configured');
  }

  const body = {
    model: options.model || DEFAULT_MODEL,
    messages: options.messages,
    max_tokens: options.maxTokens || 500,
    temperature: options.temperature ?? 0.7,
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(KIMI_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000),
      });

      if (res.status === 429) {
        if (attempt < MAX_RETRIES) {
          const retryAfter = parseInt(res.headers.get('retry-after') || '10', 10);
          await new Promise((r) => setTimeout(r, retryAfter * 1000));
          continue;
        }
        throw new Error('Kimi rate limited after retries');
      }

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Kimi API error ${res.status}: ${errText}`);
      }

      const data = await res.json();
      const choice = data.choices?.[0];

      return {
        reply: choice?.message?.content || '',
        tokensUsed: {
          input: data.usage?.prompt_tokens || 0,
          output: data.usage?.completion_tokens || 0,
          total: data.usage?.total_tokens || 0,
        },
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES && !(lastError.message.includes('rate limited'))) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
    }
  }

  throw lastError || new Error('Kimi call failed');
}
