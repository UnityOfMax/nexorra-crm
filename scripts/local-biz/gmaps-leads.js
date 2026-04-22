#!/usr/bin/env node
/**
 * Google Maps local business lead scraper.
 * Finds local businesses (restaurants, barbers, salons, etc.) that have:
 *   - No website, OR a bad/social-only website
 *   - Under 50 reviews
 *
 * Captures per listing: business name, phone, Google Maps URL, review count,
 * website URL (if any), Facebook URL (if any).
 *
 * Uses Chrome on port 9223. Stores in leads table (lead_category='website').
 * Extra fields go into personal_research jsonb.
 */

'use strict';

const puppeteer = require('puppeteer');
const https = require('https');
const fs = require('fs');

const PORT = 9223;
const DAILY_TARGET = 500;
const MAX_REVIEWS = 50;
const CITY_STATE_FILE = '/home/max/crm/agents/state/gmaps-city-pages.json';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Free / social-only website domains — treat as "no real website"
const BAD_WEBSITE_DOMAINS = [
  'facebook.com', 'fb.me', 'fb.com',
  'instagram.com', 'instagr.am',
  'yelp.com',
  'google.com', 'goo.gl',
  'linktr.ee', 'linktree.com',
  'wix.com', 'wixsite.com',
  'squarespace.com',
  'godaddysites.com',
  'weebly.com',
  'jimdo.com',
  'site123.com',
  'strikingly.com',
  'webnode.com',
  'yolasite.com',
  'wordpress.com',
  'blogspot.com',
  'tumblr.com',
];

function isBadWebsite(url) {
  if (!url) return true;
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return BAD_WEBSITE_DOMAINS.some(d => host === d || host.endsWith('.' + d));
  } catch { return true; }
}

const BUSINESS_TYPES = [
  'barber shop',
  'hair salon',
  'restaurant',
  'nail salon',
  'auto repair',
  'cleaning service',
  'landscaping',
  'plumber',
  'electrician',
  'pizza',
  'cafe',
  'tattoo shop',
  'dog groomer',
  'gym',
  'daycare',
  'car wash',
  'laundromat',
  'florist',
  'painter',
  'roofing',
];

