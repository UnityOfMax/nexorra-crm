#!/usr/bin/env node
'use strict';

const puppeteer  = require('puppeteer');
const https      = require('https');
const fs         = require('fs');
const path       = require('path');
const { execSync } = require('child_process');

const PORT             = 9240;
const PROSPECT_QUEUE   = '/home/max/crm/agents/state/prospect-demo-queue.json';
const CONFIG_PATH      = path.join(__dirname, 'config.json');
const SCRIPTS_PATH     = path.join(__dirname, 'message-scripts.json');
const DAILY_STATE_PATH = '/home/max/crm/agents/state/texting-daily.json';
const LAST_CHECK_PATH  = '/home/max/crm/agents/state/texting-last-check.json';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const OPT_OUT_KEYWORDS = ['stop', 'unsubscribe', 'remove me', 'dont text', "don't text", 'opt out', 'no thanks', 'not interested'];
const BOOKING_INTENT_KEYWORDS = ['yes', 'sure', 'sounds good', 'interested', 'when', 'what time', 'schedule', 'book', 'call', 'zoom', 'tell me more', 'how does', 'definitely', "i'd like", 'id like', 'love to', 'works for me', 'available', 'open to', 'let\'s', 'lets', 'show me', 'send it', 'go ahead'];
const BOOKING_CONFIRMED_PHRASES = ['booked you in', "you're all set", 'see you then', 'talk then', 'speak then', 'confirmed for', 'locked in'];

const CALENDLY_URL   = process.env.HCAI_CALENDLY_URL || 'https://calendly.com/homeconsultingai/discovery-call';
const AGENCY_ACCOUNT_ID = 'da99b768-79dd-48f8-af86-abf95e61a69f';
const GCAL_TOKENS_FILE  = path.join(__dirname, '../../agents/state/hcai-google-tokens.json');
const RESEND_KEY        = process.env.RESEND_API_KEY;
const BOOKING_FROM_EMAIL = process.env.BOOKING_FROM_EMAIL || 'Max <maxfawcett@ainexorra.com>';
const BOOKING_CC_EMAIL   = 'maxfwcett@gmail.com';

const TZ_NAMES = {
  EST: 'America/New_York',
  CST: 'America/Chicago',
  MST: 'America/Denver',
  PST: 'America/Los_Angeles',
};

// Returns the current UTC offset string for an IANA timezone name, e.g. "-05:00" for CDT.
// Used to anchor Claude's time extraction to the correct offset so it doesn't default to server (BST).
function currentUtcOffset(tzName) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tzName, timeZoneName: 'shortOffset',
  }).formatToParts(new Date());
  const raw = parts.find(p => p.type === 'timeZoneName')?.value || 'GMT'; // "GMT-5", "GMT+5:30", "GMT"
  const m = raw.match(/GMT([+-])(\d+)(?::(\d+))?/);
  if (!m) return '+00:00';
  const sign = m[1];
  const h = String(m[2]).padStart(2, '0');
  const min = String(m[3] || '0').padStart(2, '0');
  return `${sign}${h}:${min}`;
}

// DST-correct: uses Intl.DateTimeFormat with IANA timezone names.
function isWithinSendingHours(timezone) {
  const tzName = TZ_NAMES[timezone];
  if (!tzName) return false;
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric', minute: 'numeric', hour12: false, timeZone: tzName,
  }).formatToParts(now);
  const hour   = parseInt(parts.find(p => p.type === 'hour').value);
  const minute = parseInt(parts.find(p => p.type === 'minute').value);
  const mins   = hour * 60 + minute;
  return mins >= 9 * 60 && mins < 17 * 60 + 30; // 9:00 AM – 5:30 PM
}

// Check texting_enabled flag from agency account settings in Supabase
async function isTextingEnabled() {
  try {
    const r = await supabase('GET',
      `accounts?id=eq.${AGENCY_ACCOUNT_ID}&select=settings`
    );
    const settings = (r.data || [])[0]?.settings || {};
    return settings.texting_enabled !== false; // default true
  } catch { return true; }
}

// ── Prospect demo queue ───────────────────────────────────────────────────────
function enqueueProspectDemo(leadId, businessName, bizType) {
  try {
    let q = [];
    try { q = JSON.parse(fs.readFileSync(PROSPECT_QUEUE, 'utf8')); } catch {}
    if (q.some(e => e.leadId === leadId && e.status !== 'failed')) return;
    q.push({ leadId, businessName, bizType, queuedAt: new Date().toISOString(), status: 'pending' });
    fs.writeFileSync(PROSPECT_QUEUE, JSON.stringify(q, null, 2));
    log(`  [demo-queue] Enqueued demo build for ${businessName}`);
  } catch (e) {
    log(`  [demo-queue] Failed to enqueue: ${e.message}`);
  }
}

// ── Logging ───────────────────────────────────────────────────────────────────
function log(msg) { console.log(`[${new Date().toISOString()}] ${msg}`); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function jitter(base, spread = 600) { return base + Math.floor(Math.random() * spread); }

// ── Config ────────────────────────────────────────────────────────────────────
function loadConfig() { return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); }
function saveConfig(cfg) { fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2)); }
function loadScripts() { return JSON.parse(fs.readFileSync(SCRIPTS_PATH, 'utf8')); }

// ── Ramp ──────────────────────────────────────────────────────────────────────
function getDailyLimit(config) {
  const { ramp } = config;
  if (!ramp.startDate) {
    ramp.startDate = new Date().toISOString().split('T')[0];
    saveConfig(config);
    return ramp.startLimit;
  }
  const daysSince = Math.floor((Date.now() - new Date(ramp.startDate)) / 86400000);
  if (daysSince >= ramp.days - 1) return ramp.endLimit;
  return Math.round(ramp.startLimit + (daysSince / (ramp.days - 1)) * (ramp.endLimit - ramp.startLimit));
}

// ── Daily state ───────────────────────────────────────────────────────────────
function loadDailyState() {
  try { return JSON.parse(fs.readFileSync(DAILY_STATE_PATH, 'utf8')); } catch { return {}; }
}
function getDailySent(number) {
  const today = new Date().toISOString().split('T')[0];
  return (loadDailyState()[today] || {})[number] || 0;
}
function incrementDailySent(number) {
  const state = loadDailyState();
  const today = new Date().toISOString().split('T')[0];
  if (!state[today]) state[today] = {};
  state[today][number] = (state[today][number] || 0) + 1;
  fs.writeFileSync(DAILY_STATE_PATH, JSON.stringify(state, null, 2));
}

// ── Last-check state ──────────────────────────────────────────────────────────
function loadLastCheck() {
  try { return JSON.parse(fs.readFileSync(LAST_CHECK_PATH, 'utf8')); } catch { return {}; }
}
function saveLastCheck(state) { fs.writeFileSync(LAST_CHECK_PATH, JSON.stringify(state, null, 2)); }

