#!/usr/bin/env node
/**
 * Google Maps → CRM leads scraper.
 * Finds real estate agents/companies with no website on Google Maps.
 * Uses Outscraper API. Inserts as lead_category='website' in leads table.
 *
 * Usage: node scripts/local-biz/gmaps-leads.js
 * Env:   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OUTSCRAPER_API_KEY
 */

'use strict';

const https = require('https');

const TARGET_PER_TZ = 250;
const OUTSCRAPER_BASE = 'https://api.app.outscraper.com';
const POLL_INTERVAL_MS = 5000;
const MAX_WAIT_MS = 5 * 60 * 1000;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OUTSCRAPER_KEY = process.env.OUTSCRAPER_API_KEY;

const TZ_CITIES = {
  EST: [
    { name: 'New York', state: 'NY' },
    { name: 'Miami', state: 'FL' },
    { name: 'Atlanta', state: 'GA' },
    { name: 'Charlotte', state: 'NC' },
    { name: 'Philadelphia', state: 'PA' },
    { name: 'Boston', state: 'MA' },
    { name: 'Orlando', state: 'FL' },
    { name: 'Tampa', state: 'FL' },
  ],
  CST: [
    { name: 'Houston', state: 'TX' },
    { name: 'Dallas', state: 'TX' },
    { name: 'Chicago', state: 'IL' },
    { name: 'San Antonio', state: 'TX' },
    { name: 'Austin', state: 'TX' },
    { name: 'Minneapolis', state: 'MN' },
    { name: 'Nashville', state: 'TN' },
    { name: 'Kansas City', state: 'MO' },
  ],
  MST: [
    { name: 'Phoenix', state: 'AZ' },
    { name: 'Denver', state: 'CO' },
    { name: 'Tucson', state: 'AZ' },
    { name: 'Colorado Springs', state: 'CO' },
    { name: 'Albuquerque', state: 'NM' },
    { name: 'Salt Lake City', state: 'UT' },
    { name: 'Mesa', state: 'AZ' },
    { name: 'Aurora', state: 'CO' },
  ],
  PST: [
    { name: 'Los Angeles', state: 'CA' },
    { name: 'San Diego', state: 'CA' },
    { name: 'San Francisco', state: 'CA' },
    { name: 'Seattle', state: 'WA' },
    { name: 'Portland', state: 'OR' },
    { name: 'Sacramento', state: 'CA' },
    { name: 'Las Vegas', state: 'NV' },
    { name: 'San Jose', state: 'CA' },
  ],
};

const COUNTRY_BY_STATE = {
  AZ: 'US', CO: 'US', NM: 'US', UT: 'US',
  CA: 'US', WA: 'US', OR: 'US', NV: 'US',
  NY: 'US', FL: 'US', GA: 'US', NC: 'US', PA: 'US', MA: 'US',
  TX: 'US', IL: 'US', MN: 'US', TN: 'US', MO: 'US',
};

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── HTTP helpers ──────────────────────────────────────────────────────────────

function httpsRequest(opts, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// ── Outscraper ────────────────────────────────────────────────────────────────

async function searchPlaces(query, limit = 50) {
  const params = new URLSearchParams({
    query,
    limit: String(limit),
    async: 'true',
    fields: 'place_id,name,phone,site,full_address,city,state,country_code,rating,reviews',
  });

  const url = new URL(`${OUTSCRAPER_BASE}/maps/search-v3?${params}`);
  const res = await httpsRequest({
    hostname: url.hostname,
    path: url.pathname + url.search,
    method: 'GET',
    headers: { 'X-API-KEY': OUTSCRAPER_KEY },
  });

  if (res.status !== 200) {
    log(`  Outscraper error ${res.status}: ${JSON.stringify(res.body).slice(0, 200)}`);
    return [];
  }

  const data = res.body;

  // Synchronous response
  if (data.status === 'Success' && data.data) {
    return flattenResults(data.data);
  }

  // Async job — poll
  const jobId = data.id;
  if (!jobId) { log('  No job ID from Outscraper'); return []; }

  return pollJob(jobId);
}

async function pollJob(jobId) {
  const deadline = Date.now() + MAX_WAIT_MS;
  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);
    const url = new URL(`${OUTSCRAPER_BASE}/requests/${jobId}`);
    const res = await httpsRequest({
      hostname: url.hostname,
      path: url.pathname,
      method: 'GET',
      headers: { 'X-API-KEY': OUTSCRAPER_KEY },
    });
    const d = res.body;
    if (d.status === 'Success') return flattenResults(d.data || []);
    if (d.status === 'Error' || d.status === 'Cancelled') {
      log(`  Outscraper job ${jobId} failed: ${d.status}`);
      return [];
    }
  }
  log(`  Outscraper job ${jobId} timed out`);
  return [];
}

