#!/usr/bin/env node
'use strict';

const puppeteer  = require('puppeteer');
const https      = require('https');
const fs         = require('fs');
const path       = require('path');
const { execSync } = require('child_process');

const PORT             = 9240;
const CONFIG_PATH      = path.join(__dirname, 'config.json');
const SCRIPTS_PATH     = path.join(__dirname, 'message-scripts.json');
const DAILY_STATE_PATH = '/home/max/crm/agents/state/texting-daily.json';
const LAST_CHECK_PATH  = '/home/max/crm/agents/state/texting-last-check.json';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const OPT_OUT_KEYWORDS = ['stop', 'unsubscribe', 'remove me', 'dont text', "don't text", 'opt out', 'no thanks', 'not interested'];
const BOOKING_INTENT_KEYWORDS = ['yes', 'sure', 'sounds good', 'interested', 'when', 'what time', 'schedule', 'book', 'call', 'zoom', 'tell me more', 'how does', 'definitely', "i'd like", 'id like', 'love to', 'works for me', 'available', 'open to', 'let\'s', 'lets'];

const CALENDLY_URL = 'https://calendly.com/nexorra/demo-call';
const AGENCY_ACCOUNT_ID = 'da99b768-79dd-48f8-af86-abf95e61a69f';

// UTC offset for each timezone (standard time — US doesn't observe DST uniformly
// but these offsets are close enough; OpenPhone leads are scraped with tz labels)
const TZ_UTC_OFFSET = { EST: -5, CST: -6, MST: -7, PST: -8 };