// ── Supabase ──────────────────────────────────────────────────────────────────
function supabase(method, resource, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(`${SUPABASE_URL}/rest/v1/${resource}`);
    const payload = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: u.hostname, path: u.pathname + u.search, method,
      headers: {
        apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json', Prefer: 'return=representation',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: d ? JSON.parse(d) : null }); }
        catch { resolve({ status: res.statusCode, data: d }); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function getLeadsForInitialByTimezone(timezone, limit, leadCategory = 'website') {
  const r = await supabase('GET',
    `leads?select=id,full_name,first_name,phone,city,state_province,timezone,source_brokerage` +
    `&text_status=is.null&phone=not.is.null&text_opted_out=not.is.true` +
    `&lead_category=eq.${leadCategory}&timezone=eq.${timezone}` +
    `&order=created_at.asc&limit=${limit}`
  );
  return r.data || [];
}

// Position-based script assignment: 25% each, rounded up for scripts 1&2.
// At limit=10 → 3,3,2,2. At limit=40 → 10,10,10,10.
function getScriptForCount(sentToday, dailyLimit) {
  const q = Math.ceil(dailyLimit * 0.25);
  const q3 = Math.floor(dailyLimit * 0.25);
  if (sentToday < q)           return 1;
  if (sentToday < q * 2)       return 2;
  if (sentToday < q * 2 + q3) return 3;
  return 4;
}

async function getLeadsForFollowUp(fromStatus, daysAgo, leadCategory = 'website') {
  const cutoff = new Date(Date.now() - daysAgo * 86400000).toISOString();
  const r = await supabase('GET',
    `leads?select=id,full_name,first_name,phone,city,state_province,timezone,text_sender_number,text_script_id,source_brokerage` +
    `&text_status=eq.${fromStatus}&text_reply_received=not.is.true&text_opted_out=not.is.true` +
    `&lead_category=eq.${leadCategory}` +
    `&last_texted_at=lt.${encodeURIComponent(cutoff)}&limit=200`
  );
  return r.data || [];
}

async function getLeadsForPostBooking(fromStatus, daysAgo, leadCategory = 'website') {
  const cutoff = new Date(Date.now() - daysAgo * 86400000).toISOString();
  const r = await supabase('GET',
    `leads?select=id,full_name,first_name,phone,city,state_province,timezone,text_sender_number,text_script_id,source_brokerage` +
    `&text_status=eq.${fromStatus}&text_booked=not.is.true&text_opted_out=not.is.true` +
    `&lead_category=eq.${leadCategory}` +
    `&last_texted_at=lt.${encodeURIComponent(cutoff)}&limit=200`
  );
  return r.data || [];
}

async function updateLeadTexted(leadId, status, senderNumber, scriptId) {
  await supabase('PATCH', `leads?id=eq.${leadId}`, {
    text_status: status, last_texted_at: new Date().toISOString(),
    text_sender_number: senderNumber, text_script_id: scriptId,
    text_contacted: true,
  });
}

async function markLeadReplied(leadId) {
  await supabase('PATCH', `leads?id=eq.${leadId}`, {
    text_status: 'replied', text_reply_received: true, text_reply_at: new Date().toISOString(),
  });
}

async function markLeadOptedOut(leadId) {
  await supabase('PATCH', `leads?id=eq.${leadId}`, { text_opted_out: true, text_status: 'opted_out' });
}

async function markBookingIntent(leadId) {
  await supabase('PATCH', `leads?id=eq.${leadId}`, {
    text_booking_intent: true, text_booking_intent_at: new Date().toISOString(),
  });
}

async function markBookingLinkSent(leadId) {
  await supabase('PATCH', `leads?id=eq.${leadId}`, {
    text_booking_link_sent: true,
    text_booking_link_sent_at: new Date().toISOString(),
    text_status: 'booking_link_sent',
    last_texted_at: new Date().toISOString(),
  });
}

async function markBooked(leadId, bookedTimeIso = null) {
  await supabase('PATCH', `leads?id=eq.${leadId}`, {
    text_booked: true, text_booked_at: new Date().toISOString(), text_status: 'booked',
    ...(bookedTimeIso ? { text_booked_time: bookedTimeIso } : {}),
  });
}

// Requires text_booked_time, booking_1day_reminder_sent, booking_1hr_reminder_sent columns.
// Run migration: ALTER TABLE leads ADD COLUMN IF NOT EXISTS text_booked_time timestamptz,
//   ADD COLUMN IF NOT EXISTS booking_1day_reminder_sent boolean DEFAULT false,
//   ADD COLUMN IF NOT EXISTS booking_1hr_reminder_sent boolean DEFAULT false;
async function getLeadsNeedingReminders() {
  const now = new Date();
  const in25h = new Date(now.getTime() + 25 * 3600000).toISOString();
  const in23h = new Date(now.getTime() + 23 * 3600000).toISOString();
  const in90m = new Date(now.getTime() + 90 * 60000).toISOString();
  const in30m = new Date(now.getTime() + 30 * 60000).toISOString();

  const [day, hour] = await Promise.all([
    supabase('GET',
      `leads?select=id,full_name,first_name,phone,timezone,text_sender_number,text_booked_time` +
      `&text_booked=is.true&booking_1day_reminder_sent=is.false` +
      `&text_booked_time=gt.${encodeURIComponent(in23h)}&text_booked_time=lt.${encodeURIComponent(in25h)}&limit=50`
    ),
    supabase('GET',
      `leads?select=id,full_name,first_name,phone,timezone,text_sender_number,text_booked_time` +
      `&text_booked=is.true&booking_1hr_reminder_sent=is.false` +
      `&text_booked_time=gt.${encodeURIComponent(in30m)}&text_booked_time=lt.${encodeURIComponent(in90m)}&limit=50`
    ),
  ]);
  return { dayReminders: day.data || [], hourReminders: hour.data || [] };
}

function formatBookingTime(isoStr, timezone) {
  if (!isoStr) return 'your scheduled time';
  const tzName = TZ_NAMES[timezone] || 'America/Chicago';
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZone: tzName, timeZoneName: 'short',
  }).format(new Date(isoStr));
}

async function getConversationHistory(leadId) {
  const r = await supabase('GET',
    `text_message_log?lead_id=eq.${leadId}&order=sent_at.asc&limit=10&select=direction,body`
  );
  return r.data || [];
}

function claudeExec(prompt) {
  try {
    return execSync(
      `claude -p --model claude-haiku-4-5-20251001 ${JSON.stringify(prompt)}`,
      { timeout: 30000, encoding: 'utf8' }
    ).trim() || null;
  } catch { return null; }
}

const HARD_COPY_RULES = `HARD RULES — zero exceptions:
1. Em dashes (—) and en dashes (–) are COMPLETELY FORBIDDEN. Never use them.
2. BANNED words: Absolutely, Great, Fantastic, Certainly, Of course, I totally understand, I appreciate, Sounds good, Happy to help, Excited, Delighted, Pleasure.
3. No filler openers. Jump straight in.
4. One idea per text. Never stack questions.
5. Write like a real person texting from their phone — casual, friendly, genuine.

EMPATHY FIRST:
If they mention anything stressful or difficult, acknowledge it genuinely before anything else. Never pivot straight to business when they've described a problem.`;

async function generateAIReply(lead, inboundMessage, scriptId, history, availabilityNote) {
  const bizName = getCompanyName(lead) || 'them';
  const bizType = (lead.source_brokerage || 'home improvement company').toLowerCase();
  const city = lead.city || 'their area';
  const state = lead.state_province || '';
  const location = state ? `${city}, ${state}` : city;
  const tz = lead.timezone || 'CST';

  const historyText = history.map(m => `${m.direction === 'outbound' ? 'Max' : 'Them'}: ${m.body}`).join('\n');

  const prompt = `${HARD_COPY_RULES}

You are Max, a college student who builds websites as a side income. You found ${bizName}, a ${bizType} in ${location}, and built them a free website to show them. You're texting them to get them on a 5-10 min call to show it.

What you offer:
- Simple websites for home improvement companies (${bizType}, landscaping, roofing, pest control, kitchen remodel, etc.)
- Includes: AI auto-booking, auto text-back, SEO, Google review tools
- Price: $150-$300/month depending on needs
- NEVER mention pricing unless they explicitly ask about cost

${availabilityNote || ''}

Conversation so far:
${historyText || '(none)'}
Them: ${inboundMessage}

BOOKING RULES (follow these exactly):
- Only suggest times from the AVAILABLE SLOTS list above. Never suggest a time that isn't listed.
- Suggest specific casual times: "Does Thursday at 2pm ${tz} work?" — pick from the available slots
- Never suggest more than 2 times in one message
- Do NOT send the Calendly link unless they explicitly say they want to pick their own time after you've already suggested times twice
- When they confirm a time, ask: "Perfect, what email should I send the Google Meet link to?"
- Once you have BOTH a confirmed time AND their email, reply with a booking confirmation like: "Booked you in for [day] at [time], see you then!" — use this exact phrasing so the system can detect it
- If they suggest a time not in the available slots, apologise and offer the nearest available slot

TONE:
- You're a college student, not a salesperson. Casual, warm, never pushy.
- If they're not interested, be cool and say no worries.
- 1-2 sentences max. Never over-explain.

Reply only — no labels, no quotes, nothing extra.`;

  return claudeExec(prompt);
}

async function generateBookingTimeSuggestion(lead, inboundMessage, history) {
  const tz = lead.timezone || 'CST';
  const historyText = history.map(m => `${m.direction === 'outbound' ? 'Max' : 'Them'}: ${m.body}`).join('\n');
  const prompt = `${HARD_COPY_RULES}

You are Max, a college student who builds websites. This person has just shown they're interested in seeing your website.

Conversation:
${historyText || '(none)'}
Them: ${inboundMessage}

Suggest a specific time for a 5-10 min call, casually. Something like "Does Thursday at 2pm ${tz} work?" or "How about Friday afternoon?". Max one suggestion. Keep it to one sentence.

Reply only.`;
  const ai = claudeExec(prompt);
  return ai || `Does this week work for a quick 5-10 min call? What day is good for you?`;
}

async function findLeadByPhone(phone) {
  const digits = phone.replace(/\D/g, '').slice(-10);
  const r = await supabase('GET',
    `leads?select=id,text_status,text_reply_received,text_sender_number,text_script_id,first_name,full_name` +
    `&phone=eq.%2B1${digits}&limit=1`
  );
  return (r.data || [])[0] || null;
}

async function logMessage(leadId, direction, from, to, body, type, scriptId) {
  await supabase('POST', 'text_message_log', {
    lead_id: leadId, direction, sender_number: from, recipient_number: to,
    body, message_type: type, script_id: scriptId, sent_at: new Date().toISOString(),
  });
}

// ── Name + template ───────────────────────────────────────────────────────────
function properName(raw) {
  if (!raw) return '';
  return raw.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

function getFirstName(lead) {
  const raw = lead.first_name || (lead.full_name || '').split(/\s+/)[0] || '';
  return properName(raw) || 'there';
}

function getCompanyName(lead) {
  return properName(lead.full_name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim()) || '';
}

function personalise(template, lead) {
  const first = getFirstName(lead);
  const bizType = (lead.source_brokerage || 'company').toLowerCase();
  const city = lead.city || 'your area';
  const state = lead.state_province || '';
  const localArea = state ? `${city}, ${state}` : city;
  return template
    .replace(/{First_name}/g, first)
    .replace(/{first_name}/g, first)
    .replace(/{city}/g, city)
    .replace(/{state}/g, state)
    .replace(/{company type}/g, bizType)
    .replace(/{local area}/g, localArea);
}

// ── Quo web app helpers ───────────────────────────────────────────────────────

async function waitForApp(page) {
  // Wait until Quo sidebar inbox buttons are present
  await page.waitForFunction(
    () => !!document.querySelector('button[role="link"][aria-label], nav, aside'),
    { timeout: 20000 }
  ).catch(() => {});
  await sleep(1500);
}

// Read unread counts from sidebar badges BEFORE switching inboxes.
// Returns { "4642453780": 5, "7786585522": 3, ... } keyed by last-10 digits.
async function getInboxUnreadCounts(page) {
  return page.evaluate(() => {
    const result = {};
    // Quo sidebar: <div aria-label="5 unread conversations">5</div> inside inbox buttons
    const badges = Array.from(document.querySelectorAll('[aria-label*="unread conversations"]'));
    for (const badge of badges) {
      const btn = badge.closest('button[role="link"][aria-label]');
      if (!btn) continue;
      const digits = (btn.getAttribute('aria-label') || '').replace(/\D/g, '').slice(-10);
      if (digits.length === 10) result[digits] = parseInt(badge.textContent) || 1;
    }
    return result;
  });
}

// Switch to the inbox for a given display number.
// Prefers clicking the nav <a> link (SPA navigation, no reload).
// Falls back to page.goto only when the link is not in the current DOM.
// Fast path: already on this inbox list view — do nothing.
async function switchToInbox(page, displayNumber, inboxId) {
  const config = loadConfig();
  const blocked = new Set(config.blockedInboxIds || []);
  if (inboxId && blocked.has(inboxId)) throw new Error(`Blocked inbox ${inboxId} — will not navigate there`);

  const currentUrl = page.url();

  // Already on this inbox list view — nothing to do
  if (inboxId && currentUrl.includes(`/inbox/${inboxId}`) && !currentUrl.includes('/c/') && !currentUrl.includes('/details')) {
    await sleep(200);
    return;
  }

  if (inboxId) {
    // Try clicking the nav link first (SPA client-side nav, no reload)
    const clicked = await page.evaluate((inboxId) => {
      const link = document.querySelector(`a[href="/inbox/${inboxId}"]`);
      if (link) { link.click(); return true; }
      return false;
    }, inboxId);

    if (!clicked) {
      // Link not in DOM — use page.goto (domcontentloaded to avoid WebSocket idle timeout)
      const baseUrl = page.url().startsWith('https://my.quo.com') ? 'https://my.quo.com' : 'https://app.openphone.com';
      await page.goto(`${baseUrl}/inbox/${inboxId}`, {
        waitUntil: 'domcontentloaded', timeout: 15000,
      });
    }

    await page.waitForSelector('button[aria-label="Send a message"]', { timeout: 12000 });
    await sleep(300);
    return;
  }

  // No inboxId — fall back to sidebar button matching by phone digits
  const digits = displayNumber.replace(/\D/g, '').slice(-10);
  const clicked = await page.evaluate((digits) => {
    for (const btn of document.querySelectorAll('button[role="link"]')) {
      if ((btn.textContent || '').replace(/\D/g, '').includes(digits)) {
        btn.click();
        return true;
      }
    }
    return false;
  }, digits);
  if (!clicked) throw new Error(`Inbox not found for ${displayNumber}`);
  await page.waitForSelector('button[aria-label="Send a message"]', { timeout: 8000 }).catch(() => {});
  await sleep(200);
}

// Get all conversation hrefs in the current inbox.
// The <a> is empty — unread badge lives in the parent container div.
async function getVisibleConversations(page) {
  return page.evaluate(() => {
    return Array.from(document.querySelectorAll('a[href*="/inbox/"][href*="/c/"]'))
      .map(el => {
        const container = el.closest('[data-index]') || el.parentElement || el;
        return {
          href: el.getAttribute('href'),
          hasUnread: !!container.querySelector('[aria-label*="unread"]'),
        };
      })
      .filter(c => c.href);
  });
}

// Get the contact's phone number from the open conversation.
// Waits for the message input to confirm the view is loaded, then scans for a phone pattern.
async function getContactPhone(page) {

  return page.evaluate(() => {
    const re = /\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}/;
    // Walk all text nodes — phone appears in a button or span in the conversation header
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const candidates = [];
    let node;
    while ((node = walker.nextNode())) {
      const t = (node.textContent || '').trim();
      if (re.test(t)) {
        const digits = t.replace(/\D/g, '');
        // Must be exactly a 10-digit US number (or 11 starting with 1)
        const ten = digits.length === 10 ? digits : digits.length === 11 && digits[0] === '1' ? digits.slice(1) : null;
        if (ten) {
          const parent = node.parentElement;
          const tag = parent.tagName.toLowerCase();
          // Prefer buttons (Quo shows contact phone as a button in header)
          // Exclude sidebar numbers (our own inboxes shown in the nav)
          const inNav = !!parent.closest('nav, [id="sideMenu"]');
          if (!inNav) candidates.push({ ten, inButton: tag === 'button', tag });
        }
      }
    }
    // Return a button candidate first, then any other
    const btn = candidates.find(c => c.inButton);
    return btn ? btn.ten : (candidates[0] ? candidates[0].ten : null);
  });
}

// Get the last N message groups from the open conversation.
// Direction: outbound if avatar has a gravatar photo (background-image), inbound if initials only.
async function getLastMessages(page, n = 8) {
  // Scroll to bottom first so virtual list renders latest messages
  await page.evaluate(() => {
    const s = document.querySelector('[data-testid="virtuoso-scroller"]');
    if (s) s.scrollTop = s.scrollHeight;
  });
  await sleep(500);

  return page.evaluate((n) => {
    const items = Array.from(document.querySelectorAll('[role="listitem"]'));
    const messages = [];
    for (const item of items) {
      const avatar = item.querySelector('[role="img"][aria-label*="avatar"]');
      if (!avatar) continue;
      // Outbound: inner div has gravatar photo via background-image
      // Inbound:  inner div has only background-color (letter initial)
      const hasPhoto = !!avatar.querySelector('[style*="background-image"]');
      const direction = hasPhoto ? 'outbound' : 'inbound';
      // Collect text from leaf nodes inside this message group
      const texts = [];
      const walk = (el) => {
        if (!el.childElementCount) {
          const t = (el.textContent || '').trim();
          if (t.length > 1) texts.push(t);
        } else { for (const c of el.children) walk(c); }
      };
      walk(item);
      const body = texts.join(' ').trim();
      if (body) messages.push({ body, direction });
    }
    return messages.slice(-n);
  }, n);
}

// Compose and send a brand-new text to a number.
// Quo DOM (confirmed): participant input[role="combobox"][aria-label="participant input"]
//                      message  div[role="textbox"][aria-label="message input"]
//                      send     button[aria-label="Send message"]
async function sendText(page, toPhone, body) {
  // Click the compose button
  const composeClicked = await page.evaluate(() => {
    const btn = document.querySelector('button[aria-label="Send a message"]');
    if (btn) { btn.click(); return true; }
    return false;
  });
  if (!composeClicked) throw new Error('Compose button not found');
  await sleep(jitter(800, 400));

  // Enter recipient phone number
  const recipientInput = await page.waitForSelector(
    'input[aria-label="participant input"], input[role="combobox"]',
    { timeout: 6000 }
  ).catch(() => null);
  if (!recipientInput) throw new Error('Recipient input not found');
  await recipientInput.type(toPhone, { delay: jitter(50, 30) });
  await sleep(jitter(900, 300));

  // Wait for autocomplete suggestion and click it, or press Enter to confirm
  const suggestion = await page.waitForSelector(
    '[role="option"], [role="listbox"] [role="option"], [aria-selected]',
    { timeout: 3000 }
  ).catch(() => null);
  if (suggestion) {
    await suggestion.click();
  } else {
    await page.keyboard.press('Enter');
  }
  await sleep(jitter(800, 300));

  // Wait for the message input to appear — this confirms we're in a conversation context
  // (not still in the recipient-entry state)
  const msgInput = await page.waitForSelector(
    '[role="textbox"][aria-label="message input"], [aria-label="message input"]',
    { timeout: 8000 }
  ).catch(() => null);
  if (!msgInput) throw new Error('Message input not found — recipient may not have been confirmed');
  await msgInput.click();
  await page.keyboard.type(body, { delay: jitter(20, 10) });
  await sleep(jitter(400, 200));

  // Click Send
  const sent = await page.evaluate(() => {
    const btn = document.querySelector('button[aria-label="Send message"]');
    if (btn && !btn.disabled) { btn.click(); return true; }
    return false;
  });
  if (!sent) await page.keyboard.press('Enter');
  await sleep(jitter(1000, 400));
}

// Set contact name in the Quo details panel for the open conversation.
// Quo flow: "Show details" opens #contactPanel (button label does NOT change).
// Click the name button inside the panel to reveal editable inputs.
// Tab to save (Enter navigates away). Close panel via aria-labelledby "Close" button.
async function setContactName(page, companyName) {
  if (!companyName) return;

  const convUrl = page.url().replace('/details', '');
  if (!convUrl.includes('/c/')) {
    log(`  [contact] Not in a conversation URL — skipping`);
    return;
  }

  try {
    // Extract the OpenPhone contact ID and auth token via the page's network interceptor
    const result = await page.evaluate(async (company) => {
      // Pull the auth token from localStorage / sessionStorage / cookies
      let token = null;
      for (const key of Object.keys(localStorage)) {
        const val = localStorage.getItem(key);
        if (val && val.includes('Bearer ')) { token = val; break; }
        if (val && /^ey[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(val)) { token = val; break; }
      }
      // Also try to get it from the app's redux/zustand store via window
      const anyToken = token ||
        window.__store?.getState?.()?.auth?.token ||
        window.__authToken;

      // Extract conversation ID from URL
      const convMatch = location.href.match(/\/c\/(CN[a-z0-9]+)/);
      const convId = convMatch?.[1];

      return { token: anyToken?.slice(0, 40), convId, href: location.href };
    }, companyName);

    log(`  [contact] convId=${result.convId} token_found=${!!result.token} url=${result.href.slice(0, 80)}`);

    // Find the conversation column by anchoring from the message input upward,
    // then look for the contact header within that column only.
    const headerClicked = await page.evaluate(() => {
      const phoneRe = /\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}/;

      // Anchor: message input is at the bottom of the conversation column
      const msgInput = document.querySelector('[aria-label="message input"]');
      if (!msgInput) return 'no-msg-input';

      // Walk up to find the conversation column container
      let col = msgInput.parentElement;
      for (let i = 0; i < 12; i++) {
        if (!col) break;
        const rect = col.getBoundingClientRect();
        // The conversation column should be roughly the right half of the page and tall
        if (rect.width > 400 && rect.height > 300 && col !== document.body) break;
        col = col.parentElement;
      }
      if (!col) return 'no-col';

      // Within this column, find the topmost clickable element with contact info
      const allInCol = Array.from(col.querySelectorAll('*'));
      const topEls = allInCol.filter(e => {
        const r = e.getBoundingClientRect();
        return r.top < 150 && r.height > 0 && r.width > 50;
      });

      // Look for phone number in top section
      for (const el of topEls) {
        if (el.childElementCount > 3) continue;
        const text = el.textContent.trim();
        if (phoneRe.test(text) && text.length < 30) {
          el.click();
          return 'clicked-phone:' + text;
        }
      }

      // Dump top elements for debug
      const topTexts = topEls
        .filter(e => e.childElementCount === 0 && e.textContent.trim())
        .map(e => e.textContent.trim()).slice(0, 15);
      return 'no-phone-found top-texts:' + topTexts.join('|');
    });
    log(`  [contact] Header click: ${headerClicked}`);
    await sleep(2000);

    // Check what appeared in the DOM after panel opened
    const panelResult = await page.evaluate((company) => {
      // Search for Company label anywhere in the DOM
      const allEls = Array.from(document.querySelectorAll('*'));
      const companyLabel = allEls.find(e =>
        e.childElementCount === 0 && /^company$/i.test(e.textContent.trim())
      );

      if (!companyLabel) {
        // Dump all leaf text to help debug
        const texts = allEls
          .filter(e => e.childElementCount === 0 && e.textContent.trim().length < 40 && e.textContent.trim().length > 1)
          .map(e => e.textContent.trim());
        return { found: false, debug: texts.slice(-60).join(' | ') };
      }

      // Found the Company label — click the row/value to make it editable
      const row = companyLabel.closest('[class*="row"], [class*="field"], [class*="item"], li, tr') ||
                  companyLabel.parentElement?.parentElement;
      if (row) {
        // Look for an existing value element to click (the value next to "Company")
        const valueEl = row.querySelector('[class*="value"], [class*="text"], span:not([class*="label"])') ||
                        companyLabel.nextElementSibling;
        if (valueEl) { valueEl.click(); return { found: true, clicked: 'value', html: row.outerHTML.slice(0, 300) }; }
        row.click();
        return { found: true, clicked: 'row', html: row.outerHTML.slice(0, 300) };
      }
      companyLabel.click();
      return { found: true, clicked: 'label', html: companyLabel.outerHTML };
    }, companyName);

    if (!panelResult.found) {
      log(`  [contact] Company label not in panel. Last page texts: ${panelResult.debug?.slice(0, 300)}`);
      return;
    }

    log(`  [contact] Clicked ${panelResult.clicked}: ${panelResult.html?.slice(0, 80)}`);
    await sleep(600);

    // Now look for an input that appeared
    const input = await page.$('input[placeholder*="company" i], input[placeholder*="Add" i], input[placeholder*="organization" i]');
    if (input) {
      await input.click({ clickCount: 3 });
      await sleep(100);
      await input.type(companyName, { delay: 40 });
      await page.keyboard.press('Tab');
      await sleep(500);
      log(`  [contact] Company set to "${companyName}"`);
    } else {
      // Try contenteditable
      const editable = await page.$('[contenteditable="true"], [contenteditable="plaintext-only"]');
      if (editable) {
        await editable.click({ clickCount: 3 });
        await editable.type(companyName, { delay: 40 });
        await page.keyboard.press('Tab');
        await sleep(500);
        log(`  [contact] Company set via contenteditable`);
      } else {
        log(`  [contact] No input appeared after clicking company row`);
      }
    }

    // Close panel by pressing Escape or clicking elsewhere
    await page.keyboard.press('Escape');
    await sleep(400);

  } catch (err) {
    log(`  [contact] setContactName error: ${err.message}`);
  }
}

// Send initial outreach: compose new conversation, set company name in contact,
// then send text1 → 3s → text2 → 3s → text3 as separate messages.
async function sendInitial(page, toPhone, text1, text2, text3, companyName) {
  // Click compose
  const composeClicked = await page.evaluate(() => {
    const btn = document.querySelector('button[aria-label="Send a message"]');
    if (btn) { btn.click(); return true; }
    return false;
  });
  if (!composeClicked) throw new Error('Compose button not found');
  await sleep(jitter(800, 400));

  // Enter recipient phone
  const recipientInput = await page.waitForSelector(
    'input[aria-label="participant input"], input[role="combobox"]', { timeout: 6000 }
  ).catch(() => null);
  if (!recipientInput) throw new Error('Recipient input not found');
  await recipientInput.type(toPhone, { delay: jitter(50, 30) });
  await sleep(jitter(900, 300));
  const suggestion = await page.waitForSelector('[role="option"]', { timeout: 3000 }).catch(() => null);
  if (suggestion) await suggestion.click(); else await page.keyboard.press('Enter');
  await sleep(jitter(800, 300));

  // Wait for conversation to open
  await page.waitForSelector('[aria-label="message input"]', { timeout: 8000 }).catch(() => {});

  // Type text into the message input — splits on \n and uses Shift+Enter
  async function typeMessage(text) {
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (i > 0) {
        await page.keyboard.down('Shift');
        await page.keyboard.press('Enter');
        await page.keyboard.up('Shift');
      }
      if (lines[i]) await page.keyboard.type(lines[i], { delay: jitter(15, 8) });
    }
  }

  async function sendMsg(text) {
    const inp = await page.$('[aria-label="message input"]').catch(() => null);
    if (!inp) throw new Error('Message input not found');
    await inp.click();
    await typeMessage(text);
    await sleep(jitter(300, 150));
    const sent = await page.evaluate(() => {
      const btn = document.querySelector('button[aria-label="Send message"]');
      if (btn && !btn.disabled) { btn.click(); return true; }
      return false;
    });
    if (!sent) await page.keyboard.press('Enter');
  }

  // Send text1
  await sendMsg(text1);
  await page.evaluate(() => { if (document.activeElement) document.activeElement.blur(); });
  await sleep(1000);

  // Set company name AFTER text1 — conversation is now fully open, contact header accessible
  if (companyName) {
    try {
      await setContactName(page, companyName);
    } catch (e) {
      log(`  Contact name failed (non-fatal): ${e.message}`);
    }
  }

  // text2
  const ri1 = await page.waitForSelector('[aria-label="message input"]', { timeout: 8000 }).catch(() => null);
  if (ri1) await ri1.click();
  await sleep(3000);
  await sendMsg(text2);
  await page.evaluate(() => { if (document.activeElement) document.activeElement.blur(); });

  // text3
  if (text3) {
    const ri2 = await page.waitForSelector('[aria-label="message input"]', { timeout: 8000 }).catch(() => null);
    if (ri2) await ri2.click();
    await sleep(3000);
    await sendMsg(text3);
    await page.evaluate(() => { if (document.activeElement) document.activeElement.blur(); });
  }

  await sleep(jitter(800, 300));
}

