#!/usr/bin/env node
'use strict';

const puppeteer = require('puppeteer');
const https     = require('https');
const fs        = require('fs');
const path      = require('path');

const PORT             = 9240;
const CONFIG_PATH      = path.join(__dirname, 'config.json');
const SCRIPTS_PATH     = path.join(__dirname, 'message-scripts.json');
const DAILY_STATE_PATH = '/home/max/crm/agents/state/texting-daily.json';
const LAST_CHECK_PATH  = '/home/max/crm/agents/state/texting-last-check.json';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const OPT_OUT_KEYWORDS = ['stop', 'unsubscribe', 'remove me', 'dont text', "don't text", 'opt out', 'no thanks', 'not interested'];

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

async function getLeadsForInitial(scriptId, category, limit) {
  const r = await supabase('GET',
    `leads?select=id,full_name,first_name,phone,city,state_province,timezone` +
    `&text_status=is.null&phone=not.is.null&text_opted_out=not.is.true` +
    `&lead_category=eq.${category}&order=created_at.asc&limit=${limit}`
  );
  return r.data || [];
}

async function getLeadsForFollowUp(followUpNum, daysAgo) {
  const cutoff = new Date(Date.now() - daysAgo * 86400000).toISOString();
  const status = followUpNum === 1 ? 'initial_sent' : 'followup_1_sent';
  const r = await supabase('GET',
    `leads?select=id,full_name,first_name,phone,city,state_province,timezone,text_sender_number,text_script_id` +
    `&text_status=eq.${status}&text_reply_received=not.is.true&text_opted_out=not.is.true` +
    `&last_texted_at=lt.${cutoff}&limit=200`
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

// ── Template ──────────────────────────────────────────────────────────────────
function personalise(template, lead) {
  return template
    .replace(/{first_name}/g, lead.first_name || (lead.full_name || '').split(' ')[0] || 'there')
    .replace(/{city}/g, lead.city || 'your area')
    .replace(/{state}/g, lead.state_province || '');
}

// ── OpenPhone web app helpers ─────────────────────────────────────────────────

async function waitForApp(page) {
  await page.waitForFunction(
    () => document.readyState === 'complete' && !!document.querySelector('nav, aside, [class*="sidebar"], [class*="Sidebar"]'),
    { timeout: 20000 }
  ).catch(() => {});
  await sleep(1500);
}

// Switch to the inbox for a given display number (e.g. "+15551234567")
async function switchToInbox(page, displayNumber) {
  const digits = displayNumber.replace(/\D/g, '').slice(-10);

  const clicked = await page.evaluate((digits) => {
    // Walk all sidebar-ish elements looking for one containing our number
    const candidates = Array.from(document.querySelectorAll(
      'nav *, aside *, [role="navigation"] *, [class*="sidebar"] *, [class*="Sidebar"] *'
    ));
    for (const el of candidates) {
      if (el.children.length > 3) continue; // skip containers, only leaf-ish nodes
      const text = (el.textContent || '').replace(/\D/g, '');
      if (text.includes(digits)) {
        const btn = el.closest('a, button, [role="button"], li, [class*="number"], [class*="inbox"]') || el;
        btn.click();
        return true;
      }
    }
    return false;
  }, digits);

  if (!clicked) throw new Error(`Inbox not found for ${displayNumber} — run --inspect to debug`);
  await sleep(jitter(1200, 500));
}

// Get conversations visible in the current inbox (phone + unread flag)
async function getVisibleConversations(page) {
  return page.evaluate(() => {
    const results = [];
    // Try multiple selectors for conversation list items
    let items = [];
    for (const sel of [
      '[data-testid*="conversation"]', '[class*="ConversationItem"]',
      '[class*="conversation-item"]', '[class*="ThreadItem"]', '[class*="thread-item"]',
    ]) {
      items = Array.from(document.querySelectorAll(sel));
      if (items.length) break;
    }
    // Fallback: any <li> in the main content area that contains a phone pattern
    if (!items.length) items = Array.from(document.querySelectorAll('li, [role="listitem"]'));

    for (const el of items) {
      const text = el.textContent || '';
      const m = text.match(/\+?1?\s*\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}/);
      const hasUnread = !!el.querySelector('[class*="unread"], [class*="Unread"], [data-unread="true"], [class*="badge"], [class*="Badge"]');
      if (m) results.push({ phone: m[0].replace(/\D/g, '').slice(-10), hasUnread });
    }
    return results;
  });
}

// Click into the conversation for a given phone number
async function openConversation(page, phone) {
  const digits = phone.replace(/\D/g, '').slice(-10);
  const found = await page.evaluate((digits) => {
    const all = Array.from(document.querySelectorAll('li, [role="listitem"], [class*="conversation"], [class*="thread"]'));
    for (const el of all) {
      if ((el.textContent || '').replace(/\D/g, '').includes(digits)) {
        el.click(); return true;
      }
    }
    return false;
  }, digits);
  if (!found) return false;
  await sleep(jitter(800, 400));
  return true;
}

// Get the last N messages in the open conversation
async function getLastMessages(page, n = 8) {
  return page.evaluate((n) => {
    let els = [];
    for (const sel of ['[data-testid*="message"]', '[class*="MessageBubble"]', '[class*="message-bubble"]', '[class*="Message"]']) {
      els = Array.from(document.querySelectorAll(sel));
      if (els.length) break;
    }
    return els.slice(-n).map(el => {
      const cls = (el.className || '') + (el.getAttribute('data-direction') || '');
      const isOut = /outbound|sent|right/i.test(cls);
      const isIn  = /inbound|received|left/i.test(cls);
      return {
        body: (el.textContent || '').trim(),
        direction: isOut ? 'outbound' : isIn ? 'inbound' : 'unknown',
      };
    });
  }, n);
}

// Compose and send a brand-new text (handles both new contacts and existing conversations)
async function sendText(page, toPhone, body) {
  // Click the new-message / compose button
  const composeClicked = await page.evaluate(() => {
    for (const sel of [
      'button[aria-label*="new message" i]', 'button[aria-label*="compose" i]',
      'button[aria-label*="create" i]', '[data-testid*="compose"]',
      '[data-testid*="new-message"]', 'a[href*="compose"]',
    ]) {
      const el = document.querySelector(sel);
      if (el) { el.click(); return sel; }
    }
    // Fallback: any button whose label or title mentions new/compose/write
    for (const btn of document.querySelectorAll('button')) {
      const hint = (btn.getAttribute('aria-label') || btn.title || '').toLowerCase();
      if (hint.includes('new') || hint.includes('compose') || hint.includes('write')) {
        btn.click(); return 'fallback-btn';
      }
    }
    return null;
  });

  if (!composeClicked) throw new Error('Compose button not found — run --inspect to debug selectors');
  await sleep(jitter(800, 400));

  // Type recipient number
  const recipientInput = await page.waitForSelector(
    'input[placeholder*="number" i], input[placeholder*="name" i], input[placeholder*="to" i], input[placeholder*="recipient" i]',
    { timeout: 6000 }
  ).catch(() => null);
  if (!recipientInput) throw new Error('Recipient input not found');
  await recipientInput.type(toPhone, { delay: jitter(30, 20) });
  await sleep(jitter(700, 300));
  await page.keyboard.press('Enter');
  await sleep(jitter(500, 200));

  // Type message body
  const msgInput = await page.waitForSelector(
    'textarea, [contenteditable="true"][data-placeholder*="message" i], [data-testid*="message-input"]',
    { timeout: 6000 }
  ).catch(() => null);
  if (!msgInput) throw new Error('Message input not found');
  await msgInput.click();
  await msgInput.type(body, { delay: jitter(18, 12) });
  await sleep(jitter(400, 200));

  // Send
  const sent = await page.evaluate(() => {
    for (const sel of ['button[aria-label*="send" i]', 'button[data-testid*="send"]', 'button[type="submit"]']) {
      const el = document.querySelector(sel);
      if (el && !el.disabled) { el.click(); return sel; }
    }
    // text "Send" button
    for (const btn of document.querySelectorAll('button')) {
      if ((btn.textContent || '').trim().toLowerCase() === 'send') { btn.click(); return 'text-send'; }
    }
    return null;
  });
  if (!sent) await page.keyboard.press('Enter');
  await sleep(jitter(1000, 400));
}

// Reply in the currently open conversation
async function sendReply(page, body) {
  const msgInput = await page.waitForSelector(
    'textarea, [contenteditable="true"], [data-testid*="message-input"]',
    { timeout: 5000 }
  ).catch(() => null);
  if (!msgInput) throw new Error('Message input not found for reply');
  await msgInput.click();
  await msgInput.type(body, { delay: jitter(18, 12) });
  await sleep(jitter(400, 200));
  const sent = await page.evaluate(() => {
    for (const sel of ['button[aria-label*="send" i]', 'button[data-testid*="send"]', 'button[type="submit"]']) {
      const el = document.querySelector(sel);
      if (el && !el.disabled) { el.click(); return true; }
    }
    return false;
  });
  if (!sent) await page.keyboard.press('Enter');
  await sleep(jitter(800, 300));
}

// ── Check inboxes for new replies ─────────────────────────────────────────────
async function checkReplies(page, config, scripts) {
  log('\n=== Checking for replies ===');
  const lastCheck = loadLastCheck();
  const newCheck  = { ...lastCheck };

  for (const numCfg of config.numbers) {
    const { displayNumber, scriptId } = numCfg;
    const script = scripts[String(scriptId)];
    newCheck[displayNumber] = new Date().toISOString();

    log(`\n  Inbox ${displayNumber}...`);
    try {
      await switchToInbox(page, displayNumber);
      const conversations = await getVisibleConversations(page);
      const unread = conversations.filter(c => c.hasUnread);
      if (!unread.length) { log('  No unread conversations'); continue; }
      log(`  ${unread.length} unread`);

      for (const conv of unread) {
        try {
          if (!await openConversation(page, conv.phone)) continue;
          const msgs = await getLastMessages(page);
          const lastInbound = [...msgs].reverse().find(m => m.direction === 'inbound');
          if (!lastInbound) continue;

          const lead = await findLeadByPhone(conv.phone);
          if (!lead) { log(`  No lead for ${conv.phone}`); continue; }

          const bodyLower = (lastInbound.body || '').toLowerCase();

          // Opt-out detection
          if (OPT_OUT_KEYWORDS.some(kw => bodyLower.includes(kw))) {
            log(`  Opt-out: ${conv.phone}`);
            await markLeadOptedOut(lead.id);
            await logMessage(lead.id, 'inbound', conv.phone, displayNumber, lastInbound.body, 'opt_out', scriptId);
            continue;
          }

          // New reply
          if (!lead.text_reply_received) {
            log(`  Reply from ${conv.phone}: "${lastInbound.body.slice(0, 60)}"`);
            await markLeadReplied(lead.id);
            await logMessage(lead.id, 'inbound', conv.phone, displayNumber, lastInbound.body, 'reply', scriptId);

            // Auto-reply if script has one
            if (script?.autoReply) {
              const replyBody = personalise(script.autoReply, lead);
              await sendReply(page, replyBody);
              await logMessage(lead.id, 'outbound', displayNumber, conv.phone, replyBody, 'auto_reply', scriptId);
              log(`  Auto-replied to ${conv.phone}`);
            }
          }
        } catch (err) {
          log(`  Error on ${conv.phone}: ${err.message}`);
        }
      }
    } catch (err) {
      log(`  Error checking ${displayNumber}: ${err.message}`);
    }
  }

  saveLastCheck(newCheck);
}

// ── Send outbound (initial + follow-ups) ──────────────────────────────────────
async function sendOutbound(page, config, scripts) {
  log('\n=== Sending outbound ===');
  const dailyLimit = getDailyLimit(config);
  const rampDay = !config.ramp.startDate ? 1 :
    Math.min(config.ramp.days, Math.floor((Date.now() - new Date(config.ramp.startDate)) / 86400000) + 1);
  log(`Ramp day ${rampDay}/${config.ramp.days} — limit: ${dailyLimit}/number`);

  // ── Follow-up 2 (if configured) ──────────────────────────────────────────
  if (config.followUp2Days) {
    const leads = await getLeadsForFollowUp(2, config.followUp2Days);
    log(`\n  Follow-up 2: ${leads.length} leads eligible`);
    for (const lead of leads) {
      const numCfg = config.numbers.find(n => n.displayNumber === lead.text_sender_number);
      if (!numCfg) continue;
      if (getDailySent(numCfg.displayNumber) >= dailyLimit) continue;
      const script = scripts[String(lead.text_script_id || numCfg.scriptId)];
      if (!script?.followup2) continue;
      await sendToLead(page, lead, numCfg.displayNumber, script.followup2, 'followup_2_sent', lead.text_script_id || numCfg.scriptId);
    }
  }

  // ── Follow-up 1 ───────────────────────────────────────────────────────────
  const fu1Leads = await getLeadsForFollowUp(1, config.followUpDays);
  log(`\n  Follow-up 1: ${fu1Leads.length} leads eligible`);
  for (const lead of fu1Leads) {
    const numCfg = config.numbers.find(n => n.displayNumber === lead.text_sender_number);
    if (!numCfg) continue;
    if (getDailySent(numCfg.displayNumber) >= dailyLimit) continue;
    const script = scripts[String(lead.text_script_id || numCfg.scriptId)];
    if (!script?.followup1) continue;
    await sendToLead(page, lead, numCfg.displayNumber, script.followup1, 'followup_1_sent', lead.text_script_id || numCfg.scriptId);
  }

  // ── Initial sends — per number ─────────────────────────────────────────────
  for (const numCfg of config.numbers) {
    const { displayNumber, scriptId } = numCfg;
    const sent = getDailySent(displayNumber);
    const remaining = dailyLimit - sent;
    if (remaining <= 0) { log(`\n  ${displayNumber}: limit reached (${sent}/${dailyLimit})`); continue; }

    const script = scripts[String(scriptId)];
    if (!script) { log(`  No script for id ${scriptId}`); continue; }

    const leads = await getLeadsForInitial(scriptId, config.leadCategory || 'calling', remaining);
    log(`\n  ${displayNumber} (script ${scriptId}): ${leads.length} initial sends, ${remaining} slots`);

    for (const lead of leads) {
      if (getDailySent(displayNumber) >= dailyLimit) break;
      await sendToLead(page, lead, displayNumber, script.initial, 'initial_sent', scriptId);
    }
  }
}

async function sendToLead(page, lead, fromNumber, template, newStatus, scriptId) {
  const body = personalise(template, lead);
  try {
    await switchToInbox(page, fromNumber);
    await sendText(page, lead.phone, body);
    await updateLeadTexted(lead.id, newStatus, fromNumber, parseInt(scriptId));
    await logMessage(lead.id, 'outbound', fromNumber, lead.phone, body, newStatus.replace('_sent', ''), parseInt(scriptId));
    incrementDailySent(fromNumber);
    log(`  ✓ ${lead.phone} (${lead.first_name || lead.full_name}) — ${newStatus} from ${fromNumber}`);
    await sleep(jitter(2500, 1000));
  } catch (err) {
    log(`  ✗ ${lead.phone}: ${err.message}`);
  }
}

// ── Inspect mode: dump page structure to identify selectors ───────────────────
async function inspect(page) {
  log('\n=== INSPECT MODE ===');
  log(`URL: ${page.url()}`);
  const structure = await page.evaluate(() => {
    function tree(el, depth) {
      if (depth > 4) return '';
      const tag  = el.tagName.toLowerCase();
      const id   = el.id ? `#${el.id}` : '';
      const cls  = el.className && typeof el.className === 'string'
        ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : '';
      const dt   = el.dataset?.testid ? `[data-testid="${el.dataset.testid}"]` : '';
      const role = el.getAttribute('role') ? `[role="${el.getAttribute('role')}"]` : '';
      const label = el.getAttribute('aria-label') ? ` aria="${el.getAttribute('aria-label')}"` : '';
      const txt  = el.childElementCount === 0 ? ` "${(el.textContent || '').trim().slice(0, 40)}"` : '';
      let out = `${'  '.repeat(depth)}<${tag}${id}${cls}${dt}${role}${label}${txt}>\n`;
      for (const child of Array.from(el.children).slice(0, 10)) out += tree(child, depth + 1);
      return out;
    }
    return tree(document.body, 0);
  });
  console.log(structure);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) { log('ERROR: Missing Supabase env vars'); process.exit(1); }

  const isInspect = process.argv.includes('--inspect');
  const isCheck   = process.argv.includes('--check-only');
  const isSend    = process.argv.includes('--send-only');

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
  const page  = pages.find(p => p.url().includes('openphone.com')) || pages[0];
  if (!page) { log('ERROR: No OpenPhone page found'); browser.disconnect(); process.exit(1); }

  if (isInspect) {
    await inspect(page);
    browser.disconnect();
    return;
  }

  const config  = loadConfig();
  const scripts = loadScripts();

  await waitForApp(page);

  if (!isSend)  await checkReplies(page, config, scripts);
  if (!isCheck) await sendOutbound(page, config, scripts);

  browser.disconnect();
  log('\n=== Done ===');
}

main().catch(err => { log(`FATAL: ${err.message}\n${err.stack}`); process.exit(1); });
