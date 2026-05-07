#!/usr/bin/env tsx
/**
 * Prospect Research Agent
 *
 * Given a lead ID, this script:
 *   1. Loads the lead from Supabase
 *   2. Searches Google Maps for their business (via Chrome port 9232)
 *   3. Scrapes: photos, reviews, hours, rating, address, website link
 *   4. Fetches their website (if exists) to extract brand colors
 *   5. Builds a personalised demo site using the right niche template
 *   6. Stores the demo in landing_pages and links it back to the lead
 *
 * Usage:
 *   npx tsx scripts/local-biz/research-prospect.ts --lead-id=<uuid>
 *   npx tsx scripts/local-biz/research-prospect.ts --queue          # process all pending
 *
 * Triggered automatically by the texting system when initial_sent.
 * Chrome port 9232 must be running: bash scripts/chrome-launch-local-biz.sh
 */

import puppeteer from 'puppeteer';
import https from 'https';
import http from 'http';
import fs from 'fs';
import { buildProspectDemo, type ProspectResearchData } from '../../lib/local-biz/prospect-demo-builder';

// ── Config ─────────────────────────────────────────────────────────────────────

const CHROME_PORT       = 9232;
const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY      = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const QUEUE_PATH        = 'agents/state/prospect-demo-queue.json';

// ── Logging ────────────────────────────────────────────────────────────────────

function log(msg: string) { console.log(`[${new Date().toISOString()}] ${msg}`); }
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ── Supabase ───────────────────────────────────────────────────────────────────

function supabase(method: string, resource: string, body?: unknown): Promise<{ status: number; data: unknown }> {
  return new Promise((resolve, reject) => {
    const u = new URL(`${SUPABASE_URL}/rest/v1/${resource}`);
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

// ── Queue management ───────────────────────────────────────────────────────────

interface QueueEntry {
  leadId:       string;
  businessName: string;
  bizType:      string;
  queuedAt:     string;
  status:       'pending' | 'processing' | 'done' | 'failed';
  error?:       string;
}

function loadQueue(): QueueEntry[] {
  try { return JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf8')); }
  catch { return []; }
}

function saveQueue(q: QueueEntry[]) {
  fs.mkdirSync('agents/state', { recursive: true });
  fs.writeFileSync(QUEUE_PATH, JSON.stringify(q, null, 2));
}

export function enqueueProspect(leadId: string, businessName: string, bizType: string) {
  const q = loadQueue();
  // Don't add duplicates
  if (q.some(e => e.leadId === leadId && e.status !== 'failed')) return;
  q.push({ leadId, businessName, bizType, queuedAt: new Date().toISOString(), status: 'pending' });
  saveQueue(q);
  log(`[queue] Enqueued ${businessName} (${leadId})`);
}

// ── Google Maps scraper ────────────────────────────────────────────────────────

async function scrapeGoogleMaps(page: ReturnType<typeof puppeteer.prototype.newPage> extends Promise<infer T> ? T : never, businessName: string, city: string, state: string): Promise<Partial<ProspectResearchData>> {
  const query = encodeURIComponent(`${businessName} ${city} ${state}`);
  const url = `https://www.google.com/maps/search/${query}/`;

  log(`  Searching Maps for "${businessName} ${city} ${state}"`);
  await (page as any).goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await sleep(2500);

  // Click first result
  const firstResult = await (page as any).$('a[href*="/maps/place/"]');
  if (firstResult) {
    await firstResult.click();
    await sleep(2500);
  }

  // Extract data from the right panel
  return (page as any).evaluate(() => {
    const getText = (sel: string) => document.querySelector(sel)?.textContent?.trim() || null;
    const getAttr = (sel: string, attr: string) => (document.querySelector(sel) as HTMLElement | null)?.getAttribute(attr) || null;

    // Business name
    const name = getText('h1');

    // Rating
    const ratingText = getText('span[aria-label*="stars"], div[aria-label*="stars"]');
    const rating = ratingText ? parseFloat(ratingText) : null;

    // Review count
    const reviewText = getText('button[aria-label*="reviews"], span[aria-label*="reviews"]');
    const reviewCount = reviewText ? parseInt(reviewText.replace(/[^0-9]/g, '')) : null;

    // Phone
    const phoneEl = document.querySelector('button[data-tooltip*="phone"], [aria-label*="Phone:"], [data-item-id*="phone"]');
    const phone = phoneEl?.textContent?.replace(/[^0-9+() -]/g, '').trim() || null;

    // Website
    const websiteEl = document.querySelector('a[href*="http"][aria-label*="website" i], a[data-tooltip*="website" i]');
    const website = websiteEl?.getAttribute('href') || null;

    // Address
    const addressEl = document.querySelector('button[data-tooltip*="address"], [aria-label*="Address:"], [data-item-id*="address"]');
    const address = addressEl?.textContent?.trim() || null;

    // Hours
    const hoursEl = document.querySelector('div[aria-label*="Hours"], table.y0skZc');
    const hours = hoursEl?.textContent?.replace(/\s+/g, ' ').trim() || null;

    // Photos — get up to 8 photo URLs from the panel
    const photos: string[] = [];
    document.querySelectorAll('img[src*="googleusercontent.com"]').forEach(img => {
      const src = (img as HTMLImageElement).src;
      if (src && src.includes('googleusercontent') && !src.includes('maps/api')) {
        // Bump resolution
        const hires = src.replace(/=w\d+/, '=w800').replace(/=h\d+/, '=h600');
        if (!photos.includes(hires)) photos.push(hires);
      }
    });

    // Reviews — extract visible review text
    const reviewTexts: string[] = [];
    document.querySelectorAll('[data-expandable-section] span, .wiI7pd, .review-full-text').forEach(el => {
      const text = el.textContent?.trim();
      if (text && text.length > 30 && text.length < 500 && !reviewTexts.includes(text)) {
        reviewTexts.push(text);
      }
    });

    return { name, rating, reviewCount, phone, website, address, hours, photos: photos.slice(0, 8), reviewTexts: reviewTexts.slice(0, 8) };
  });
}

// ── Website content scraper ────────────────────────────────────────────────────

function fetchUrl(url: string, timeoutMs = 8000): Promise<string> {
  return new Promise((resolve, reject) => {
    const lib: typeof https = url.startsWith('https') ? https : (http as unknown as typeof https);
    const req = lib.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DemoBuilder/1.0)', Accept: 'text/html' },
    } as any, (res: any) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchUrl(res.headers.location, timeoutMs).then(resolve).catch(reject);
        return;
      }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk: string) => { body += chunk; if (body.length > 150_000) res.destroy(); });
      res.on('end', () => resolve(body));
    });
    req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
  });
}

