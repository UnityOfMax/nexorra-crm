/**
 * Jeff Email Lead Gen Session — 1000 new email leads
 * Cities: Jacksonville, Philadelphia, Raleigh, Austin, Chicago,
 *         Tucson, Colorado Springs, San Francisco, Portland, Sacramento
 * Brokerages: ColdwellBanker, BHHS, eXp
 */

const puppeteer = require('/home/max/crm/node_modules/puppeteer');
const fs = require('fs');
const path = require('path');

// Load env
const envFile = fs.readFileSync('/home/max/crm/.env.local', 'utf8');
envFile.split('\n').forEach(line => {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
});

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STATE_FILE = '/home/max/crm/agents/state/jeff-state.json';

// Compass location IDs (discovered 2026-03-23)
const COMPASS_LOCATION_IDS = {
  'jacksonville-fl': 44337,
  'philadelphia-pa': 31493,
  'raleigh-nc': 39870,
  'austin-tx': 42626,
  'chicago-il': 40768,
  'tucson-az': null, // Not a Compass region
  'colorado-springs-co': null, // Not a Compass region
  'san-francisco-ca': 12416,
  'portland-or': 23044,
  'sacramento-ca': 27040,
  'houston-tx': 4418,
  'dallas-tx': 40435,
  'nashville-tn': 27781,
  'new-york-ny': 21429,
  'los-angeles-ca': 6580,
  'miami-fl': 12421,
  'denver-co': 12424,
  'seattle-wa': 14158,
  'washington-dc': 24793,
  'boston-ma': 12422,
  'atlanta-ga': 42508,
  'san-diego-ca': 12623,
  'orange-county-ca': 12420,
};

const CITIES = [
  { name: 'Jacksonville', state: 'FL', country: 'US', timezone: 'EST', cbSlug: 'fl/jacksonville', bhhsCity: 'Jacksonville, FL, USA', expLocation: 'Jacksonville, FL', kwLocation: 'Jacksonville%2C+FL', slug: 'jacksonville-fl' },
  { name: 'Philadelphia', state: 'PA', country: 'US', timezone: 'EST', cbSlug: 'pa/philadelphia', bhhsCity: 'Philadelphia, PA, USA', expLocation: 'Philadelphia, PA', kwLocation: 'Philadelphia%2C+PA', slug: 'philadelphia-pa' },
  { name: 'Raleigh', state: 'NC', country: 'US', timezone: 'EST', cbSlug: 'nc/raleigh', bhhsCity: 'Raleigh, NC, USA', expLocation: 'Raleigh, NC', kwLocation: 'Raleigh%2C+NC', slug: 'raleigh-nc' },
  { name: 'Austin', state: 'TX', country: 'US', timezone: 'CST', cbSlug: 'tx/austin', bhhsCity: 'Austin, TX, USA', expLocation: 'Austin, TX', kwLocation: 'Austin%2C+TX', slug: 'austin-tx' },
  { name: 'Chicago', state: 'IL', country: 'US', timezone: 'CST', cbSlug: 'il/chicago', bhhsCity: 'Chicago, IL, USA', expLocation: 'Chicago, IL', kwLocation: 'Chicago%2C+IL', slug: 'chicago-il' },
  { name: 'Tucson', state: 'AZ', country: 'US', timezone: 'MST', cbSlug: 'az/tucson', bhhsCity: 'Tucson, AZ, USA', expLocation: 'Tucson, AZ', kwLocation: 'Tucson%2C+AZ', slug: 'tucson-az' },
  { name: 'Colorado Springs', state: 'CO', country: 'US', timezone: 'MST', cbSlug: 'co/colorado-springs', bhhsCity: 'Colorado Springs, CO, USA', expLocation: 'Colorado Springs, CO', kwLocation: 'Colorado+Springs%2C+CO', slug: 'colorado-springs-co' },
  { name: 'San Francisco', state: 'CA', country: 'US', timezone: 'PST', cbSlug: 'ca/san-francisco', bhhsCity: 'San Francisco, CA, USA', expLocation: 'San Francisco, CA', kwLocation: 'San+Francisco%2C+CA', slug: 'san-francisco-ca' },
  { name: 'Portland', state: 'OR', country: 'US', timezone: 'PST', cbSlug: 'or/portland', bhhsCity: 'Portland, OR, USA', expLocation: 'Portland, OR', kwLocation: 'Portland%2C+OR', slug: 'portland-or' },
  { name: 'Sacramento', state: 'CA', country: 'US', timezone: 'PST', cbSlug: 'ca/sacramento', bhhsCity: 'Sacramento, CA, USA', expLocation: 'Sacramento, CA', kwLocation: 'Sacramento%2C+CA', slug: 'sacramento-ca' },
];