// Reply in the currently open conversation.
async function sendReply(page, body) {
  const msgInput = await page.waitForSelector(
    '[role="textbox"][aria-label="message input"], [aria-label="message input"]',
    { timeout: 5000 }
  ).catch(() => null);
  if (!msgInput) throw new Error('Message input not found for reply');
  await msgInput.click();
  await page.keyboard.type(body, { delay: jitter(20, 10) });
  await sleep(jitter(400, 200));
  const sent = await page.evaluate(() => {
    const btn = document.querySelector('button[aria-label="Send message"]');
    if (btn && !btn.disabled) { btn.click(); return true; }
    return false;
  });
  if (!sent) await page.keyboard.press('Enter');
  await sleep(jitter(800, 300));
}

// ── Scan sidebar for inboxes that have a red unread badge ─────────────────────
async function getInboxesWithUnread(page, numbers, blocked) {
  return page.evaluate((nums, blockedIds) => {
    const withUnread = [];
    for (const { displayNumber, inboxId } of nums) {
      if (blockedIds.includes(inboxId)) continue;
      // Sidebar link for this inbox
      const link = document.querySelector(`a[href*="/inbox/${inboxId}"]`);
      if (!link) continue;
      // Red badge: a span/div containing a number inside the sidebar link
      const badge = link.querySelector('[class*="badge" i], [class*="count" i], [class*="unread" i]');
      const hasBadge = badge && /^\d+$/.test(badge.textContent.trim());
      // Also check aria-label on the link itself
      const ariaLabel = link.getAttribute('aria-label') || '';
      const hasAria = /unread/i.test(ariaLabel);
      if (hasBadge || hasAria) withUnread.push({ displayNumber, inboxId });
    }
    return withUnread;
  }, numbers, [...blocked]);
}

