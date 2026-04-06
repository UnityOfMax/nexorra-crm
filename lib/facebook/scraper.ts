/**
 * Facebook business page scraper — Chrome CDP via port 9232.
 * Used by Petra for no-website leads: scrapes photos, about text,
 * email, reviews, hours from a business Facebook page.
 */

import puppeteer from 'puppeteer';

export interface FacebookBusinessData {
  about_text:  string | null;      // "About" / intro section
  description: string | null;      // Longer story/description
  email:       string | null;      // Email found in About/contact section
  phone:       string | null;      // Phone if different from Maps
  photos:      string[];           // Up to 8 photo URLs from Photos tab
  reviews:     FacebookReview[];   // Up to 10 reviews
  services:    string[];           // Service names if listed
  hours:       Record<string, string> | null;
  category:    string | null;      // Facebook page category
  likes:       number | null;
}

export interface FacebookReview {
  rating: number;
  text:   string;
  author: string;
}

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const EMAIL_BLOCKLIST = ['noreply', 'no-reply', 'example.com', 'sentry', 'facebook.com', 'fb.com'];

function extractEmail(text: string): string | null {
  const matches = text.match(EMAIL_RE) || [];
  const valid = matches.filter(e => !EMAIL_BLOCKLIST.some(b => e.includes(b)));
  return valid[0] ?? null;
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

export async function scrapeFacebookBusiness(
  facebookUrl: string,
  port = 9232,
): Promise<FacebookBusinessData> {
  const browser = await puppeteer.connect({
    browserURL: `http://localhost:${port}`,
    defaultViewport: { width: 1280, height: 900 },
  });

  const page = await browser.newPage();

  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  );

  const result: FacebookBusinessData = {
    about_text: null, description: null, email: null, phone: null,
    photos: [], reviews: [], services: [], hours: null, category: null, likes: null,
  };

  // Normalise URL — strip trailing slashes, ensure /about and /photos etc. work
  const baseUrl = facebookUrl.replace(/\/+$/, '');

  try {
    // ── 1. Main page ─────────────────────────────────────────────────────────
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await sleep(2000);

    // Accept cookies if prompted
    try {
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('div[role="button"], button'));
        const accept = btns.find(b => /allow all|accept all|okay|got it/i.test((b as HTMLElement).innerText || '')) as HTMLElement | undefined;
        if (accept) accept.click();
      });
      await sleep(800);
    } catch { /* ignore */ }

    // Scan full page text for email
    const bodyText: string = await page.evaluate(() => (document.body as HTMLElement).innerText || '');
    result.email = extractEmail(bodyText);

    // Category — appears under the page name in a clickable link
    result.category = await page.evaluate(() => {
      const el = document.querySelector('a[href*="/pages/category/"], [data-testid="page_category"]');
      return el ? (el as HTMLElement).innerText.trim() : null;
    }).catch(() => null);

    // Likes count
    result.likes = await page.evaluate(() => {
      const text = (document.body as HTMLElement).innerText || '';
      const m = text.match(/([\d,]+)\s+(?:people like|likes)/i);
      return m ? parseInt(m[1].replace(/,/g, '')) : null;
    }).catch(() => null);

    // ── 2. About tab ─────────────────────────────────────────────────────────
    try {
      await page.goto(`${baseUrl}/about`, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await sleep(1500);

      const aboutText: string = await page.evaluate(() => {
        // Try several selectors for the intro / about bio section
        const selectors = [
          '[data-key="intro_card_bio"]',
          '[data-testid="intro_bio"]',
          'div[data-pagelet="ProfileTilesFeed"]',
        ];
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el) return (el as HTMLElement).innerText.trim();
        }
        // Fallback: grab h2 "About" section content
        const h2s = Array.from(document.querySelectorAll('h2'));
        const aboutH2 = h2s.find(h => /about/i.test(h.innerText));
        if (aboutH2 && aboutH2.nextElementSibling) {
          return (aboutH2.nextElementSibling as HTMLElement).innerText.trim();
        }
        return '';
      });

      if (aboutText) result.about_text = aboutText.slice(0, 800);

      // Hours — look for day-of-week patterns
      result.hours = await page.evaluate(() => {
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const bodyText = (document.body as HTMLElement).innerText || '';
        const hours: Record<string, string> = {};
        for (const day of days) {
          const re = new RegExp(`${day}[^\\n]*([\\d]+:[\\d]+\\s*(?:AM|PM|am|pm)?\\s*[–\\-]\\s*[\\d]+:[\\d]+\\s*(?:AM|PM|am|pm)?)`, 'i');
          const m = bodyText.match(re);
          if (m) hours[day] = m[1].trim();
        }
        return Object.keys(hours).length ? hours : null;
      }).catch(() => null);

      // Email re-check on about page
      const aboutPageText: string = await page.evaluate(() => (document.body as HTMLElement).innerText || '');
      if (!result.email) result.email = extractEmail(aboutPageText);

    } catch { /* about page unavailable */ }

    // ── 3. Photos tab ────────────────────────────────────────────────────────
    try {
      await page.goto(`${baseUrl}/photos`, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await sleep(2000);

      result.photos = await page.evaluate(() => {
        const imgs: string[] = [];
        document.querySelectorAll('img').forEach(img => {
          const src = (img as HTMLImageElement).src || '';
          // Exclude small thumbnails, icons, profile pics (small = s60x60 etc.)
          const isSmall = /s[0-9]{2}x[0-9]{2}|profile_pic|emoji|icon/i.test(src);
          if (src && src.startsWith('http') && !isSmall && src.includes('fbcdn') && src.length > 80) {
            imgs.push(src);
          }
        });
        return Array.from(new Set(imgs)).slice(0, 8);
      });
    } catch { /* photos unavailable */ }

    // ── 4. Reviews tab ───────────────────────────────────────────────────────
    try {
      await page.goto(`${baseUrl}/reviews`, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await sleep(1500);

      result.reviews = await page.evaluate(() => {
        const out: Array<{ rating: number; text: string; author: string }> = [];
        // Facebook review text containers vary — grab any substantial paragraphs
        const items = Array.from(document.querySelectorAll('[data-testid="UFI2Comment/body"], div[dir="auto"]'))
          .filter(el => (el as HTMLElement).innerText.length > 30)
          .slice(0, 10);
        for (const item of items) {
          out.push({ rating: 5, text: (item as HTMLElement).innerText.trim().slice(0, 300), author: 'Customer' });
        }
        return out;
      });
    } catch { /* reviews unavailable */ }

  } catch (err) {
    console.warn('[fb-scraper] Error scraping', facebookUrl, (err as Error).message);
  } finally {
    await page.close().catch(() => {});
  }

  return result;
}