let totalInserted = 0;
let state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));

function saveState() {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function toTitleCase(str) {
  if (!str) return str;
  return str.split(' ').map(w => {
    if (!w) return w;
    return w.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join('-');
  }).join(' ');
}

function isValidEmail(email) {
  if (!email) return false;
  if (!email.includes('@')) return false;
  const badDomains = ['city.local', 'example.com', 'test.com', 'domain.com'];
  return !badDomains.some(d => email.endsWith(d));
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function insertLead(lead) {
  const body = JSON.stringify(lead);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body,
  });
  return res.status;
}

// ─── COLDWELL BANKER ───────────────────────────────────────────────────────
async function scrapeCB(page, city) {
  const key = `${city.name}, ${city.state}`;
  let cityState = state.cities[key];
  if (!cityState) {
    cityState = { country: city.country, state: city.state, timezone: city.timezone, brokerages: {} };
    state.cities[key] = cityState;
  }
  if (!cityState.brokerages.coldwellbanker) {
    cityState.brokerages.coldwellbanker = { status: 'not_started', count: 0, last_page: 0 };
  }
  const bs = cityState.brokerages.coldwellbanker;
  if (bs.status === 'complete' || bs.status === 'rate_limited') {
    console.log(`[CB] ${city.name} — skip (${bs.status})`);
    return 0;
  }

  let inserted = 0;
  let pageNum = bs.last_page > 0 ? bs.last_page + 1 : 1;
  let consecutive_empty = 0;

  console.log(`\n[CB] Starting ${city.name}, ${city.state} from page ${pageNum}`);

  while (bs.count < 100 && consecutive_empty < 2) {
    const url = pageNum === 1
      ? `https://www.coldwellbanker.com/city/${city.cbSlug}/agents`
      : `https://www.coldwellbanker.com/city/${city.cbSlug}/agents?page=${pageNum}`;

    try {
      await page.goto(url, { waitUntil: 'load', timeout: 60000 });
      await sleep(3000);

      // Scroll to load lazy images
      await page.evaluate(() => {
        return new Promise(resolve => {
          let lastHeight = 0;
          const scroll = setInterval(() => {
            window.scrollBy(0, 800);
            if (document.body.scrollHeight === lastHeight) {
              clearInterval(scroll);
              resolve();
            }
            lastHeight = document.body.scrollHeight;
          }, 500);
          setTimeout(() => { clearInterval(scroll); resolve(); }, 8000);
        });
      });

      const agents = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('[class*="agent-card"], [class*="AgentCard"], .agent-listing-card, [data-test="agent-card"]'));
        // Also try generic card selectors
        const allCards = cards.length > 0 ? cards : Array.from(document.querySelectorAll('.card, [class*="card"]')).filter(c => {
          const text = c.textContent || '';
          return text.includes('@') || c.querySelector('a[href*="mailto:"]');
        });

        return allCards.map(card => {
          const emailLink = card.querySelector('a[href^="mailto:"]');
          const email = emailLink ? emailLink.href.replace('mailto:', '').trim() : null;
          if (!email) return null;

          const nameEl = card.querySelector('h2, h3, h4, [class*="name"], [class*="Name"]');
          const full_name = nameEl ? nameEl.textContent.trim() : null;
          if (!full_name || full_name.length < 3) return null;

          const profileLink = card.querySelector('a[href*="/agents/"]');
          const profile_url = profileLink ? profileLink.href : null;

          const phoneEl = card.querySelector('a[href^="tel:"]');
          const phone = phoneEl ? phoneEl.href.replace('tel:', '').trim() : null;

          const imgEl = card.querySelector('img[src*="realogy"], img[src*="coldwell"]');
          const profile_picture_url = imgEl && imgEl.src && !imgEl.src.startsWith('data:') ? imgEl.src : null;

          const nameParts = full_name.split(' ');
          return {
            full_name, email, phone, profile_url, profile_picture_url,
            first_name: nameParts[0] || null,
            last_name: nameParts.slice(1).join(' ') || null,
          };
        }).filter(Boolean);
      });

      if (agents.length === 0) {
        consecutive_empty++;
        console.log(`[CB] ${city.name} p${pageNum} — 0 agents (empty ${consecutive_empty}/2)`);
        if (consecutive_empty >= 2) break;
        pageNum++;
        await sleep(8000);
        continue;
      }
      consecutive_empty = 0;

      let pageInserted = 0;
      for (const agent of agents) {
        if (!isValidEmail(agent.email)) continue;
        const lead = {
          full_name: toTitleCase(agent.full_name),
          first_name: toTitleCase(agent.first_name),
          last_name: toTitleCase(agent.last_name),
          email: agent.email.toLowerCase(),
          phone: agent.phone || null,
          profile_url: agent.profile_url || null,
          profile_picture_url: agent.profile_picture_url || null,
          source_brokerage: 'coldwellbanker',
          lead_category: 'email',
          country: city.country,
          state_province: city.state,
          city: city.name,
          timezone: city.timezone,
        };
        await sleep(200);
        const status = await insertLead(lead);
        if (status === 201) { pageInserted++; inserted++; bs.count++; totalInserted++; }
        else if (status === 409) { /* dup */ }
        else console.log(`[CB] Insert error ${status} for ${agent.email}`);
      }
      console.log(`[CB] ${city.name} p${pageNum} — ${agents.length} found, ${pageInserted} new | city total: ${bs.count} | session: ${totalInserted}`);

      bs.last_page = pageNum;
      bs.status = 'in_progress';
      saveState();

      if (bs.count >= 100) { bs.status = 'complete'; saveState(); break; }

      pageNum++;
      await sleep(10000 + Math.random() * 8000);
    } catch (err) {
      console.error(`[CB] ${city.name} p${pageNum} error:`, err.message);
      bs.status = 'rate_limited';
      saveState();
      break;
    }
  }

  if (bs.status === 'in_progress') bs.status = 'complete';
  saveState();
  console.log(`[CB] ${city.name} DONE — ${bs.count} inserted`);
  return inserted;
}