// ── Check inboxes for new replies ─────────────────────────────────────────────
async function checkReplies(page, config, scripts) {
  log('\n=== Checking for replies ===');

  const blocked = new Set(config.blockedInboxIds || []);
  const activeNumbers = config.numbers.filter(n => n.inboxId && !blocked.has(n.inboxId));

  // Fast path: scan sidebar badges first — only navigate into inboxes with a red unread count
  // Navigate to base app URL once so sidebar is visible
  const currentUrl = page.url();
  if (!currentUrl.includes('quo.com') || currentUrl.includes('/c/')) {
    await page.goto('https://my.quo.com', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await sleep(1500);
  }

  const inboxesWithUnread = await getInboxesWithUnread(page, activeNumbers, blocked);

  if (inboxesWithUnread.length === 0) {
    // No badges visible — do a quick full scan (sidebar may not show all badges)
    log('  No unread badges — doing full scan');
  } else {
    log(`  Unread badges on: ${inboxesWithUnread.map(n => n.displayNumber).join(', ')}`);
  }

  // Always scan all inboxes on first run of the session; after that only badge-flagged ones
  const toScan = inboxesWithUnread.length > 0 ? inboxesWithUnread : activeNumbers;

  for (const numCfg of toScan) {
    const { displayNumber, inboxId } = numCfg;

    log(`\n  Inbox ${displayNumber} (${inboxId})...`);
    try {
      await switchToInbox(page, displayNumber, inboxId);
      await page.waitForSelector('a[href*="/inbox/"][href*="/c/"]', { timeout: 8000 }).catch(() => {});
      await sleep(300);

      const conversations = await getVisibleConversations(page);
      const toCheck = conversations.filter(c => c.hasUnread);
      log(`  ${conversations.length} conversations, ${toCheck.length} unread`);
      if (!toCheck.length) continue;

      for (const conv of toCheck) {
        try {
          // Click the conversation link. After the first click we're inside a conversation
          // and Virtuoso has unmounted other list items — so go back first to restore the list.
          let clicked = await page.evaluate((href) => {
            const a = document.querySelector(`a[href="${href}"]`);
            if (a) { a.click(); return true; }
            return false;
          }, conv.href);

          if (!clicked) {
            // Go back to inbox list via client-side history (no HTTP reload)
            await page.evaluate(() => window.history.back());
            await page.waitForSelector('a[href*="/inbox/"][href*="/c/"]', { timeout: 6000 }).catch(() => {});
            await sleep(400);
            clicked = await page.evaluate((href) => {
              const a = document.querySelector(`a[href="${href}"]`);
              if (a) { a.click(); return true; }
              return false;
            }, conv.href);
          }

          if (!clicked) { log(`  Could not open ${conv.href} — skipping`); continue; }

          // Wait for message input to confirm conversation loaded
          await page.waitForSelector('[aria-label="message input"], [role="textbox"]', { timeout: 8000 }).catch(() => {});
          await sleep(jitter(400, 150));

          const contactPhone = await getContactPhone(page);
          if (!contactPhone) { log(`  No phone found in ${conv.href}`); continue; }

          const msgs = await getLastMessages(page);
          const lastInbound = [...msgs].reverse().find(m => m.direction === 'inbound');
          if (!lastInbound?.body) { log(`  No inbound message in ${contactPhone}`); continue; }

          log(`  Inbound from ${contactPhone}: "${lastInbound.body.slice(0, 60)}"`);

          const lead = await findLeadByPhone(contactPhone);
          if (!lead) { log(`  No lead for ${contactPhone}`); continue; }

          const bodyLower = lastInbound.body.toLowerCase();

          if (OPT_OUT_KEYWORDS.some(kw => bodyLower.includes(kw))) {
            log(`  Opt-out: ${contactPhone}`);
            await markLeadOptedOut(lead.id);
            await logMessage(lead.id, 'inbound', contactPhone, displayNumber, lastInbound.body, 'opt_out', scriptId);
            continue;
          }

          const hasBookingIntent = BOOKING_INTENT_KEYWORDS.some(kw => bodyLower.includes(kw));
          const usedScriptId = lead.text_script_id || scriptId;

          if (!lead.text_reply_received) {
            await markLeadReplied(lead.id);
            await logMessage(lead.id, 'inbound', contactPhone, displayNumber, lastInbound.body, 'reply', usedScriptId);
            log(`  ✓ Marked replied: ${contactPhone}${hasBookingIntent ? ' [BOOKING INTENT]' : ''}`);
          }

          // All replies go through the AI — it handles booking time suggestions,
          // email collection, booking confirmation, and general conversation.
          const history = await getConversationHistory(lead.id);
          if (hasBookingIntent && !lead.text_booking_intent) {
            await markBookingIntent(lead.id);
          }

          // Fetch calendar availability when there's booking intent (avoid unnecessary API calls)
          let availabilityNote = '';
          if (hasBookingIntent || lead.text_booking_intent) {
            const busySlots = await getCalendarBusySlots(7);
            availabilityNote = formatAvailableSlots(busySlots, lead.timezone || 'CST');
          }

          const aiReply = await generateAIReply(lead, lastInbound.body, usedScriptId, history, availabilityNote);
          const bizName = getCompanyName(lead);
          const replyBody = aiReply || `Hey, thanks for getting back! When works best for a quick 5-10 min call?`;
          await sendReply(page, replyBody);

          const msgType = BOOKING_CONFIRMED_PHRASES.some(p => replyBody.toLowerCase().includes(p))
            ? 'booking_confirmed' : (hasBookingIntent ? 'booking_suggest' : 'ai_reply');

          // Detect booking confirmation — AI said something like "Booked you in for..."
          if (msgType === 'booking_confirmed') {
            const bookedTimeIso = await extractBookedTimeIso(replyBody, lead.timezone);
            const leadEmail = extractEmailFromHistory([...history, { direction: 'inbound', body: lastInbound.body }]);
            await markBooked(lead.id, bookedTimeIso);
            log(`  Booking confirmed for ${contactPhone} (${bizName})${bookedTimeIso ? ' at ' + bookedTimeIso : ''}${leadEmail ? ' | email: ' + leadEmail : ' | no email'}`);
            if (bookedTimeIso) {
              await createCalendarEvent(lead, bookedTimeIso, bizName, leadEmail);
            } else {
              log('  Could not extract booked time — calendar event skipped');
            }
          }

          await logMessage(lead.id, 'outbound', displayNumber, contactPhone, replyBody, msgType, usedScriptId);
          log(`  [${msgType}] reply → ${contactPhone}: "${replyBody.slice(0, 70)}"`);

          // Calendly fallback — only if they explicitly ask for a link after we've suggested times
          if (!aiReply && hasBookingIntent && lead.text_booking_intent) {
            const fallback = `Here's a link if easier to pick your own time: ${CALENDLY_URL}`;
            await sendReply(page, fallback);
            await markBookingLinkSent(lead.id);
            await logMessage(lead.id, 'outbound', displayNumber, contactPhone, fallback, 'booking_link', usedScriptId);
          }
        } catch (err) {
          log(`  Error processing ${conv.href}: ${err.message}`);
        }
      }
    } catch (err) {
      log(`  Error checking ${displayNumber}: ${err.message}`);
    }
  }
}

// ── Booking reminders ─────────────────────────────────────────────────────────
// Requires DB migration — see comment in getLeadsNeedingReminders above.
async function checkBookingReminders(page, config) {
  let reminders;
  try {
    reminders = await getLeadsNeedingReminders();
  } catch (e) {
    log(`  Reminders: DB columns missing (migration needed) — skipping`);
    return;
  }

  const blocked = new Set(config.blockedInboxIds || []);

  for (const lead of reminders.dayReminders) {
    const numCfg = config.numbers.find(n => n.displayNumber === lead.text_sender_number);
    if (!numCfg || blocked.has(numCfg.inboxId)) continue;
    const timeStr = lead.text_booked_time
      ? formatBookingTime(lead.text_booked_time, lead.timezone)
      : 'tomorrow';
    const msg = `Hey, just making sure you can still make it tomorrow${lead.text_booked_time ? ' at ' + new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: TZ_NAMES[lead.timezone] || 'America/Chicago' }).format(new Date(lead.text_booked_time)) : ''}?`;
    try {
      await switchToInbox(page, numCfg.displayNumber, numCfg.inboxId);
      await sendText(page, lead.phone, msg);
      await supabase('PATCH', `leads?id=eq.${lead.id}`, { booking_1day_reminder_sent: true });
      await logMessage(lead.id, 'outbound', numCfg.displayNumber, lead.phone, msg, 'booking_reminder_1day', lead.text_script_id || 1);
      log(`  1-day reminder → ${lead.phone}`);
    } catch (e) {
      log(`  1-day reminder failed for ${lead.phone}: ${e.message}`);
    }
  }

  for (const lead of reminders.hourReminders) {
    const numCfg = config.numbers.find(n => n.displayNumber === lead.text_sender_number);
    if (!numCfg || blocked.has(numCfg.inboxId)) continue;
    const msg = `Looking forward to showing you the website I built you in an hour!`;
    try {
      await switchToInbox(page, numCfg.displayNumber, numCfg.inboxId);
      await sendText(page, lead.phone, msg);
      await supabase('PATCH', `leads?id=eq.${lead.id}`, { booking_1hr_reminder_sent: true });
      await logMessage(lead.id, 'outbound', numCfg.displayNumber, lead.phone, msg, 'booking_reminder_1hr', lead.text_script_id || 1);
      log(`  1-hour reminder → ${lead.phone}`);
    } catch (e) {
      log(`  1-hour reminder failed for ${lead.phone}: ${e.message}`);
    }
  }
}

// ── Send outbound (initial + 3 follow-ups + 3 post-booking follow-ups) ────────
async function sendOutbound(page, config, scripts, limitArg = null) {
  log('\n=== Sending outbound ===');
  const dailyLimit = getDailyLimit(config);
  const rampDay = !config.ramp.startDate ? 1 :
    Math.min(config.ramp.days, Math.floor((Date.now() - new Date(config.ramp.startDate)) / 86400000) + 1);
  log(`Ramp day ${rampDay}/${config.ramp.days} — limit: ${dailyLimit}/number`);

  const fu = scripts.followups || {};
  const pb = scripts.postBooking || {};

  const followupSteps = [
    { fromStatus: 'initial_sent',    toStatus: 'followup_1_sent',   text: fu['1']?.text, days: fu['1']?.daysAfter || 1 },
    { fromStatus: 'followup_1_sent', toStatus: 'followup_2_sent',   text: fu['2']?.text, days: fu['2']?.daysAfter || 2 },
    { fromStatus: 'followup_2_sent', toStatus: 'followup_3_sent',   text: fu['3']?.text, days: fu['3']?.daysAfter || 2 },
  ];

  const postBookingSteps = [
    { fromStatus: 'booking_link_sent',     toStatus: 'post_booking_1_sent', text: pb['1']?.text, days: pb['1']?.daysAfter || 2 },
    { fromStatus: 'post_booking_1_sent',   toStatus: 'post_booking_2_sent', text: pb['2']?.text, days: pb['2']?.daysAfter || 2 },
    { fromStatus: 'post_booking_2_sent',   toStatus: 'post_booking_3_sent', text: pb['3']?.text, days: pb['3']?.daysAfter || 2 },
  ];

  // ── Post-booking follow-ups (run first — highest urgency) ──────────────────
  for (const step of postBookingSteps) {
    if (!step.text) continue;
    const leads = await getLeadsForPostBooking(step.fromStatus, step.days, config.leadCategory || 'website');
    log(`\n  Post-booking ${step.fromStatus}: ${leads.length} eligible`);
    for (const lead of leads) {
      const numCfg = config.numbers.find(n => n.displayNumber === lead.text_sender_number);
      if (!numCfg || (config.blockedInboxIds || []).includes(numCfg.inboxId)) continue;
      if (getDailySent(numCfg.displayNumber) >= dailyLimit) continue;
      await sendToLead(page, lead, numCfg.displayNumber, step.text, null, null, step.toStatus, lead.text_script_id || 1, numCfg.inboxId);
    }
  }

  // ── Follow-ups 1 → 3 (forward order: freshest leads first) ──────────────
  for (const step of followupSteps) {
    if (!step.text) continue;
    const leads = await getLeadsForFollowUp(step.fromStatus, step.days, config.leadCategory || 'website');
    log(`\n  ${step.fromStatus} → ${step.toStatus}: ${leads.length} eligible`);
    for (const lead of leads) {
      const numCfg = config.numbers.find(n => n.displayNumber === lead.text_sender_number);
      if (!numCfg || (config.blockedInboxIds || []).includes(numCfg.inboxId)) continue;
      if (getDailySent(numCfg.displayNumber) >= dailyLimit) continue;
      await sendToLead(page, lead, numCfg.displayNumber, step.text, null, null, step.toStatus, lead.text_script_id || 1, numCfg.inboxId);
    }
  }

  // ── Initial sends — timezone-based, script distributed 25% each ──────────
  // Each number pulls from its timezone lead pool. Script assigned by position:
  // first 25% of daily sends → script 1, next 25% → script 2, etc.
  // At 10/number: 3,3,2,2. At 40/number: 10,10,10,10.
  let totalSentThisRun = 0;
  for (const numCfg of config.numbers) {
    if (limitArg && totalSentThisRun >= limitArg) break;
    const { displayNumber, inboxId, timezone } = numCfg;
    if (!timezone) continue;
    if ((config.blockedInboxIds || []).includes(inboxId)) continue;

    // Only send during 9AM–5:30PM in this number's timezone
    if (!isWithinSendingHours(timezone)) {
      log(`\n  ${displayNumber} (${timezone}): outside sending hours — skip`);
      continue;
    }

    const sent = getDailySent(displayNumber);
    const remaining = limitArg ? Math.min(dailyLimit - sent, limitArg - totalSentThisRun) : dailyLimit - sent;
    if (remaining <= 0) { log(`\n  ${displayNumber} (${timezone}): limit reached`); continue; }

    const leads = await getLeadsForInitialByTimezone(timezone, remaining, config.leadCategory || 'website');
    log(`\n  ${displayNumber} (${timezone}): ${leads.length} leads, ${remaining} slots`);

    for (const lead of leads) {
      if (limitArg && totalSentThisRun >= limitArg) break;
      if (getDailySent(displayNumber) >= dailyLimit) break;
      const currentSent = getDailySent(displayNumber);
      const scriptId = getScriptForCount(currentSent, dailyLimit);
      const script = scripts[String(scriptId)];
      if (!script?.text1) { log(`  No script ${scriptId}`); continue; }
      await sendToLead(page, lead, displayNumber, script.text1, script.text2 || null, script.text3 || null, 'initial_sent', scriptId, inboxId);
      totalSentThisRun++;
    }
  }
}

async function sendToLead(page, lead, fromNumber, text1, text2, text3, newStatus, scriptId, inboxId) {
  const body1 = personalise(text1, lead);
  const body2 = text2 ? personalise(text2, lead) : null;
  const body3 = text3 ? personalise(text3, lead) : null;
  const companyName = getCompanyName(lead);
  try {
    await switchToInbox(page, fromNumber, inboxId || null);
    if (newStatus === 'initial_sent') {
      await sendInitial(page, lead.phone, body1, body2 || '', body3 || '', companyName);
    } else {
      await sendText(page, lead.phone, body1);
    }
    await updateLeadTexted(lead.id, newStatus, fromNumber, parseInt(scriptId));
    await logMessage(lead.id, 'outbound', fromNumber, lead.phone,
      [body1, body2, body3].filter(Boolean).join(' | '),
      newStatus.replace('_sent', ''), parseInt(scriptId));
    incrementDailySent(fromNumber);
    log(`  ✓ ${lead.phone} (${companyName || lead.phone}) — ${newStatus} from ${fromNumber}`);

    // Queue for prospect demo build after initial send
    if (newStatus === 'initial_sent') {
      enqueueProspectDemo(lead.id, companyName || lead.full_name || lead.phone, lead.source_brokerage || 'home services');
    }

    await sleep(jitter(2500, 1000));
  } catch (err) {
    log(`  ✗ ${lead.phone}: ${err.message}`);
  }
}

// ── Inspect mode ──────────────────────────────────────────────────────────────
async function inspect(page) {
  log('\n=== INSPECT MODE ===');
  log(`URL: ${page.url()}`);

  const result = await page.evaluate(() => {
    const out = [];

    // Inbox sidebar buttons (Quo: button[role="link"][aria-label])
    out.push('--- INBOX BUTTONS ---');
    Array.from(document.querySelectorAll('button[role="link"][aria-label]')).forEach(b => {
      out.push(`  aria-label: "${b.getAttribute('aria-label')}"`);
    });

    // Unread badges
    out.push('--- UNREAD BADGES ---');
    Array.from(document.querySelectorAll('[aria-label*="unread"]')).forEach(b => {
      out.push(`  aria-label: "${b.getAttribute('aria-label')}"  text: "${b.textContent.trim()}"`);
    });

    // Conversation links
    out.push('--- CONVERSATION LINKS ---');
    Array.from(document.querySelectorAll('a[href*="/inbox/"][href*="/c/"]')).slice(0, 10).forEach(a => {
      out.push(`  href: ${a.getAttribute('href')}  text: "${a.textContent.trim().slice(0, 60)}"`);
    });

    // Compose / new message buttons
    out.push('--- BUTTONS (aria-label) ---');
    Array.from(document.querySelectorAll('button[aria-label]')).slice(0, 30).forEach(b => {
      out.push(`  "${b.getAttribute('aria-label')}"`);
    });

    // Inputs
    out.push('--- INPUTS ---');
    Array.from(document.querySelectorAll('input, textarea, [contenteditable="true"]')).forEach(el => {
      const ph = el.getAttribute('placeholder') || '';
      const label = el.getAttribute('aria-label') || '';
      out.push(`  <${el.tagName.toLowerCase()}> placeholder="${ph}" aria-label="${label}"`);
    });

    return out.join('\n');
  });

  console.log(result);
}

// ── Google Calendar integration ───────────────────────────────────────────────

function httpsReq(options, body = null) {
  return new Promise((resolve, reject) => {
    const r = https.request(options, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(d) }); } catch { resolve({ status: res.statusCode, body: d }); } });
    });
    r.on('error', reject);
    if (body) r.write(typeof body === 'string' ? body : JSON.stringify(body));
    r.end();
  });
}