const CITIES = [
  { name: 'Birmingham',     state: 'AL', tz: 'CST' },
  { name: 'Huntsville',     state: 'AL', tz: 'CST' },
  { name: 'Little Rock',    state: 'AR', tz: 'CST' },
  { name: 'Fresno',         state: 'CA', tz: 'PST' },
  { name: 'Bakersfield',    state: 'CA', tz: 'PST' },
  { name: 'Stockton',       state: 'CA', tz: 'PST' },
  { name: 'Colorado Springs', state: 'CO', tz: 'MST' },
  { name: 'Pueblo',         state: 'CO', tz: 'MST' },
  { name: 'Jacksonville',   state: 'FL', tz: 'EST' },
  { name: 'Tallahassee',    state: 'FL', tz: 'EST' },
  { name: 'Pensacola',      state: 'FL', tz: 'CST' },
  { name: 'Augusta',        state: 'GA', tz: 'EST' },
  { name: 'Macon',          state: 'GA', tz: 'EST' },
  { name: 'Savannah',       state: 'GA', tz: 'EST' },
  { name: 'Boise',          state: 'ID', tz: 'MST' },
  { name: 'Peoria',         state: 'IL', tz: 'CST' },
  { name: 'Rockford',       state: 'IL', tz: 'CST' },
  { name: 'Fort Wayne',     state: 'IN', tz: 'EST' },
  { name: 'Evansville',     state: 'IN', tz: 'CST' },
  { name: 'Des Moines',     state: 'IA', tz: 'CST' },
  { name: 'Wichita',        state: 'KS', tz: 'CST' },
  { name: 'Topeka',         state: 'KS', tz: 'CST' },
  { name: 'Lexington',      state: 'KY', tz: 'EST' },
  { name: 'Baton Rouge',    state: 'LA', tz: 'CST' },
  { name: 'Shreveport',     state: 'LA', tz: 'CST' },
  { name: 'Grand Rapids',   state: 'MI', tz: 'EST' },
  { name: 'Lansing',        state: 'MI', tz: 'EST' },
  { name: 'Flint',          state: 'MI', tz: 'EST' },
  { name: 'Jackson',        state: 'MS', tz: 'CST' },
  { name: 'Springfield',    state: 'MO', tz: 'CST' },
  { name: 'Billings',       state: 'MT', tz: 'MST' },
  { name: 'Omaha',          state: 'NE', tz: 'CST' },
  { name: 'Lincoln',        state: 'NE', tz: 'CST' },
  { name: 'Reno',           state: 'NV', tz: 'PST' },
  { name: 'Henderson',      state: 'NV', tz: 'PST' },
  { name: 'Albuquerque',    state: 'NM', tz: 'MST' },
  { name: 'Buffalo',        state: 'NY', tz: 'EST' },
  { name: 'Rochester',      state: 'NY', tz: 'EST' },
  { name: 'Syracuse',       state: 'NY', tz: 'EST' },
  { name: 'Greensboro',     state: 'NC', tz: 'EST' },
  { name: 'Durham',         state: 'NC', tz: 'EST' },
  { name: 'Winston-Salem',  state: 'NC', tz: 'EST' },
  { name: 'Fargo',          state: 'ND', tz: 'CST' },
  { name: 'Columbus',       state: 'OH', tz: 'EST' },
  { name: 'Cleveland',      state: 'OH', tz: 'EST' },
  { name: 'Cincinnati',     state: 'OH', tz: 'EST' },
  { name: 'Tulsa',          state: 'OK', tz: 'CST' },
  { name: 'Oklahoma City',  state: 'OK', tz: 'CST' },
  { name: 'Eugene',         state: 'OR', tz: 'PST' },
  { name: 'Salem',          state: 'OR', tz: 'PST' },
  { name: 'Allentown',      state: 'PA', tz: 'EST' },
  { name: 'Pittsburgh',     state: 'PA', tz: 'EST' },
  { name: 'Providence',     state: 'RI', tz: 'EST' },
  { name: 'Columbia',       state: 'SC', tz: 'EST' },
  { name: 'Sioux Falls',    state: 'SD', tz: 'CST' },
  { name: 'Memphis',        state: 'TN', tz: 'CST' },
  { name: 'Knoxville',      state: 'TN', tz: 'EST' },
  { name: 'Chattanooga',    state: 'TN', tz: 'EST' },
  { name: 'El Paso',        state: 'TX', tz: 'MST' },
  { name: 'Lubbock',        state: 'TX', tz: 'CST' },
  { name: 'Corpus Christi', state: 'TX', tz: 'CST' },
  { name: 'Laredo',         state: 'TX', tz: 'CST' },
  { name: 'Salt Lake City', state: 'UT', tz: 'MST' },
  { name: 'Provo',          state: 'UT', tz: 'MST' },
  { name: 'Norfolk',        state: 'VA', tz: 'EST' },
  { name: 'Richmond',       state: 'VA', tz: 'EST' },
  { name: 'Spokane',        state: 'WA', tz: 'PST' },
  { name: 'Tacoma',         state: 'WA', tz: 'PST' },
  { name: 'Milwaukee',      state: 'WI', tz: 'CST' },
  { name: 'Madison',        state: 'WI', tz: 'CST' },
  { name: 'Cheyenne',       state: 'WY', tz: 'MST' },
];

