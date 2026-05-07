#!/usr/bin/env tsx
/**
 * Rebuild demos for the 4 booked leads using GMB names + enriched online data.
 * Deletes existing demos and rebuilds with website/Yelp/Houzz data injected.
 */
import puppeteer from 'puppeteer';
import https from 'https';
import { buildProspectDemo, type ProspectResearchData } from '../../lib/local-biz/prospect-demo-builder';

const CHROME_PORT = 9232;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
function log(msg: string) { console.log(`[${new Date().toISOString().slice(11,19)}] ${msg}`); }

function supa(method: string, path: string, body?: unknown): Promise<{ status: number; data: unknown }> {
  return new Promise((resolve, reject) => {
    const u = new URL(`${SUPABASE_URL}/rest/v1/${path}`);
    const payload = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: u.hostname, path: u.pathname + u.search, method,
      headers: {
        apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json', Prefer: 'return=representation',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode!, data: d ? JSON.parse(d) : null }); }
        catch { resolve({ status: res.statusCode!, data: d }); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function deleteOldDemos(gmb_name: string) {
  const slug_prefix = gmb_name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const { data } = await supa('GET', `landing_pages?slug=like.demo-*${slug_prefix.slice(0,20)}*&select=id,slug`);
  const rows = (data as any[]) || [];
  for (const row of rows) {
    await supa('DELETE', `landing_pages?id=eq.${row.id}`);
    log(`  Deleted: ${row.slug}`);
  }
  return rows.length;
}

async function scrapeGMaps(page: any, phone: string): Promise<any> {
  const q = encodeURIComponent(phone);
  await page.goto(`https://www.google.com/maps/search/${q}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await sleep(3000);
  const firstResult = await page.$('a[href*="/maps/place/"]');
  if (firstResult) { await firstResult.click(); await sleep(3500); }
  await page.evaluate(() => {
    const pane = document.querySelector('[role="main"]') as HTMLElement | null;
    if (pane) pane.scrollTop = 400;
  });
  await sleep(1500);

  const basic = await page.evaluate(() => {
    const name = document.querySelector('h1')?.textContent?.trim() || null;
    const ratingEl = document.querySelector('[aria-label*=" stars"][aria-label*="."]');
    const ratingText = ratingEl?.getAttribute('aria-label') || '';
    const rating = parseFloat(ratingText.match(/[\d.]+/)?.[0] || '0') || null;
    const reviewCountEl = document.querySelector('[aria-label*="reviews"]');
    const reviewCountText = reviewCountEl?.getAttribute('aria-label') || reviewCountEl?.textContent || '';
    const reviewCount = parseInt(reviewCountText.match(/[\d,]+/)?.[0]?.replace(',','') || '0') || null;
    const phoneEl = document.querySelector('[data-item-id*="phone"]');
    const phone = phoneEl?.textContent?.replace(/[^0-9+() \-]/g, '').trim() || null;
    const addrEl = document.querySelector('[data-item-id*="address"]');
    const address = addrEl?.textContent?.trim() || null;
    const websiteEl = document.querySelector('a[data-item-id="authority"]') as HTMLAnchorElement | null;
    const website = websiteEl?.href || null;
    const hoursEl = document.querySelector('[data-item-id*="oh"]');
    const hours = hoursEl?.textContent?.trim() || null;
    const photos: string[] = [];
    document.querySelectorAll('img[src*="googleusercontent.com"]').forEach((img: any) => {
      const src = img.src || '';
      if (src && src.includes('googleusercontent') && !photos.includes(src)) {
        const hires = src.replace(/=w\d+-h\d+/, '=w1200-h900').replace(/=s\d+/, '=s1200');
        photos.push(hires);
      }
    });
    return { name, rating, reviewCount, phone, address, website, hours, photos: photos.slice(0, 8) };
  });

  // Try Reviews tab
  const reviewTexts: string[] = [];
  try {
    const reviewTab = await page.evaluateHandle(() =>
      Array.from(document.querySelectorAll('button[role="tab"], button'))
        .find((el: any) => /^reviews?$/i.test(el.textContent?.trim())) || null
    );
    const rEl = (reviewTab as any).asElement?.();
    if (rEl) {
      await rEl.click();
      await sleep(2500);
      await page.evaluate(() => {
        const p = document.querySelector('[role="main"]') as HTMLElement | null;
        if (p) p.scrollTop = 2000;
      });
      await sleep(1500);
      const texts = await page.evaluate(() => {
        const r: string[] = [];
        document.querySelectorAll('button.w8nwRe, [aria-label="See more"]').forEach((b: any) => { try { b.click(); } catch {} });
        document.querySelectorAll('.wiI7pd, .MyEned span, .jftiEf span').forEach((el: any) => {
          const t = el.textContent?.trim();
          if (t && t.length > 40 && t.length < 600 && !r.includes(t)) r.push(t);
        });
        return r.slice(0, 6);
      });
      reviewTexts.push(...texts);
    }
  } catch {}

  return { ...basic, reviewTexts };
}

async function scrapeWebsiteData(page: any, url: string): Promise<{ headline: string; about: string; services: string[] }> {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 12000 });
    await sleep(800);
    return await page.evaluate(() => {
      const headline = document.querySelector('h1')?.textContent?.trim() || '';
      const paras = Array.from(document.querySelectorAll('p'))
        .map((el: any) => el.textContent?.trim())
        .filter((t: string) => t && t.length > 50 && t.length < 600);
      const h2s = Array.from(document.querySelectorAll('h2, h3'))
        .map((el: any) => el.textContent?.trim())
        .filter((t: string) => t && t.length > 5 && t.length < 100 &&
          !['Home', 'About', 'Contact', 'Services', 'Gallery', 'Portfolio'].includes(t));
      return {
        headline,
        about: paras[0] || paras[1] || '',
        services: h2s.slice(0, 8),
      };
    });
  } catch {
    return { headline: '', about: '', services: [] };
  }
}

// ── Leads with enriched data from research ──────────────────────────────────

const ENRICHED_LEADS = [
  {
    gmb_name: 'Denver Patios and Landscape',
    phone: '+17204368401',
    type: 'landscaping',
    city: 'Denver',
    state: 'CO',
    timezone: 'MST',
    website_url: '', // no direct website found
    // Tagline from Yelp "Denver Patios and Landscape"
    heroHeadline: 'Denver\'s outdoor living specialists.',
    aboutText: 'Denver Patios and Landscape has been transforming outdoor spaces across Denver for years. From custom patios and stonework to full landscape design and lawn care — we build outdoor rooms that get used.',
    services: ['Custom Patio Design', 'Landscape Design', 'Retaining Walls', 'Lawn Care & Maintenance', 'Drainage Solutions', 'Outdoor Lighting'],
  },
  {
    gmb_name: 'JMZ Contracting',
    phone: '+17802962696',
    type: 'roofing contractor',
    city: 'Grande Prairie',
    state: 'AB',
    timezone: 'MST',
    website_url: 'https://jmzcontracting.ca',
    heroHeadline: 'Together, let\'s create the home of your dreams.',
    aboutText: 'JMZ Contracting is a prestigious, full-service renovation company located in Grande Prairie, AB. We specialize in residential renovations and interior design — bringing craftsmanship and vision to every project.',
    services: ['Roof Replacement & Repair', 'Interior Renovations', 'Exterior Renovations', 'Custom Home Improvements', 'Free Estimates', 'Insurance Claims'],
  },
  {
    gmb_name: 'PFD Remodeling',
    phone: '+13202487473',
    type: 'bathroom remodel',
    city: 'Saint Cloud',
    state: 'MN',
    timezone: 'CST',
    website_url: '',
    heroHeadline: 'Quality remodeling for St. Cloud homes.',
    aboutText: 'PFD Remodeling specializes in residential remodeling for homeowners in the St. Cloud area. Owner Dennis Eichers leads every project personally — from bathroom renovations and kitchen remodels to basement finishing and home additions.',
    services: ['Bathroom Remodels', 'Kitchen Remodels', 'Basement Finishing', 'Home Additions', 'Garage Conversions', 'Full Interior Renovations'],
  },
  {
    gmb_name: 'Windy Acres Cabinetry',
    phone: '+17808975535',
    type: 'kitchen remodel',
    city: 'Sexsmith',
    state: 'AB',
    timezone: 'MST',
    website_url: 'https://www.windyacrescabinetry.com',
    heroHeadline: 'Quality for your home.',
    aboutText: 'Windy Acres Cabinetry serves the Peace Region with quality custom cabinets and countertops for new builds and existing home renovations. Our expert designers and committed craftsmen are ready to transform your space.',
    services: ['Custom Cabinetry', 'Kitchen Renovations', 'Countertop Installation', 'Bathroom Vanities', 'Built-in Storage', 'Full Design Service'],
  },
];

async function main() {
  log('=== Enriched Demo Builder ===');

  const browser = await (puppeteer as any).connect({
    browserURL: `http://localhost:${CHROME_PORT}`,
    defaultViewport: null,
  });
  const page = (await browser.pages())[0] || await browser.newPage();

  const results: Array<{ name: string; url: string }> = [];

  for (const lead of ENRICHED_LEADS) {
    log(`\nBuilding: ${lead.gmb_name}...`);

    // Delete old demos
    const deleted = await deleteOldDemos(lead.gmb_name);
    log(`  Deleted ${deleted} old pages`);
    await sleep(500);

    // 1. Scrape Google Maps using phone number
    let mapsData: any = {};
    try {
      mapsData = await scrapeGMaps(page, lead.phone);
      const resolvedName = (!mapsData.name || mapsData.name.toLowerCase() === 'results')
        ? lead.gmb_name : mapsData.name;
      mapsData.name = resolvedName;
      log(`  Maps: name="${mapsData.name}" rating=${mapsData.rating} photos=${mapsData.photos?.length || 0} reviews=${mapsData.reviewTexts?.length || 0}`);
    } catch (e: any) {
      log(`  Maps failed: ${e.message}`);
      mapsData.name = lead.gmb_name;
    }
    await sleep(1000);

    // 2. Scrape website if available
    let webData = { headline: '', about: '', services: [] as string[] };
    if (lead.website_url) {
      webData = await scrapeWebsiteData(page, lead.website_url);
      log(`  Website: headline="${webData.headline?.slice(0,50)}" services=${webData.services?.length}`);
    }
    await sleep(500);

    // 3. Build enriched demo
    const data: ProspectResearchData = {
      leadId:       `enriched-${Date.now()}`,
      businessName: mapsData.name || lead.gmb_name,
      bizType:      lead.type,
      phone:        mapsData.phone || null,
      address:      mapsData.address || null,
      city:         lead.city,
      state:        lead.state,
      timezone:     lead.timezone,
      website:      mapsData.website || lead.website_url || null,
      googleRating: mapsData.rating || null,
      reviewCount:  mapsData.reviewCount || null,
      reviewTexts:  mapsData.reviewTexts?.length ? mapsData.reviewTexts : [],
      photos:       mapsData.photos?.length ? mapsData.photos : [],
      hours:        mapsData.hours || null,
      colorPrimary: null,
      colorAccent:  null,
      logoUrl:      null,
      // Inject enriched content — prefer website data, fall back to researched
      heroHeadline: webData.headline || lead.heroHeadline || null,
      heroSub:      null,
      aboutText:    webData.about || lead.aboutText || null,
      aboutBody:    lead.aboutText || null,
      ctaText:      'Get a Free Quote',
    };

    try {
      const result = await buildProspectDemo(data);
      log(`  Built: ${result.demoUrl}`);
      results.push({ name: lead.gmb_name, url: result.demoUrl });
    } catch (e: any) {
      log(`  Build failed: ${e.message}`);
      results.push({ name: lead.gmb_name, url: `ERROR: ${e.message}` });
    }

    await sleep(2000);
  }

  await browser.disconnect();

  log('\n=== Results ===');
  results.forEach(r => log(`${r.name}: ${r.url}`));
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