// Returns true if current time is within 9:00AM–5:30PM in the given timezone
function isWithinSendingHours(timezone) {
  const offset = TZ_UTC_OFFSET[timezone] ?? -5;
  const now = new Date();
  const localMins = ((now.getUTCHours() + offset + 24) % 24) * 60 + now.getUTCMinutes();
  return localMins >= 9 * 60 && localMins < 17 * 60 + 30;
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

async function getLeadsForInitialByTimezone(timezone, limit) {
  const r = await supabase('GET',
    `leads?select=id,full_name,first_name,phone,city,state_province,timezone` +
    `&text_status=is.null&phone=not.is.null&text_opted_out=not.is.true` +
    `&lead_category=eq.calling&timezone=eq.${timezone}` +
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

async function getLeadsForFollowUp(fromStatus, daysAgo) {
  const cutoff = new Date(Date.now() - daysAgo * 86400000).toISOString();
  const r = await supabase('GET',
    `leads?select=id,full_name,first_name,phone,city,state_province,timezone,text_sender_number,text_script_id` +
    `&text_status=eq.${fromStatus}&text_reply_received=not.is.true&text_opted_out=not.is.true` +
    `&last_texted_at=lt.${encodeURIComponent(cutoff)}&limit=200`
  );
  return r.data || [];
}

async function getLeadsForPostBooking(fromStatus, daysAgo) {
  const cutoff = new Date(Date.now() - daysAgo * 86400000).toISOString();
  const r = await supabase('GET',
    `leads?select=id,full_name,first_name,phone,city,state_province,timezone,text_sender_number,text_script_id` +
    `&text_status=eq.${fromStatus}&text_booked=not.is.true&text_opted_out=not.is.true` +
    `&last_texted_at=lt.${encodeURIComponent(cutoff)}&limit=200`
  );
  return r.data || [];
}

async function updateLeadTexted(leadId, status, senderNumber, scriptId) {
  await supabase('PATCH', `leads?id=eq.${leadId}`, {
    text_status: status, last_texted_at: new Date().toISOString(),
    text_sender_number: senderNumber, text_script_id: scriptId,
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

async function markBooked(leadId) {
  await supabase('PATCH', `leads?id=eq.${leadId}`, {
    text_booked: true, text_booked_at: new Date().toISOString(), text_status: 'booked',
  });
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

async function generateAIReply(lead, inboundMessage, scriptId, history) {
  const firstName = getFirstName(lead);
  const historyText = history.map(m => `${m.direction === 'outbound' ? 'Us' : 'Them'}: ${m.body}`).join('\n');
  const prompt = `You text real estate agents for Nexorra about AI-powered lead follow-up. You are Max.

Agent: ${firstName} | Market: ${lead.city || 'their area'}, ${lead.state_province || ''}
Goal: get them to book a 10-15 min demo call at ${CALENDLY_URL}

${historyText ? `Conversation so far:\n${historyText}\n` : ''}Them: ${inboundMessage}

Reply in 1-2 sentences max. Sound like a real person texting — casual, direct, no corporate filler.
No dashes. No bullet points. No em dashes.
Never use: Absolutely, Great, Fantastic, Certainly, Of course, I totally understand, I appreciate, Sounds good, Happy to help.
If they show interest, move toward booking — suggest the calendar link naturally.
Reply only — no labels, no quotes, nothing else.`;
  return claudeExec(prompt);
}

async function generateBookingLinkMessage(lead, inboundMessage, scriptId, history) {
  const firstName = getFirstName(lead);
  const historyText = history.map(m => `${m.direction === 'outbound' ? 'Us' : 'Them'}: ${m.body}`).join('\n');
  const prompt = `You text real estate agents for Nexorra. This person just expressed interest in booking a call.

Agent: ${firstName}
${historyText ? `Conversation:\n${historyText}\n` : ''}Them: ${inboundMessage}

Write a short 1-sentence reply acknowledging their interest and include this booking link naturally: ${CALENDLY_URL}
No filler words. No dashes. Sound human, not salesy.
Reply only — no labels, no quotes.`;
  const ai = claudeExec(prompt);
  // Fallback if AI fails — always include the link
  return ai || `Here's the link to grab a time: ${CALENDLY_URL}`;
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
  if (!raw) return 'there';
  // Each word: first letter upper, rest lower — handles "JEN" → "Jen", "JOHN DOE" → "John Doe"
  return raw.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

function getFirstName(lead) {
  const raw = lead.first_name || (lead.full_name || '').split(/\s+/)[0] || '';
  return properName(raw) || 'there';
}

function personalise(template, lead) {
  const first = getFirstName(lead);
  return template
    .replace(/{First_name}/g, first)
    .replace(/{first_name}/g, first)
    .replace(/{city}/g, lead.city || 'your area')
    .replace(/{state}/g, lead.state_province || '');
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
// Primary: navigate by inboxId URL (fast, reliable).
// Fallback: scan sidebar buttons by phone digits.
async function switchToInbox(page, displayNumber, inboxId) {
  const config = loadConfig();
  const blocked = new Set(config.blockedInboxIds || []);
  if (inboxId && blocked.has(inboxId)) throw new Error(`Blocked inbox ${inboxId} — will not navigate there`);

  const digits = displayNumber.replace(/\D/g, '').slice(-10);

  // Click the inbox in the sidebar — all inboxes are always visible as DIVs
  // containing the phone number. No page navigation needed.
  const currentUrl = page.url();
  const alreadyThere = inboxId && currentUrl.includes(`/inbox/${inboxId}`) && !currentUrl.includes('/c/');
  if (alreadyThere) { await sleep(200); return; }

  // Each inbox is a button[role="link"] in the sidebar containing the phone number
  const clicked = await page.evaluate((digits) => {
    for (const btn of document.querySelectorAll('button[role="link"]')) {
      if ((btn.textContent || '').replace(/\D/g, '').includes(digits)) {
        btn.click();
        return true;
      }
    }
    return false;
  }, digits);

  if (!clicked) throw new Error(`Inbox not found in sidebar for ${displayNumber}`);
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
async function setContactName(page, firstName, lastName) {
  // Open details panel
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button[aria-label]'))
      .find(b => b.getAttribute('aria-label') === 'Show details');
    if (btn) btn.click();
  });
  await sleep(800);

  // Click "Add a name..." to reveal first/last inputs
  const hasNameInput = await page.$('input[placeholder="Add a first name..."]');
  if (!hasNameInput) {
    await page.evaluate(() => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        if (node.textContent.trim() === 'Add a name...') {
          node.parentElement.click();
          return;
        }
      }
    });
    await sleep(600);
  }

  const fnInput = await page.$('input[placeholder="Add a first name..."]').catch(() => null);
  const lnInput = await page.$('input[placeholder="Add a last name..."]').catch(() => null);
  if (fnInput) { await fnInput.click(); await fnInput.type(firstName, { delay: 50 }); await sleep(200); }
  if (lnInput) { await lnInput.click(); await lnInput.type(lastName, { delay: 50 }); await sleep(200); }

  // Close details panel by clicking Show details again — this blurs the inputs
  // and saves the name without pressing Tab (which triggers "Mark as done" in Quo)
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button[aria-label]'))
      .find(b => b.getAttribute('aria-label') === 'Show details');
    if (btn) btn.click();
  });
  await sleep(600);
}

// Send initial outreach: compose new conversation, set contact name,
// send text1, wait 1 second, send text2 as a separate message.
async function sendInitial(page, toPhone, text1, text2, firstName, lastName) {
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
  // so newlines don't accidentally trigger a send
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

  // Send text1 first — conversation must exist before we can set the contact name
  await sendMsg(text1);

  // Blur the message input after sending to prevent keystrokes leaking into this
  // conversation when the next lead's compose flow runs
  await page.evaluate(() => { if (document.activeElement) document.activeElement.blur(); });

  // Now set contact name (Show details panel only appears once a conversation exists)
  if (firstName) {
    await setContactName(page, firstName, lastName || '');
    await page.waitForSelector('[aria-label="message input"]', { timeout: 5000 }).catch(() => {});
  }

  await sleep(3000); // 3 seconds between messages
  await sendMsg(text2);

  // Blur again after text2 to prevent leaking into the next send
  await page.evaluate(() => { if (document.activeElement) document.activeElement.blur(); });
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

// ── Check inboxes for new replies ─────────────────────────────────────────────
async function checkReplies(page, config, scripts) {
  log('\n=== Checking for replies ===');

  const blocked = new Set(config.blockedInboxIds || []);

  for (const numCfg of config.numbers) {
    const { displayNumber, inboxId } = numCfg;
    if (!inboxId) { log(`  ${displayNumber}: no inboxId configured — skip`); continue; }
    if (blocked.has(inboxId)) { log(`  ${displayNumber}: blocked inbox — skip`); continue; }
    const script = null; // scripts are per-lead via lead.text_script_id in follow-ups

    log(`\n  Inbox ${displayNumber} (${inboxId})...`);
    try {
      // Switch to this inbox via sidebar click (no page reload)
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

          if (hasBookingIntent && !lead.text_booking_link_sent) {
            // Send booking link — generate a natural message around it via AI
            await markBookingIntent(lead.id);
            const history = await getConversationHistory(lead.id);
            const bookingMsg = await generateBookingLinkMessage(lead, lastInbound.body, usedScriptId, history);
            await sendReply(page, bookingMsg);
            await markBookingLinkSent(lead.id);
            await logMessage(lead.id, 'outbound', displayNumber, contactPhone, bookingMsg, 'booking_link', usedScriptId);
            log(`  Booking link sent to ${contactPhone}`);
          } else if (!hasBookingIntent) {
            // AI reply to continue the conversation
            const history = await getConversationHistory(lead.id);
            const aiReply = await generateAIReply(lead, lastInbound.body, usedScriptId, history);
            if (aiReply) {
              await sendReply(page, aiReply);
              await logMessage(lead.id, 'outbound', displayNumber, contactPhone, aiReply, 'ai_reply', usedScriptId);
              log(`  AI reply sent to ${contactPhone}: "${aiReply.slice(0, 60)}"`);
            }
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

// ── Send outbound (initial + 3 follow-ups + 3 post-booking follow-ups) ────────
async function sendOutbound(page, config, scripts) {
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
    const leads = await getLeadsForPostBooking(step.fromStatus, step.days);
    log(`\n  Post-booking ${step.fromStatus}: ${leads.length} eligible`);
    for (const lead of leads) {
      const numCfg = config.numbers.find(n => n.displayNumber === lead.text_sender_number);
      if (!numCfg || (config.blockedInboxIds || []).includes(numCfg.inboxId)) continue;
      if (getDailySent(numCfg.displayNumber) >= dailyLimit) continue;
      await sendToLead(page, lead, numCfg.displayNumber, step.text, null, step.toStatus, lead.text_script_id || 1, numCfg.inboxId);
    }
  }

  // ── Follow-ups 3 → 1 (reverse order so limits apply correctly) ───────────
  for (const step of [...followupSteps].reverse()) {
    if (!step.text) continue;
    const leads = await getLeadsForFollowUp(step.fromStatus, step.days);
    log(`\n  ${step.fromStatus} → ${step.toStatus}: ${leads.length} eligible`);
    for (const lead of leads) {
      const numCfg = config.numbers.find(n => n.displayNumber === lead.text_sender_number);
      if (!numCfg || (config.blockedInboxIds || []).includes(numCfg.inboxId)) continue;
      if (getDailySent(numCfg.displayNumber) >= dailyLimit) continue;
      await sendToLead(page, lead, numCfg.displayNumber, step.text, null, step.toStatus, lead.text_script_id || 1, numCfg.inboxId);
    }
  }

  // ── Initial sends — timezone-based, script distributed 25% each ──────────
  // Each number pulls from its timezone lead pool. Script assigned by position:
  // first 25% of daily sends → script 1, next 25% → script 2, etc.
  // At 10/number: 3,3,2,2. At 40/number: 10,10,10,10.
  for (const numCfg of config.numbers) {
    const { displayNumber, inboxId, timezone } = numCfg;
    if (!timezone) continue;
    if ((config.blockedInboxIds || []).includes(inboxId)) continue;

    // Only send during 9AM–5:30PM in this number's timezone
    if (!isWithinSendingHours(timezone)) {
      log(`\n  ${displayNumber} (${timezone}): outside sending hours — skip`);
      continue;
    }

    const sent = getDailySent(displayNumber);
    const remaining = dailyLimit - sent;
    if (remaining <= 0) { log(`\n  ${displayNumber} (${timezone}): limit reached`); continue; }

    const leads = await getLeadsForInitialByTimezone(timezone, remaining);
    log(`\n  ${displayNumber} (${timezone}): ${leads.length} leads, ${remaining} slots`);

    for (const lead of leads) {
      if (getDailySent(displayNumber) >= dailyLimit) break;
      const currentSent = getDailySent(displayNumber);
      const scriptId = getScriptForCount(currentSent, dailyLimit);
      const script = scripts[String(scriptId)];
      if (!script?.text1) { log(`  No script ${scriptId}`); continue; }
      await sendToLead(page, lead, displayNumber, script.text1, script.text2, 'initial_sent', scriptId, inboxId);
    }
  }
}

async function sendToLead(page, lead, fromNumber, text1, text2, newStatus, scriptId, inboxId) {
  const body1 = personalise(text1, lead);
  const body2 = text2 ? personalise(text2, lead) : null;
  try {
    await switchToInbox(page, fromNumber, inboxId || null);
    if (newStatus === 'initial_sent') {
      const fn = getFirstName(lead);
      const rawFull = (lead.full_name || '').trim().split(/\s+/);
      const ln = rawFull.length > 1 ? properName(rawFull.slice(1).join(' ')) : '';
      await sendInitial(page, lead.phone, body1, body2 || '', fn, ln);
    } else {
      await sendText(page, lead.phone, body1);
    }
    await updateLeadTexted(lead.id, newStatus, fromNumber, parseInt(scriptId));
    await logMessage(lead.id, 'outbound', fromNumber, lead.phone, body1 + (body2 ? ' | ' + body2 : ''), newStatus.replace('_sent', ''), parseInt(scriptId));
    incrementDailySent(fromNumber);
    log(`  ✓ ${lead.phone} (${getFirstName(lead)}) — ${newStatus} from ${fromNumber}`);
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

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) { log('ERROR: Missing Supabase env vars'); process.exit(1); }

  const isInspect = process.argv.includes('--inspect');
  const isCheck   = process.argv.includes('--check-only');
  const isSend    = process.argv.includes('--send-only');

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

  const config  = loadConfig();
  const scripts = loadScripts();

  await waitForApp(page);

  // Check master enable flag — if off, skip everything
  const enabled = await isTextingEnabled();
  if (!enabled) {
    log('Texting is DISABLED in CRM — skipping all sends and replies');
    browser.disconnect();
    return;
  }

  // Replies run 24/7
  if (!isSend) await checkReplies(page, config, scripts);

  // Outbound sends only during timezone business hours (9AM–5:30PM per TZ)
  if (!isCheck) await sendOutbound(page, config, scripts);

  browser.disconnect();
  log('\n=== Done ===');
}

main().catch(err => { log(`FATAL: ${err.message}\n${err.stack}`); process.exit(1); });
