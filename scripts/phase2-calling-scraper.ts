#!/usr/bin/env npx tsx

import { execSync } from 'child_process';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Cities in EST/CST/MST/PST timezone balance - targeting ~350 calling + 350 instagram leads
const CITIES = [
  // EST (need ~90 leads)
  { city: 'Jacksonville', state: 'FL', brokerage: 'remax', tz: 'EST' },
  { city: 'Tampa',        state: 'FL', brokerage: 'remax', tz: 'EST' },
  { city: 'Miami',        state: 'FL', brokerage: 'remax', tz: 'EST' },
  { city: 'Atlanta',      state: 'GA', brokerage: 'remax', tz: 'EST' },
  { city: 'Philadelphia', state: 'PA', brokerage: 'century21', tz: 'EST' },
  { city: 'Boston',       state: 'MA', brokerage: 'remax', tz: 'EST' },
  // CST (need ~90 leads)
  { city: 'Houston',      state: 'TX', brokerage: 'century21', tz: 'CST' },
  { city: 'Dallas',       state: 'TX', brokerage: 'century21', tz: 'CST' },
  { city: 'Austin',       state: 'TX', brokerage: 'remax', tz: 'CST' },
  { city: 'San Antonio',  state: 'TX', brokerage: 'remax', tz: 'CST' },
  { city: 'Chicago',      state: 'IL', brokerage: 'century21', tz: 'CST' },
  // MST (need ~85 leads)
  { city: 'Phoenix',      state: 'AZ', brokerage: 'remax', tz: 'MST' },
  { city: 'Denver',       state: 'CO', brokerage: 'century21', tz: 'MST' },
  { city: 'Las Vegas',    state: 'NV', brokerage: 'remax', tz: 'MST' },
  // PST (need ~85 leads)
  { city: 'Los Angeles',  state: 'CA', brokerage: 'century21', tz: 'PST' },
  { city: 'San Francisco',state: 'CA', brokerage: 'remax', tz: 'PST' },
  { city: 'San Diego',    state: 'CA', brokerage: 'remax', tz: 'PST' },
  { city: 'Seattle',      state: 'WA', brokerage: 'century21', tz: 'PST' },
];

const SKIP_PATTERNS = /LLC|Inc|Corp|Team|Group|Realty|Properties|Homes|Agency/i;
// Max RE/MAX profile visits per city — each takes ~5s; 20 × 12 cities = ~20 min
const MAX_PROFILES_PER_CITY = 20;

let totalInstagram = 0;
let totalCalling = 0;

function normalizeTitle(name: string): string {
  if (!name) return '';
  return name.split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function normalizePhone(phone: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) return `+1${cleaned}`;
  if (cleaned.length === 11 && cleaned.startsWith('1')) return `+${cleaned}`;
  if (cleaned.length >= 11) return `+${cleaned.slice(-11)}`;
  return `+1${cleaned}`;
}

function isValidName(name: string): boolean {
  if (!name || name.length < 3) return false;
  if (SKIP_PATTERNS.test(name)) return false;
  const words = name.trim().split(/\s+/);
  return words.length >= 2 && words.length <= 4;
}

/**
 * Insert a lead. Instagram takes priority over phone number.
 * - Has instagram_handle → lead_category = 'instagram'
 * - Has phone only → lead_category = 'calling'
 * - Neither → skip
 */
async function insertLead(agent: any, city: string, state: string, tz: string, brokerage: string): Promise<'instagram' | 'calling' | null> {
  const fullName = agent.full_name;
  const instagram = agent.instagram_handle || null;
  const phone = agent.phone || null;

  if (!isValidName(fullName)) return null;
  if (!instagram && !phone) return null;

  // Instagram takes priority
  const lead_category = instagram ? 'instagram' : 'calling';

  const payload: Record<string, any> = {
    full_name:            normalizeTitle(fullName),
    first_name:           normalizeTitle(agent.first_name || ''),
    last_name:            normalizeTitle(agent.last_name || ''),
    email:                null,
    phone:                phone ? normalizePhone(phone) : null,
    profile_url:          agent.profile_url || null,
    profile_picture_url:  agent.profile_picture_url || null,
    source_brokerage:     brokerage,
    lead_category,
    country:              'US',
    state_province:       state,
    city,
    timezone:             tz,
    instagram_handle:     instagram,
  };

  try {
    const cmd = `curl -s -w "%{http_code}" -o /dev/null -X POST "${SUPABASE_URL}/rest/v1/leads" \
      -H "apikey: ${SUPABASE_KEY}" \
      -H "Authorization: Bearer ${SUPABASE_KEY}" \
      -H "Content-Type: application/json" \
      -H "Prefer: return=minimal" \
      -d '${JSON.stringify(payload)}'`;

    const response = execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();

    if (response === '201') {
      if (lead_category === 'instagram') totalInstagram++;
      else totalCalling++;
      return lead_category;
    } else if (response === '409') {
      return lead_category; // Duplicate — already counted
    }
  } catch (_e) {}

  return null;
}

