/**
 * Instagram DM Session — 2-Cycle Rotation
 * Uses saved account picker in Chrome port 9225
 * Available accounts: maxwellfawctt + fawcettmaximilian
 * 5 DMs per account per cycle × 2 cycles = 20 DMs this session
 *
 * Login flow (confirmed working):
 * 1. Go to login page → account picker appears
 * 2. mouse.click on account name button (gets coordinates, real mouse event)
 * 3. Password modal appears → fill input[name=pass] → click input[type=submit]
 * 4. Lands on /accounts/onetap/ → handle Save info prompt
 *
 * DM flow (confirmed working):
 * 1. Navigate to profile URL
 * 2. Check for div[role=button] with text "Message" (can be at y > 250)
 * 3. Click Message → DM panel opens on right side
 * 4. Find [aria-placeholder*="Message"] contenteditable div
 * 5. el.click() → keyboard.type(msg, {delay}) → keyboard.press('Enter') × 3
 */

const puppeteer = require('/home/max/crm/node_modules/puppeteer');
const https = require('https');
const fs = require('fs');

// ── Config ────────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PORT = 9225;

const ACTIVE_ACCOUNTS = [
  { username: 'maxwellfawctt',     password: 'BaJiWvS5ha:ygG3', display_name: 'Account 5' },
  { username: 'fawcettmaximilian', password: 'gErt9q12z?-',      display_name: 'Account 4' },
];

const LEADS = JSON.parse(fs.readFileSync('/tmp/ig_matched_leads.json', 'utf8'));
const CYCLE_LIMIT = 5;
const CYCLES = 2;
const STATE_FILE = '/home/max/crm/agents/state/instagram-outreach-state.json';

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

async function supabasePatch(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const url = new URL(SUPABASE_URL + path);
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
        'Content-Length': Buffer.byteLength(data),
      }
    }, res => {
      let b = '';
      res.on('data', d => b += d);
      res.on('end', () => resolve({ status: res.statusCode }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// ── Login via account picker ──────────────────────────────────────────────────
// Confirmed flow:
//   1. Navigate to /accounts/login/
//   2. Picker shows saved accounts — use getBoundingClientRect + mouse.click
//   3. Password modal appears → fill pass input → click submit
//   4. Lands on /accounts/onetap/ on success

async function loginViaAccountPicker(page, account) {
  const { username, password } = account;
  console.log(`  Logging in as @${username}...`);

  // Navigate to login page
  await page.goto('https://www.instagram.com/accounts/login/?next=%2F', {
    waitUntil: 'domcontentloaded', timeout: 30000
  });
  await sleep(3000);

  let url = page.url();

  // If already logged in (not on login page), check if it's the right account
  if (!url.includes('/accounts/login/')) {
    // Check current user via profile nav link
    const currentUser = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="instagram.com/"]'));
      for (const l of links) {
        const m = l.href.match(/instagram\.com\/([a-zA-Z0-9_.]+)\/?$/);
        if (m && !['explore', 'direct', 'reels', 'stories'].includes(m[1])) return m[1];
      }
      return null;
    });
    if (currentUser && currentUser.toLowerCase() === username.toLowerCase()) {
      console.log(`  Already logged in as @${username}`);
      return true;
    }
    // Wrong account — logout
    await page.goto('https://www.instagram.com/accounts/logout/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await sleep(3000);
    await page.goto('https://www.instagram.com/accounts/login/?next=%2F', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(3000);
    url = page.url();
  }

  // Check if challenge/2FA is active
  if (url.includes('/challenge/') || url.includes('codeentry')) {
    console.log(`  Challenge detected at login — skipping @${username}`);
    return false;
  }

  // Use evaluateHandle to get element reference — position-independent, works after logout
  const pickerElHandle = await page.evaluateHandle((targetUser) => {
    const tablist = document.querySelector('div[role="tablist"]');
    if (!tablist) return null;
    const tabs = Array.from(tablist.querySelectorAll('div[role="button"]'));
    return tabs.find(t => t.textContent.trim().toLowerCase() === targetUser.toLowerCase()) || null;
  }, username);

  const pickerEl = pickerElHandle.asElement();

  if (pickerEl) {
    // Click via element handle (not coordinates — avoids position-shift issue after logout)
    console.log(`  Clicking account picker element for @${username}`);
    await pickerEl.click();
    await sleep(4000);

    // Password modal should appear — fill it
    const hasPassInput = await page.evaluate(() => !!document.querySelector('input[type="password"], input[name="pass"]'));
    if (hasPassInput) {
      console.log(`  Password modal appeared — filling...`);
      await page.evaluate((pwd) => {
        const inp = document.querySelector('input[type="password"]') || document.querySelector('input[name="pass"]');
        if (!inp) return;
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(inp, pwd);
        inp.dispatchEvent(new Event('input', { bubbles: true }));
      }, password);
      await sleep(600);

      // Click submit
      await page.evaluate(() => {
        const sub = document.querySelector('input[type="submit"]');
        if (sub) sub.click();
      });
      await sleep(6000);
    }
  } else {
    // Account not in picker — use "Use another profile" → manual login
    console.log(`  @${username} not in picker — using manual login`);
    const clickedUseAnother = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('div[role="button"], button'));
      const btn = buttons.find(b => b.textContent.trim() === 'Use another profile');
      if (btn) { btn.click(); return true; }
      return false;
    });
    if (clickedUseAnother) await sleep(2000);

    const hasForm = await page.evaluate(() => !!document.querySelector('input[name="email"]'));
    if (!hasForm) {
      console.log(`  Login form not found for @${username}`);
      return false;
    }

    await page.evaluate((u, p) => {
      const emailInp = document.querySelector('input[name="email"]') || document.querySelector('input[name="username"]');
      const passInp = document.querySelector('input[name="pass"]') || document.querySelector('input[type="password"]');
      if (!emailInp || !passInp) return;
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(emailInp, u);
      emailInp.dispatchEvent(new Event('input', { bubbles: true }));
      setter.call(passInp, p);
      passInp.dispatchEvent(new Event('input', { bubbles: true }));
    }, username, password);
    await sleep(600);

    await page.evaluate(() => {
      const sub = document.querySelector('input[type="submit"]');
      if (sub) sub.click();
      else {
        const btn = Array.from(document.querySelectorAll('div[role="button"], button')).find(b => b.textContent.trim() === 'Log in');
        if (btn) btn.click();
      }
    });
    await sleep(6000);
  }

  // Check result
  const finalUrl = page.url();
  console.log(`  Post-login URL: ${finalUrl}`);

  if (finalUrl.includes('/challenge/') || finalUrl.includes('codeentry') || finalUrl.includes('/two_factor/')) {
    console.log(`  Challenge/2FA for @${username} — skipping`);
    return false;
  }
  if (finalUrl.includes('/accounts/login/')) {
    console.log(`  Still on login page — wrong credentials?`);
    return false;
  }

  // Handle prompts
  for (const promptText of ['Save info', 'Not now']) {
    try {
      await page.evaluate((text) => {
        const btn = Array.from(document.querySelectorAll('div[role="button"], button')).find(b => b.textContent.trim() === text);
        if (btn) btn.click();
      }, promptText);
      await sleep(1500);
    } catch (_) {}
  }

  console.log(`  Login successful: @${username}`);
  return true;
}

