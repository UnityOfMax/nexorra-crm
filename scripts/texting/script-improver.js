#!/usr/bin/env node
'use strict';

/**
 * Texting Script Improver — nightly cron agent
 * Runs 10 PM weekdays: 0 22 * * 1-5
 *
 * 1. Pull text_script_stats + 7-day daily breakdown from Supabase
 * 2. For each script where reply_rate < 10% OR total_sent > 50:
 *    - Ask Claude Haiku for an improved initial message variant
 *    - Insert to text_script_variants (status='pending')
 * 3. Apply any approved variants to message-scripts.json, mark as 'active'
 */

const https    = require('https');
const fs       = require('fs');
const path     = require('path');

// ── Env ───────────────────────────────────────────────────────────────────────

function loadEnv() {
  const envPath = path.join(__dirname, '../../.env.local');
  let raw;
  try { raw = fs.readFileSync(envPath, 'utf8'); }
  catch { log('WARN: Could not read .env.local — relying on process.env'); return; }

  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val   = trimmed.slice(eqIdx + 1).trim();
    // Strip surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const { execSync } = require('child_process');

const SCRIPTS_PATH = path.join(__dirname, 'message-scripts.json');

// ── Logging ───────────────────────────────────────────────────────────────────

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

function httpRequest(options, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const headers = Object.assign({}, options.headers || {});
    if (payload) {
      headers['Content-Type']   = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    }
    const req = https.request(Object.assign({}, options, { headers }), res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: data ? JSON.parse(data) : null }); }
        catch { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ── Supabase helpers ──────────────────────────────────────────────────────────

function sbHeaders() {
  return {
    apikey:        SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    Prefer:        'return=representation',
  };
}

function sbUrl(resource) {
  const u = new URL(`${SUPABASE_URL}/rest/v1/${resource}`);
  return { hostname: u.hostname, path: u.pathname + u.search };
}

async function sbGet(resource) {
  const u = sbUrl(resource);
  const res = await httpRequest({ method: 'GET', hostname: u.hostname, path: u.path, headers: sbHeaders() });
  if (res.status >= 400) {
    throw new Error(`Supabase GET ${resource} → ${res.status}: ${JSON.stringify(res.data)}`);
  }
  return res.data || [];
}

async function sbPost(resource, body) {
  const u = sbUrl(resource);
  const res = await httpRequest({ method: 'POST', hostname: u.hostname, path: u.path, headers: sbHeaders() }, body);
  if (res.status >= 400) {
    throw new Error(`Supabase POST ${resource} → ${res.status}: ${JSON.stringify(res.data)}`);
  }
  return res.data;
}

async function sbPatch(resource, body) {
  const u = sbUrl(resource);
  const res = await httpRequest({ method: 'PATCH', hostname: u.hostname, path: u.path, headers: sbHeaders() }, body);
  if (res.status >= 400) {
    throw new Error(`Supabase PATCH ${resource} → ${res.status}: ${JSON.stringify(res.data)}`);
  }
  return res.data;
}

// ── Claude Haiku ──────────────────────────────────────────────────────────────

function callClaude(prompt) {
  const result = execSync(`claude -p ${JSON.stringify(prompt)}`, {
    timeout: 60000, encoding: 'utf8',
  });
  return result.trim();
}

// ── Script helpers ────────────────────────────────────────────────────────────

function loadScripts() {
  return JSON.parse(fs.readFileSync(SCRIPTS_PATH, 'utf8'));
}

function saveScripts(scripts) {
  fs.writeFileSync(SCRIPTS_PATH, JSON.stringify(scripts, null, 2));
}

// ── Core logic ────────────────────────────────────────────────────────────────

function generateVariant(scriptId, currentMsg, stats, daily) {
  const replyRate     = stats.reply_rate  || 0;
  const totalSent     = stats.total_sent  || 0;
  const bookingIntent = stats.booking_intent || 0;

  const dailySummary = daily
    .filter(d => String(d.script_id) === String(scriptId))
    .slice(0, 7)
    .map(d => `  ${d.day}: sent=${d.sent}, replies=${d.replies}, bookingIntent=${d.booking_intent}`)
    .join('\n') || '  (no daily data)';

  const prompt = `You are optimising cold text message scripts sent to real estate agents in the US.

CURRENT INITIAL MESSAGE (script ${scriptId}):
"${currentMsg}"

PERFORMANCE STATS (last 7 days):
- Total sent: ${totalSent}
- Reply rate: ${replyRate}%
- Booking intent replies: ${bookingIntent}
- Daily breakdown:
${dailySummary}

GOAL: Increase reply rate and booking intent (discovery call with Nexorra, AI appointment-setting agency for agents).

RULES (non-negotiable):
- Under 160 characters including spaces
- First-person, casual — sounds like a real human texting
- No AI slop: no "Absolutely!", "Great!", "I understand", "I hope this finds you well"
- No generic buzzwords: no "game-changing", "revolutionary", "leverage"
- Personalisation tokens allowed: {first_name}, {city}
- End with a clear, low-friction question or CTA
- Do NOT start with "Hi" or "Hey" if the current message does — try a different opener

Reply with ONLY the new message text. No explanation, no quotes, no preamble.`;

  const raw = callClaude(prompt);

  // Strip any surrounding quotes the model might add
  const cleaned = raw.replace(/^["']|["']$/g, '').trim();

  // Enforce 160-char hard limit — truncate at last word boundary if needed
  if (cleaned.length > 160) {
    const truncated = cleaned.slice(0, 157);
    const lastSpace = truncated.lastIndexOf(' ');
    return (lastSpace > 100 ? truncated.slice(0, lastSpace) : truncated) + '...';
  }

  return cleaned;
}

async function run() {
  log('=== Script Improver — start ===');

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    log('ERROR: Missing SUPABASE env vars — abort');
    process.exit(1);
  }

  // 1. Pull stats
  log('Pulling text_script_stats...');
  const stats = await sbGet('text_script_stats');
  log(`  ${stats.length} script(s) found`);

  // 2. Pull 7-day daily
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  log('Pulling text_script_daily (last 7 days)...');
  const daily = await sbGet(`text_script_daily?day=gte.${sevenDaysAgo}&order=day.desc`);
  log(`  ${daily.length} daily rows`);

  // 3. Load current scripts
  const scripts = loadScripts();

  // 4. Generate variants for underperforming scripts
  for (const stat of stats) {
    const { script_id, reply_rate, total_sent } = stat;
    const needsWork = (reply_rate !== null && reply_rate < 10) || (total_sent !== null && total_sent > 50);

    if (!needsWork) {
      log(`Script ${script_id}: reply_rate=${reply_rate}% total_sent=${total_sent} — skip (performing OK)`);
      continue;
    }

    log(`Script ${script_id}: reply_rate=${reply_rate}% total_sent=${total_sent} — generating variant...`);

    const currentMsg = (scripts[String(script_id)] || {}).initial;
    if (!currentMsg) {
      log(`  Script ${script_id}: no initial message in message-scripts.json — skip`);
      continue;
    }

    try {
      const newBody = generateVariant(script_id, currentMsg, stat, daily);
      log(`  Generated (${newBody.length} chars): "${newBody}"`);

      await sbPost('text_script_variants', {
        script_id:    script_id,
        message_type: 'initial',
        body:         newBody,
        status:       'pending',
        performance:  {
          reply_rate:     reply_rate,
          total_sent:     total_sent,
          booking_intent: stat.booking_intent,
          opted_out:      stat.opted_out,
          generated_at:   new Date().toISOString(),
        },
      });

      log(`  Inserted pending variant for script ${script_id}`);
    } catch (err) {
      log(`  ERROR generating variant for script ${script_id}: ${err.message}`);
    }

    // Pause between Claude calls to avoid rate limits
    await new Promise(r => setTimeout(r, 2000));
  }

  // 5. Apply any approved variants to message-scripts.json
  log('\nChecking for approved variants to apply...');
  const approved = await sbGet('text_script_variants?status=eq.approved&order=approved_at.asc');
  log(`  ${approved.length} approved variant(s)`);

  for (const variant of approved) {
    const { id, script_id, message_type, body } = variant;
    const sid = String(script_id);

    if (!scripts[sid]) {
      log(`  Variant ${id}: script ${script_id} not in message-scripts.json — skip`);
      continue;
    }
    if (!['initial', 'followup1', 'followup2', 'autoReply'].includes(message_type)) {
      log(`  Variant ${id}: unknown message_type '${message_type}' — skip`);
      continue;
    }

    const oldMsg = scripts[sid][message_type];
    scripts[sid][message_type] = body;
    saveScripts(scripts);

    log(`  Applied variant ${id} → script ${script_id}.${message_type}`);
    log(`    OLD: "${oldMsg}"`);
    log(`    NEW: "${body}"`);

    // Mark as active in DB
    try {
      await sbPatch(`text_script_variants?id=eq.${id}`, {
        status:     'active',
        applied_at: new Date().toISOString(),
      });
      log(`  Marked variant ${id} as active`);
    } catch (err) {
      log(`  WARN: Could not mark variant ${id} active: ${err.message}`);
    }
  }

  log('\n=== Script Improver — done ===');
}

run().catch(err => {
  log(`FATAL: ${err.message}\n${err.stack}`);
  process.exit(1);
});
