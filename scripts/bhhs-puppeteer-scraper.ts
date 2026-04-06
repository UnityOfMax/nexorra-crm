#!/usr/bin/env npx tsx

import puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// State file — tracks last scraped page per city so restarts pick up where they left off
const STATE_FILE = path.resolve(__dirname, '../agents/state/scrape-progress.json');

function readState(): Record<string, any> {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
  } catch (_e) {
    return {};
  }
}

function saveState(state: Record<string, any>): void {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// 250+ cities — top cities across all US states, sorted by agent density
// The scraper resumes mid-city on restart — no city is ever "exhausted" unless
// getLastPage() returns a page where the API returned 0 results.
const CITIES = [
  { city: 'New York',       state: 'NY', tz: 'EST' },
  { city: 'Los Angeles',    state: 'CA', tz: 'PST' },
  { city: 'Chicago',        state: 'IL', tz: 'CST' },
  { city: 'Houston',        state: 'TX', tz: 'CST' },
  { city: 'Phoenix',        state: 'AZ', tz: 'MST' },
  { city: 'Philadelphia',   state: 'PA', tz: 'EST' },
  { city: 'San Antonio',    state: 'TX', tz: 'CST' },
  { city: 'San Diego',      state: 'CA', tz: 'PST' },
  { city: 'Dallas',         state: 'TX', tz: 'CST' },
  { city: 'San Jose',       state: 'CA', tz: 'PST' },
  { city: 'Austin',         state: 'TX', tz: 'CST' },
  { city: 'Jacksonville',   state: 'FL', tz: 'EST' },
  { city: 'Fort Worth',     state: 'TX', tz: 'CST' },
  { city: 'Columbus',       state: 'OH', tz: 'EST' },
  { city: 'Charlotte',      state: 'NC', tz: 'EST' },
  { city: 'Indianapolis',   state: 'IN', tz: 'EST' },
  { city: 'San Francisco',  state: 'CA', tz: 'PST' },
  { city: 'Seattle',        state: 'WA', tz: 'PST' },
  { city: 'Denver',         state: 'CO', tz: 'MST' },
  { city: 'Nashville',      state: 'TN', tz: 'CST' },
  { city: 'Oklahoma City',  state: 'OK', tz: 'CST' },
  { city: 'El Paso',        state: 'TX', tz: 'MST' },
  { city: 'Washington',     state: 'DC', tz: 'EST' },
  { city: 'Las Vegas',      state: 'NV', tz: 'MST' },
  { city: 'Louisville',     state: 'KY', tz: 'EST' },
  { city: 'Baltimore',      state: 'MD', tz: 'EST' },
  { city: 'Milwaukee',      state: 'WI', tz: 'CST' },
  { city: 'Albuquerque',    state: 'NM', tz: 'MST' },
  { city: 'Tucson',         state: 'AZ', tz: 'MST' },
  { city: 'Fresno',         state: 'CA', tz: 'PST' },
  { city: 'Sacramento',     state: 'CA', tz: 'PST' },
  { city: 'Mesa',           state: 'AZ', tz: 'MST' },
  { city: 'Kansas City',    state: 'MO', tz: 'CST' },
  { city: 'Atlanta',        state: 'GA', tz: 'EST' },
  { city: 'Omaha',          state: 'NE', tz: 'CST' },
  { city: 'Colorado Springs', state: 'CO', tz: 'MST' },
  { city: 'Raleigh',        state: 'NC', tz: 'EST' },
  { city: 'Long Beach',     state: 'CA', tz: 'PST' },
  { city: 'Virginia Beach', state: 'VA', tz: 'EST' },
  { city: 'Miami',          state: 'FL', tz: 'EST' },
  { city: 'Oakland',        state: 'CA', tz: 'PST' },
  { city: 'Minneapolis',    state: 'MN', tz: 'CST' },
  { city: 'Tampa',          state: 'FL', tz: 'EST' },
  { city: 'Tulsa',          state: 'OK', tz: 'CST' },
  { city: 'Arlington',      state: 'TX', tz: 'CST' },
  { city: 'New Orleans',    state: 'LA', tz: 'CST' },
  { city: 'Wichita',        state: 'KS', tz: 'CST' },
  { city: 'Bakersfield',    state: 'CA', tz: 'PST' },
  { city: 'Aurora',         state: 'CO', tz: 'MST' },
  { city: 'Cleveland',      state: 'OH', tz: 'EST' },
  { city: 'Anaheim',        state: 'CA', tz: 'PST' },
  { city: 'Henderson',      state: 'NV', tz: 'MST' },
  { city: 'Honolulu',       state: 'HI', tz: 'HST' },
  { city: 'Riverside',      state: 'CA', tz: 'PST' },
  { city: 'Santa Ana',      state: 'CA', tz: 'PST' },
  { city: 'Corpus Christi', state: 'TX', tz: 'CST' },
  { city: 'Lexington',      state: 'KY', tz: 'EST' },
  { city: 'Pittsburgh',     state: 'PA', tz: 'EST' },
  { city: 'Stockton',       state: 'CA', tz: 'PST' },
  { city: 'Anchorage',      state: 'AK', tz: 'AKST' },
  { city: 'Cincinnati',     state: 'OH', tz: 'EST' },
  { city: 'St Paul',        state: 'MN', tz: 'CST' },
  { city: 'Greensboro',     state: 'NC', tz: 'EST' },
  { city: 'Lincoln',        state: 'NE', tz: 'CST' },
  { city: 'Plano',          state: 'TX', tz: 'CST' },
  { city: 'Jersey City',    state: 'NJ', tz: 'EST' },
  { city: 'St Louis',       state: 'MO', tz: 'CST' },
  { city: 'Fort Wayne',     state: 'IN', tz: 'EST' },
  { city: 'Madison',        state: 'WI', tz: 'CST' },
  { city: 'Chandler',       state: 'AZ', tz: 'MST' },
  { city: 'Scottsdale',     state: 'AZ', tz: 'MST' },
  { city: 'Lubbock',        state: 'TX', tz: 'CST' },
  { city: 'Baton Rouge',    state: 'LA', tz: 'CST' },
  { city: 'Norfolk',        state: 'VA', tz: 'EST' },
  { city: 'Laredo',         state: 'TX', tz: 'CST' },
  { city: 'Durham',         state: 'NC', tz: 'EST' },
  { city: 'Buffalo',        state: 'NY', tz: 'EST' },
  { city: 'Madison',        state: 'WI', tz: 'CST' },
  { city: 'Gilbert',        state: 'AZ', tz: 'MST' },
  { city: 'Reno',           state: 'NV', tz: 'PST' },
  { city: 'Birmingham',     state: 'AL', tz: 'CST' },
  { city: 'Rochester',      state: 'NY', tz: 'EST' },
  { city: 'Salt Lake City', state: 'UT', tz: 'MST' },
  { city: 'Glendale',       state: 'AZ', tz: 'MST' },
  { city: 'Des Moines',     state: 'IA', tz: 'CST' },
  { city: 'Boise',          state: 'ID', tz: 'MST' },
  { city: 'Spokane',        state: 'WA', tz: 'PST' },
  { city: 'Tacoma',         state: 'WA', tz: 'PST' },
  { city: 'Fremont',        state: 'CA', tz: 'PST' },
  { city: 'Fayetteville',   state: 'NC', tz: 'EST' },
  { city: 'Richmond',       state: 'VA', tz: 'EST' },
  { city: 'Shreveport',     state: 'LA', tz: 'CST' },
  { city: 'Huntsville',     state: 'AL', tz: 'CST' },
  { city: 'Mobile',         state: 'AL', tz: 'CST' },
  { city: 'Knoxville',      state: 'TN', tz: 'EST' },
  { city: 'Chattanooga',    state: 'TN', tz: 'EST' },
  { city: 'Memphis',        state: 'TN', tz: 'CST' },
  { city: 'Cape Coral',     state: 'FL', tz: 'EST' },
  { city: 'Fort Lauderdale', state: 'FL', tz: 'EST' },
  { city: 'Orlando',        state: 'FL', tz: 'EST' },
  { city: 'St Petersburg',  state: 'FL', tz: 'EST' },
  { city: 'Hialeah',        state: 'FL', tz: 'EST' },
  { city: 'Portland',       state: 'OR', tz: 'PST' },
  { city: 'Eugene',         state: 'OR', tz: 'PST' },
  { city: 'Salem',          state: 'OR', tz: 'PST' },
  { city: 'Provo',          state: 'UT', tz: 'MST' },
  { city: 'Ogden',          state: 'UT', tz: 'MST' },
];

const SKIP_PATTERNS = /LLC|Inc|Inc\.|Corp|Ltd|Ltd\.|Group|Team|Realty|Properties|Homes|Agency|Brokerage|We Buy|Real Estate/i;

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function humanPause(min: number, max: number): Promise<void> {
  const base = rand(min, max);
  const extra = Math.random() < 0.15 ? rand(3000, 8000) : 0;
  return new Promise(r => setTimeout(r, base + extra));
}

let totalInserted = 0;

function normalizeTitle(name: string): string {
  if (!name) return '';
  return name.split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function isValidName(fullName: string): boolean {
  if (!fullName || fullName.length < 3) return false;
  if (SKIP_PATTERNS.test(fullName)) return false;
  if (fullName.match(/\d/)) return false;
  const words = fullName.trim().split(/\s+/);
  if (words.length > 4 || words.length < 2) return false;
  return true;
}

async function insertLead(agent: any, city: string, state: string, tz: string): Promise<string> {
  const email = agent.MemberEmail;
  const fullName = agent.MemberFullName;
  const instagramRaw = agent.SocialMediaInstagramUrlOrId || null;

  if (!isValidName(fullName)) return 'skip';
  // Must have email OR instagram to be worth saving
  if (!email && !instagramRaw) return 'skip';

  // Extract handle from URL if needed (e.g. "https://www.instagram.com/handle/")
  let instagram_handle: string | null = null;
  if (instagramRaw) {
    const match = instagramRaw.match(/instagram\.com\/([^/?#]+)/i);
    instagram_handle = match ? match[1].replace(/\/$/, '') : instagramRaw.replace(/^@/, '');
  }

  // Categorize: instagram takes priority over email
  const lead_category = instagram_handle ? 'instagram' : 'email';

  // Email-only leads — skip if email missing
  if (lead_category === 'email' && !email) return 'skip';

  const payload = {
    full_name: normalizeTitle(fullName),
    first_name: normalizeTitle(agent.MemberFirstName || ''),
    last_name: normalizeTitle(agent.MemberLastName || ''),
    email: email || null,
    phone: agent.MemberMobilePhone || null,
    profile_url: agent.MemberUrl || null,
    profile_picture_url: agent.Photo || null,
    source_brokerage: 'bhhs',
    lead_category,
    country: 'US',
    state_province: state,
    city,
    timezone: tz,
    instagram_handle,
  };

  try {
    const cmd = `curl -s -w "%{http_code}" -o /dev/null -X POST "${SUPABASE_URL}/rest/v1/leads" \
      -H "apikey: ${SUPABASE_KEY}" \
      -H "Authorization: Bearer ${SUPABASE_KEY}" \
      -H "Content-Type: application/json" \
      -H "Prefer: return=minimal" \
      -d '${JSON.stringify(payload)}'`;

    const { execSync } = require('child_process');
    const response = execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();

    if (response === '201') { totalInserted++; return '201'; }
    if (response === '409') return '409';
    return response;
  } catch (_e) {
    return 'error';
  }
}

async function scrapeCityBHHS(page: any, city: string, state: string, tz: string): Promise<number> {
  const cityKey = `${city}_${state}`;
  const scrapeState = readState();
  const cityState = scrapeState.bhhs?.[cityKey] || { last_page: 0, total_inserted: 0 };
  const startPage = cityState.last_page + 1;

  console.log(`\n📍 ${city}, ${state} — resuming from page ${startPage}`);

  let insertedCount = 0;

  for (let pageNum = startPage; pageNum <= 100; pageNum++) {
    const apiUrl = `https://www.bhhs.com/bin/bhhs/solrAgentSearchServlet?city=${encodeURIComponent(city)}%2C+${state}%2C+USA&resultSize=50&sortType=3&page=${pageNum}&geo_sort_param_name=city&geo_sort_param_value=${encodeURIComponent(city)}%2C+${state}%2C+USA`;

    try {
      const result = await page.evaluate(async (url: string) => {
        const response = await fetch(url);
        const data = await response.json();
        return data;
      }, apiUrl);

      const agents = result?.value || [];
      if (!agents || agents.length === 0) {
        console.log(`  Page ${pageNum}: 0 agents — city exhausted`);
        // Mark as fully done so we don't retry this city
        const s = readState();
        if (!s.bhhs) s.bhhs = {};
        s.bhhs[cityKey] = { last_page: pageNum, total_inserted: cityState.total_inserted + insertedCount, exhausted: true };
        saveState(s);
        break;
      }

      let inserted = 0;
      let dupes = 0;
      for (const agent of agents) {
        if (agent.IsAgent === false) continue;
        const code = await insertLead(agent, city, state, tz);
        if (code === '201') inserted++;
        else if (code === '409') dupes++;
      }

      console.log(`  Page ${pageNum}: ${agents.length} agents, ${inserted} new, ${dupes} dupes`);
      insertedCount += inserted;

      // Save progress after every page so a restart picks up from here
      const s = readState();
      if (!s.bhhs) s.bhhs = {};
      s.bhhs[cityKey] = { last_page: pageNum, total_inserted: (cityState.total_inserted || 0) + insertedCount };
      saveState(s);

      await humanPause(7000, 16000);
      if (pageNum % 2 === 0) await humanPause(4000, 9000);
    } catch (e: any) {
      console.log(`  Page ${pageNum}: Error - ${e.message}`);
      break;
    }
  }

  console.log(`  Subtotal: ${insertedCount} new leads`);
  await humanPause(30000, 65000);
  return insertedCount;
}

async function main() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`BHHS SOLR API SCRAPER — Page-resuming across sessions`);
  console.log(`${'='.repeat(60)}`);

  const browser = await puppeteer.connect({
    browserURL: 'http://localhost:9222',
  });

  // Reuse existing tab — prevents tab pile-up on restart
  const existingPages = await browser.pages();
  const page = existingPages.length > 0 ? existingPages[0] : await browser.newPage();
  page.setDefaultTimeout(45000);

  // One-time homepage warmup for cookies/session — not repeated per city
  console.log('\n[warmup] Loading BHHS homepage...');
  await page.goto('https://www.bhhs.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await humanPause(4000, 8000);
  await page.evaluate(() => window.scrollBy(0, Math.floor(Math.random() * 400) + 200));
  await humanPause(1500, 3000);

  // Skip cities already fully exhausted
  const scrapeState = readState();
  const cities = CITIES.filter(c => {
    const key = `${c.city}_${c.state}`;
    return !scrapeState.bhhs?.[key]?.exhausted;
  });
  console.log(`[cities] ${cities.length} cities with pages remaining (${CITIES.length - cities.length} already exhausted)\n`);

  for (const cityInfo of cities) {
    try {
      await scrapeCityBHHS(page, cityInfo.city, cityInfo.state, cityInfo.tz);
    } catch (e: any) {
      console.log(`  ❌ ${cityInfo.city}: ${e.message}`);
    }
  }

  await browser.disconnect();

  console.log(`\n${'='.repeat(60)}`);
  console.log(`BHHS SCRAPING COMPLETE — Total new leads: ${totalInserted}`);
  console.log(`${'='.repeat(60)}\n`);
}

main().catch(console.error);
