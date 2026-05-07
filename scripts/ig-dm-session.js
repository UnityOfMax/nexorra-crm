#!/usr/bin/env node
/**
 * Instagram DM Session — Full 4-message sequence (GIF + 3 texts)
 * Currently logged in as Account 5 (maxwellfawctt).
 * Cycle 1: Acct5 → 5 DMs, Acct4 → 5 DMs
 * Cycle 2: Acct5 → 5 DMs, Acct4 → 5 DMs
 * Total target: 20 DMs
 */

const puppeteer = require('puppeteer');
const https = require('https');
const http = require('http');
const fs = require('fs');

const CDP_PORT = 9225;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE env vars');
  process.exit(1);
}

// REMAINING LEADS (already sent: kristi.rose, joshua.moreno.cre, remaxofcherrycreek)
const LEADS = [
  // Account 4 (fawcettmaximilian) — Cycle 1 batch (5 DMs, not yet attempted)
  { id: 'd0bc6964-2eb6-4355-890b-3f1b83c49c65', handle: 'shatillacraig', first_name: 'Craig', brokerage: 'RE/MAX', lp_id: '02412ed2-a59f-4495-86e0-b4b7fc79716a' },
  { id: 'e3344582-7d07-4ebf-8d81-0870224b7256', handle: 'shruti_sells_homes', first_name: 'Shruti', brokerage: 'RE/MAX', lp_id: '52cd4324-eb5c-4b29-9526-62541844e1e0' },
  { id: '9bfbc416-6171-483e-9f9c-e21d09579d96', handle: 'brandon.bartholomew.realtor', first_name: 'Brandon', brokerage: 'RE/MAX', lp_id: '331d0ce9-0900-4b81-9d54-50867f1145eb' },
  { id: '1c53babc-2d20-4878-9eb1-f0a83ecf49eb', handle: 'amykershner_realtor', first_name: 'there', brokerage: 'RE/MAX', lp_id: 'b827e1ae-787d-4c1f-a9cb-53995a2f4aef' },
  { id: '84da2ec6-58c0-4cea-8127-6f45103525f3', handle: 'soldbyjuliewoods', first_name: 'there', brokerage: 'RE/MAX', lp_id: 'd44afce5-b775-4109-b269-d7e2075090e8' },
  // Account 5 (maxwellfawctt) — Cycle 2 batch (7 remaining quota: 2 retries + 5 new)
  { id: '181ab19e-1705-4e08-8675-68abe84041b9', handle: 'vivimiamibeachrealtor', first_name: 'Vivian', brokerage: 'RE/MAX', lp_id: '151fb185-c20b-411f-ab48-27fa4aa2eed6' },
  { id: '96f74dfc-f6b3-4f41-a03b-9f05ab301887', handle: 'chuckwestrum', first_name: 'Charles', brokerage: 'RE/MAX', lp_id: 'a6408b37-4773-4c9b-b82c-219a99b050c3' },
  { id: '23f1b0cf-872a-4942-8d62-34f6ef7c3321', handle: 'lynnstoferrealtor', first_name: 'there', brokerage: 'RE/MAX', lp_id: '38b79bf0-a1d2-4ade-ad26-e5a3db904d65' },
  { id: '37c6d28d-6880-4585-9d26-4d0afa5ce245', handle: 'marklipner', first_name: 'Mark', brokerage: 'Berkshire Hathaway', lp_id: '0ae65d3a-4a92-4192-833a-2c689e220c9e' },
  { id: '123ce18f-6c10-4f8e-a316-69ea98544281', handle: 'sheriwolfe31', first_name: 'Sheri', brokerage: 'Berkshire Hathaway', lp_id: '02a07965-32ad-4323-9c44-8ad9063d6d5a' },
  // Account 4 — Cycle 2 batch (5 DMs)
  { id: '79487542-baf4-4417-8f9a-4bbff9f2d7a2', handle: 'alliepollara79', first_name: 'Allison', brokerage: 'Berkshire Hathaway', lp_id: '92dbf6d7-eea6-4814-8ea4-c4efb1229658' },
  { id: '30430a09-3f05-46ca-b8f2-76c6bccaeae9', handle: 'Heningburg', first_name: 'Maria Morrison', brokerage: 'Berkshire Hathaway', lp_id: 'beb2e22e-5816-4414-a343-9de56923e9d3' },
  { id: '3599741c-ff8d-469b-8508-cd858a42bd6c', handle: 'brucedesonne', first_name: 'Bruce', brokerage: 'Berkshire Hathaway', lp_id: '1e382b53-5289-4a19-96a9-9dcf9dccff2d' },
  { id: 'e7c219d9-0dc5-4ba0-9cb0-879c224f84ee', handle: 'luistorresrealtor', first_name: 'Luis', brokerage: 'Berkshire Hathaway', lp_id: 'c390a551-678a-4e35-a965-f4393f2081d7' },
  { id: 'a77641f0-ec86-46d0-b3fc-52b51a087a6e', handle: 'garytorrettirealtor', first_name: 'Graziano', brokerage: 'Berkshire Hathaway', lp_id: '89ce8a0e-bed0-488c-be75-9aa996c25c22' },
];

