#!/usr/bin/env node
/**
 * Realtor.com calling lead scraper.
 * Scrapes agent names + mobile phones from realtor.com agent search pages.
 * Uses the real Chrome browser (port 9222) with Max's full profile — no bot detection.
 *
 * Usage: node scripts/calling/realtor-leads.js
 * Env:   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TELEGRAM_BOT_TOKEN
 */

'use strict';

const puppeteer = require('puppeteer');
const https = require('https');
const fs = require('fs');
const { spawnSync } = require('child_process');

const TARGET = 1000;
const MIN_DEALS = parseInt(process.env.MIN_DEALS || '0');
const TZ_TARGET = 250;

const COMPANY_INDICATORS = [
  'group', 'team', 'realty', 'real estate', 'properties', 'property',
  'llc', 'inc', 'corp', 'associates', ' & ', 'co.', 'homes', 'brokers',
  'brokerage', 'investments', 'solutions', 'advisors', 'partners',
];
function isSoloAgent(name) {
  if (!name || name.trim().length < 3) return false;
  const lower = name.toLowerCase();
  if (COMPANY_INDICATORS.some(ind => lower.includes(ind))) return false;
  const words = name.trim().split(/\s+/);
  if (words.length < 2 || words.length > 4) return false;
  return true;
}
const PAGE_DELAY = 4000;      // ms between listing pages
const PROFILE_DELAY = 2500;   // ms between profile visits
const WARMUP_DONE_FILE = '/tmp/realtor-warmup-done';
const CITY_PAGE_STATE = '/home/max/crm/agents/state/realtor-city-pages.json';
const LOG_FILE = '/home/max/crm/logs/realtor-leads.log';

// MST cities (~250 leads)
// PST cities (~250 leads)
const TZ_CITIES = {
  EST: [
    { name: 'New York',         state: 'NY', slug: 'new-york_ny' },
    { name: 'Miami',            state: 'FL', slug: 'miami_fl' },
    { name: 'Atlanta',          state: 'GA', slug: 'atlanta_ga' },
    { name: 'Charlotte',        state: 'NC', slug: 'charlotte_nc' },
    { name: 'Philadelphia',     state: 'PA', slug: 'philadelphia_pa' },
    { name: 'Boston',           state: 'MA', slug: 'boston_ma' },
    { name: 'Orlando',          state: 'FL', slug: 'orlando_fl' },
    { name: 'Tampa',            state: 'FL', slug: 'tampa_fl' },
  ],
  CST: [
    { name: 'Houston',          state: 'TX', slug: 'houston_tx' },
    { name: 'Dallas',           state: 'TX', slug: 'dallas_tx' },
    { name: 'Chicago',          state: 'IL', slug: 'chicago_il' },
    { name: 'San Antonio',      state: 'TX', slug: 'san-antonio_tx' },
    { name: 'Austin',           state: 'TX', slug: 'austin_tx' },
    { name: 'Minneapolis',      state: 'MN', slug: 'minneapolis_mn' },
    { name: 'Nashville',        state: 'TN', slug: 'nashville_tn' },
    { name: 'Kansas City',      state: 'MO', slug: 'kansas-city_mo' },
  ],
  MST: [
    { name: 'Phoenix',          state: 'AZ', slug: 'phoenix_az' },
    { name: 'Denver',           state: 'CO', slug: 'denver_co' },
    { name: 'Tucson',           state: 'AZ', slug: 'tucson_az' },
    { name: 'Colorado Springs', state: 'CO', slug: 'colorado-springs_co' },
    { name: 'Albuquerque',      state: 'NM', slug: 'albuquerque_nm' },
    { name: 'Salt Lake City',   state: 'UT', slug: 'salt-lake-city_ut' },
    { name: 'Mesa',             state: 'AZ', slug: 'mesa_az' },
    { name: 'Aurora',           state: 'CO', slug: 'aurora_co' },
  ],
  PST: [
    { name: 'Los Angeles',      state: 'CA', slug: 'los-angeles_ca' },
    { name: 'San Diego',        state: 'CA', slug: 'san-diego_ca' },
    { name: 'San Francisco',    state: 'CA', slug: 'san-francisco_ca' },
    { name: 'Seattle',          state: 'WA', slug: 'seattle_wa' },
    { name: 'Portland',         state: 'OR', slug: 'portland_or' },
    { name: 'Sacramento',       state: 'CA', slug: 'sacramento_ca' },
    { name: 'Las Vegas',        state: 'NV', slug: 'las-vegas_nv' },
    { name: 'San Jose',         state: 'CA', slug: 'san-jose_ca' },
  ],
};