async function scrapeWebsiteContent(websiteUrl: string): Promise<{
  services: string[];
  aboutText: string | null;
  heroHeadline: string | null;
  phone: string | null;
}> {
  try {
    const html = await fetchUrl(websiteUrl);
    const text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                     .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                     .replace(/<[^>]+>/g, ' ')
                     .replace(/\s+/g, ' ').trim();

    // Extract h1 as hero headline
    const h1Match = html.match(/<h1[^>]*>([^<]{5,120})<\/h1>/i);
    const heroHeadline = h1Match ? h1Match[1].replace(/<[^>]+>/g, '').trim() : null;

    // Extract services from nav/lists — look for service-keyword words near list items
    const serviceRe = /<li[^>]*>\s*<[^>]+>?([^<]{5,80})<\/[^>]+>?\s*<\/li>/gi;
    const services: string[] = [];
    let sm: RegExpExecArray | null;
    while ((sm = serviceRe.exec(html)) !== null) {
      const svc = sm[1].trim();
      if (svc.length > 4 && svc.length < 60 && !/cookie|privacy|terms|login|signup/i.test(svc)) {
        services.push(svc);
      }
    }

    // Extract phone number
    const phoneMatch = text.match(/\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}/);
    const phone = phoneMatch ? phoneMatch[0] : null;

    // Extract about text — look for paragraphs near "about" headings
    const aboutMatch = html.match(/(?:about|who we are|our story)[^<]*<\/h[1-6]>[\s\S]{0,500}<p[^>]*>([^<]{50,400})<\/p>/i);
    const aboutText = aboutMatch ? aboutMatch[1].replace(/<[^>]+>/g, '').trim() : null;

    return {
      services: Array.from(new Set(services)).slice(0, 8),
      aboutText: aboutText || null,
      heroHeadline: heroHeadline?.replace(/&amp;/g, '&').replace(/&#39;/g, "'") || null,
      phone,
    };
  } catch {
    return { services: [], aboutText: null, heroHeadline: null, phone: null };
  }
}

// ── Main research function ─────────────────────────────────────────────────────

