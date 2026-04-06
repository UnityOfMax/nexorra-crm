/**
 * Google Maps scraper — Chrome CDP replacement for Outscraper.
 * Connects to the existing Chrome instance on port 9232 (Petra's Chrome).
 * Uses Puppeteer to navigate Maps search, click each result, extract detail panel.
 *
 * Selectors are defined as constants at the top — update here when Google changes DOM.
 */

import puppeteer from 'puppeteer';

// ── Selectors — update when Google changes DOM ────────────────────────────────
const SEL = {
  feed:        '[role="feed"]',
  resultLinks: '[role="feed"] a[href*="/maps/place/"]',
  name:        'h1.DUwDvf, h1[class*="fontHeadlineLarge"], [data-attrid="title"] h1, h1',
  category:    'button.DkEaL, .DkEaL, [jsaction*="category"]',
  address:     '[data-item-id="address"] .Io6YTe, [data-item-id="address"] .rogA2c, [data-item-id="address"]',
  phone:       '[data-item-id^="phone:tel:"] .Io6YTe, [data-item-id^="phone:tel:"] .rogA2c',
  website:     'a[data-item-id="authority"]',
  rating:      '.fontDisplayLarge, span.MW4etd, .F7nice .fontBodyMedium',
  reviews:     'span.UY7F9, .F7nice span:last-child, [aria-label*="reviews"]',
};

export interface GMBPlace {
  place_id:     string;
  name:         string;
  phone:        string | null;
  site:         string | null;      // website URL
  full_address: string;
  city:         string;
  state:        string;
  country_code: string;             // 'US' or 'CA'
  rating:       number | null;
  reviews:      number | null;
  type:         string;             // primary category
  photos:       string[];
  working_hours: Record<string, string> | null;
}

export async function searchPlaces(query: string, limit = 20, port = 9232): Promise<GMBPlace[]> {
  const browser = await puppeteer.connect({
    browserURL: `http://localhost:${port}`,
    defaultViewport: null,
  });

  const page = await browser.newPage();

  try {
    await page.goto(
      `https://www.google.com/maps/search/${encodeURIComponent(query)}`,
      { waitUntil: 'networkidle2', timeout: 30000 },
    );

    // Wait for results feed
    try {
      await page.waitForSelector(SEL.feed, { timeout: 15000 });
    } catch {
      console.warn(`[gmaps] No results feed for: ${query}`);
      return [];
    }

    await sleep(2000);

    const results: GMBPlace[] = [];
    let processedCount = 0;
    let stallCount = 0;

    while (results.length < limit && stallCount < 4) {
      const cardLinks = await page.$$(SEL.resultLinks);

      if (cardLinks.length <= processedCount) {
        // Scroll to load more
        await page.evaluate((feedSel: string) => {
          const feed = document.querySelector(feedSel);
          if (feed) feed.scrollBy(0, 600);
        }, SEL.feed);
        await sleep(1500);
        stallCount++;
        continue;
      }

      stallCount = 0;

      // Process newly loaded cards
      const unprocessed = cardLinks.slice(processedCount, processedCount + 5);

      for (const link of unprocessed) {
        if (results.length >= limit) break;
        processedCount++;

        try {
          await link.click();
          await page.waitForSelector(SEL.name, { timeout: 6000 });
          await sleep(900 + Math.random() * 600);

          const place = await extractPlace(page, query);
          if (place.name) results.push(place);
        } catch {
          // Skip broken result
        }
      }
    }

    return results;
  } finally {
    await page.close().catch(() => {});
    // Do NOT disconnect — Chrome must stay running for other Petra scripts
  }
}