// ── Navigate to profile ───────────────────────────────────────────────────────

async function navigateToProfile(page, handle) {
  try {
    await page.goto(`https://www.instagram.com/${handle}/`, {
      waitUntil: 'networkidle2', timeout: 30000
    });
    await sleep(4000);
  } catch (_) {
    await sleep(2000);
  }

  return page.evaluate(() => {
    const bodyText = document.body.innerText || '';
    if (bodyText.includes("Sorry, this page isn't available")) return 'not_found';

    // Look for Message button (can be at y > 250 on this Instagram layout)
    const allDivBtns = Array.from(document.querySelectorAll('div[role="button"]'));
    const msgBtn = allDivBtns.find(b => b.textContent.trim() === 'Message');

    // Detect private/follow-only by checking for Follow button without Message
    const followBtn = document.querySelector('button');
    const hasFollowOnly = followBtn && ['Follow', 'Following', 'Requested'].includes(followBtn.textContent.trim());

    if (msgBtn) return 'ok';
    if (hasFollowOnly) return 'private';
    return 'no_message_btn';
  });
}

// ── Send DM (3-message sequence) ─────────────────────────────────────────────

async function sendDM(page, lead) {
  const { instagram_handle: handle, first_name, source_brokerage, landing_page_url } = lead;
  const name = first_name || 'there';
  const brokerage = (source_brokerage || '').toLowerCase() === 'remax' ? 'RE/MAX' :
                    (source_brokerage || '').toLowerCase() === 'bhhs' ? 'Berkshire Hathaway' :
                    source_brokerage || 'your brokerage';

  console.log(`    Sending DM to @${handle} (${name}, ${brokerage})`);

  // Click Message button
  const clicked = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('div[role="button"]')).find(b => b.textContent.trim() === 'Message');
    if (btn) { btn.click(); return true; }
    return false;
  });
  if (!clicked) return 'no_message_btn';

  await sleep(4000);

  // Find DM input
  const dmSel = await page.evaluate(() => {
    const sels = ['[aria-placeholder*="Message"]', '[placeholder*="Message"]', 'div[contenteditable="true"]'];
    for (const s of sels) if (document.querySelector(s)) return s;
    return null;
  });

  if (!dmSel) {
    try { await page.screenshot({ path: `/tmp/ig_nodm_${handle}.png` }); } catch (_) {}
    return 'dm_input_not_found';
  }

  const messages = [
    `Hey ${name}, I'm Max. I just wanted to break the ice. We've helped over 100 other realestate agents close on average 3 extra deals per month`,
    `I found you on ${brokerage}'s website and I thought you'd be a great fit for this, I recorded a video for you explaining everything if you're interested:`,
    landing_page_url,
  ];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    try {
      const el = await page.$(dmSel);
      if (el) await el.click();
      await sleep(400);
      await page.keyboard.type(msg, { delay: rand(25, 65) });
      await sleep(rand(400, 900));
      await page.keyboard.press('Enter');
      console.log(`    Msg ${i + 1}/3 sent`);
      if (i < messages.length - 1) await sleep(rand(8000, 14000));
    } catch (err) {
      // Try fallback via execCommand
      try {
        await page.evaluate((s, t) => {
          const el = document.querySelector(s);
          if (el) { el.focus(); document.execCommand('insertText', false, t); }
        }, dmSel, msg);
        await sleep(400);
        await page.keyboard.press('Enter');
        if (i < messages.length - 1) await sleep(rand(8000, 12000));
      } catch (err2) {
        const currentUrl = page.url();
        if (currentUrl.includes('/challenge/') || currentUrl.includes('codeentry')) return 'blocked';
        console.log(`    Msg ${i + 1} failed: ${err2.message}`);
        return 'send_failed';
      }
    }
  }

  return 'sent';
}