const ACCOUNTS = {
  4: { username: 'fawcettmaximilian', password: 'gErt9q12z?-', display: 'Account 4' },
  5: { username: 'maxwellfawctt', password: 'BaJiWvS5ha:ygG3', display: 'Account 5' },
};

let totalSent = 0;
let totalSkipped = 0;
const accountsUsed = [];
const accountsBlocked = [];

function randomDelay(min, max) {
  return new Promise(r => setTimeout(r, Math.random() * (max - min) + min));
}

function log(msg) {
  const ts = new Date().toISOString();
  const line = `[${ts}] ${msg}`;
  console.log(line);
  fs.appendFileSync('/tmp/ig-dm-session.log', line + '\n');
}

async function supabasePatch(leadId, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const url = new URL(`${SUPABASE_URL}/rest/v1/leads?id=eq.${leadId}`);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const lib = url.protocol === 'https:' ? https : http;
    const req = lib.request(options, (res) => {
      let d = '';
      res.on('data', chunk => d += chunk);
      res.on('end', () => resolve({ status: res.statusCode }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function getCurrentUser(page) {
  try {
    await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle2', timeout: 20000 });
    await randomDelay(1500, 2500);
    const username = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('nav a[href], [role="navigation"] a[href], a[href]'));
      for (const l of links) {
        const href = l.href || '';
        const m = href.match(/instagram\.com\/([a-zA-Z0-9_.]+)\/?$/);
        if (m && m[1] && !['explore','reels','direct','stories','notifications','accounts','api','p','tv'].includes(m[1])) {
          return m[1];
        }
      }
      return null;
    });
    return username;
  } catch {
    return null;
  }
}

async function clearSession(page) {
  // Clear all instagram.com cookies to force logout
  try {
    const cookies = await page.cookies('https://www.instagram.com');
    for (const cookie of cookies) {
      await page.deleteCookie({ name: cookie.name, domain: cookie.domain });
    }
    // Also clear via cdp
    const client = await page.createCDPSession();
    await client.send('Network.clearBrowserCookies').catch(() => null);
    await client.send('Network.clearBrowserCache').catch(() => null);
    await client.detach().catch(() => null);
    log('  Session cleared (cookies wiped)');
  } catch (err) {
    log(`  Session clear error (non-fatal): ${err.message}`);
  }
}

async function dismissCookieConsent(page) {
  try {
    // Look for Allow/Accept buttons in cookie consent overlay
    const btns = await page.$$('button');
    for (const btn of btns) {
      const txt = await page.evaluate(el => el.textContent?.trim(), btn);
      if (txt && (txt.toLowerCase().includes('allow all') || txt.toLowerCase().includes('accept all') || txt.toLowerCase().includes('allow essential'))) {
        await btn.click();
        await randomDelay(1500, 2500);
        log('  Cookie consent dismissed');
        return true;
      }
    }
  } catch {}
  return false;
}

async function loginAccount(page, account) {
  log(`Logging in as ${account.username}...`);

  await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'networkidle2', timeout: 30000 });
  await randomDelay(2000, 3000);

  // Dismiss cookie consent if present
  await dismissCookieConsent(page);
  await randomDelay(500, 1000);

  const currentUrl = page.url();
  // If redirected away from login, already logged in
  if (!currentUrl.includes('/accounts/login')) {
    log(`  Already logged in (URL: ${currentUrl}) — checking account...`);
    const user = await getCurrentUser(page);
    if (user && user.toLowerCase() === account.username.toLowerCase()) {
      log(`  Already logged in as ${user} ✓`);
      return true;
    }
    log(`  Wrong account (${user}) — clearing session and retrying`);
    await clearSession(page);
    await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'networkidle2', timeout: 30000 });
    await randomDelay(2000, 3000);
    await dismissCookieConsent(page);
    await randomDelay(500, 1000);
  }

  // Instagram uses name="email" and name="pass" (not "username"/"password")
  const userInput = await page.$('input[name="email"]') || await page.$('input[autocomplete*="username"]') || await page.$('input[name="username"]');
  const passInput = await page.$('input[name="pass"]') || await page.$('input[name="password"]') || await page.$('input[type="password"]');
  if (!userInput || !passInput) {
    log(`  Login form not found — page: ${page.url()}`);
    return false;
  }

  await userInput.click({ clickCount: 3 });
  await randomDelay(200, 400);
  for (const char of account.username) {
    await page.keyboard.type(char, { delay: Math.random() * 80 + 40 });
  }
  await randomDelay(400, 700);
  await passInput.click();
  await randomDelay(200, 400);
  for (const char of account.password) {
    await page.keyboard.type(char, { delay: Math.random() * 80 + 40 });
  }
  await randomDelay(500, 1000);
  await page.keyboard.press('Enter');
  await randomDelay(5000, 7000);

  const postUrl = page.url();
  log(`  Post-login URL: ${postUrl}`);

  if (postUrl.includes('/challenge') || postUrl.includes('/two_factor') || postUrl.includes('/verify')) {
    log(`  BLOCKED: ${account.username} needs verification/2FA`);
    return false;
  }
  if (postUrl.includes('/accounts/login')) {
    log(`  BLOCKED: ${account.username} login failed`);
    return false;
  }

  log(`  Logged in as ${account.username} ✓`);
  return true;
}

