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

  // POST /lena/query-db — fast Supabase SQL query (no CLI spawn)
  if (req.url === '/lena/query-db' && req.method === 'POST') {
    try {
      const body = JSON.parse(await readBody(req));
      const { sql } = body;
      if (!sql) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'sql required' }));
        return;
      }

      // Use Supabase Management API for raw SQL
      const sbToken = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!sbToken || !sbUrl) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Supabase not configured' }));
        return;
      }

      const start = Date.now();
      // Use Supabase PostgREST RPC or direct REST. For simple queries, use pg-meta.
      const pgRes = await fetch(`${sbUrl}/rest/v1/rpc/`, {
        method: 'POST',
        headers: {
          'apikey': sbToken,
          'Authorization': `Bearer ${sbToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      // PostgREST doesn't support raw SQL. Use a different approach:
      // Execute via the supabase-js client approach (REST API with query params)
      // For now, support common patterns via REST:
      const elapsed = Date.now() - start;

      // Parse the SQL to extract table and conditions for REST API
      // This is a lightweight approach — complex queries fall back to agent
      const selectMatch = sql.match(/SELECT\s+(.+?)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+?))?(?:\s+ORDER\s+BY\s+(.+?))?(?:\s+LIMIT\s+(\d+))?$/i);
      if (selectMatch) {
        const [, columns, table, where, orderBy, limit] = selectMatch;
        let url = `${sbUrl}/rest/v1/${table}?select=${columns === '*' ? '*' : encodeURIComponent(columns.trim())}`;
        if (limit) url += `&limit=${limit}`;
        if (orderBy) {
          const [col, dir] = orderBy.trim().split(/\s+/);
          url += `&order=${col}.${dir?.toLowerCase() === 'asc' ? 'asc' : 'desc'}`;
        }

        const dataRes = await fetch(url, {
          headers: {
            'apikey': sbToken,
            'Authorization': `Bearer ${sbToken}`,
            'Prefer': 'count=exact',
          },
        });
        const data = await dataRes.json();
        const count = dataRes.headers.get('content-range')?.split('/')?.pop();
        const queryElapsed = Date.now() - start;
        console.log(`[query-db] ${table}: ${(data as any[]).length} rows in ${queryElapsed}ms`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ data, count: count ? parseInt(count) : (data as any[]).length, elapsed: queryElapsed }));
        return;
      }

      // Count query
      const countMatch = sql.match(/SELECT\s+count\(\*\)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+))?$/i);
      if (countMatch) {
        const [, table] = countMatch;
        const countRes = await fetch(`${sbUrl}/rest/v1/${table}?select=id&limit=0`, {
          headers: {
            'apikey': sbToken,
            'Authorization': `Bearer ${sbToken}`,
            'Prefer': 'count=exact',
          },
        });
        const countVal = countRes.headers.get('content-range')?.split('/')?.pop() || '0';
        const queryElapsed = Date.now() - start;
        console.log(`[query-db] count(${table}): ${countVal} in ${queryElapsed}ms`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ data: [{ count: parseInt(countVal) }], count: parseInt(countVal), elapsed: queryElapsed }));
        return;
      }

      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Query too complex for fast path. Use agent query instead.' }));
    } catch (err: any) {
      console.error('[query-db] Error:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // POST /lena/relay — agents relay messages to Max via Telegram
  if (req.url === '/lena/relay' && req.method === 'POST') {
    try {
      const body = JSON.parse(await readBody(req));
      const { to, from, text } = body;
      if (!text) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'text required' }));
        return;
      }

      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
      if (!botToken || !chatId) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Telegram not configured' }));
        return;
      }

      const prefix = from ? `[${from}] ` : '';
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: `${prefix}${text}`, parse_mode: 'Markdown' }),
      });

      console.log(`[relay] ${from || 'unknown'} → Max: ${text.slice(0, 60)}...`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    } catch (err: any) {
      console.error('[relay] Error:', err.message);
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