// ─── BHHS ──────────────────────────────────────────────────────────────────
async function scrapeBHHS(page, city) {
  const key = `${city.name}, ${city.state}`;
  let cityState = state.cities[key];
  if (!cityState) {
    cityState = { country: city.country, state: city.state, timezone: city.timezone, brokerages: {} };
    state.cities[key] = cityState;
  }
  if (!cityState.brokerages.bhhs) {
    cityState.brokerages.bhhs = { status: 'not_started', count: 0, last_page: 0 };
  }
  const bs = cityState.brokerages.bhhs;
  if (bs.status === 'complete' || bs.status === 'rate_limited') {
    console.log(`[BHHS] ${city.name} — skip (${bs.status})`);
    return 0;
  }

  let inserted = 0;
  let pageNum = bs.last_page > 0 ? bs.last_page + 1 : 1;

  console.log(`\n[BHHS] Starting ${city.name}, ${city.state} from page ${pageNum}`);

  // Navigate to BHHS to get cookies
  await page.goto('https://www.bhhs.com', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(5000);

  while (bs.count < 100) {
    try {
      const apiUrl = `https://www.bhhs.com/bin/bhhs/solrAgentSearchServlet?city=${encodeURIComponent(city.bhhsCity)}&resultSize=50&sortType=3&page=${pageNum}&geo_sort_param_name=city&geo_sort_param_value=${encodeURIComponent(city.bhhsCity)}`;

      const result = await page.evaluate(async (url) => {
        const res = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'Referer': 'https://www.bhhs.com/agent-search-results',
          }
        });
        if (!res.ok) return { error: res.status };
        return await res.json();
      }, apiUrl);

      if (result.error) {
        console.log(`[BHHS] ${city.name} p${pageNum} — API error ${result.error}`);
        bs.status = 'rate_limited';
        saveState();
        break;
      }

      const agents = result.value || [];
      if (agents.length === 0) {
        console.log(`[BHHS] ${city.name} p${pageNum} — 0 agents, done`);
        break;
      }

      let pageInserted = 0;
      for (const agent of agents) {
        if (agent.IsAgent === false && agent.type === 'RealEstateTeam') continue;
        const email = agent.MemberEmail;
        if (!isValidEmail(email)) continue;

        const full_name = toTitleCase(agent.MemberFullName || `${agent.MemberFirstName} ${agent.MemberLastName}`);
        const phone = agent.MemberMobilePhone || agent.MemberOfficePhone || null;
        const profile_url = agent.MemberUrl || null;
        const profile_picture_url = agent.Photo && !agent.Photo.startsWith('data:') ? agent.Photo : null;

        const lead = {
          full_name,
          first_name: toTitleCase(agent.MemberFirstName) || null,
          last_name: toTitleCase(agent.MemberLastName) || null,
          email: email.toLowerCase(),
          phone: phone || null,
          profile_url,
          profile_picture_url,
          source_brokerage: 'bhhs',
          lead_category: 'email',
          country: city.country,
          state_province: city.state,
          city: city.name,
          timezone: city.timezone,
        };
        await sleep(200);
        const status = await insertLead(lead);
        if (status === 201) { pageInserted++; inserted++; bs.count++; totalInserted++; }
        else if (status === 409) { /* dup */ }
        else console.log(`[BHHS] Insert error ${status} for ${email}`);
      }
      console.log(`[BHHS] ${city.name} p${pageNum} — ${agents.length} found, ${pageInserted} new | city total: ${bs.count} | session: ${totalInserted}`);

      bs.last_page = pageNum;
      bs.status = 'in_progress';
      saveState();

      if (bs.count >= 100) { bs.status = 'complete'; saveState(); break; }

      pageNum++;
      await sleep(8000 + Math.random() * 6000);
    } catch (err) {
      console.error(`[BHHS] ${city.name} p${pageNum} error:`, err.message);
      bs.status = 'rate_limited';
      saveState();
      break;
    }
  }

  if (bs.status === 'in_progress') bs.status = 'complete';
  saveState();
  console.log(`[BHHS] ${city.name} DONE — ${bs.count} inserted`);
  return inserted;
}