async function switchToAccount(page, account, currentUser) {
  if (currentUser && currentUser.toLowerCase() === account.username.toLowerCase()) {
    log(`Already on ${account.username} ✓`);
    return true;
  }
  log(`Switching to ${account.username} (clearing session from ${currentUser || 'unknown'})...`);
  await clearSession(page);
  await randomDelay(1000, 2000);
  return await loginAccount(page, account);
}

async function checkProfileAccessible(page) {
  const bodyText = await page.evaluate(() => document.body?.innerText?.toLowerCase() || '');
  if (bodyText.includes("sorry, this page isn't available") || bodyText.includes("page not found")) {
    return { ok: false, reason: 'not_found' };
  }
  if (bodyText.includes('this account is private') || bodyText.includes('follow to see')) {
    return { ok: false, reason: 'private' };
  }
  return { ok: true };
}

async function openDmThread(page) {
  try {
    // Puppeteer 24 ::-p-text selector
    const msgBtn = await page.$('div[role="button"]::-p-text(Message)');
    if (msgBtn) {
      await msgBtn.click();
      await randomDelay(2500, 3500);
      return true;
    }
  } catch {}
  // Fallback: scan all buttons
  try {
    const btns = await page.$$('div[role="button"]');
    for (const btn of btns) {
      const txt = await page.evaluate(el => el.textContent?.trim(), btn);
      if (txt === 'Message') {
        await btn.click();
        await randomDelay(2500, 3500);
        return true;
      }
    }
  } catch {}
  log('    DM thread: Message button not found');
  return false;
}

