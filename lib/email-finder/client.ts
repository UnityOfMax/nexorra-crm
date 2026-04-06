/**
 * Email finder — Chrome CDP replacement for Apollo.io.
 * Connects to the existing Chrome instance on port 9232 (Petra's Chrome).
 * Visits the business website, scans for mailto: links and email patterns,
 * tries common contact/about pages, and falls back to a Google search.
 */

import puppeteer from 'puppeteer';

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Patterns that indicate a non-real / system email — skip these
const BLOCKLIST_PATTERNS = [
  'noreply', 'no-reply', 'donotreply', 'do-not-reply',
  '@example.', '@sentry.', '@schema.org', 'privacy@', 'security@',
  '@squarespace.', '@wix.', '@wordpress.', '@godaddy.',
  'webmaster@', 'postmaster@', '@google.', '@facebook.', '@apple.',
  'admin@', 'abuse@', 'hostmaster@',
];

export async function findEmail(
  websiteUrl: string,
  businessName: string,
  city: string,
  port = 9232,
): Promise<string | null> {
  if (!websiteUrl) return null;

  const domain = extractDomain(websiteUrl);
  if (!domain) return null;

  const browser = await puppeteer.connect({
    browserURL: `http://localhost:${port}`,
    defaultViewport: null,
  });

  const page = await browser.newPage();

  try {
    // Step 1 — Homepage scan
    const homeEmail = await scanPage(page, websiteUrl, domain, 8000);
    if (homeEmail) return homeEmail;

    // Step 2 — Common contact / about pages
    const contactPaths = [
      '/contact', '/contact-us', '/contact-us.html',
      '/about', '/about-us', '/about-us.html',
      '/get-in-touch', '/reach-us', '/info',
    ];
    for (const p of contactPaths) {
      const url = `https://${domain}${p}`;
      const email = await scanPage(page, url, domain, 6000);
      if (email) return email;
    }

    // Step 3 — Google search fallback: site:domain.com email
    const searchUrl = `https://www.google.com/search?q=site%3A${domain}+%40+contact`;
    try {
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
      await new Promise(r => setTimeout(r, 2000));
      const bodyText: string = await page.evaluate(() => document.body?.innerText || '');
      const found = extractEmails(bodyText, domain);
      if (found.length > 0) return found[0];
    } catch {
      // Google search failed — accept null
    }

    return null;
  } finally {
    await page.close().catch(() => {});
    // Do NOT disconnect — Chrome must stay running for other Petra scripts
  }
}

// ── Internals ─────────────────────────────────────────────────────────────────

async function scanPage(
  page: any,
  url: string,
  domain: string,
  timeoutMs: number,
): Promise<string | null> {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });

    // Check mailto: links first — most reliable
    const mailtoEmails: string[] = await page.evaluate(() => {
      const out: string[] = [];
      document.querySelectorAll('a[href^="mailto:"]').forEach(a => {
        const href = a.getAttribute('href') || '';
        const email = href.replace(/^mailto:/i, '').split('?')[0].trim().toLowerCase();
        if (email) out.push(email);
      });
      return out;
    });

    for (const email of mailtoEmails) {
      if (isValid(email)) return email;
    }

    // Fall back to regex scan of all visible text
    const bodyText: string = await page.evaluate(() => document.body?.innerText || '');
    const found = extractEmails(bodyText, domain);
    return found.length > 0 ? found[0] : null;
  } catch {
    return null;
  }
}

function extractEmails(text: string, preferDomain?: string): string[] {
  const raw = text.match(EMAIL_REGEX) || [];
  const valid = Array.from(new Set(raw.map(e => e.toLowerCase()))).filter(isValid);

  // Prefer emails on the business's own domain
  if (preferDomain) {
    const own = valid.filter(e => e.endsWith(`@${preferDomain}`) || e.includes(`@${preferDomain}`));
    if (own.length > 0) return own;
  }

  return valid;
}

function isValid(email: string): boolean {
  if (!email || !email.includes('@')) return false;
  const lower = email.toLowerCase();
  if (BLOCKLIST_PATTERNS.some(p => lower.includes(p))) return false;
  // Must have a reasonable TLD
  if (!/\.[a-z]{2,}$/.test(lower)) return false;
  // Reject obviously fake / placeholder emails
  if (/^(test|example|demo|sample|user|your)@/.test(lower)) return false;
  return true;
}

function extractDomain(url: string): string | null {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}
