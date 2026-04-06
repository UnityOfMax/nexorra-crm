// eXp GraphQL interception scraper
// Usage: node scripts/exp_city_scraper.js <City> <ST> <timezone> <country>
const puppeteer = require('puppeteer-core');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const city = process.argv[2] || 'Charlotte';
const state = process.argv[3] || 'NC';
const timezone = process.argv[4] || 'EST';
const country = process.argv[5] || 'US';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MAX_LEADS = 500; // per run — enough for ~10 pages; next run resumes from last page

// State file — shared with bhhs scraper, tracks last scraped page per city
const STATE_FILE = path.resolve(__dirname, '../agents/state/scrape-progress.json');
const CITY_KEY = `${city}_${state}`;

function readState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')); }
  catch (e) { return {}; }
}
function saveState(state_data) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state_data, null, 2));
}

// Read starting page from state — resumes where the last run left off
const existingState = readState();
const cityProgress = existingState.exp?.[CITY_KEY] || { last_page: 0 };
const START_PAGE = cityProgress.last_page + 1;
console.log(`[exp] ${city}, ${state} — resuming from page ${START_PAGE}`);

function insertLead(agent) {
  const data = JSON.stringify({
    full_name: agent.full_name,
    first_name: agent.first_name,
    last_name: agent.last_name,
    email: agent.email,
    phone: agent.phone || null,
    profile_url: agent.profile_url || null,
    profile_picture_url: agent.profile_picture_url || null,
    source_brokerage: 'exp',
    lead_category: 'email',
    country: country,
    state_province: state,
    city: city,
    timezone: timezone,
  });
  try {
    const result = execSync(
      `curl -s -o /dev/null -w "%{http_code}" -X POST "${SUPABASE_URL}/rest/v1/leads" ` +
      `-H "apikey: ${SUPABASE_KEY}" ` +
      `-H "Authorization: Bearer ${SUPABASE_KEY}" ` +
      `-H "Content-Type: application/json" ` +
      `-H "Prefer: return=minimal" ` +
      `-d '${data.replace(/'/g, "'\\''")}'`,
      { encoding: 'utf8', timeout: 15000 }
    );
    return result.trim();
  } catch (e) {
    return 'error';
  }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// Random delay within a range — defeats fixed-interval detection
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Simulate human reading pause (occasionally much longer)
function humanPause(baseMin, baseMax) {
  const base = rand(baseMin, baseMax);
  // 15% chance of a longer "reading" pause
  const extra = Math.random() < 0.15 ? rand(3000, 8000) : 0;
  return sleep(base + extra);
}

(async () => {
  const browser = await puppeteer.connect({
    browserURL: 'http://localhost:9222',
    defaultViewport: null,
  });

  const pages = await browser.pages();
  const page = pages[0];

  let allAgents = [];
  let interceptedData = [];

  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('agentdir-api.expproptech.com/graphql') || url.includes('exprealty.com') && url.includes('graphql')) {
      try {
        const text = await response.text();
        const json = JSON.parse(text);
        if (json.data && json.data.search && json.data.search.agents) {
          interceptedData.push(...json.data.search.agents);
        } else if (json.data && json.data.searchAgents && json.data.searchAgents.results) {
          interceptedData.push(...json.data.searchAgents.results);
        }
      } catch (e) {}
    }
  });

  // Natural homepage warmup — browse like a human before searching
  console.log('Warming up eXp session...');
  await page.goto('https://www.exprealty.com', { waitUntil: 'networkidle2', timeout: 60000 });
  await humanPause(6000, 11000);
  // Scroll the homepage a bit (human behaviour)
  await page.evaluate(() => window.scrollBy(0, Math.floor(Math.random() * 400) + 300));
  await humanPause(1500, 3500);
  await page.evaluate(() => window.scrollBy(0, Math.floor(Math.random() * 300) + 200));
  await humanPause(2000, 4000);

  let inserted = 0;
  let skipped = 0;

  for (let pageNum = START_PAGE; pageNum <= 200 && inserted < MAX_LEADS; pageNum++) {
    interceptedData = [];
    const locationEncoded = `${city}%2C+${state}`;
    const url = `https://www.exprealty.com/agents-search?page=${pageNum}&country=${country}&m=f&location=${locationEncoded}`;

    console.log(`Page ${pageNum}: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await sleep(5000);

    if (interceptedData.length === 0) {
      console.log('No agents on page — city exhausted.');
      // Mark city as exhausted so future runs skip it
      const s = readState();
      if (!s.exp) s.exp = {};
      s.exp[CITY_KEY] = { last_page: pageNum, exhausted: true };
      saveState(s);
      break;
    }

    console.log(`Found ${interceptedData.length} agents via API`);

    for (const agent of interceptedData) {
      if (inserted >= MAX_LEADS) break;

      const email = agent.email || agent.Email || agent.agentEmail;
      if (!email || !email.includes('@')) { skipped++; continue; }

      const firstName = agent.firstName || agent.first_name || '';
      const lastName = agent.lastName || agent.last_name || '';
      const fullName = `${firstName} ${lastName}`.trim() || agent.name || agent.fullName;
      if (!fullName || fullName.length < 3) { skipped++; continue; }

      const agentId = agent.agentId || agent.id || '';
      const slug = `${firstName}-${lastName}`.toLowerCase().replace(/\s+/g, '-');
      const profileUrl = agentId ? `https://www.exprealty.com/agents-search/${slug}_${agentId}` : null;

      const lead = {
        full_name: fullName,
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone: agent.phoneNumber || agent.phone || agent.mobilePhone || null,
        profile_url: profileUrl,
        profile_picture_url: agent.photo || agent.profileImageUrl || null,
      };

      const code = insertLead(lead);
      if (code === '201') { inserted++; console.log(`  + ${fullName} <${email}> [${code}]`); }
      else if (code === '409') { skipped++; }
      else { console.log(`  ! ${fullName} [${code}]`); }
      await humanPause(150, 500);
    }

    console.log(`Page ${pageNum} done. Inserted: ${inserted}, Skipped: ${skipped}`);

    // Save progress after every page — next run resumes from here
    const s = readState();
    if (!s.exp) s.exp = {};
    s.exp[CITY_KEY] = { last_page: pageNum };
    saveState(s);

    await humanPause(9000, 18000);
    if (pageNum % 3 === 0) await humanPause(5000, 12000);
  }

  console.log(`\nFINAL: Inserted ${inserted}, Skipped ${skipped}`);
  await browser.disconnect();
})();