async function sendGif(page) {
  try {
    const stickerIcon = await page.$("svg[aria-label*='Sticker']");
    if (!stickerIcon) { log('    GIF: sticker icon not found'); return false; }
    await stickerIcon.click();
    await randomDelay(1500, 2000);

    // GIF tab at approximate coords from prior sessions
    await page.mouse.click(557, 91);
    await randomDelay(1500, 2000);

    const searchInput = await page.$('input[placeholder="Search GIPHY"]');
    if (!searchInput) {
      log('    GIF: GIPHY search not found');
      await page.keyboard.press('Escape').catch(() => null);
      return false;
    }
    await searchInput.click();
    await randomDelay(300, 500);
    await page.keyboard.type('break the ice', { delay: 80 });
    await randomDelay(2000, 2500);

    // Find GIF button — right column, first row (x>560, y 140-240)
    const buttons = await page.$$('[role="button"]');
    for (const btn of buttons) {
      const rect = await btn.boundingBox();
      if (rect && rect.x > 560 && rect.y > 140 && rect.y < 250) {
        await btn.click();
        log('    GIF: sent via sticker picker ✓');
        await randomDelay(2000, 3000);
        return true;
      }
    }
    // Coordinate fallback
    await page.mouse.click(617, 180);
    log('    GIF: sent via coordinate fallback');
    await randomDelay(2000, 3000);
    return true;
  } catch (err) {
    log(`    GIF error: ${err.message}`);
    await page.keyboard.press('Escape').catch(() => null);
    return false;
  }
}

async function sendTextMessage(page, text) {
  try {
    let input = await page.$('[placeholder*="Message"]');
    if (!input) input = await page.$('div[role="textbox"][contenteditable="true"]');
    if (!input) { log(`    Text: input not found`); return false; }
    await input.click();
    await randomDelay(300, 500);
    for (const char of text) {
      await page.keyboard.type(char, { delay: Math.random() * 60 + 30 });
    }
    await randomDelay(400, 700);
    await page.keyboard.press('Enter');
    await randomDelay(1200, 2000);
    log(`    Sent: "${text.substring(0, 70)}${text.length > 70 ? '...' : ''}"`);
    return true;
  } catch (err) {
    log(`    Text send error: ${err.message}`);
    return false;
  }
}

async function sendDmToLead(page, lead, accountUsername) {
  const lpUrl = `https://app.nexorra.io/video/${lead.lp_id}`;
  const msg2 = `Hey ${lead.first_name}, I'm Max. I just wanted to break the ice. We've helped over 100 other realestate agents close on average 3 extra deals per month`;
  const msg3 = `I found you on ${lead.brokerage}'s website and I thought you'd be a great fit for this, I recorded a video for you explaining everything if you're interested:`;

  log(`\n  → @${lead.handle} (${lead.first_name}, ${lead.brokerage})`);

  // Navigate to profile
  await page.goto(`https://www.instagram.com/${lead.handle}/`, { waitUntil: 'networkidle2', timeout: 30000 });
  await randomDelay(2000, 3000);

  // Verify profile
  const access = await checkProfileAccessible(page);
  if (!access.ok) {
    log(`    SKIP: ${access.reason}`);
    await supabasePatch(lead.id, { instagram_status: access.reason }).catch(() => null);
    return { sent: false, reason: access.reason };
  }

  // Open DM thread
  if (!await openDmThread(page)) {
    return { sent: false, reason: 'no_dm_button' };
  }

  // Take screenshot to verify DM thread opened
  await page.screenshot({ path: `/tmp/ig-dm-thread-${lead.handle}.png` }).catch(() => null);

  // Msg 1: GIF
  const gifSent = await sendGif(page);
  await randomDelay(9000, 14000);

  // Msg 2
  if (!await sendTextMessage(page, msg2)) return { sent: false, reason: 'msg2_failed' };
  await randomDelay(10000, 15000);

  // Msg 3
  if (!await sendTextMessage(page, msg3)) return { sent: false, reason: 'msg3_failed' };
  await randomDelay(8000, 12000);

  // Msg 4: URL
  if (!await sendTextMessage(page, lpUrl)) return { sent: false, reason: 'msg4_failed' };

  // Update Supabase
  const now = new Date().toISOString();
  const r = await supabasePatch(lead.id, {
    instagram_dm_sent: true,
    instagram_dm_sent_at: now,
    instagram_status: 'dm_sent',
    instagram_dm_account: accountUsername,
  });
  log(`    ✓ DM complete (gif=${gifSent}) — Supabase: ${r.status}`);
  return { sent: true, gifSent };
}