// ── Logout ────────────────────────────────────────────────────────────────────

async function logout(page) {
  try {
    await page.goto('https://www.instagram.com/accounts/logout/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await sleep(2000);
    // Confirm if modal
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('div[role="button"], button')).find(b => /^log out$/i.test(b.textContent.trim()));
      if (btn) btn.click();
    });
    await sleep(2000);
  } catch (err) {
    console.log(`  Logout (non-fatal): ${err.message}`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const startTime = Date.now();
  console.log('=== Instagram DM Session ===');
  console.log(`Leads queued: ${LEADS.length}`);
  console.log(`Accounts: ${ACTIVE_ACCOUNTS.map(a => a.username).join(', ')}`);
  console.log(`Plan: ${CYCLES} cycles × ${ACTIVE_ACCOUNTS.length} accounts × ${CYCLE_LIMIT} DMs`);
  console.log('');

  const browser = await puppeteer.connect({
    browserURL: `http://localhost:${PORT}`,
    defaultViewport: null,
  });
  const allPages = await browser.pages();
  let page = allPages.find(p => p.url().includes('instagram.com')) || allPages[0] || await browser.newPage();

  const stats = { sent: 0, skipped: 0, blocked: [], accountsUsed: [], details: [] };
  let leadIndex = 0;

  for (let cycle = 1; cycle <= CYCLES; cycle++) {
    console.log(`\n${'━'.repeat(50)}`);
    console.log(`CYCLE ${cycle}/${CYCLES}`);
    console.log('━'.repeat(50));

    let consecutiveBlocks = 0;

    for (const account of ACTIVE_ACCOUNTS) {
      if (stats.blocked.includes(account.username)) {
        console.log(`  Skipping @${account.username} (blocked)`);
        continue;
      }
      if (consecutiveBlocks >= 2) {
        console.log('  STOPPING: 2 consecutive blocks');
        break;
      }

      console.log(`\n--- @${account.username} ---`);

      const loggedIn = await loginViaAccountPicker(page, account);
      if (!loggedIn) {
        stats.blocked.push(account.username);
        consecutiveBlocks++;
        continue;
      }
      if (!stats.accountsUsed.includes(account.username)) stats.accountsUsed.push(account.username);
      consecutiveBlocks = 0;

      // Brief browse on home feed (human behavior)
      try {
        await page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded', timeout: 20000 });
        await sleep(rand(2000, 4000));
      } catch (_) {}

      let sentCount = 0;
      let attempted = 0;

      while (sentCount < CYCLE_LIMIT && attempted < CYCLE_LIMIT + 6 && leadIndex < LEADS.length) {
        const lead = LEADS[leadIndex++];
        attempted++;

        console.log(`\n  [${leadIndex}/${LEADS.length}] @${lead.instagram_handle} (${lead.first_name})`);

        // Navigate to profile
        let profileStatus;
        try {
          profileStatus = await navigateToProfile(page, lead.instagram_handle);
        } catch (err) {
          profileStatus = 'error';
        }
        console.log(`  Profile: ${profileStatus}`);

        if (profileStatus === 'not_found') {
          await supabasePatch(`/rest/v1/leads?id=eq.${lead.id}`, { instagram_status: 'not_found' });
          stats.skipped++;
          continue;
        }
        if (profileStatus === 'private') {
          await supabasePatch(`/rest/v1/leads?id=eq.${lead.id}`, { instagram_status: 'private' });
          stats.skipped++;
          continue;
        }
        if (profileStatus === 'no_message_btn' || profileStatus === 'error') {
          await supabasePatch(`/rest/v1/leads?id=eq.${lead.id}`, { instagram_status: 'ignored' });
          stats.skipped++;
          continue;
        }

        // Send DM
        let dmResult;
        try {
          dmResult = await sendDM(page, lead);
        } catch (err) {
          console.log(`  DM exception: ${err.message}`);
          dmResult = 'error';
        }
        console.log(`  Result: ${dmResult}`);

        if (dmResult === 'sent') {
          sentCount++;
          stats.sent++;
          stats.details.push(`@${lead.instagram_handle}`);
          console.log(`  ✓ [${sentCount}/${CYCLE_LIMIT} | total: ${stats.sent}]`);

          await supabasePatch(`/rest/v1/leads?id=eq.${lead.id}`, {
            instagram_dm_sent: true,
            instagram_dm_sent_at: new Date().toISOString(),
            instagram_status: 'dm_sent',
            instagram_dm_account: account.username,
          });

          if (sentCount < CYCLE_LIMIT) {
            const delay = rand(60000, 90000);
            console.log(`  Waiting ${Math.round(delay / 1000)}s...`);
            await sleep(delay);
          }
        } else if (dmResult === 'blocked') {
          console.log(`  ACCOUNT BLOCKED: @${account.username}`);
          stats.blocked.push(account.username);
          consecutiveBlocks++;
          break;
        } else {
          if (dmResult !== 'no_message_btn' && dmResult !== 'dm_input_not_found') {
            await supabasePatch(`/rest/v1/leads?id=eq.${lead.id}`, { instagram_status: 'ignored' });
          }
          stats.skipped++;
        }
      }

      console.log(`\n  @${account.username} done: ${sentCount} DMs sent this cycle`);
      await logout(page);
      await sleep(3000);
    }

    if (cycle < CYCLES) {
      console.log(`\n${'━'.repeat(50)}`);
      console.log(`Cycle ${cycle} done — sent ${stats.sent} total. 15-min break starting...`);
      console.log('━'.repeat(50));
      await sleep(15 * 60 * 1000);
    }
  }

  // ── Final ──────────────────────────────────────────────────────────────────
  const elapsed = Math.round((Date.now() - startTime) / 60000);
  console.log(`\n${'━'.repeat(50)}`);
  console.log('SESSION COMPLETE');
  console.log(`  Sent: ${stats.sent}`);
  console.log(`  Skipped: ${stats.skipped}`);
  console.log(`  Blocked: ${stats.blocked.join(', ') || 'none'}`);
  console.log(`  Accounts used: ${stats.accountsUsed.join(', ')}`);
  console.log(`  Duration: ~${elapsed} min`);
  if (stats.details.length) console.log(`  DM'd: ${stats.details.join(', ')}`);

  const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  fs.writeFileSync(STATE_FILE, JSON.stringify({
    version: 3,
    last_run: new Date().toISOString(),
    total_dms_sent_lifetime: (state.total_dms_sent_lifetime || 221) + stats.sent,
    session_target: CYCLES * ACTIVE_ACCOUNTS.length * CYCLE_LIMIT,
    daily_limit_per_account: 10,
    cycle_limit_per_account: CYCLE_LIMIT,
    cycles_per_day: CYCLES,
    last_session_sent: stats.sent,
    last_session_skipped: stats.skipped,
    accounts_used: stats.accountsUsed,
    accounts_blocked: stats.blocked,
  }, null, 2));

  console.log(`\nInstagram DM Outreach: Sent ${stats.sent} DMs across ${stats.accountsUsed.length} accounts (${CYCLES} cycles). Skipped: ${stats.skipped}. Blocked: ${stats.blocked.length}.`);
  browser.disconnect();
}

main().catch(err => {
  console.error('Fatal:', err.message, err.stack);
  process.exit(1);
});