async function researchAndBuild(leadId: string): Promise<void> {
  // Load lead
  const { data: leads } = await supabase('GET',
    `leads?id=eq.${leadId}&select=id,full_name,first_name,last_name,phone,city,state_province,timezone,source_brokerage,demo_slug,demo_built_at&limit=1`
  ) as { data: any[] };

  const lead = (leads || [])[0];
  if (!lead) throw new Error(`Lead ${leadId} not found`);
  if (lead.demo_slug) { log(`  Already has demo: ${lead.demo_slug} — skipping`); return; }

  const businessName = lead.full_name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim();
  const bizType = lead.source_brokerage || 'home services';
  const city  = lead.city || '';
  const state = lead.state_province || '';

  log(`  Researching: ${businessName} — ${bizType} in ${city}, ${state}`);

  // Connect to Chrome
  let browser: ReturnType<typeof puppeteer.connect> extends Promise<infer T> ? T : never;
  let page: any;
  let mapsData: Partial<ProspectResearchData> = {};

  try {
    browser = await (puppeteer as any).connect({
      browserURL: `http://localhost:${CHROME_PORT}`,
      defaultViewport: null,
    });
    const pages = await browser.pages();
    page = pages[0] || await browser.newPage();

    mapsData = await scrapeGoogleMaps(page, businessName, city, state);
    log(`  Maps data: rating=${mapsData.rating}, photos=${mapsData.photos?.length || 0}, reviews=${mapsData.reviewTexts?.length || 0}`);

    await browser.disconnect();
  } catch (err: any) {
    log(`  Chrome scrape failed (${err.message}) — using lead data only`);
  }

  // Scrape their website for brand content if available
  const websiteUrl = mapsData.website || null;
  let siteContent = { services: [] as string[], aboutText: null as string | null, heroHeadline: null as string | null, phone: null as string | null };
  if (websiteUrl) {
    log(`  Scraping website: ${websiteUrl}`);
    siteContent = await scrapeWebsiteContent(websiteUrl);
    log(`  Website: headline="${siteContent.heroHeadline}" services=${siteContent.services.length} about=${!!siteContent.aboutText}`);
  }

  // Assemble research data — website content takes priority over Maps data
  const researchData: ProspectResearchData = {
    leadId,
    businessName,
    bizType,
    phone:        mapsData.phone || siteContent.phone || lead.phone,
    address:      mapsData.address || null,
    city,
    state,
    timezone:     lead.timezone || 'CST',
    website:      websiteUrl,
    googleRating: mapsData.rating ?? null,
    reviewCount:  mapsData.reviewCount ?? null,
    reviewTexts:  mapsData.reviewTexts || [],
    photos:       mapsData.photos || [],
    hours:        mapsData.hours || null,
    colorPrimary: null,
    colorAccent:  null,
    logoUrl:      null,
    heroHeadline: siteContent.heroHeadline || null,
    heroSub:      null,
    aboutText:    null,
    aboutBody:    siteContent.aboutText || null,
    ctaText:      null,
  };

  // Build the demo
  await buildProspectDemo(researchData);
}

// ── Queue processor ────────────────────────────────────────────────────────────

async function processQueue(): Promise<void> {
  const q = loadQueue();
  const pending = q.filter(e => e.status === 'pending');
  log(`Queue: ${pending.length} pending items`);

  for (const entry of pending) {
    entry.status = 'processing';
    saveQueue(q);
    try {
      await researchAndBuild(entry.leadId);
      entry.status = 'done';
    } catch (err: any) {
      entry.status = 'failed';
      entry.error = err.message;
      log(`  FAILED ${entry.businessName}: ${err.message}`);
    }
    saveQueue(q);
    await sleep(3000);
  }
}

// ── CLI entry ──────────────────────────────────────────────────────────────────

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing Supabase env vars');
    process.exit(1);
  }

  const leadIdArg = (process.argv.find(a => a.startsWith('--lead-id=')) || '').replace('--lead-id=', '');
  const isQueue   = process.argv.includes('--queue');

  log('=== Prospect Research Agent ===');

  if (leadIdArg) {
    await researchAndBuild(leadIdArg);
  } else if (isQueue) {
    await processQueue();
  } else {
    console.log('Usage:');
    console.log('  npx tsx scripts/local-biz/research-prospect.ts --lead-id=<uuid>');
    console.log('  npx tsx scripts/local-biz/research-prospect.ts --queue');
  }

  log('=== Done ===');
}

main().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