async function runBatch(page, account, leads, cycleNum, currentUser) {
  log(`\n=== ${account.display} (${account.username}) — Cycle ${cycleNum} ===`);

  // Switch account if needed
  const ok = await switchToAccount(page, account, currentUser);
  if (!ok) {
    log(`  SKIP: ${account.display} login failed`);
    accountsBlocked.push(account.username);
    totalSkipped += leads.length;
    return null; // null = login failed, don't stop session
  }

  if (!accountsUsed.includes(account.username)) accountsUsed.push(account.username);
  let sentThisBatch = 0;

  for (const lead of leads) {
    if (sentThisBatch >= 5) break;
    const result = await sendDmToLead(page, lead, account.username);
    if (result.sent) {
      totalSent++;
      sentThisBatch++;
      if (sentThisBatch < 5) {
        const wait = Math.floor(Math.random() * 30 + 60);
        log(`  Waiting ${wait}s before next DM...`);
        await randomDelay(wait * 1000, (wait + 8) * 1000);
      }
    } else {
      totalSkipped++;
    }
  }

  log(`  Batch done: ${sentThisBatch} DMs sent`);
  return account.username; // return username as the "current logged in user"
}

async function main() {
  log('=== Instagram DM Session 2 (Continuation) ===');
  log(`Remaining leads: ${LEADS.length} | Account 4: 0 sent today, Account 5: 3 sent today`);
  log('Currently at Instagram login page (cookies cleared)');

  const browser = await puppeteer.connect({ browserURL: `http://localhost:${CDP_PORT}` });
  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();

  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    if (!window.chrome) window.chrome = { runtime: {} };
  });

  let currentUser = null; // Currently on login page, no session

  // ── BATCH 1: Account 4 — leads 0-4 (5 DMs) ───────────────────
  log('\n========== BATCH 1: Account 4 ==========');
  currentUser = await runBatch(page, ACCOUNTS[4], LEADS.slice(0, 5), 1, currentUser) || currentUser;

  // ── 15-MINUTE BREAK ──────────────────────────────────
  log(`\n========== 15-MINUTE BREAK | Sent so far: ${totalSent} ==========`);
  await randomDelay(900000, 910000);

  // ── BATCH 2: Account 5 — leads 5-9 (5 DMs) ─────────────────
  log('\n========== BATCH 2: Account 5 ==========');
  currentUser = await runBatch(page, ACCOUNTS[5], LEADS.slice(5, 10), 2, currentUser) || currentUser;

  // ── BATCH 3: Account 4 — leads 10-14 (5 DMs) ────────────────
  log('\n========== BATCH 3: Account 4 ==========');
  currentUser = await runBatch(page, ACCOUNTS[4], LEADS.slice(10, 15), 2, currentUser) || currentUser;

  await browser.disconnect();
  finalize();
}

function finalize() {
  log('\n========== SESSION COMPLETE ==========');
  log(`Total DMs sent:   ${totalSent}`);
  log(`Total skipped:    ${totalSkipped}`);
  log(`Accounts used:    ${accountsUsed.join(', ') || 'none'}`);
  log(`Accounts blocked: ${accountsBlocked.join(', ') || 'none'}`);

  fs.writeFileSync('/tmp/ig-dm-results.json', JSON.stringify({
    totalSent, totalSkipped, accountsUsed, accountsBlocked,
    timestamp: new Date().toISOString(),
  }, null, 2));
}

main().catch(err => {
  log(`FATAL: ${err.message}\n${err.stack}`);
  finalize();
  process.exit(1);
});