const COUNTRY_BY_STATE = {
  AZ: 'US', CO: 'US', NM: 'US', UT: 'US',
  CA: 'US', WA: 'US', OR: 'US', NV: 'US',
  NY: 'US', FL: 'US', GA: 'US', NC: 'US', PA: 'US', MA: 'US',
  TX: 'US', IL: 'US', MN: 'US', TN: 'US', MO: 'US',
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ── Logging ──────────────────────────────────────────────────────────────────

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function formatPhone(p) {
  if (!p) return null;
  const d = p.replace(/\D/g, '');
  if (d.length === 10) return '+1' + d;
  if (d.length === 11 && d[0] === '1') return '+' + d;
  return null;
}

function jitter(base) {
  return base + Math.floor(Math.random() * 1000);
}

// ── City page state ───────────────────────────────────────────────────────────

function loadCityPageState() {
  try { return JSON.parse(fs.readFileSync(CITY_PAGE_STATE, 'utf8')); } catch { return {}; }
}

function saveCityPage(state, slug, pageNum) {
  state[slug] = pageNum;
  try { fs.writeFileSync(CITY_PAGE_STATE, JSON.stringify(state, null, 2)); } catch {}
}

// ── Telegram ──────────────────────────────────────────────────────────────────

async function sendTelegramAlert(message, screenshotPath) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return;
  const chatId = '5880638817';
  if (screenshotPath && fs.existsSync(screenshotPath)) {
    spawnSync('bash', ['-c',
      `curl -s -X POST "https://api.telegram.org/bot${botToken}/sendPhoto" ` +
      `-F chat_id="${chatId}" -F photo=@"${screenshotPath}" -F caption="${message.replace(/"/g, "'")}"`,
    ], { timeout: 20000 });
    log(`[Telegram] Screenshot sent`);
  } else {
    spawnSync('bash', ['-c',
      `curl -s -X POST "https://api.telegram.org/bot${botToken}/sendMessage" ` +
      `-H "Content-Type: application/json" ` +
      `-d '{"chat_id":"${chatId}","text":${JSON.stringify(message)}}'`,
    ], { timeout: 10000 });
    log(`[Telegram] Alert sent`);
  }
}

// ── Supabase ──────────────────────────────────────────────────────────────────

async function countTodayLeads() {
  return new Promise((resolve) => {
    const today = new Date().toISOString().split('T')[0];
    const u = new URL(`${SUPABASE_URL}/rest/v1/leads?select=timezone&lead_category=eq.calling&source_brokerage=eq.realtor.com&scraped_at=gte.${today}T00:00:00Z`);
    const req = https.request({
      hostname: u.hostname, path: u.pathname + u.search, method: 'GET',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Prefer': 'count=exact' },
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try {
          const arr = JSON.parse(data);
          const tzCounts = { EST: 0, CST: 0, MST: 0, PST: 0 };
          arr.forEach(r => { if (tzCounts[r.timezone] !== undefined) tzCounts[r.timezone]++; });
          resolve({ total: arr.length, tzCounts });
        } catch { resolve({ total: 0, tzCounts: { EST: 0, CST: 0, MST: 0, PST: 0 } }); }
      });
    });
    req.on('error', () => resolve({ total: 0, tzCounts: { EST: 0, CST: 0, MST: 0, PST: 0 } }));
    req.end();
  });
}

async function saveLead(lead) {
  const parts = (lead.full_name || '').split(' ');
  const payload = {
    full_name: lead.full_name,
    first_name: parts[0] || '',
    last_name: parts.slice(1).join(' ') || '',
    email: lead.email || null,
    phone: lead.phone,
    profile_url: lead.profile_url,
    source_brokerage: 'realtor.com',
    country: lead.country,
    state_province: lead.state,
    city: lead.city,
    timezone: lead.timezone,
    lead_category: 'calling',
  };
  return new Promise((resolve) => {
    const body = JSON.stringify(payload);
    const u = new URL(`${SUPABASE_URL}/rest/v1/leads`);
    const req = https.request({
      hostname: u.hostname, path: u.pathname, method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json', 'Prefer': 'return=minimal',
      },
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve({ ok: res.statusCode < 300, status: res.statusCode, err: data.slice(0, 200) }));
    });
    req.on('error', e => resolve({ ok: false, status: 0, err: e.message }));
    req.write(body);
    req.end();
  });
}

// ── Page scraping ─────────────────────────────────────────────────────────────

