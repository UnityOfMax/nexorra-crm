#!/usr/bin/env node
/**
 * Research the 4 booked leads online: Google, Yelp, Houzz, website
 * Uses Chrome port 9232
 */

const puppeteer = require('puppeteer');
const https = require('https');

const CHROME_PORT = 9232;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const LEADS = [
  { name: 'Denver Patios', phone: '+17204368401', type: 'landscaping', city: 'Denver', state: 'CO' },
  { name: 'JMZ Contracting', phone: '+17802962696', type: 'roofing contractor', city: 'Edmonton', state: 'AB' },
  { name: 'PFD Remodeling', phone: '+13202487473', type: 'bathroom remodel', city: 'St Cloud', state: 'MN' },
  { name: 'Windy Acres Cabinetry', phone: '+17808975535', type: 'kitchen remodel', city: 'Edmonton', state: 'AB' },
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function log(msg) { console.log(`[${new Date().toISOString().slice(11,19)}] ${msg}`); }

async function searchGoogle(page, query) {
  log(`Searching Google: ${query}`);
  await page.goto(`https://www.google.com/search?q=${encodeURIComponent(query)}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await sleep(1500);

  return await page.evaluate(() => {
    const results = [];
    // Organic result links
    document.querySelectorAll('a[href]').forEach(a => {
      const href = a.href;
      if (href && !href.includes('google.com') && !href.includes('youtube.com') &&
          href.startsWith('http') && !href.includes('accounts.') &&
          !href.includes('policies.') && !href.includes('support.')) {
        const title = a.closest('[data-hveid]')?.querySelector('h3')?.textContent?.trim() ||
                      a.querySelector('h3')?.textContent?.trim() || '';
        const snippet = a.closest('[data-hveid]')?.querySelector('[data-sncf]')?.textContent?.trim() ||
                        a.closest('[data-hveid]')?.querySelector('div:not(h3)')?.textContent?.trim() || '';
        if (title || snippet) {
          results.push({ url: href, title, snippet: snippet.slice(0, 200) });
        }
      }
    });
    // Knowledge panel info
    const kp = {};
    const rating = document.querySelector('[aria-label*="stars"], [aria-label*="rating"]')?.getAttribute('aria-label') || '';
    const address = document.querySelector('[data-dtype="d3adr"]')?.textContent?.trim() || '';
    const phone = document.querySelector('[data-dtype="d3ph"]')?.textContent?.trim() || '';
    const website = document.querySelector('a[href*="website"]')?.href || '';
    if (rating) kp.rating = rating;
    if (address) kp.address = address;
    if (phone) kp.phone = phone;
    if (website) kp.website = website;
    return { results: results.slice(0, 5), kp };
  });
}

async function scrapeWebsite(page, url, businessName) {
  log(`Visiting website: ${url}`);
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 12000 });
    await sleep(1000);
    return await page.evaluate((name) => {
      const getTexts = (selectors) => {
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el?.textContent?.trim()) return el.textContent.trim().slice(0, 300);
        }
        return '';
      };
      const headline = getTexts(['h1', '.hero h1', '.banner h1', 'header h1']);
      const subhead = getTexts(['h2', '.hero h2', '.subtitle', '.tagline', 'header p']);
      const about = getTexts(['.about', '#about', '[class*="about"] p', 'main p']);
      const phone = document.body.innerText.match(/\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}/)?.[0] || '';
      // Services
      const serviceEls = document.querySelectorAll('[class*="service"] h3, [class*="service"] h2, .services li, ul li');
      const services = Array.from(serviceEls).slice(0, 8).map(el => el.textContent.trim()).filter(t => t.length > 3 && t.length < 80);
      // Photos — find real image URLs
      const imgs = Array.from(document.querySelectorAll('img[src]'))
        .filter(img => {
          const src = img.src;
          return src && src.startsWith('http') && !src.includes('logo') && !src.includes('icon') &&
                 !src.includes('arrow') && !src.includes('social') && (img.naturalWidth || 0) > 200;
        })
        .map(img => img.src)
        .slice(0, 6);
      return { headline, subhead, about, phone, services, images: imgs };
    }, businessName);
  } catch (e) {
    log(`Website scrape failed: ${e.message}`);
    return null;
  }
}

async function searchYelp(page, query, city) {
  log(`Searching Yelp: ${query} in ${city}`);
  try {
    await page.goto(`https://www.yelp.com/search?find_desc=${encodeURIComponent(query)}&find_loc=${encodeURIComponent(city)}`,
      { waitUntil: 'domcontentloaded', timeout: 12000 });
    await sleep(1500);
    return await page.evaluate(() => {
      const firstResult = document.querySelector('[class*="businessName"]');
      const rating = document.querySelector('[aria-label*="star"]')?.getAttribute('aria-label') || '';
      const reviewCount = document.querySelector('[class*="reviewCount"]')?.textContent?.trim() || '';
      const snippet = document.querySelector('[class*="snippet"]')?.textContent?.trim() || '';
      const photos = Array.from(document.querySelectorAll('img[src*="yelp"]'))
        .filter(img => img.src.includes('bphoto') || img.src.includes('photo'))
        .map(img => img.src)
        .slice(0, 4);
      return { name: firstResult?.textContent?.trim() || '', rating, reviewCount, snippet, photos };
    });
  } catch (e) {
    log(`Yelp search failed: ${e.message}`);
    return null;
  }
}