async function getGoogleAccessToken() {
  let stored;
  try { stored = JSON.parse(fs.readFileSync(GCAL_TOKENS_FILE, 'utf8')); }
  catch { throw new Error('Google tokens file not found — run hcai-google-oauth.js'); }

  if (stored.access_token && stored.token_expiry &&
      Date.now() < new Date(stored.token_expiry).getTime() - 5 * 60 * 1000) {
    return { token: stored.access_token, calendarId: stored.extra_calendar_id };
  }

  const body = new URLSearchParams({
    client_id:     process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    refresh_token: stored.refresh_token,
    grant_type:    'refresh_token',
  }).toString();

  const res = await httpsReq({
    hostname: 'oauth2.googleapis.com', path: '/token', method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
  }, body);

  if (!res.body.access_token) throw new Error('Token refresh failed: ' + JSON.stringify(res.body));

  const updated = {
    ...stored,
    access_token: res.body.access_token,
    token_expiry: new Date(Date.now() + (res.body.expires_in || 3600) * 1000).toISOString(),
  };
  fs.writeFileSync(GCAL_TOKENS_FILE, JSON.stringify(updated, null, 2));
  return { token: res.body.access_token, calendarId: stored.extra_calendar_id };
}

async function getCalendarBusySlots(days = 7) {
  try {
    const { token, calendarId } = await getGoogleAccessToken();
    const timeMin = new Date().toISOString();
    const timeMax = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    const params  = new URLSearchParams({ singleEvents: 'true', maxResults: '50', timeMin, timeMax, orderBy: 'startTime' });
    const res = await httpsReq({
      hostname: 'www.googleapis.com',
      path: `/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status !== 200) return [];
    return (res.body.items || [])
      .filter(e => e.status !== 'cancelled' && e.start?.dateTime)
      .map(e => ({ start: e.start.dateTime, end: e.end.dateTime, title: e.summary }));
  } catch { return []; }
}

function formatAvailableSlots(busySlots, timezone) {
  const tzName = TZ_NAMES[timezone] || 'America/Chicago';
  const slots = [];
  const now = new Date();

  for (let dayOffset = 1; dayOffset <= 7; dayOffset++) {
    const day = new Date(now);
    day.setDate(day.getDate() + dayOffset);
    const dow = day.getDay();
    if (dow === 0 || dow === 6) continue; // skip weekends

    const dayLabel = day.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: tzName });
    const freeHours = [];

    for (let hour = 9; hour <= 16; hour++) {
      // Build slot start as UTC by expressing the local time with the correct offset
      const utcOffset = currentUtcOffset(tzName); // e.g. "-05:00"
      const dateStr = day.toLocaleDateString('en-CA', { timeZone: tzName }); // "2026-05-07"
      const slotStartLocal = new Date(`${dateStr}T${String(hour).padStart(2,'0')}:00:00${utcOffset}`);
      const slotEndLocal   = new Date(slotStartLocal.getTime() + 30 * 60 * 1000);

      const clash = busySlots.some(b => {
        const bs = new Date(b.start).getTime();
        const be = new Date(b.end).getTime();
        return slotStartLocal.getTime() < be && slotEndLocal.getTime() > bs;
      });

      if (!clash) {
        const timeStr = new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: true, timeZone: tzName }).format(slotStartLocal);
        freeHours.push(timeStr);
      }
    }

    if (freeHours.length) slots.push(`${dayLabel}: ${freeHours.join(', ')}`);
  }

  return slots.length
    ? `AVAILABLE SLOTS (Website Calls calendar, ${timezone}):\n${slots.join('\n')}\nOnly suggest times from this list.`
    : `No availability data — suggest morning or afternoon slots Mon-Fri next week.`;
}

function extractEmailFromHistory(history) {
  const emailRe = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/;
  // Search newest messages first
  for (const msg of [...history].reverse()) {
    const m = (msg.body || '').match(emailRe);
    if (m) return m[0];
  }
  return null;
}

async function sendBookingConfirmationEmail(leadEmail, firstName, bizName, bookedTimeIso, meetLink, timezone) {
  if (!RESEND_KEY || !leadEmail) return;
  // Resolve IANA timezone — must be explicit, never fall back to server local (BST)
  const tzName = TZ_NAMES[timezone] || TZ_NAMES['CST'];
  if (!TZ_NAMES[timezone]) {
    log(`  WARNING: unknown timezone "${timezone}" for confirmation email — falling back to America/Chicago`);
  }
  // Use Intl.DateTimeFormat with explicit timeZone; toLocaleString silently uses system TZ if undefined
  const timeStr = new Intl.DateTimeFormat('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
    timeZone: tzName,
  }).format(new Date(bookedTimeIso));
  log(`  Confirmation email timezone: ${timezone} → ${tzName} → "${timeStr}"`);

  const text = [
    `Hi ${firstName || 'there'},`,
    ``,
    `You're booked in for ${timeStr}.`,
    ``,
    meetLink ? `Join via Google Meet: ${meetLink}` : '',
    ``,
    `I'll walk you through the website we built for ${bizName || 'your business'} and answer any questions.`,
    ``,
    `See you then.`,
    ``,
    `Max`,
  ].filter(l => l !== null).join('\n');

  const body = JSON.stringify({
    from: BOOKING_FROM_EMAIL,
    to: [leadEmail],
    cc: [BOOKING_CC_EMAIL],
    subject: `Your call is confirmed — ${timeStr}`,
    text,
  });

  try {
    const res = await httpsReq({
      hostname: 'api.resend.com', path: '/emails', method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, body);
    log(`  Confirmation email → ${leadEmail}: ${res.status === 200 ? 'sent' : JSON.stringify(res.body)}`);
  } catch (err) {
    log(`  Confirmation email error: ${err.message}`);
  }
}

async function extractBookedTimeIso(aiMessage, timezone) {
  const tzName = TZ_NAMES[timezone] || 'America/Chicago';
  const utcOffset = currentUtcOffset(tzName); // e.g. "-05:00" for CDT
  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: tzName,
  });
  const exampleIso = `2026-05-07T14:00:00${utcOffset}`;
  const prompt = `Today is ${todayStr}. The lead is in ${tzName} (currently UTC${utcOffset}). A booking was confirmed: "${aiMessage}". ALL times in this message are in ${tzName} — do NOT use server time or any other timezone. Return ONLY a valid ISO 8601 string with the UTC offset for ${tzName}, e.g. ${exampleIso}. Return null if the time cannot be determined.`;

  const result = await claudeExec(prompt);
  if (!result) return null;

  // Match ISO with optional offset
  const m = result.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?)([+-]\d{2}:?\d{2}|Z)?/);
  if (!m) return null;

  // If Claude returned no offset (or Z/UTC), attach the lead's correct offset
  const hasCorrectOffset = m[2] && m[2] !== 'Z' && !m[2].startsWith('+00') && !m[2].startsWith('-00');
  return hasCorrectOffset ? m[0] : m[1] + utcOffset;
}