async function checkBlocked(page) {
  const title = (await page.title().catch(() => '')).toLowerCase();
  const url = page.url().toLowerCase();
  const blocked =
    title.includes('access denied') ||
    title.includes('blocked') ||
    title.includes('forbidden') ||
    title.includes('captcha') ||
    title.includes('security check') ||
    url.includes('captcha') ||
    url.includes('blocked');
  if (blocked) {
    const shot = `/tmp/realtor-blocked-${Date.now()}.png`;
    await page.screenshot({ path: shot }).catch(() => {});
    log(`  [BLOCKED] title="${title}" url=${url.slice(0,80)}`);
    await sendTelegramAlert(`⚠️ Jeff blocked on realtor.com: "${title}"\n${url.slice(0, 100)}`, shot);
  }
  return blocked;
}

// Extract agent cards from a listing page: [{profileUrl, name, deals}]
async function getAgentsFromListingPage(page) {
  return page.evaluate((MIN_DEALS) => {
    const links = Array.from(document.querySelectorAll('a[href*="/realestateagents/"]'))
      .filter(a => /\/realestateagents\/[a-f0-9]{24}$/.test(a.href));

    const seen = new Set();
    const unique = links.filter(a => { if (seen.has(a.href)) return false; seen.add(a.href); return true; });

    return unique.map(link => {
      let card = link;
      for (let i = 0; i < 4; i++) card = card.parentElement || card;
      const text = (card.innerText || '').trim();
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      const name = lines[0] || '';
      const dealsM = text.match(/(\d+)\s+(?:recent\s+)?sales in last 12 months/);
      const deals = dealsM ? parseInt(dealsM[1]) : 0;
      return { profileUrl: link.href, name, deals };
    }).filter(a => a.name && a.deals >= MIN_DEALS && isSoloAgent(a.name));
  }, MIN_DEALS);
}

// Extract mobile phone (preferred) from an agent profile page
async function getMobilePhone(page) {
  return page.evaluate(() => {
    const telLinks = Array.from(document.querySelectorAll('a[href^="tel:"]'));
    if (!telLinks.length) return null;

    // Prefer a link whose parent text includes "mobile"
    const mobileLink = telLinks.find(a => {
      const ctx = (a.parentElement?.innerText || '') + (a.parentElement?.parentElement?.innerText || '');
      return ctx.toLowerCase().includes('mobile');
    });

    const chosen = mobileLink || telLinks[0];
    return chosen.href.replace('tel:', '').trim();
  });
}