function log(msg) { console.log(`[${new Date().toISOString()}] ${msg}`); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function jitter(base) { return base + Math.floor(Math.random() * 1200); }

function formatPhone(p) {
  if (!p) return null;
  const d = p.replace(/\D/g, '');
  if (d.length === 10) return '+1' + d;
  if (d.length === 11 && d[0] === '1') return '+' + d;
  return null;
}

function loadCityState() {
  try { return JSON.parse(fs.readFileSync(CITY_STATE_FILE, 'utf8')); } catch { return {}; }
}

function saveCityState(state) {
  try { fs.writeFileSync(CITY_STATE_FILE, JSON.stringify(state, null, 2)); } catch {}
}

async function phoneExists(phone) {
  return new Promise((resolve) => {
    const u = new URL(`${SUPABASE_URL}/rest/v1/leads?select=id&phone=eq.${encodeURIComponent(phone)}&limit=1`);
    const req = https.request({
      hostname: u.hostname, path: u.pathname + u.search, method: 'GET',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    }, res => {
      let b = '';
      res.on('data', d => b += d);
      res.on('end', () => { try { resolve(JSON.parse(b).length > 0); } catch { resolve(false); } });
    });
    req.on('error', () => resolve(false));
    req.end();
  });
}

async function countTodayLeads() {
  return new Promise((resolve) => {
    const today = new Date().toISOString().split('T')[0];
    const u = new URL(`${SUPABASE_URL}/rest/v1/leads?select=id&lead_category=eq.website&created_at=gte.${today}T00:00:00Z`);
    const req = https.request({
      hostname: u.hostname, path: u.pathname + u.search, method: 'GET',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, Prefer: 'count=exact' },
    }, res => {
      const m = (res.headers['content-range'] || '').match(/\/(\d+)$/);
      resolve(m ? parseInt(m[1]) : 0);
    });
    req.on('error', () => resolve(0));
    req.end();
  });
}

async function insertLead(lead) {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      full_name:        lead.business_name,
      first_name:       lead.business_name.split(' ')[0],
      last_name:        lead.business_name.split(' ').slice(1).join(' ') || '',
      phone:            lead.phone,
      city:             lead.city,
      state_province:   lead.state,
      country:          'US',
      timezone:         lead.tz,
      profile_url:      lead.maps_url,
      lead_category:    'website',
      source_brokerage: lead.business_type,
      reviewer_name:    lead.reviewer_name || null,
      has_website:      lead.has_website,
    });
    const u = new URL(`${SUPABASE_URL}/rest/v1/leads`);
    const req = https.request({
      hostname: u.hostname, path: u.pathname, method: 'POST',
      headers: {
        apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body),
        Prefer: 'return=minimal',
      },
    }, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        if (res.statusCode >= 300) log(`  INSERT ERROR ${res.statusCode}: ${body.slice(0, 200)}`);
        resolve(res.statusCode < 300);
      });
    });
    req.on('error', e => { log(`  INSERT NETWORK ERROR: ${e.message}`); resolve(false); });
    req.write(body);
    req.end();
  });
}