async function scrapeCity(city: string, state: string, brokerage: string, tz: string): Promise<{ instagram: number; calling: number }> {
  console.log(`\n📍 ${city}, ${state} — ${brokerage.toUpperCase()}`);

  let url = '';
  if (brokerage === 'remax') {
    const citySlug = city.toLowerCase().replace(/\s+/g, '-');
    url = `https://www.remax.com/real-estate-agents/${citySlug}-${state.toLowerCase()}`;
  } else if (brokerage === 'century21') {
    const citySlug = city.toLowerCase().replace(/\s+/g, '-');
    url = `https://www.century21.com/agent/list/city/${state.toLowerCase()}/${citySlug}?page=1`;
  }

  let instaCount = 0;
  let callCount = 0;

  try {
    execSync(`node scripts/chrome-tool.js navigate "${url}"`, { stdio: 'ignore', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));
    execSync(`node scripts/chrome-tool.js scroll-all`, { stdio: 'ignore' });
    await new Promise(r => setTimeout(r, 1000));

    let extracted = '';
    if (brokerage === 'remax') {
      extracted = execSync(`node scripts/chrome-tool.js agents remax 2>/dev/null || echo "[]"`, {
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
        stdio: ['pipe', 'pipe', 'ignore'],
      });
    } else if (brokerage === 'century21') {
      extracted = execSync(`node scripts/chrome-tool.js agents century21 2>/dev/null || echo "[]"`, {
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
        stdio: ['pipe', 'pipe', 'ignore'],
      });
    }

    const agents: any[] = JSON.parse(extracted);
    if (!Array.isArray(agents) || agents.length === 0) {
      console.log(`  0 agents found`);
      return { instagram: 0, calling: 0 };
    }

    console.log(`  ${agents.length} agents on listing page`);

    if (brokerage === 'remax') {
      // RE/MAX listing pages don't have Instagram — must visit each profile.
      // Limit per-city visits to keep total time reasonable.
      const toVisit = agents.slice(0, MAX_PROFILES_PER_CITY);
      console.log(`  Visiting ${toVisit.length} profiles for Instagram + phone...`);

      for (const agent of toVisit) {
        if (!agent.profile_url) continue;

        try {
          execSync(`node scripts/chrome-tool.js navigate "${agent.profile_url}"`, { stdio: 'ignore', timeout: 15000 });
          await new Promise(r => setTimeout(r, 3000));
          // Scroll to load the Social Media section (lazy-loaded)
          execSync(`node scripts/chrome-tool.js scroll-all`, { stdio: 'ignore' });
          await new Promise(r => setTimeout(r, 800));

          const profileRaw = execSync(`node scripts/chrome-tool.js profile remax 2>/dev/null || echo "{}"`, {
            encoding: 'utf-8',
            maxBuffer: 1024 * 1024,
            stdio: ['pipe', 'pipe', 'ignore'],
          });
          const profile = JSON.parse(profileRaw.trim() || '{}');

          const enriched = {
            ...agent,
            full_name:        profile.full_name || agent.full_name,
            phone:            profile.phone || agent.phone || null,
            instagram_handle: profile.instagram_handle || null,
          };

          const result = await insertLead(enriched, city, state, tz, brokerage);
          if (result === 'instagram') {
            instaCount++;
            console.log(`  📸 ${enriched.full_name} → instagram (@${enriched.instagram_handle})`);
          } else if (result === 'calling') {
            callCount++;
          }

          await new Promise(r => setTimeout(r, 1500));
        } catch (_e) {
          // Profile visit failed — skip and continue
        }
      }
    } else {
      // Century 21: listing page has phones directly, no profile visit needed
      for (const agent of agents) {
        const result = await insertLead(agent, city, state, tz, brokerage);
        if (result === 'instagram') instaCount++;
        else if (result === 'calling') callCount++;
      }
    }

    console.log(`  ✓ ${city}: ${instaCount} instagram, ${callCount} calling`);
    return { instagram: instaCount, calling: callCount };
  } catch (e) {
    console.log(`  Error: ${(e as any).message}`);
    return { instagram: 0, calling: 0 };
  }
}

async function main() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`PHASE 2 — INSTAGRAM + CALLING LEADS SCRAPER`);
  console.log(`RE/MAX: visits each profile → Instagram first, phone fallback`);
  console.log(`Century 21: listing page phones (no profile visit needed)`);
  console.log(`${'='.repeat(60)}`);

  for (const cityInfo of CITIES) {
    await scrapeCity(cityInfo.city, cityInfo.state, cityInfo.brokerage, cityInfo.tz);
    await new Promise(r => setTimeout(r, 12000)); // Rate limiting between cities
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`PHASE 2 COMPLETE`);
  console.log(`Instagram leads: ${totalInstagram}`);
  console.log(`Calling leads:   ${totalCalling}`);
  console.log(`${'='.repeat(60)}\n`);
}

main().catch(console.error);
