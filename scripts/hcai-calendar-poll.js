#!/usr/bin/env node
/**
 * HCAI Calendar Polling — watches the "Extra" calendar on maxfwcett@gmail.com
 * for new website consultation bookings and fires the 2-email sequence via Resend.
 *
 * Email 1: immediate on booking   (hcai.booking.confirmed)
 * Email 2: 4 hours before call    (hcai.call.reminder_4h, scheduled via Resend)
 *
 * Runs every 5 min via cron. Emails are queued in Resend — device doesn't need to
 * stay on after a booking is detected.
 *
 * State: agents/state/hcai-poll-state.json
 * Tokens: agents/state/hcai-google-tokens.json
 * Resend config: agents/state/resend-hcai-booking-config.json
 *
 * Flags:
 *   --dry-run   Log everything, send nothing
 *   --test      Send to TEST_EMAIL instead of the lead
 */

'use strict';

const https   = require('https');
const fs      = require('fs');
const path    = require('path');
const { execSync, spawn } = require('child_process');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const QUEUE_PATH   = path.join(__dirname, '../agents/state/prospect-demo-queue.json');

const RESEND_KEY   = process.env.RESEND_API_KEY;
const TEST_EMAIL   = process.env.TEST_EMAIL || '111macifawcett@gmail.com';
const PRECALL_URL  = process.env.HCAI_PRECALL_URL || 'https://booking.ainexorra.com';

const TOKENS_FILE  = path.join(__dirname, '../agents/state/hcai-google-tokens.json');
const STATE_FILE   = path.join(__dirname, '../agents/state/hcai-poll-state.json');
const CONFIG_FILE  = path.join(__dirname, '../agents/state/resend-hcai-booking-config.json');

const DRY_RUN  = process.argv.includes('--dry-run');
const TEST_MODE = process.argv.includes('--test');

if (DRY_RUN)   console.log('[DRY RUN] No emails will be sent');
if (TEST_MODE) console.log(`[TEST MODE] All emails → ${TEST_EMAIL}`);

// ── HTTP helper ───────────────────────────────────────────────────────────────

function req(options, body = null) {
  return new Promise((resolve, reject) => {
    const r = https.request(options, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d }); }
      });
    });
    r.on('error', reject);
    if (body) r.write(typeof body === 'string' ? body : JSON.stringify(body));
    r.end();
  });
}

// ── State ─────────────────────────────────────────────────────────────────────

function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); }
  catch { return { syncToken: null, processed: [] }; }
}

function saveState(s) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2));
}

// ── Google OAuth token refresh ────────────────────────────────────────────────

async function getAccessToken() {
  const stored = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8'));

  // Return cached token if still valid (with 5 min buffer)
  if (stored.access_token && stored.token_expiry) {
    if (Date.now() < new Date(stored.token_expiry).getTime() - 5 * 60 * 1000) {
      return stored.access_token;
    }
  }

  console.log('Refreshing Google access token...');
  const body = new URLSearchParams({
    client_id:     process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    refresh_token: stored.refresh_token,
    grant_type:    'refresh_token',
  }).toString();

  const res = await req({
    hostname: 'oauth2.googleapis.com', path: '/token', method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
  }, body);

  if (!res.body.access_token) throw new Error('Token refresh failed: ' + JSON.stringify(res.body));

  const updated = {
    ...stored,
    access_token: res.body.access_token,
    token_expiry: new Date(Date.now() + (res.body.expires_in || 3600) * 1000).toISOString(),
  };
  fs.writeFileSync(TOKENS_FILE, JSON.stringify(updated, null, 2));
  return res.body.access_token;
}

// ── Calendar polling ──────────────────────────────────────────────────────────

async function fetchCalendarChanges(accessToken, calendarId, syncToken) {
  const params = new URLSearchParams({ singleEvents: 'true', maxResults: '50' });
  if (syncToken) {
    params.set('syncToken', syncToken);
  } else {
    params.set('orderBy', 'updated');
    params.set('timeMin', new Date().toISOString());
    params.set('timeMax', new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString());
  }

  const res = await req({
    hostname: 'www.googleapis.com',
    path: `/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.status === 410) {
    console.log('Sync token expired — resetting');
    return fetchCalendarChanges(accessToken, calendarId, null);
  }

  if (res.status !== 200) throw new Error(`Calendar API ${res.status}: ${JSON.stringify(res.body)}`);

  return { items: res.body.items || [], nextSyncToken: res.body.nextSyncToken };
}

// ── Lead info extraction ──────────────────────────────────────────────────────

function extractLead(event) {
  const attendees = event.attendees || [];
  const lead = attendees.find(a => !a.self && !a.organizer) || attendees.find(a => !a.self);

  const email = lead?.email || null;
  let firstName = (lead?.displayName || '').split(' ')[0];
  if (!firstName && email) {
    const local = email.split('@')[0].split(/[._-]/)[0];
    firstName = local.charAt(0).toUpperCase() + local.slice(1);
  }

  return {
    email,
    firstName: firstName || 'there',
    callTime: event.start?.dateTime || event.start?.date,
    eventId: event.id,
    title: event.summary,
  };
}

// ── Resend helpers ────────────────────────────────────────────────────────────

function resendReq(urlPath, method, body) {
  const str = JSON.stringify(body);
  return req({
    hostname: 'api.resend.com', path: urlPath, method,
    headers: {
      Authorization: `Bearer ${RESEND_KEY}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(str),
    },
  }, str);
}