function flattenResults(data) {
  const flat = [];
  for (const batch of data) {
    if (Array.isArray(batch)) { for (const item of batch) flat.push(item); }
    else if (batch && typeof batch === 'object') flat.push(batch);
  }
  return flat;
}

// ── Supabase ──────────────────────────────────────────────────────────────────

async function checkExistingByPhone(phone) {
  const u = new URL(`${SUPABASE_URL}/rest/v1/leads?phone=eq.${encodeURIComponent(phone)}&select=id&limit=1`);
  const res = await httpsRequest({
    hostname: u.hostname,
    path: u.pathname + u.search,
    method: 'GET',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
  });
  return Array.isArray(res.body) && res.body.length > 0;
}

async function saveLead(lead) {
  const body = JSON.stringify(lead);
  const u = new URL(`${SUPABASE_URL}/rest/v1/leads`);
  const res = await httpsRequest({
    hostname: u.hostname,
    path: u.pathname,
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
  }, body);
  return { ok: res.status < 300, status: res.status };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) { log('ERROR: Missing SUPABASE env vars'); process.exit(1); }
  if (!OUTSCRAPER_KEY) { log('ERROR: Missing OUTSCRAPER_API_KEY'); process.exit(1); }

  log('=== Google Maps leads scraper started ===');

  let totalSaved = 0;
  const tzSaved = { EST: 0, CST: 0, MST: 0, PST: 0 };

  for (const [tz, cities] of Object.entries(TZ_CITIES)) {
    log(`\n=== ${tz} (target: ${TARGET_PER_TZ}) ===`);

    for (const { name: cityName, state } of cities) {
      if (tzSaved[tz] >= TARGET_PER_TZ) break;

      const query = `real estate agent ${cityName} ${state}`;
      log(`Searching: "${query}"`);

      const places = await searchPlaces(query, 50).catch(e => { log(`  Error: ${e.message}`); return []; });

      // Filter to no-website entries
      const noWebsite = places.filter(p => !p.site);
      log(`  ${places.length} results, ${noWebsite.length} without website`);

      for (const place of noWebsite) {
        if (tzSaved[tz] >= TARGET_PER_TZ) break;

        if (!place.phone) continue;
        // Normalize phone
        const digits = place.phone.replace(/\D/g, '');
        let phone = null;
        if (digits.length === 10) phone = '+1' + digits;
        else if (digits.length === 11 && digits[0] === '1') phone = '+' + digits;
        if (!phone) continue;

        // Dedup by phone
        const exists = await checkExistingByPhone(phone).catch(() => false);
        if (exists) continue;

        const nameParts = (place.name || '').trim().split(' ');
        const country = COUNTRY_BY_STATE[state] || 'US';

        const result = await saveLead({
          full_name: place.name || '',
          first_name: nameParts[0] || '',
          last_name: nameParts.slice(1).join(' ') || '',
          phone,
          email: null,
          profile_url: null,
          source_brokerage: 'Google Maps',
          country,
          state_province: state,
          city: cityName,
          timezone: tz,
          lead_category: 'website',
        });

        if (result.ok) {
          tzSaved[tz]++;
          totalSaved++;
          log(`  ✓ Saved: ${place.name} ${phone} (${tz}: ${tzSaved[tz]}/${TARGET_PER_TZ})`);
        } else if (result.status === 409) {
          // duplicate
        } else {
          log(`  ✗ Error ${result.status}`);
        }
      }
    }
  }

  log(`\n=== Done: ${totalSaved} website leads saved (EST:${tzSaved.EST} CST:${tzSaved.CST} MST:${tzSaved.MST} PST:${tzSaved.PST}) ===`);
}

main().catch(e => { log(`FATAL: ${e.message}`); process.exit(1); });