async function extractPlace(page: any, query: string): Promise<GMBPlace> {
  const name        = await safeText(page, SEL.name);
  const category    = await safeText(page, SEL.category);
  const address     = await safeText(page, SEL.address);
  const phone       = await safeText(page, SEL.phone);
  const website     = await safeAttr(page, SEL.website, 'href');
  const ratingStr   = await safeText(page, SEL.rating);
  const reviewsStr  = await safeText(page, SEL.reviews);
  const photos      = await safePhotos(page);

  // Extract place_id from Maps URL — encoded as !1sChIJ... in the data param
  const url = page.url();
  const pidMatch = url.match(/!1s(ChIJ[^!%]+)/);
  const place_id = pidMatch
    ? decodeURIComponent(pidMatch[1])
    : `gmb_${Date.now()}_${Math.floor(Math.random() * 99999)}`;

  const { city, state, country_code } = parseAddress(address, query);

  return {
    place_id,
    name:         name.trim(),
    phone:        phone.trim() || null,
    site:         cleanUrl(website),
    full_address: address.trim(),
    city,
    state,
    country_code,
    rating:       parseRating(ratingStr),
    reviews:      parseReviews(reviewsStr),
    type:         (category.trim() || query.split(' in ')[0] || '').trim(),
    photos,
    working_hours: null,
  };
}

// ── DOM helpers ───────────────────────────────────────────────────────────────

async function safeText(page: any, selectorList: string): Promise<string> {
  for (const sel of selectorList.split(', ')) {
    try {
      const el = await page.$(sel.trim());
      if (el) {
        const text: string = await page.evaluate((e: Element) => (e.textContent || '').trim(), el);
        if (text) return text;
      }
    } catch {}
  }
  return '';
}

async function safeAttr(page: any, selectorList: string, attr: string): Promise<string> {
  for (const sel of selectorList.split(', ')) {
    try {
      const el = await page.$(sel.trim());
      if (el) {
        const val: string = await page.evaluate(
          (e: Element, a: string) => (e.getAttribute(a) || '').trim(),
          el, attr,
        );
        if (val) return val;
      }
    } catch {}
  }
  return '';
}

async function safePhotos(page: any): Promise<string[]> {
  try {
    return await page.evaluate(() => {
      const imgs: string[] = [];
      document.querySelectorAll('.aoRNLd img, .RZ66Rb img, [data-photo-index] img').forEach(el => {
        const src = (el as HTMLImageElement).src || '';
        if (src && src.startsWith('http')) {
          // Upscale Google thumbnail URLs
          const hi = src.replace(/=w\d+-h\d+.*$/, '=w800-h600');
          imgs.push(hi);
        }
      });
      return Array.from(new Set(imgs)).slice(0, 5);
    });
  } catch {
    return [];
  }
}

// ── Value parsers ─────────────────────────────────────────────────────────────

const CA_PROVINCES = new Set(['ON', 'QC', 'BC', 'AB', 'MB', 'SK', 'NS', 'NB', 'PE', 'NL', 'YT', 'NT', 'NU']);

function parseAddress(address: string, query: string): { city: string; state: string; country_code: string } {
  // US: "123 Main St, Austin, TX 78701"
  // CA: "123 King St, Toronto, ON M5V 1M4"
  const addrMatch = address.match(/,\s*([^,]+),\s*([A-Z]{2})\s+[\dA-Z]/);
  if (addrMatch) {
    const city = addrMatch[1].trim();
    const state = addrMatch[2];
    return { city, state, country_code: CA_PROVINCES.has(state) ? 'CA' : 'US' };
  }
  // Fallback: extract from query "hairdressers in Austin, TX"
  const queryMatch = query.match(/in\s+(.+?),\s*([A-Z]{2})$/i);
  if (queryMatch) {
    const state = queryMatch[2].toUpperCase();
    return { city: queryMatch[1].trim(), state, country_code: CA_PROVINCES.has(state) ? 'CA' : 'US' };
  }
  return { city: '', state: '', country_code: 'US' };
}

function parseRating(text: string): number | null {
  const m = text.match(/(\d+\.?\d*)/);
  return m ? parseFloat(m[1]) : null;
}

function parseReviews(text: string): number | null {
  const kMatch = text.match(/(\d+\.?\d*)\s*[Kk]/);
  if (kMatch) return Math.round(parseFloat(kMatch[1]) * 1000);
  const numMatch = text.replace(/,/g, '').match(/(\d+)/);
  return numMatch ? parseInt(numMatch[1]) : null;
}

function cleanUrl(url: string): string | null {
  if (!url) return null;
  // Google Maps routes website links through a redirect — unwrap it
  if (url.includes('google.com/url')) {
    try {
      const u = new URL(url);
      return u.searchParams.get('q') || u.searchParams.get('url') || null;
    } catch { return null; }
  }
  return url.startsWith('http') ? url : null;
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}