function formatCallDate(iso) {
  if (!iso) return 'your scheduled time';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) +
    ' at ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
}

function formatCallTime(iso) {
  if (!iso) return 'your scheduled time';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
}

async function sendEmails(lead, config, recipientEmail) {
  const callDate = formatCallDate(lead.callTime);
  const callTime = formatCallTime(lead.callTime);
  const callMs   = lead.callTime ? new Date(lead.callTime).getTime() : 0;
  const from     = config.from || process.env.BOOKING_FROM_EMAIL || 'Max <maxfawcett@ainexorra.com>';

  // ── Email 1: immediate booking confirmation ───────────────────────────────
  const email1Html = `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0a0f1e;line-height:1.7">
<p>Hi ${lead.firstName},</p>
<p>I've set your booking up for <strong>${callDate}</strong>.</p>
<p>Before we speak, watch the short video on the page below. It covers the website we've built for your business and what we'll go through on the call.</p>
<p style="text-align:center;margin:32px 0">
  <a href="${PRECALL_URL}" style="background:#1354e8;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:16px;display:inline-block">
    Watch the video &rarr;
  </a>
</p>
<p>See you then.</p>
<p style="margin-top:28px">Max</p>
</body></html>`;

  if (!DRY_RUN) {
    const r1 = await resendReq('/emails', 'POST', {
      from,
      to: [recipientEmail],
      subject: "Here's everything before our call",
      html: email1Html,
    });
    console.log(`  Email 1 sent to ${recipientEmail}: ${r1.status === 200 ? 'OK' : JSON.stringify(r1.body)}`);
  } else {
    console.log(`  [DRY] Email 1 → ${recipientEmail}: "Here's everything before our call"`);
  }

  // ── Email 2: 4 hours before the call ─────────────────────────────────────
  const reminderAt = callMs - 4 * 60 * 60 * 1000;
  const now = Date.now();

  if (reminderAt <= now) {
    console.log('  Email 2 skipped — call is less than 4 hours away');
    return;
  }

  const email2Html = `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0a0f1e;line-height:1.7">
<p>Hi ${lead.firstName},</p>
<p>Your call is in 4 hours at <strong>${callTime}</strong>.</p>
<p>If you haven't watched the video yet, worth doing before we speak. It's a few minutes and covers exactly what we'll be going through.</p>
<p style="text-align:center;margin:32px 0">
  <a href="${PRECALL_URL}" style="background:#1354e8;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;font-size:15px;display:inline-block">
    Watch the video &rarr;
  </a>
</p>
<p>Talk soon.</p>
<p style="margin-top:28px">Max</p>
</body></html>`;

  if (!DRY_RUN) {
    const r2 = await resendReq('/emails', 'POST', {
      from,
      to: [recipientEmail],
      subject: 'Your call is in 4 hours',
      html: email2Html,
      scheduledAt: new Date(reminderAt).toISOString(),
    });
    console.log(`  Email 2 scheduled at ${new Date(reminderAt).toLocaleString()}: ${r2.status === 200 ? 'OK' : JSON.stringify(r2.body)}`);
  } else {
    console.log(`  [DRY] Email 2 scheduled → ${new Date(reminderAt).toLocaleString()}`);
  }
}

// ── Lead matching from calendar event ────────────────────────────────────────

function extractPhoneFromEvent(event) {
  const phoneRe = /\+?1?[\s.\-]?\(?(\d{3})\)?[\s.\-]?(\d{3})[\s.\-]?(\d{4})/;

  // 1. Description: look for "Phone: ..." line
  const desc = event.description || '';
  const descMatch = desc.match(/Phone:\s*([+0-9()\s.\-]{7,20})/i);
  if (descMatch) {
    const digits = descMatch[1].replace(/\D/g, '');
    if (digits.length >= 10) return digits.slice(-10);
  }

  // 2. Title: "Website Call — Company Name (555) 123-4567"
  const title = event.summary || '';
  const titleMatch = title.match(phoneRe);
  if (titleMatch) {
    return (titleMatch[1] + titleMatch[2] + titleMatch[3]);
  }

  return null;
}

