#!/usr/bin/env node
/**
 * Deep research pass on the 4 booked leads
 */
const puppeteer = require('puppeteer');
const fs = require('fs');

const CHROME_PORT = 9232;
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function log(msg) { console.log(`[${new Date().toISOString().slice(11,19)}] ${msg}`); }

async function deepScrapeWebsite(page, baseUrl, name) {
  log(`Deep scraping: ${baseUrl}`);
  const result = { baseUrl, pages: [], images: [], services: [], headline: '', about: '', phone: '', address: '' };

  const pagesToVisit = [
    baseUrl,
    baseUrl + '/about', baseUrl + '/about-us',
    baseUrl + '/services', baseUrl + '/projects', baseUrl + '/gallery',
    baseUrl + '/portfolio', baseUrl + '/work',
  ];

  for (const url of pagesToVisit.slice(0, 4)) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
      await sleep(800);
      const data = await page.evaluate(() => {
        const headline = document.querySelector('h1')?.textContent?.trim() || '';
        const h2s = Array.from(document.querySelectorAll('h2,h3')).map(el => el.textContent.trim()).filter(t => t.length > 5 && t.length < 120);
        const paras = Array.from(document.querySelectorAll('p')).map(el => el.textContent.trim()).filter(t => t.length > 30 && t.length < 400);
        const phone = document.body.innerText.match(/\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}/)?.[0] || '';
        const address = document.body.innerText.match(/\d+\s+[A-Za-z]+\s+(St|Ave|Blvd|Dr|Rd|Way|Lane|Ln|Cres|Crescent|Close|Place|Pl)[^\n]*/i)?.[0] || '';
        const imgs = Array.from(document.querySelectorAll('img'))
          .filter(img => img.src && img.src.startsWith('http') && !img.src.includes('logo') && !img.src.includes('icon')
            && !img.src.includes('favicon') && !img.src.includes('social') && !img.src.includes('badge')
            && !img.src.includes('banner') && !img.src.includes('arrow') && img.width > 150)
          .map(img => img.src);
        return { headline, h2s: h2s.slice(0,6), paras: paras.slice(0,4), phone, address, imgs: imgs.slice(0,8) };
      });
      result.pages.push({ url, ...data });
      if (data.headline && !result.headline) result.headline = data.headline;
      if (data.phone && !result.phone) result.phone = data.phone;
      if (data.address && !result.address) result.address = data.address;
      result.images.push(...data.imgs);
      result.services.push(...data.h2s);
      if (data.paras.length > 0 && !result.about) result.about = data.paras[0];
      log(`  [${url.split('/').pop() || 'home'}] headline: ${data.headline?.slice(0,50)} | ${data.imgs.length} imgs`);
    } catch (e) {
      // skip failed pages
    }
  }
  result.images = [...new Set(result.images)].slice(0, 10);
  result.services = [...new Set(result.services)].slice(0, 10);
  return result;
}

async function searchGoogleMaps(page, query, city) {
  log(`Maps search: ${query} ${city}`);
  try {
    const q = encodeURIComponent(`${query} ${city}`);
    await page.goto(`https://www.google.com/maps/search/${q}/`, { waitUntil: 'networkidle2', timeout: 12000 });
    await sleep(2000);
    return await page.evaluate(() => {
      const name = document.querySelector('h1')?.textContent?.trim() || '';
      const rating = document.querySelector('[data-tooltip*="star"], [aria-label*="star"]')?.getAttribute('aria-label') ||
                     document.querySelector('.fontDisplaySmall')?.textContent?.trim() || '';
      const address = document.querySelector('[data-item-id="address"]')?.textContent?.trim() || '';
      const phone = document.querySelector('[data-item-id*="phone"]')?.textContent?.trim() || '';
      const website = document.querySelector('[data-item-id="authority"]')?.querySelector('a')?.href || '';
      const reviews = Array.from(document.querySelectorAll('[jscontroller="fIQYlf"]')).slice(0,3).map(r => ({
        text: r.querySelector('[jsan*="text"]')?.textContent?.trim() || r.textContent?.trim().slice(0,200) || '',
      }));
      const photos = Array.from(document.querySelectorAll('img[src*="lh3.googleusercontent"]')).map(img => img.src).slice(0,6);
      return { name, rating, address, phone, website, reviews, photos };
    });
  } catch (e) {
    log(`Maps search failed: ${e.message}`);
    return null;
  }
}

async function searchDenverPatios(page) {
  log('\n=== Deep research: Denver Patios ===');
  const result = { name: 'Denver Patios', city: 'Denver', state: 'CO', type: 'landscaping' };

  // Try Google Maps
  const maps = await searchGoogleMaps(page, 'Denver Patios', 'Denver CO');
  if (maps) result.mapsData = maps;
  await sleep(1000);

  // Try direct Google search with phone
  await page.goto(`https://www.google.com/search?q="${encodeURIComponent('Denver Patios')}"+patio+Denver`, { waitUntil: 'domcontentloaded', timeout: 12000 });
  await sleep(1500);
  const google = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href]')).filter(a =>
      a.href.startsWith('http') && !a.href.includes('google.com') && !a.href.includes('youtube.com')
    ).map(a => ({ url: a.href, text: a.textContent?.trim().slice(0,100) })).slice(0, 8);
    const snippets = Array.from(document.querySelectorAll('[data-hveid] [data-sncf], [data-hveid] .VwiC3b, [data-hveid] span'))
      .map(el => el.textContent.trim()).filter(t => t.length > 50 && t.length < 300).slice(0, 5);
    return { links, snippets };
  });
  result.googleSearch = google;
  log(`  Google links: ${google.links.slice(0,3).map(l => l.url).join(' | ')}`);

  // Try Facebook search
  for (const link of google.links) {
    if (link.url.includes('facebook.com')) {
      try {
        await page.goto(link.url, { waitUntil: 'domcontentloaded', timeout: 10000 });
        await sleep(1000);
        const fb = await page.evaluate(() => ({
          about: document.querySelector('[class*="about"], [data-key="intro"]')?.textContent?.trim() || '',
          phone: document.body.innerText.match(/\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}/)?.[0] || '',
        }));
        result.facebook = fb;
        log(`  Facebook: ${fb.about?.slice(0,100)}`);
      } catch (e) { /* skip */ }
      break;
    }
  }

  return result;
}