// ─── eXp REALTY ────────────────────────────────────────────────────────────
async function scrapeExp(page, city) {
  const key = `${city.name}, ${city.state}`;
  let cityState = state.cities[key];
  if (!cityState) {
    cityState = { country: city.country, state: city.state, timezone: city.timezone, brokerages: {} };
    state.cities[key] = cityState;
  }
  if (!cityState.brokerages.exp) {
    cityState.brokerages.exp = { status: 'not_started', count: 0, last_page: 0 };
  }
  const bs = cityState.brokerages.exp;
  if (bs.status === 'complete' || bs.status === 'rate_limited') {
    console.log(`[eXp] ${city.name} — skip (${bs.status})`);
    return 0;
  }

  let inserted = 0;
  let pageNum = bs.last_page > 0 ? bs.last_page + 1 : 1;

  console.log(`\n[eXp] Starting ${city.name}, ${city.state} from page ${pageNum}`);

  // eXp Cloudflare bypass
  await page.goto('https://www.exprealty.com', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(8000);

  while (bs.count < 100) {
    const url = `https://www.exprealty.com/agents-search?page=${pageNum}&country=US&m=f&location=${encodeURIComponent(city.expLocation)}`;

    try {
      // Set up response interceptor to capture GraphQL response
      let graphqlData = null;
      const responseHandler = async (response) => {
        if (response.url().includes('agentdir-api.expproptech.com/graphql')) {
          try {
            const json = await response.json();
            if (json?.data?.search) graphqlData = json.data.search;
          } catch {}
        }
      };
      page.on('response', responseHandler);

      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      await sleep(5000);

      page.off('response', responseHandler);

      if (!graphqlData) {
        // Try scrolling to trigger GraphQL
        await page.evaluate(() => window.scrollBy(0, 500));
        await sleep(3000);
      }

      if (!graphqlData) {
        console.log(`[eXp] ${city.name} p${pageNum} — no GraphQL data, trying page scrape`);
        // Fallback: scrape visible agent cards
        const agents = await page.evaluate(() => {
          const cards = document.querySelectorAll('[class*="agent"], [class*="Agent"]');
          return Array.from(cards).map(card => {
            const emailLink = card.querySelector('a[href^="mailto:"]');
            const nameEl = card.querySelector('[class*="name"], [class*="Name"], h3, h4');
            return {
              email: emailLink ? emailLink.href.replace('mailto:', '') : null,
              full_name: nameEl ? nameEl.textContent.trim() : null,
            };
          }).filter(a => a.email && a.full_name);
        });

        if (agents.length === 0) {
          bs.status = 'rate_limited';
          saveState();
          break;
        }

        for (const agent of agents) {
          if (!isValidEmail(agent.email)) continue;
          const nameParts = agent.full_name.trim().split(' ');
          const lead = {
            full_name: toTitleCase(agent.full_name),
            first_name: toTitleCase(nameParts[0]) || null,
            last_name: toTitleCase(nameParts.slice(1).join(' ')) || null,
            email: agent.email.toLowerCase(),
            source_brokerage: 'exp',
            lead_category: 'email',
            country: city.country,
            state_province: city.state,
            city: city.name,
            timezone: city.timezone,
          };
          const status = await insertLead(lead);
          if (status === 201) { inserted++; bs.count++; totalInserted++; }
        }
        pageNum++;
        await sleep(10000);
        continue;
      }

      const agents = graphqlData.agents || [];
      if (agents.length === 0) {
        console.log(`[eXp] ${city.name} p${pageNum} — 0 agents, done`);
        break;
      }

      let pageInserted = 0;
      for (const agent of agents) {
        const email = agent.email || agent.contactEmail;
        if (!isValidEmail(email)) continue;

        const full_name = toTitleCase(`${agent.firstName || ''} ${agent.lastName || ''}`.trim());
        if (!full_name || full_name.length < 3) continue;

        const lead = {
          full_name,
          first_name: toTitleCase(agent.firstName) || null,
          last_name: toTitleCase(agent.lastName) || null,
          email: email.toLowerCase(),
          phone: agent.phone || null,
          profile_url: agent.profileUrl || agent.url || null,
          profile_picture_url: agent.photo || agent.profilePhoto || null,
          source_brokerage: 'exp',
          lead_category: 'email',
          country: city.country,
          state_province: city.state,
          city: city.name,
          timezone: city.timezone,
        };
        await sleep(200);
        const status = await insertLead(lead);
        if (status === 201) { pageInserted++; inserted++; bs.count++; totalInserted++; }
        else if (status === 409) { /* dup */ }
        else console.log(`[eXp] Insert error ${status} for ${email}`);
      }
      console.log(`[eXp] ${city.name} p${pageNum} — ${agents.length} found, ${pageInserted} new | city total: ${bs.count} | session: ${totalInserted}`);

      bs.last_page = pageNum;
      bs.status = 'in_progress';
      saveState();

      if (bs.count >= 100) { bs.status = 'complete'; saveState(); break; }

      pageNum++;
      await sleep(10000 + Math.random() * 8000);
    } catch (err) {
      console.error(`[eXp] ${city.name} p${pageNum} error:`, err.message);
      bs.status = 'rate_limited';
      saveState();
      break;
    }
  }

  if (bs.status === 'in_progress') bs.status = 'complete';
  saveState();
  console.log(`[eXp] ${city.name} DONE — ${bs.count} inserted`);
  return inserted;
}

// ─── KELLER WILLIAMS ───────────────────────────────────────────────────────
async function scrapeKW(page, city) {
  const key = `${city.name}, ${city.state}`;
  let cityState = state.cities[key];
  if (!cityState) { cityState = { country: city.country, state: city.state, timezone: city.timezone, brokerages: {} }; state.cities[key] = cityState; }
  if (!cityState.brokerages.kw) cityState.brokerages.kw = { status: 'not_started', count: 0, last_page: 0 };
  const bs = cityState.brokerages.kw;
  if (bs.status === 'complete' || bs.status === 'rate_limited') { console.log(`[KW] ${city.name} — skip (${bs.status})`); return 0; }

  let inserted = 0;
  let pageNum = bs.last_page > 0 ? bs.last_page + 1 : 1;
  let consecutive_empty = 0;
  console.log(`\n[KW] Starting ${city.name}, ${city.state} from page ${pageNum}`);

  while (bs.count < 100 && consecutive_empty < 2) {
    const url = `https://kw.com/agents?location=${city.kwLocation}&page=${pageNum}`;
    try {
      await page.goto(url, { waitUntil: 'load', timeout: 60000 });
      await sleep(4000);
      // Scroll to trigger lazy-loaded cards
      await page.evaluate(() => new Promise(resolve => {
        let last = 0; const t = setInterval(() => { window.scrollBy(0, 800);
          if (document.body.scrollHeight === last) { clearInterval(t); resolve(); } last = document.body.scrollHeight; }, 600);
        setTimeout(() => { clearInterval(t); resolve(); }, 10000);
      }));

      const agents = await page.evaluate(() => {
        const agents = [];
        const seen = new Set();
        document.querySelectorAll('.agent-card-info').forEach(card => {
          const emailEl = card.querySelector('a[href^="mailto:"]');
          if (!emailEl) return;
          const email = emailEl.href.replace('mailto:', '').split('?')[0].trim().toLowerCase();
          if (!email || !email.includes('@') || seen.has(email)) return;
          seen.add(email);
          const name = card.querySelector('.agent-card-name')?.textContent?.trim() || null;
          if (!name || name.length < 3) return;
          const profileLink = card.querySelector('a[href*="/agent/"]');
          const href = profileLink?.getAttribute('href');
          const profile_url = href ? (href.startsWith('http') ? href : 'https://kw.com' + href) : null;
          const avatarEl = card.querySelector('.agent-card-avatar');
          let picture = null;
          if (avatarEl) { const bg = avatarEl.getAttribute('style') || ''; const m = bg.match(/url\(['"]?([^'")\s]+)['"]?\)/); if (m) picture = m[1]; }
          const phoneEl = card.querySelector('a[href^="tel:"]');
          const nameParts = name.trim().split(/\s+/);
          agents.push({ full_name: name, first_name: nameParts[0] || null, last_name: nameParts.slice(1).join(' ') || null, email, phone: phoneEl?.href?.replace('tel:', '') || null, profile_url, profile_picture_url: picture });
        });
        return agents;
      });

      if (agents.length === 0) { consecutive_empty++; if (consecutive_empty >= 2) break; pageNum++; await sleep(8000); continue; }
      consecutive_empty = 0;
      let pageInserted = 0;
      for (const agent of agents) {
        if (!isValidEmail(agent.email)) continue;
        const status = await insertLead({ full_name: toTitleCase(agent.full_name), first_name: toTitleCase(agent.first_name), last_name: toTitleCase(agent.last_name), email: agent.email, phone: agent.phone || null, profile_url: agent.profile_url || null, profile_picture_url: agent.profile_picture_url || null, source_brokerage: 'kw', lead_category: 'email', country: city.country, state_province: city.state, city: city.name, timezone: city.timezone });
        await sleep(200);
        if (status === 201) { pageInserted++; inserted++; bs.count++; totalInserted++; }
        else if (status !== 409) console.log(`[KW] Insert error ${status}`);
      }
      console.log(`[KW] ${city.name} p${pageNum} — ${agents.length} found, ${pageInserted} new | city: ${bs.count} | session: ${totalInserted}`);
      bs.last_page = pageNum; bs.status = 'in_progress'; saveState();
      if (bs.count >= 100) { bs.status = 'complete'; saveState(); break; }
      pageNum++;
      await sleep(10000 + Math.random() * 8000);
    } catch (err) { console.error(`[KW] ${city.name} p${pageNum} error:`, err.message); bs.status = 'rate_limited'; saveState(); break; }
  }
  if (bs.status === 'in_progress') bs.status = 'complete';
  saveState();
  console.log(`[KW] ${city.name} DONE — ${bs.count} inserted`);
  return inserted;
}

// ─── COMPASS ───────────────────────────────────────────────────────────────
async function scrapeCompass(page, city) {
  const key = `${city.name}, ${city.state}`;
  let cityState = state.cities[key];
  if (!cityState) { cityState = { country: city.country, state: city.state, timezone: city.timezone, brokerages: {} }; state.cities[key] = cityState; }
  if (!cityState.brokerages.compass) cityState.brokerages.compass = { status: 'not_started', count: 0, last_page: 0 };
  const bs = cityState.brokerages.compass;
  if (bs.status === 'complete' || bs.status === 'rate_limited') { console.log(`[Compass] ${city.name} — skip (${bs.status})`); return 0; }

  const locationId = COMPASS_LOCATION_IDS[city.slug];
  if (!locationId) { console.log(`[Compass] ${city.name} — no location ID, skip`); bs.status = 'rate_limited'; saveState(); return 0; }

  let inserted = 0;
  let pageNum = bs.last_page > 0 ? bs.last_page + 1 : 1;
  console.log(`\n[Compass] Starting ${city.name}, ${city.state} from page ${pageNum}`);

  while (bs.count < 100) {
    const url = `https://www.compass.com/agents/locations/${city.slug}/${locationId}/page-${pageNum}/`;
    try {
      await page.goto(url, { waitUntil: 'load', timeout: 60000 });
      await sleep(3000);

      const agents = await page.evaluate(() => {
        const agents = [];
        const seen = new Set();
        try {
          const scripts = document.querySelectorAll('script[type="application/ld+json"]');
          for (const script of scripts) {
            let data; try { data = JSON.parse(script.textContent); } catch { continue; }
            const graph = data['@graph'] || (Array.isArray(data) ? data : [data]);
            for (const item of graph) {
              if (item['@type'] !== 'RealEstateAgent') continue;
              const email = item.email ? item.email.toLowerCase().trim() : null;
              if (!email || !email.includes('@') || seen.has(email)) continue;
              seen.add(email);
              const full_name = item.name ? item.name.trim() : null;
              if (!full_name || full_name.length < 3) continue;
              const nameParts = full_name.split(/\s+/);
              agents.push({ full_name, first_name: nameParts[0] || null, last_name: nameParts.slice(1).join(' ') || null, email, phone: item.telephone ? String(item.telephone) : null, profile_url: item.url || null, profile_picture_url: item.image ? (typeof item.image === 'string' ? item.image : (item.image.url || null)) : null });
            }
          }
        } catch (e) {}
        return agents;
      });

      if (agents.length === 0) { console.log(`[Compass] ${city.name} p${pageNum} — 0 agents, done`); break; }
      let pageInserted = 0;
      for (const agent of agents) {
        if (!isValidEmail(agent.email)) continue;
        await sleep(200);
        const status = await insertLead({ full_name: toTitleCase(agent.full_name), first_name: toTitleCase(agent.first_name), last_name: toTitleCase(agent.last_name), email: agent.email, phone: agent.phone || null, profile_url: agent.profile_url || null, profile_picture_url: agent.profile_picture_url || null, source_brokerage: 'compass', lead_category: 'email', country: city.country, state_province: city.state, city: city.name, timezone: city.timezone });
        if (status === 201) { pageInserted++; inserted++; bs.count++; totalInserted++; }
        else if (status !== 409) console.log(`[Compass] Insert error ${status}`);
      }
      console.log(`[Compass] ${city.name} p${pageNum} — ${agents.length} found, ${pageInserted} new | city: ${bs.count} | session: ${totalInserted}`);
      bs.last_page = pageNum; bs.status = 'in_progress'; saveState();
      if (bs.count >= 100) { bs.status = 'complete'; saveState(); break; }
      pageNum++;
      await sleep(10000 + Math.random() * 8000);
    } catch (err) { console.error(`[Compass] ${city.name} p${pageNum} error:`, err.message); bs.status = 'rate_limited'; saveState(); break; }
  }
  if (bs.status === 'in_progress') bs.status = 'complete';
  saveState();
  console.log(`[Compass] ${city.name} DONE — ${bs.count} inserted`);
  return inserted;
}

// ─── MAIN ──────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== Jeff Email Session — 1000 leads target ===');
  console.log(`Cities: ${CITIES.map(c => c.name).join(', ')}`);

  const browser = await puppeteer.connect({
    browserURL: 'http://localhost:9222',
    defaultViewport: null,
  });

  async function getFreshPage() {
    const p = await browser.newPage();
    await p.setDefaultNavigationTimeout(60000);
    return p;
  }

  let page = await getFreshPage();

  async function runScraper(fn, city) {
    try {
      await fn(page, city);
    } catch (err) {
      console.error(`[main] ${fn.name} crashed for ${city.name}: ${err.message}. Getting fresh page.`);
      try { await page.close(); } catch {}
      page = await getFreshPage();
    }
  }

  for (const city of CITIES) {
    if (totalInserted >= 1000) {
      console.log(`\n✅ Target reached: ${totalInserted} leads. Stopping.`);
      break;
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`CITY: ${city.name}, ${city.state} (${city.timezone}) — session total: ${totalInserted}`);
    console.log('='.repeat(60));

    // KW (fast, email on listing)
    await runScraper(scrapeKW, city);
    await sleep(20000 + Math.random() * 20000);

    if (totalInserted >= 1000) break;

    // CB (fast, email on listing)
    await runScraper(scrapeCB, city);
    await sleep(20000 + Math.random() * 20000);

    if (totalInserted >= 1000) break;

    // Compass (fast, email in JSON-LD)
    await runScraper(scrapeCompass, city);
    await sleep(20000 + Math.random() * 20000);

    if (totalInserted >= 1000) break;

    // BHHS (Solr API via Chrome fetch)
    await runScraper(scrapeBHHS, city);
    await sleep(30000 + Math.random() * 30000);

    if (totalInserted >= 1000) break;

    // eXp (GraphQL interception)
    await runScraper(scrapeExp, city);
    await sleep(45000 + Math.random() * 30000);

    // Progress report every city
    const pct = Math.round((totalInserted / 1000) * 100);
    console.log(`\n📊 Progress: ${totalInserted}/1000 (${pct}%) after ${city.name}`);
  }

  // Final report
  console.log('\n' + '='.repeat(60));
  console.log('FINAL REPORT');
  console.log('='.repeat(60));
  console.log(`Total inserted this session: ${totalInserted}`);

  const tzBreakdown = { EST: 0, CST: 0, MST: 0, PST: 0 };
  for (const [cityKey, cityData] of Object.entries(state.cities)) {
    const tz = cityData.timezone;
    if (!tzBreakdown[tz]) tzBreakdown[tz] = 0;
    for (const [brok, bData] of Object.entries(cityData.brokerages || {})) {
      if (['coldwellbanker', 'bhhs', 'exp'].includes(brok)) {
        tzBreakdown[tz] = (tzBreakdown[tz] || 0) + (bData.count || 0);
      }
    }
  }
  console.log('By timezone:', JSON.stringify(tzBreakdown));

  state.session_email_total = totalInserted;
  state.last_run = new Date().toISOString();
  saveState();

  try { await page.close(); } catch {}
  console.log('\nJeff session complete.');
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