function extractBusinessFromEvent(event) {
  const desc = event.description || '';
  const bizMatch = desc.match(/Business:\s*(.+)/i);
  if (bizMatch) return bizMatch[1].trim();

  // Fall back to parsing title "Website Call — Company Name (phone)"
  const titleMatch = (event.summary || '').match(/Website Call\s*[—-]\s*(.+?)\s*\(/i);
  if (titleMatch) return titleMatch[1].trim();

  return null;
}

async function findLeadByPhone(phone) {
  if (!SUPABASE_URL || !SUPABASE_KEY || !phone) return null;
  const digits = phone.replace(/\D/g, '').slice(-10);
  return new Promise((resolve) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/leads`);
    url.searchParams.set('select', 'id,full_name,first_name,source_brokerage,city,state_province,demo_slug');
    url.searchParams.set('phone', `ilike.%${digits}%`);
    url.searchParams.set('lead_category', 'eq.website');
    url.searchParams.set('limit', '1');
    const r = https.request({
      hostname: url.hostname, path: url.pathname + url.search, method: 'GET',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const rows = JSON.parse(d);
          resolve(rows && rows[0] ? rows[0] : null);
        } catch { resolve(null); }
      });
    });
    r.on('error', () => resolve(null));
    r.end();
  });
}

function enqueueDemoBuild(leadId, businessName, bizType) {
  let q = [];
  try { q = JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf8')); } catch {}
  if (q.some(e => e.leadId === leadId && e.status !== 'failed')) {
    console.log(`  Demo already queued for ${businessName}`);
    return;
  }
  q.push({ leadId, businessName, bizType, queuedAt: new Date().toISOString(), status: 'pending' });
  fs.mkdirSync(path.dirname(QUEUE_PATH), { recursive: true });
  fs.writeFileSync(QUEUE_PATH, JSON.stringify(q, null, 2));
  console.log(`  Queued demo build for ${businessName}`);
}

function triggerResearchAgent() {
  const cwd = path.join(__dirname, '..');
  const envFile = path.join(cwd, '.env.local');
  const script  = path.join(__dirname, 'local-biz/research-prospect.ts');

  // Run in background — detached so poll script doesn't wait for it
  const child = spawn('bash', ['-c',
    `set -a && source "${envFile}" && set +a && npx tsx "${script}" --queue >> "${cwd}/logs/prospect-demo.log" 2>&1`
  ], { cwd, detached: true, stdio: 'ignore' });
  child.unref();
  console.log('  Research agent spawned (background)');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const tokens = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8'));
  const calendarId = tokens.extra_calendar_id;
  if (!calendarId) throw new Error('No extra_calendar_id in hcai-google-tokens.json. Re-run hcai-google-oauth.js.');

  let config = {};
  try { config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); } catch {}

  const state = loadState();
  const accessToken = await getAccessToken();

  console.log(`Polling Extra calendar (${calendarId.slice(0, 16)}...)...`);
  const { items, nextSyncToken } = await fetchCalendarChanges(accessToken, calendarId, state.syncToken);
  console.log(`${items.length} event(s) to check`);

  let emailsSent = 0;

  for (const event of items) {
    if (event.status === 'cancelled') continue;
    if (!event.start?.dateTime && !event.start?.date) continue;

    const lead = extractLead(event);
    if (!lead.email) { console.log(`  Skip "${event.summary}" — no attendee email`); continue; }

    // Skip already processed
    if (state.processed.includes(event.id)) { continue; }

    console.log(`\nNew booking: "${event.summary}"`);
    console.log(`  Lead: ${lead.firstName} <${lead.email}>`);
    console.log(`  Time: ${lead.callTime}`);

    const recipientEmail = TEST_MODE ? TEST_EMAIL : lead.email;
    await sendEmails(lead, config, recipientEmail);

    // ── Match lead in DB and trigger personalised demo build ──────────────────
    const phone = extractPhoneFromEvent(event);
    const bizName = extractBusinessFromEvent(event) || lead.firstName;
    console.log(`  Extracted phone: ${phone || '(none)'} | business: ${bizName}`);

    if (phone) {
      const dbLead = await findLeadByPhone(phone);
      if (dbLead) {
        console.log(`  Matched lead: ${dbLead.full_name || dbLead.first_name} (${dbLead.id})`);
        if (dbLead.demo_slug) {
          console.log(`  Demo already built: ${dbLead.demo_slug}`);
        } else {
          enqueueDemoBuild(dbLead.id, dbLead.full_name || dbLead.first_name || bizName, dbLead.source_brokerage || 'home services');
          triggerResearchAgent();
        }
      } else {
        console.log(`  No matching lead found for phone ${phone}`);
      }
    }

    state.processed.push(event.id);
    emailsSent++;
  }

  // Keep processed list trim (last 200 event IDs)
  if (state.processed.length > 200) state.processed = state.processed.slice(-200);

  state.syncToken = nextSyncToken || state.syncToken;
  if (!DRY_RUN) saveState(state);

  console.log(`\nDone. ${emailsSent} new booking(s) processed.`);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