async function searchPFD(page) {
  log('\n=== Deep research: PFD Remodeling ===');
  const result = { name: 'PFD Remodeling', city: 'St Cloud', state: 'MN', type: 'bathroom remodel' };

  // Owner: Dennis Eichers — search that
  await page.goto(`https://www.google.com/search?q=${encodeURIComponent('PFD Remodeling "Dennis Eichers" St Cloud MN')}`, { waitUntil: 'domcontentloaded', timeout: 12000 });
  await sleep(1500);
  const google = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href]')).filter(a =>
      a.href.startsWith('http') && !a.href.includes('google.com') && !a.href.includes('youtube.com')
    ).map(a => ({ url: a.href, text: a.textContent?.trim().slice(0,80) }));
    const snippets = Array.from(document.querySelectorAll('[data-hveid] .VwiC3b, [data-hveid] [data-sncf]'))
      .map(el => el.textContent.trim()).filter(t => t.length > 30).slice(0,6);
    const kp = {
      address: document.querySelector('[data-dtype="d3adr"]')?.textContent?.trim() || '',
      phone: document.querySelector('[data-dtype="d3ph"]')?.textContent?.trim() || '',
    };
    return { links: links.slice(0,6), snippets, kp };
  });
  result.googleSearch = google;
  log(`  Snippets: ${google.snippets.slice(0,2).join(' | ').slice(0,200)}`);
  log(`  Links: ${google.links.slice(0,3).map(l=>l.url).join(' | ')}`);

  // Try any personal website found
  for (const link of google.links) {
    if (!link.url.includes('cmba') && !link.url.includes('google') && !link.url.includes('facebook') &&
        !link.url.includes('yelp') && !link.url.includes('bbb') && link.url.startsWith('http')) {
      log(`  Visiting: ${link.url}`);
      const data = await deepScrapeWebsite(page, link.url, 'PFD Remodeling');
      result.websiteData = data;
      break;
    }
  }

  // Google Maps
  const maps = await searchGoogleMaps(page, 'PFD Remodeling', 'St Cloud MN');
  if (maps) result.mapsData = maps;

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

  const allData = JSON.parse(fs.readFileSync('agents/state/booked-leads-research.json', 'utf8'));

  // Deep scrape JMZ website
  log('\n=== Deep scrape: JMZ Contracting ===');
  const jmzData = await deepScrapeWebsite(page, 'https://jmzcontracting.ca', 'JMZ Contracting');
  const jmzMaps = await searchGoogleMaps(page, 'JMZ Contracting', 'Grande Prairie AB');
  const jmzEntry = allData.find(d => d.name === 'JMZ Contracting');
  if (jmzEntry) { jmzEntry.websiteData = jmzData; jmzEntry.mapsData = jmzMaps; jmzEntry.city = 'Grande Prairie'; }
  await sleep(1000);

  // Deep scrape Windy Acres
  log('\n=== Deep scrape: Windy Acres Cabinetry ===');
  const wacData = await deepScrapeWebsite(page, 'https://www.windyacrescabinetry.com', 'Windy Acres Cabinetry');
  const wacMaps = await searchGoogleMaps(page, 'Windy Acres Cabinetry', 'Sexsmith AB');
  const wacEntry = allData.find(d => d.name === 'Windy Acres Cabinetry');
  if (wacEntry) { wacEntry.websiteData = wacData; wacEntry.mapsData = wacMaps; }
  await sleep(1000);

  // Deep search Denver Patios
  const denverData = await searchDenverPatios(page);
  const denverEntry = allData.find(d => d.name === 'Denver Patios');
  if (denverEntry) Object.assign(denverEntry, denverData);
  await sleep(1000);

  // Deep search PFD
  const pfdData = await searchPFD(page);
  const pfdEntry = allData.find(d => d.name === 'PFD Remodeling');
  if (pfdEntry) Object.assign(pfdEntry, pfdData);

  await page.close();
  fs.writeFileSync('agents/state/booked-leads-research.json', JSON.stringify(allData, null, 2));
  log('\nSaved enriched data to agents/state/booked-leads-research.json');

  // Print final summary
  console.log('\n=== FINAL ENRICHED DATA ===');
  for (const d of allData) {
    console.log(`\n${d.name} (${d.city}, ${d.state}):`);
    const wd = d.websiteData || {};
    const md = d.mapsData || {};
    console.log(`  Headline: ${wd.headline || md.name || ''}`);
    console.log(`  About: ${(wd.about || '').slice(0, 150)}`);
    console.log(`  Services: ${(wd.services || []).slice(0,5).join(' | ')}`);
    console.log(`  Phone: ${wd.phone || md.phone || ''}`);
    console.log(`  Address: ${wd.address || md.address || ''}`);
    console.log(`  Images: ${(wd.images || []).length} found`);
    console.log(`  Maps rating: ${md.rating || ''}`);
    console.log(`  Maps photos: ${(md.photos || []).length}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
