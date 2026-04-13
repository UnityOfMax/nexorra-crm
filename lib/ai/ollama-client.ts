/**
 * Ollama client for local LLM inference.
 * Uses the OpenAI-compatible endpoint at localhost:11434.
 */

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_REPLY_MODEL || 'llama3.2:3b';

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
    options: {
      temperature: opts.temperature ?? 0.65,
      num_predict: opts.maxTokens || 400,
    },
  };

  const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
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