// Extract all details from a listing page that's already loaded
async function extractListingDetails(page) {
  return page.evaluate(() => {
    // Phone — from data-item-id attribute (most reliable)
    let phone = null;
    document.querySelectorAll('[data-item-id]').forEach(el => {
      const id = el.getAttribute('data-item-id') || '';
      if (id.startsWith('phone:tel:')) phone = id.replace('phone:tel:', '').trim();
    });
    if (!phone) {
      const telLink = document.querySelector('a[href^="tel:"]');
      if (telLink) phone = telLink.href.replace('tel:', '').trim();
    }

    // Website URL — the authority link
    let website_url = null;
    const websiteEl = document.querySelector('a[data-item-id="authority"]');
    if (websiteEl) website_url = websiteEl.href;

    // Facebook URL — look for facebook.com links in the page
    let facebook_url = null;
    document.querySelectorAll('a[href]').forEach(a => {
      if (!facebook_url && a.href.includes('facebook.com/') &&
          !a.href.includes('facebook.com/share') &&
          !a.href.includes('facebook.com/sharer') &&
          !a.href.includes('facebook.com/dialog')) {
        facebook_url = a.href;
      }
    });

    // Review count — "X reviews" in page text
    let review_count = null;
    const bodyText = document.body.innerText || '';
    const rm = bodyText.match(/(\d[\d,]*)\s+reviews?/i);
    if (rm) review_count = parseInt(rm[1].replace(/,/g, ''));

    // Current page URL (the canonical Maps listing URL)
    const maps_url = window.location.href;

    // Business name — h1 that is NOT "Results" (the search panel heading)
    // Fallback: decode from URL path /maps/place/Business+Name/...
    let name = null;
    document.querySelectorAll('h1').forEach(el => {
      const t = el.innerText.trim();
      if (t && t !== 'Results' && t.length > 1) name = t;
    });
    if (!name && maps_url.includes('/maps/place/')) {
      try {
        const seg = maps_url.split('/maps/place/')[1].split('/')[0];
        name = decodeURIComponent(seg.replace(/\+/g, ' '));
      } catch {}
    }

    // Reviewer name — scoped inside [data-review-id] so we only hit customer review cards,
    // never the business listing header photo (which is outside any review container).
    let reviewer_name = null;
    const bizNameLower = (name || '').toLowerCase().trim();
    const reviewEl = document.querySelector('[data-review-id]');
    if (reviewEl) {
      const photoBtn = reviewEl.querySelector('button[aria-label^="Photo of "]');
      if (photoBtn) {
        const t = photoBtn.getAttribute('aria-label').replace('Photo of ', '').trim();
        if (t && t.toLowerCase() !== bizNameLower && t.length > 1 && t.length < 60) {
          reviewer_name = t;
        }
      }
    }

    return { name, phone, website_url, facebook_url, review_count, maps_url, reviewer_name };
  });
}

