/**
 * Lena Bridge — Lightweight HTTP server for fast AI generation.
 * Uses local OAuth token from ~/.claude/.credentials.json.
 * Runs on port 4201, exposed via cloudflared tunnel.
 * ~1-3s response time (vs 50s for daemon /generate which spawns CLI).
 */

import http from 'http';
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const PORT = 4201;
const CRON_SECRET = process.env.CRON_SECRET || '';

let cachedClient: Anthropic | null = null;
let cachedExpiry = 0;

function getClient(): Anthropic {
  const now = Date.now();
  if (cachedClient && cachedExpiry > now + 300_000) return cachedClient;

  // Try API key first
  if (process.env.ANTHROPIC_API_KEY) {
    cachedClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    cachedExpiry = now + 3600_000;
    return cachedClient;
  }

  // Read OAuth token
  const credsPath = join(process.env.HOME || '/home/max', '.claude', '.credentials.json');
  if (!existsSync(credsPath)) throw new Error('No credentials file found');

  const creds = JSON.parse(readFileSync(credsPath, 'utf-8'));
  const oauth = creds.claudeAiOauth;
  if (!oauth?.accessToken || oauth.expiresAt <= now) {
    throw new Error('OAuth token expired or missing');
  }

  cachedClient = new Anthropic({ apiKey: oauth.accessToken });
  cachedExpiry = oauth.expiresAt;
  return cachedClient;
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk: Buffer) => { data += chunk.toString(); });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // Health check
  if (req.url === '/health' || req.url === '/lena/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, uptime: process.uptime() }));
    return;
  }

  // Main generate endpoint
  if (req.url === '/lena' && req.method === 'POST') {
    try {
      const body = JSON.parse(await readBody(req));
      const { system, messages, maxTokens = 400, model = 'claude-haiku-4-5-20251001', temperature = 0.7 } = body;

      const client = getClient();
      const start = Date.now();

      const response = await client.messages.create({
        model,
        max_tokens: maxTokens,
        temperature,
        system: [{ type: 'text' as const, text: system, cache_control: { type: 'ephemeral' as const } }],
        messages: messages.map((m: any) => ({ role: m.role, content: m.content })),
      });

      const text = response.content
        .filter((b: any) => b.type === 'text')
        .map((b: any) => b.text)
        .join('');

      const elapsed = Date.now() - start;
      console.log(`[lena] Generated ${text.length} chars in ${elapsed}ms (${response.usage.input_tokens}+${response.usage.output_tokens} tokens)`);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        text,
        usage: { input: response.usage.input_tokens, output: response.usage.output_tokens },
        elapsed,
      }));
    } catch (err: any) {
      console.error('[lena] Generation error:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[lena-bridge] Listening on http://127.0.0.1:${PORT}`);
  console.log(`[lena-bridge] Endpoints: POST /lena, GET /health`);
});
