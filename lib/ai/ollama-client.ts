/**
 * Ollama client for local LLM inference.
 * Uses the /api/chat endpoint at localhost:11434.
 *
 * Model selection (env vars):
 *   OLLAMA_REPLY_MODEL — default: llama3.2:1b
 *   OLLAMA_BASE_URL    — default: http://localhost:11434
 *
 * keep_alive: 10m keeps the model resident in RAM between requests.
 * On a machine with <4GB free RAM, use llama3.2:1b (1.3GB).
 * On a machine with >6GB free RAM, llama3.2:3b (2GB) is fine.
 */

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_REPLY_MODEL || 'llama3.2:1b';
const KEEP_ALIVE = process.env.OLLAMA_KEEP_ALIVE || '10m';
const TIMEOUT_MS = parseInt(process.env.OLLAMA_TIMEOUT_MS || '120000', 10);

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OllamaOptions {
  model?: string;
  system: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  maxTokens?: number;
  temperature?: number;
}

interface OllamaResult {
  text: string;
  usage: { input: number; output: number };
}

/**
 * Pre-warm the model — load it into RAM before the first real request.
 * Call this at daemon startup so the first reply isn't slow.
 */
export async function warmModel(model?: string): Promise<void> {
  const m = model || DEFAULT_MODEL;
  try {
    await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: m,
        messages: [{ role: 'user', content: 'ready' }],
        stream: false,
        keep_alive: KEEP_ALIVE,
        options: { num_predict: 1 },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    console.log(`[ollama] Model ${m} warmed up, keep_alive ${KEEP_ALIVE}`);
  } catch (err: any) {
    console.warn(`[ollama] Warm-up failed (non-fatal): ${err.message}`);
  }
}

export async function generateWithOllama(opts: OllamaOptions): Promise<OllamaResult> {
  const model = opts.model || DEFAULT_MODEL;

  const messages: OllamaMessage[] = [
    { role: 'system', content: opts.system },
    ...opts.messages,
  ];

  const body = {
    model,
    messages,
    stream: false,
    keep_alive: KEEP_ALIVE,
    options: {
      temperature: opts.temperature ?? 0.65,
      num_predict: opts.maxTokens || 400,
    },
  };

  const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => `HTTP ${res.status}`);
    throw new Error(`Ollama error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const text: string = data.message?.content ?? '';

  return {
    text: text.trim(),
    usage: {
      input: data.prompt_eval_count ?? 0,
      output: data.eval_count ?? 0,
    },
  };
}