async function scrapeSearch(page, city, businessType) {
  const query = `${businessType} ${city.name} ${city.state}`;
  const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;

  log(`  Searching: "${query}"`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await sleep(jitter(2000));

  try {
    await page.waitForSelector('[role="feed"]', { timeout: 8000 });
  } catch {
    log(`  No results panel — skipping`);
    return [];
  }

  // Scroll to load more results
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => {
      const feed = document.querySelector('[role="feed"]');
      if (feed) feed.scrollTop = feed.scrollHeight;
    });
    await sleep(800);
  }

  // Collect listing URLs from the results panel
  const listingUrls = await page.evaluate(() => {
    const seen = new Set();
    const urls = [];
    document.querySelectorAll('[role="feed"] a[href*="/maps/place/"]').forEach(a => {
      if (!seen.has(a.href)) { seen.add(a.href); urls.push(a.href); }
    });
    return urls.slice(0, 20);
  });

  log(`  Found ${listingUrls.length} listings`);
  const leads = [];

  for (let idx = 0; idx < listingUrls.length; idx++) {
    let openedPanel = false;
    try {
      // Navigate using page.goto() — we already have the URL from the upfront collection.
      // Avoids page.evaluate() window.location.href trick which detaches the frame.
      const listingUrl = listingUrls[idx];
      if (!listingUrl) continue;

      await page.goto(listingUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      openedPanel = true;
      // Wait for review cards to appear (gives us reviewer names).
      // Falls through immediately after 3s if the business has no reviews.
      await page.waitForSelector('[data-review-id]', { timeout: 3000 }).catch(() => {});
      await sleep(jitter(600));

      const info = await extractListingDetails(page);

      // Apply filters — all use if blocks, not continue, so the finally block always runs
      let skip = false;
      if (!info.name || info.name === 'Results') {
        log(`  Skip: (no valid name)`); skip = true;
      } else if (info.review_count !== null && info.review_count >= MAX_REVIEWS) {
        log(`  Skip: ${info.name} (${info.review_count} reviews)`); skip = true;
      } else if (info.website_url && !isBadWebsite(info.website_url)) {
        log(`  Skip: ${info.name} (has real website: ${info.website_url.slice(0, 50)})`); skip = true;
      } else if (!info.phone) {
        log(`  Skip: ${info.name} (no phone)`); skip = true;
      }

      if (!skip) {
        const phone = formatPhone(info.phone);
        if (phone) {
          if (await phoneExists(phone)) {
            log(`  Dupe: ${info.name} (${phone})`);
          } else {
            const lead = {
              business_name:  info.name,
              phone,
              city:           city.name,
              state:          city.state,
              tz:             city.tz,
              maps_url:       info.maps_url,
              website_url:    info.website_url,
              facebook_url:   info.facebook_url,
              review_count:   info.review_count,
              business_type:  businessType,
              reviewer_name:  info.reviewer_name || null,
              has_website:    !!info.website_url,
            };
            const websiteNote = info.website_url ? ` | web: ${info.website_url.slice(0, 40)}` : ' | no website';
            const fbNote = info.facebook_url ? ' | has FB' : '';
            log(`  + "${info.name}" (${info.review_count ?? '?'} reviews${websiteNote}${fbNote}) — ${phone}`);
            leads.push(lead);
          }
        }
      }

    } catch (err) {
      log(`  Error: ${err.message.slice(0, 80)}`);
    } finally {
      // Always return to the search results panel before the next iteration
      if (openedPanel) {
        await page.goBack({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
        await page.waitForSelector('[role="feed"]', { timeout: 8000 }).catch(() => {});
        await sleep(jitter(400));
      }
    }
  }

  return leads;
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) { log('ERROR: Missing Supabase env vars'); process.exit(1); }

  log('=== Google Maps local business scraper ===');
  log(`Filter: no/bad website + under ${MAX_REVIEWS} reviews`);

  let browser;
  try {
    browser = await puppeteer.connect({ browserURL: `http://localhost:${PORT}`, defaultViewport: null });
  } catch (err) {
    log(`ERROR: Cannot connect to Chrome on port ${PORT}: ${err.message}`);
    process.exit(1);
  }

  const todayStart = await countTodayLeads();
  log(`Website leads already today: ${todayStart}`);
  if (todayStart >= DAILY_TARGET) {
    log('Daily target reached — exiting');
    browser.disconnect();
    return;
  }

  // Close leftover Maps tabs from previous killed runs
  const existingPages = await browser.pages();
  for (const p of existingPages) {
    const url = p.url();
    if (url.includes('google.com/maps') || url.includes('maps/place') || url.includes('maps/search')) {
      await p.close().catch(() => {});
    }
  }

  const cityState = loadCityState();
  const today = new Date().toISOString().split('T')[0];

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

  let totalSaved = 0;

  try {
    outer: for (const city of CITIES) {
      const cityKey = `${city.name}_${city.state}`;
      const doneBizTypes = (cityState[cityKey]?.date === today) ? (cityState[cityKey].types || []) : [];
      const pendingTypes = BUSINESS_TYPES.filter(t => !doneBizTypes.includes(t));

      for (const businessType of pendingTypes) {
        if (todayStart + totalSaved >= DAILY_TARGET) {
          log('Daily target reached — stopping');
          break outer;
        }

        log(`\n=== ${city.name}, ${city.state} — "${businessType}" ===`);

        try {
          const leads = await scrapeSearch(page, city, businessType);
          for (const lead of leads) {
            if (await insertLead(lead)) totalSaved++;
          }
        } catch (err) {
          log(`ERROR: ${err.message}`);
        }

        // Mark this type as done for today
        if (!cityState[cityKey] || cityState[cityKey].date !== today) {
          cityState[cityKey] = { date: today, types: [] };
        }
        cityState[cityKey].types.push(businessType);
        saveCityState(cityState);

        await sleep(jitter(2000));
      }
    }
  } finally {
    await page.close().catch(() => {});
    browser.disconnect();
    log(`\n=== Done: ${totalSaved} website leads saved ===`);
  }
}

main().catch(err => { log(`FATAL: ${err.message}`); process.exit(1); });
