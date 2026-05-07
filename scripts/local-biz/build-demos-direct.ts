#!/usr/bin/env tsx
/**
 * Standalone demo builder — builds demos by business name without needing a DB lead record.
 * Used to build demos for leads that were texted before the DB was cleared.
 */
import puppeteer from 'puppeteer';
import fs from 'fs';
import { buildProspectDemo, type ProspectResearchData } from '../../lib/local-biz/prospect-demo-builder';

const CHROME_PORT = 9232;

const LEADS = [
  { name: 'Denver Patios',         phone: '+17204368401', type: 'landscaping',      city: 'Denver',    state: 'CO', email: 'denverpatios@gmail.com'  },
  { name: 'JMZ Contracting',       phone: '+17802962696', type: 'roofing contractor',city: 'Edmonton', state: 'AB', email: 'jmzcontract@gmail.com'   },
  { name: 'PFD Remodeling',        phone: '+13202487473', type: 'bathroom remodel', city: 'Minnesota', state: 'MN', email: 'precision.f@hotmail.com' },
  { name: 'Windy Acres Cabinetry', phone: '+17808975535', type: 'kitchen remodel',  city: 'Edmonton',  state: 'AB', email: 'windyacreswood@live.ca'  },
];

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function scrapeGMaps(page: any, name: string, city: string, state: string, phone?: string): Promise<any> {
  const query = phone ? encodeURIComponent(phone) : encodeURIComponent(`${name} ${city} ${state}`);
  await page.goto(`https://www.google.com/maps/search/${query}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await sleep(3000);

  // Click first listing to open detail pane
  const firstResult = await page.$('a[href*="/maps/place/"]');
  if (firstResult) { await firstResult.click(); await sleep(3500); }

  // Scroll the detail pane to trigger lazy-loaded photos
  await page.evaluate(() => {
    const pane = document.querySelector('[role="main"]') as HTMLElement | null;
    if (pane) pane.scrollTop = 400;
  });
  await sleep(1500);

  // Extract basic info
  const basic = await page.evaluate(() => {
    const name = document.querySelector('h1')?.textContent?.trim() || null;

    // Rating — try multiple selectors
    const ratingEl = document.querySelector('[aria-label*=" stars"][aria-label*="."]');
    const ratingText = ratingEl?.getAttribute('aria-label') || '';
    const rating = parseFloat(ratingText.match(/[\d.]+/)?.[0] || '0') || null;

    const phoneEl = document.querySelector('[data-item-id*="phone"]');
    const phone = phoneEl?.textContent?.replace(/[^0-9+() \-]/g, '').trim() || null;

    const addrEl = document.querySelector('[data-item-id*="address"]');
    const address = addrEl?.textContent?.trim() || null;

    const websiteEl = document.querySelector('a[data-item-id="authority"]') as HTMLAnchorElement | null;
    const website = websiteEl?.href || null;

    const photos: string[] = [];
    document.querySelectorAll('img[src*="googleusercontent.com"], img[src*="lh3.google"]').forEach((img: any) => {
      const src = (img.src || '');
      if (src && src.includes('googleusercontent') && !photos.includes(src)) {
        const hires = src.replace(/=w\d+-h\d+/, '=w1200-h900').replace(/=s\d+/, '=s1200');
        photos.push(hires);
      }
    });

    return { name, rating, phone, address, website, photos: photos.slice(0, 10) };
  });

  // Click the Photos button to open the photo gallery and get more photos
  try {
    const photoBtn = await page.evaluateHandle(() => {
      return Array.from(document.querySelectorAll('button, [role="button"], a'))
        .find((el: any) => /see photos|view photos|photos/i.test(el.textContent?.trim())) || null;
    });
    const photoBtnEl = (photoBtn as any).asElement?.();
    if (photoBtnEl) {
      await photoBtnEl.click();
      await sleep(2500);
      const galleryPhotos = await page.evaluate(() => {
        const imgs: string[] = [];
        document.querySelectorAll('img[src*="googleusercontent.com"], img[src*="lh3.google"]').forEach((img: any) => {
          const src = img.src || '';
          if (src && src.includes('googleusercontent') && !imgs.includes(src)) {
            imgs.push(src.replace(/=w\d+-h\d+/, '=w1200-h900').replace(/=s\d+/, '=s1200'));
          }
        });
        return imgs.slice(0, 12);
      });
      if (galleryPhotos.length > basic.photos.length) basic.photos = galleryPhotos;
      // Go back to listing
      await page.goBack({ waitUntil: 'domcontentloaded' });
      await sleep(2000);
    }
  } catch { /* no photos button */ }

  // Click Reviews tab to load review text
  const reviewTexts: string[] = [];
  try {
    const reviewTab = await page.evaluateHandle(() => {
      return Array.from(document.querySelectorAll('button[role="tab"], button'))
        .find((el: any) => /^reviews?$/i.test(el.textContent?.trim()) || /\d+\s+reviews?/i.test(el.textContent?.trim())) || null;
    });
    const reviewTabEl = (reviewTab as any).asElement?.();
    if (reviewTabEl) {
      await reviewTabEl.click();
      await sleep(2500);
      // Scroll to load more reviews
      await page.evaluate(() => {
        const pane = document.querySelector('[role="main"]') as HTMLElement | null;
        if (pane) pane.scrollTop = 2000;
      });
      await sleep(1500);
      const texts = await page.evaluate(() => {
        const results: string[] = [];
        // Expand all "More" buttons first
        document.querySelectorAll('button.w8nwRe, [aria-label="See more"]').forEach((btn: any) => { try { btn.click(); } catch {} });
        document.querySelectorAll('.wiI7pd, .MyEned span, .jftiEf span, [data-expandable-section] span').forEach((el: any) => {
          const t = el.textContent?.trim();
          if (t && t.length > 40 && t.length < 600 && !results.includes(t)) results.push(t);
        });
        return results.slice(0, 8);
      });
      reviewTexts.push(...texts);
    }
  } catch { /* no reviews tab */ }

  return { ...basic, reviewTexts };
}

async function main() {
  console.log('=== Standalone Demo Builder ===');

  const browser = await (puppeteer as any).connect({
    browserURL: `http://localhost:${CHROME_PORT}`,
    defaultViewport: null,
  });
  const page = (await browser.pages())[0] || await browser.newPage();

  const results: Array<{ name: string; url: string }> = [];

  for (const lead of LEADS) {
    console.log(`\nBuilding demo: ${lead.name}...`);

    let mapsData: any = {};
    try {
      mapsData = await scrapeGMaps(page, lead.name, lead.city, lead.state, (lead as any).phone);
      // If Maps returned a generic "Results" page or nothing, fall back to lead name
      if (!mapsData.name || mapsData.name.toLowerCase() === 'results') {
        console.log(`  Maps returned no clear result — using lead name`);
        mapsData.name = lead.name;
      }
      console.log(`  Maps: name=${mapsData.name} phone=${mapsData.phone} photos=${mapsData.photos?.length || 0} rating=${mapsData.rating}`);
    } catch (e: any) {
      console.log(`  Maps scrape failed: ${e.message}`);
    }

    const data: ProspectResearchData = {
      leadId:       `standalone-${Date.now()}`,
      businessName: mapsData.name || lead.name,
      bizType:      lead.type,
      phone:        mapsData.phone || null,
      address:      mapsData.address || null,
      city:         lead.city,
      state:        lead.state,
      timezone:     'EST',
      website:      mapsData.website || null,
      googleRating: mapsData.rating || null,
      reviewCount:  null,
      reviewTexts:  mapsData.reviewTexts || [],
      photos:       mapsData.photos || [],
      hours:        null,
      colorPrimary: null,
      colorAccent:  null,
      logoUrl:      null,
      heroHeadline: null,
      heroSub:      null,
      aboutText:    null,
      aboutBody:    null,
      ctaText:      null,
    };

    try {
      const result = await buildProspectDemo(data);
      console.log(`  Built: ${result.demoUrl}`);
      results.push({ name: lead.name, url: result.demoUrl });
    } catch (e: any) {
      console.log(`  Build failed: ${e.message}`);
      results.push({ name: lead.name, url: `ERROR: ${e.message}` });
    }

    await sleep(2000);
  }

  await browser.disconnect();

  console.log('\n=== Results ===');
  results.forEach(r => console.log(`${r.name}: ${r.url}`));

  fs.writeFileSync('/tmp/demo-results.json', JSON.stringify(results, null, 2));
  console.log('\nResults written to /tmp/demo-results.json');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