async function createCalendarEvent(lead, bookedTimeIso, bizName, leadEmail) {
  try {
    const { token, calendarId } = await getGoogleAccessToken();
    if (!calendarId) { log('  Calendar: no calendarId in tokens — skip'); return; }

    const start = new Date(bookedTimeIso);
    const end   = new Date(start.getTime() + 30 * 60 * 1000); // 30-min call

    const title = `Website Call — ${bizName || lead.first_name || 'Lead'} (${lead.phone})`;
    const desc  = [
      `Name: ${lead.full_name || lead.first_name || ''}`,
      `Phone: ${lead.phone}`,
      `Business: ${bizName || ''}`,
      `Timezone: ${lead.timezone || ''}`,
      leadEmail ? `Email: ${leadEmail}` : '',
    ].filter(Boolean).join('\n');

    const attendees = [
      { email: BOOKING_CC_EMAIL },
      ...(leadEmail ? [{ email: leadEmail }] : []),
    ];

    const eventBody = JSON.stringify({
      summary: title,
      description: desc,
      start: { dateTime: start.toISOString() },
      end:   { dateTime: end.toISOString() },
      attendees,
      conferenceData: {
        createRequest: {
          requestId: `hcai-${lead.id}-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    });

    const res = await httpsReq({
      hostname: 'www.googleapis.com',
      path: `/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1&sendUpdates=none`,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(eventBody),
      },
    }, eventBody);

    if (res.status === 200 || res.status === 201) {
      const meetLink = res.body.conferenceData?.entryPoints?.find(e => e.entryPointType === 'video')?.uri || null;
      log(`  Calendar event created: "${title}" at ${start.toLocaleString()}${meetLink ? ' | Meet: ' + meetLink : ''}`);

      if (leadEmail) {
        await sendBookingConfirmationEmail(
          leadEmail,
          lead.first_name || lead.full_name?.split(' ')[0] || 'there',
          bizName,
          bookedTimeIso,
          meetLink,
          lead.timezone,
        );
      } else {
        log('  No lead email — confirmation email skipped');
      }
    } else {
      log(`  Calendar event failed (${res.status}): ${JSON.stringify(res.body)}`);
    }
  } catch (err) {
    log(`  Calendar event error (non-fatal): ${err.message}`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) { log('ERROR: Missing Supabase env vars'); process.exit(1); }

  const isInspect = process.argv.includes('--inspect');
  const isCheck   = process.argv.includes('--check-only');
  const isSend    = process.argv.includes('--send-only');
  const limitArg  = parseInt((process.argv.find(a => a.startsWith('--limit=')) || '').replace('--limit=', '') || '0') || null;

  // --test --from=+14642453780 --inbox-id=PNAtCJVoUv --to=+12056062178 --msg="Hi this is a Test."
  const testArg    = process.argv.find(a => a === '--test');
  const fromArg    = (process.argv.find(a => a.startsWith('--from='))     || '').replace('--from=', '');
  const inboxIdArg = (process.argv.find(a => a.startsWith('--inbox-id=')) || '').replace('--inbox-id=', '');
  const toArg      = (process.argv.find(a => a.startsWith('--to='))       || '').replace('--to=', '');
  const msgArg     = (process.argv.find(a => a.startsWith('--msg='))      || '').replace('--msg=', '');

  log('=== OpenPhone Texting Daemon ===');

  let browser;
  try {
    browser = await puppeteer.connect({ browserURL: `http://localhost:${PORT}`, defaultViewport: null });
  } catch (err) {
    log(`ERROR: Cannot connect to Chrome on port ${PORT}: ${err.message}`);
    log('Start OpenPhone Chrome: bash scripts/chrome-launch-openphone.sh');
    process.exit(1);
  }

  const pages = await browser.pages();
  const page  = pages.find(p => p.url().includes('quo.com')) || pages[0];
  if (!page) { log('ERROR: No OpenPhone page found'); browser.disconnect(); process.exit(1); }

  log(`Connected to: ${page.url()}`);

  if (isInspect) {
    await inspect(page);
    browser.disconnect();
    return;
  }

  if (testArg) {
    if (!fromArg || !toArg || !msgArg) {
      log('Usage: --test --from=+1XXXXXXXXXX --to=+1XXXXXXXXXX --msg="your message"');
      browser.disconnect(); process.exit(1);
    }
    log(`\n=== TEST SEND ===`);
    log(`From: ${fromArg}  InboxId: ${inboxIdArg || '(none)'}  To: ${toArg}`);
    log(`Msg:  ${msgArg}`);
    await waitForApp(page);
    await switchToInbox(page, fromArg, inboxIdArg || null);
    await sendText(page, toArg, msgArg);
    log('✓ Test message sent');
    browser.disconnect();
    return;
  }

  await waitForApp(page);
  log('Daemon started — checking replies every 2 min, outbound fires per-timezone at 9AM local.');

  // ── Daemon loop ────────────────────────────────────────────────────────────
  while (true) {
    const config  = loadConfig();
    const scripts = loadScripts();

    try {
      const enabled = await isTextingEnabled();
      if (!enabled) {
        log('Texting DISABLED in CRM — sleeping 5 min before re-check.');
        await sleep(5 * 60 * 1000);
        continue;
      }

      // Replies + booking reminders: run every cycle, 24/7
      if (!isSend) {
        await checkReplies(page, config, scripts);
        await checkBookingReminders(page, config);
      }

      // Outbound: sendOutbound already guards by isWithinSendingHours per tz
      // and stops when daily limit is hit — safe to call every cycle.
      if (!isCheck) {
        await sendOutbound(page, config, scripts, limitArg);
      }

    } catch (err) {
      log(`Loop error (non-fatal): ${err.message}`);
    }

    log('--- sleeping 2 min ---');
    await sleep(2 * 60 * 1000);
  }
}

main().catch(err => { log(`FATAL: ${err.message}\n${err.stack}`); process.exit(1); });