async function researchLead(page, lead) {
  log(`\n=== Researching: ${lead.name} ===`);
  const result = { ...lead, googleData: null, websiteData: null, yelpData: null };

  // 1. Google search
  const googleQuery = `${lead.name} ${lead.city} ${lead.state} contractor`;
  const google = await searchGoogle(page, googleQuery);
  result.googleData = google;
  log(`Google: found ${google.results.length} results`);
  if (google.kp.rating) log(`  Rating: ${google.kp.rating}`);
  if (google.kp.address) log(`  Address: ${google.kp.address}`);

  // 2. Find and visit their website
  let websiteUrl = null;
  for (const r of google.results) {
    const url = r.url;
    // Skip directories and social media
    if (!url.includes('yelp.') && !url.includes('facebook.') && !url.includes('linkedin.') &&
        !url.includes('yellowpages.') && !url.includes('bbb.org') && !url.includes('houzz.') &&
        !url.includes('angi.') && !url.includes('thumbtack.') && !url.includes('google.')) {
      websiteUrl = url;
      log(`  Website candidate: ${url}`);
      break;
    }
  }
  if (!websiteUrl && google.kp.website) {
    websiteUrl = google.kp.website;
  }

  if (websiteUrl) {
    result.websiteUrl = websiteUrl;
    result.websiteData = await scrapeWebsite(page, websiteUrl, lead.name);
    if (result.websiteData) {
      log(`  Headline: ${result.websiteData.headline?.slice(0,60)}`);
      log(`  Services: ${result.websiteData.services?.slice(0,3).join(', ')}`);
      log(`  Images found: ${result.websiteData.images?.length || 0}`);
    }
  }
  await sleep(1000);

  // 3. Yelp search
  const yelp = await searchYelp(page, lead.name, `${lead.city} ${lead.state}`);
  result.yelpData = yelp;
  if (yelp?.rating) log(`  Yelp rating: ${yelp.rating}`);
  if (yelp?.reviewCount) log(`  Yelp reviews: ${yelp.reviewCount}`);

  await sleep(1000);
  return result;
}

async function main() {
  log('Connecting to Chrome...');
  const browser = await puppeteer.connect({
    browserURL: `http://localhost:${CHROME_PORT}`,
    defaultViewport: { width: 1280, height: 800 },
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  const allData = [];
  for (const lead of LEADS) {
    const data = await researchLead(page, lead);
    allData.push(data);
    await sleep(2000);
  }

  await page.close();

  // Save results
  const outputPath = 'agents/state/booked-leads-research.json';
  require('fs').writeFileSync(outputPath, JSON.stringify(allData, null, 2));
  log(`\nResults saved to ${outputPath}`);

  // Print summary
  console.log('\n=== SUMMARY ===');
  for (const d of allData) {
    console.log(`\n${d.name}:`);
    console.log(`  Website: ${d.websiteUrl || 'not found'}`);
    if (d.websiteData?.headline) console.log(`  Headline: ${d.websiteData.headline.slice(0,80)}`);
    if (d.websiteData?.services?.length) console.log(`  Services: ${d.websiteData.services.slice(0,4).join(' | ')}`);
    if (d.googleData?.kp?.address) console.log(`  Address: ${d.googleData.kp.address}`);
    if (d.yelpData?.rating) console.log(`  Yelp: ${d.yelpData.rating} (${d.yelpData.reviewCount})`);
  }
}

main().catch(console.error);