// Get email from profile if visible
async function getEmail(page) {
  return page.evaluate(() => {
    const text = document.body.innerText;
    const m = text.match(/[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
    const filtered = (m || []).filter(e =>
      !e.includes('realtor.com') && !e.includes('example') &&
      !e.includes('@sentry') && !e.includes('@noreply')
    );
    return filtered[0] || null;
  });
}

// ── Warm-up ───────────────────────────────────────────────────────────────────

async function warmUp(page) {
  if (fs.existsSync(WARMUP_DONE_FILE)) {
    log('[Warm-up] Already done this session — skipping');
    return;
  }
  log('[Warm-up] Navigating to realtor.com homepage to establish session...');
  await page.goto('https://www.realtor.com/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await sleep(jitter(3000));
  // Light interaction — move to agents section
  await page.goto('https://www.realtor.com/realestateagents/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await sleep(jitter(2000));
  fs.writeFileSync(WARMUP_DONE_FILE, Date.now().toString());
  log('[Warm-up] Done');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) { log('ERROR: Missing SUPABASE env vars'); process.exit(1); }

  const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();

  await warmUp(page);

  const { total: alreadySaved, tzCounts } = await countTodayLeads();
  log(`\n=== Realtor.com Calling Lead Scraper — target: ${TARGET} ===`);
  log(`Already saved today: ${alreadySaved} (EST:${tzCounts.EST} CST:${tzCounts.CST} MST:${tzCounts.MST} PST:${tzCounts.PST})`);

  const cityPageState = loadCityPageState();
  log(`City page state loaded (${Object.keys(cityPageState).length} cities tracked)`);

  let saved = alreadySaved;
  const tzSaved = { ...tzCounts };

  let skipped = 0, errors = 0;

  outer: for (const [tz, cities] of Object.entries(TZ_CITIES)) {
    log(`\n====== ${tz} — target: ${TZ_TARGET} (have: ${tzSaved[tz]}) ======`);
    if (tzSaved[tz] >= TZ_TARGET) { log(`  Already at target — skipping`); continue; }

    for (const { name: cityName, state, slug } of cities) {
      if (tzSaved[tz] >= TZ_TARGET) break;

      const timezone = tz;
      const country = COUNTRY_BY_STATE[state] || 'US';
      const resumePage = Math.max(1, (cityPageState[slug] || 0) + 1);
      log(`\n=== ${cityName}, ${state} (resuming from page ${resumePage}) ===`);

      let dryStreak = 0;
      let failStreak = 0;

      for (let pageNum = resumePage; pageNum <= 200; pageNum++) {
        if (saved >= TARGET) break outer;
        if (tzSaved[tz] >= TZ_TARGET) break;

        const url = `https://www.realtor.com/realestateagents/${slug}/pg-${pageNum}`;
        log(`\n[${cityName} p${pageNum}]`);

        try {
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
        } catch {
          log(`  [goto] Timeout`);
          failStreak++;
          if (failStreak >= 3) { log('  3 failures — moving to next city'); break; }
          await sleep(8000);
          continue;
        }

        await sleep(jitter(1500));

        if (await checkBlocked(page)) {
          log('  Blocked — waiting 30s then retrying once');
          await sleep(30000);
          try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 }); } catch {}
          await sleep(2000);
          if (await checkBlocked(page)) { log('  Still blocked — moving to next city'); break; }
        }

        failStreak = 0;

        const bodyText = await page.evaluate(() => document.body.innerText).catch(() => '');
        if (bodyText.includes('No agents found') || bodyText.includes("doesn't match") || bodyText.trim().length < 200) {
          log('  End of results');
          break;
        }

        const agents = await getAgentsFromListingPage(page).catch(() => []);
        log(`  ${agents.length} qualifying solo agents (${MIN_DEALS}+ deals)`);

        if (agents.length === 0) {
          dryStreak++;
          if (dryStreak >= 3) { log(`  Dry streak — end of city results`); break; }
          saveCityPage(cityPageState, slug, pageNum);
          await sleep(PAGE_DELAY);
          continue;
        }

        let pageNewSaves = 0, pageDupes = 0;

        for (const agent of agents) {
          if (saved >= TARGET) break outer;
          if (tzSaved[tz] >= TZ_TARGET) break;

          log(`  → ${agent.name} | ${agent.deals} deals`);

          try {
            await page.goto(agent.profileUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
          } catch {
            log('    Profile timeout — skipping');
            skipped++;
            await sleep(2000);
            continue;
          }

          await sleep(jitter(PROFILE_DELAY));

          if (await checkBlocked(page)) { log('    Profile blocked — skipping'); skipped++; continue; }

          const rawPhone = await getMobilePhone(page).catch(() => null);
          const phone = formatPhone(rawPhone);

          if (!phone) {
            log('    No phone');
            skipped++;
            // Navigate back to listing page for next agent
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
            await sleep(jitter(1500));
            continue;
          }

          const email = await getEmail(page).catch(() => null);
          log(`    ${agent.name} | Phone: ${phone} | Email: ${email || 'none'}`);

          const result = await saveLead({
            full_name: agent.name, phone, email,
            profile_url: agent.profileUrl,
            city: cityName, state, timezone, country,
          });

          if (result.ok) {
            saved++;
            pageNewSaves++;
            tzSaved[tz]++;
            log(`    ✓ Saved (${saved}/${TARGET}) [${tz}: ${tzSaved[tz]}/${TZ_TARGET}]`);
          } else if (result.status === 409) {
            log('    Duplicate');
            pageDupes++;
            skipped++;
          } else {
            log(`    ✗ Error ${result.status}: ${result.err}`);
            errors++;
          }

          // Navigate back to listing page for next agent
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
          await sleep(jitter(1500));
        }

        saveCityPage(cityPageState, slug, pageNum);

        if (pageNewSaves > 0) {
          dryStreak = 0;
          if (pageDupes > 0) log(`  Page ${pageNum}: ${pageDupes} dupes, ${pageNewSaves} new`);
        } else if (agents.length === 0) {
          dryStreak++;
          if (dryStreak >= 3) { log(`  Dry streak — end of city results`); break; }
        } else {
          // All qualifying agents on this page were dupes — Zillow-style pagination cap
          dryStreak++;
          log(`  Page ${pageNum}: ${pageDupes} dupes, 0 new (streak ${dryStreak})`);
          if (dryStreak >= 5) { log(`  Pagination cap — moving to next city`); break; }
        }

        await sleep(jitter(PAGE_DELAY));
      }
    }
  }

  log(`\n=== Done: ${saved} leads saved (${skipped} skipped, ${errors} errors) ===`);
  await browser.disconnect();
}

main().catch(e => { log(`FATAL: ${e.message}`); process.exit(1); });
