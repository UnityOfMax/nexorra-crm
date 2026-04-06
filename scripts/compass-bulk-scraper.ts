#!/usr/bin/env npx tsx

import { execSync } from 'child_process';
import * as fs from 'fs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const CITIES = [
  { city: 'Austin', state: 'TX', id: '42626', tz: 'CST' },
  { city: 'San Francisco', state: 'CA', id: '12416', tz: 'PST' },
  { city: 'Chicago', state: 'IL', id: '40768', tz: 'CST' },
  { city: 'Boston', state: 'MA', id: '12422', tz: 'EST' },
  { city: 'New York', state: 'NY', id: '21429', tz: 'EST' },
  { city: 'Philadelphia', state: 'PA', id: '31493', tz: 'EST' },
  { city: 'Raleigh', state: 'NC', id: '39870', tz: 'EST' },
  { city: 'Portland', state: 'OR', id: '23044', tz: 'PST' },
  { city: 'Sacramento', state: 'CA', id: '27040', tz: 'PST' },
  { city: 'Nashville', state: 'TN', id: '27781', tz: 'CST' },
  { city: 'Seattle', state: 'WA', id: '14158', tz: 'PST' },
];

const SKIP_PATTERNS = /LLC|Inc|Inc\.|Corp|Ltd|Ltd\.|Group|Team|Realty|Properties|Homes|Agency|Brokerage|We Buy|Real Estate/i;
const TEAM_KEYWORDS = /^(The|Team|Group|Company)/i;

let totalInserted = 0;
let totalSkipped = 0;
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
  if (TEAM_KEYWORDS.test(fullName)) return false;
  if (fullName.match(/\d/)) return false;
  if (fullName.length > 50) return false;
  const words = fullName.trim().split(/\s+/);
  if (words.length > 4) return false;
  if (words.length === 1) return false; // Single word name
  return true;
}

async function insertLead(agent: any, city: string, state: string, tz: string): Promise<boolean> {
  if (!agent.email || !isValidName(agent.full_name)) {
    return false;
  }

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
    const response = execSync(
      `curl -s -w "%{http_code}" -o /dev/null -X POST "${SUPABASE_URL}/rest/v1/leads" \\
        -H "apikey: ${SUPABASE_KEY}" \\
        -H "Authorization: Bearer ${SUPABASE_KEY}" \\
        -H "Content-Type: application/json" \\
        -H "Prefer: return=minimal" \\
        -d '${JSON.stringify(payload)}'`,
      { encoding: 'utf-8' }
    ).trim();

    if (response === '201') {
      totalInserted++;
      return true;
    } else if (response === '409') {
      totalSkipped++;
      return true; // Duplicate is ok
    } else {
      console.error(`  ERROR: HTTP ${response}`);
      return false;
    }
  } catch (e) {
    console.error(`  Exception: ${e}`);
    return false;
  }
}

async function scrapeCityPage(city: string, state: string, id: string, tz: string, page: number): Promise<number> {
  const citySlug = city.toLowerCase().replace(/\s+/g, '-');
  const url = `https://www.compass.com/agents/locations/${citySlug}-${state.toLowerCase()}/${id}/page-${page}/`;

  try {
    // Navigate
    execSync(`node scripts/chrome-tool.js navigate "${url}" > /dev/null 2>&1`);
    await new Promise(r => setTimeout(r, 2000));

    // Scroll all
    execSync(`node scripts/chrome-tool.js scroll-all > /dev/null 2>&1`);
    await new Promise(r => setTimeout(r, 1000));

    // Extract agents
    const result = execSync('node scripts/chrome-tool.js agents compass 2>/dev/null || echo "[]"', {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    });

    const agents = JSON.parse(result);
    if (!Array.isArray(agents) || agents.length === 0) {
      return 0;
    }

    let inserted = 0;
    for (const agent of agents) {
      const ok = await insertLead(agent, city, state, tz);
      if (ok) inserted++;
    }

    console.log(`    Page ${page}: ${agents.length} agents, ${inserted} inserted`);
    totalPages++;
    return agents.length;
  } catch (e) {
    console.error(`    Page ${page}: ERROR - ${e}`);
    return 0;
  }
}

async function main() {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`COMPASS BULK SCRAPER — ${new Date().toISOString()}`);
  console.log(`${'='.repeat(50)}\n`);

  for (const cityInfo of CITIES) {
    console.log(`\n📍 ${cityInfo.city}, ${cityInfo.state} (ID: ${cityInfo.id})`);
    console.log(`   Timezone: ${cityInfo.tz}`);

    let totalForCity = 0;
    for (let page = 1; page <= 5; page++) {
      const count = await scrapeCityPage(cityInfo.city, cityInfo.state, cityInfo.id, cityInfo.tz, page);
      totalForCity += count;

      if (count === 0) {
        console.log(`    → Exhausted at page ${page}`);
        break;
      }

      // Rate limiting
      await new Promise(r => setTimeout(r, 10000));
    }

    console.log(`   Subtotal: ${totalForCity} agents`);
    await new Promise(r => setTimeout(r, 45000)); // Between cities
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`COMPASS SCRAPING SESSION COMPLETE`);
  console.log(`${'='.repeat(50)}`);
  console.log(`Total pages scraped: ${totalPages}`);
  console.log(`Leads inserted: ${totalInserted}`);
  console.log(`Leads skipped: ${totalSkipped}`);
  console.log(`${'='.repeat(50)}\n`);
}

main().catch(console.error);
