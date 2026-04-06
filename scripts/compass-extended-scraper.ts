#!/usr/bin/env npx tsx

import { execSync } from 'child_process';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Focus on cities NOT heavily scraped in Session 2
// Session 2 had: Jacksonville, Philadelphia, Raleigh, Austin, Chicago, Tucson, Colorado Springs, San Francisco, Portland, Sacramento
const CITIES = [
  { city: 'Tampa', state: 'FL', id: null, tz: 'EST' },
  { city: 'Columbus', state: 'OH', id: null, tz: 'EST' },
  { city: 'Atlanta', state: 'GA', id: '42508', tz: 'EST' },
  { city: 'Charlotte', state: 'NC', id: null, tz: 'EST' },
  { city: 'Miami', state: 'FL', id: '12421', tz: 'EST' },
  { city: 'San Antonio', state: 'TX', id: null, tz: 'CST' },
  { city: 'Nashville', state: 'TN', id: '27781', tz: 'CST' },
  { city: 'Kansas City', state: 'MO', id: null, tz: 'CST' },
  { city: 'St. Louis', state: 'MO', id: null, tz: 'CST' },
  { city: 'Phoenix', state: 'AZ', id: null, tz: 'MST' },
  { city: 'Las Vegas', state: 'NV', id: null, tz: 'MST' },
  { city: 'Denver', state: 'CO', id: '12424', tz: 'MST' },
  { city: 'Salt Lake City', state: 'UT', id: null, tz: 'MST' },
  { city: 'San Diego', state: 'CA', id: '12623', tz: 'PST' },
  { city: 'Seattle', state: 'WA', id: '14158', tz: 'PST' },
];

const SKIP_PATTERNS = /LLC|Inc|Inc\.|Corp|Ltd|Ltd\.|Group|Team|Realty|Properties|Homes|Agency|Brokerage|We Buy|Real Estate/i;

let totalInserted = 0;
let totalPages = 0;

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

async function insertLead(agent: any, city: string, state: string, tz: string): Promise<boolean> {
  if (!agent.email || !isValidName(agent.full_name)) return false;

  const payload = {
    full_name: normalizeTitle(agent.full_name),
    first_name: normalizeTitle(agent.first_name),
    last_name: normalizeTitle(agent.last_name),
    email: agent.email,
    phone: agent.phone || null,
    profile_url: agent.profile_url,
    profile_picture_url: agent.profile_picture_url || null,
    source_brokerage: 'compass',
    country: 'US',
    state_province: state,
    city,
    timezone: tz,
    instagram_handle: agent.instagram_handle || null,
  };

  try {
    const cmd = `curl -s -w "%{http_code}" -o /dev/null -X POST "${SUPABASE_URL}/rest/v1/leads" \\
      -H "apikey: ${SUPABASE_KEY}" \\
      -H "Authorization: Bearer ${SUPABASE_KEY}" \\
      -H "Content-Type: application/json" \\
      -H "Prefer: return=minimal" \\
      -d '${JSON.stringify(payload)}'`;

    const response = execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    if (response === '201') {
      totalInserted++;
      return true;
    } else if (response === '409') {
      return true;
    }
  } catch (e) {}

  return false;
}

async function scrapeCityPages(city: string, state: string, id: string | null, tz: string, maxPages: number = 3): Promise<void> {
  const citySlug = city.toLowerCase().replace(/\s+/g, '-');

  // If no ID, skip (would need to discover it)
  if (!id) {
    console.log(`  ⚠️ ${city}: No location ID, skipping`);
    return;
  }

  let totalForCity = 0;
  for (let page = 1; page <= maxPages; page++) {
    const url = `https://www.compass.com/agents/locations/${citySlug}-${state.toLowerCase()}/${id}/page-${page}/`;

    try {
      execSync(`node scripts/chrome-tool.js navigate "${url}"`, { stdio: 'ignore', timeout: 15000 });
      await new Promise(r => setTimeout(r, 2000));

      execSync(`node scripts/chrome-tool.js scroll-all`, { stdio: 'ignore' });
      await new Promise(r => setTimeout(r, 1000));

      const result = execSync('node scripts/chrome-tool.js agents compass 2>/dev/null || echo "[]"', {
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
        stdio: ['pipe', 'pipe', 'ignore']
      });

      const agents = JSON.parse(result);
      if (!Array.isArray(agents) || agents.length === 0) {
        console.log(`    Page ${page}: 0 agents (exhausted)`);
        break;
      }

      let inserted = 0;
      for (const agent of agents) {
        if (await insertLead(agent, city, state, tz)) inserted++;
      }

      console.log(`    Page ${page}: ${agents.length} agents, ${inserted} inserted`);
      totalForCity += agents.length;
      totalPages++;

      await new Promise(r => setTimeout(r, 10000));
    } catch (e) {
      console.log(`    Page ${page}: Error`);
      break;
    }
  }

  console.log(`   📍 Subtotal: ${totalForCity} agents\n`);
  await new Promise(r => setTimeout(r, 45000));
}

async function main() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`COMPASS EXTENDED SCRAPER — Fresh Cities`);
  console.log(`${'='.repeat(60)}\n`);

  for (const cityInfo of CITIES) {
    console.log(`📍 ${cityInfo.city}, ${cityInfo.state}`);
    await scrapeCityPages(cityInfo.city, cityInfo.state, cityInfo.id || '', cityInfo.tz, 5);
  }

  console.log(`${'='.repeat(60)}`);
  console.log(`SCRAPING COMPLETE`);
  console.log(`Pages scraped: ${totalPages} | Leads inserted: ${totalInserted}`);
  console.log(`${'='.repeat(60)}\n`);
}

main().catch(console.error);
