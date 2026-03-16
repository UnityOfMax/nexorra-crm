#!/usr/bin/env node
/**
 * Chrome DevTools Protocol tool — connects to user's real Chrome browser.
 *
 * Prerequisites: Launch Chrome with remote debugging:
 *   google-chrome --remote-debugging-port=9222
 *
 * Usage:
 *   node scripts/chrome-tool.js navigate <url>          Navigate to URL, wait for load
 *   node scripts/chrome-tool.js html [selector]          Get rendered HTML (full page or selector)
 *   node scripts/chrome-tool.js text [selector]          Get text content (cleaner than HTML)
 *   node scripts/chrome-tool.js scroll [pixels]          Scroll down (default 800px)
 *   node scripts/chrome-tool.js click <selector>         Click an element
 *   node scripts/chrome-tool.js type <selector> <text>   Type into an input
 *   node scripts/chrome-tool.js screenshot [file]        Save screenshot to file
 *   node scripts/chrome-tool.js agents <brokerage>       Extract agent data from listing page
 *   node scripts/chrome-tool.js profile <brokerage>      Extract email from individual profile page
 *   node scripts/chrome-tool.js dismiss-cookies           Dismiss cookie/consent banners
 *   node scripts/chrome-tool.js wait <ms>                Wait for specified milliseconds
 *   node scripts/chrome-tool.js url                      Get current page URL
 *   node scripts/chrome-tool.js status                   Check if Chrome is connected
 */

const puppeteer = require('puppeteer');

const CDP_URL = 'http://localhost:9222';

async function connectToChrome() {
  const browser = await puppeteer.connect({ browserURL: CDP_URL });
  const pages = await browser.pages();
  let page = pages[0];
  if (!page) {
    page = await browser.newPage();
  }
  return { browser, page };
}

function randomDelay(min, max) {
  return new Promise(resolve => setTimeout(resolve, Math.random() * (max - min) + min));
}

async function humanScroll(page, amount = 800) {
  const steps = Math.ceil(amount / 200);
  for (let i = 0; i < steps; i++) {
    await page.evaluate((scrollAmt) => window.scrollBy(0, scrollAmt), 200);
    await randomDelay(100, 300);
  }
}

/**
 * Dismiss common cookie/consent banners by clicking accept buttons.
 * Tries multiple common selectors and text patterns.
 */
async function dismissCookieBanners(page) {
  const dismissed = await page.evaluate(() => {
    const patterns = [
      // Common button text patterns (case-insensitive)
      'accept all', 'accept cookies', 'accept', 'agree', 'allow all',
      'allow cookies', 'got it', 'i agree', 'ok', 'okay', 'save',
      'continue', 'dismiss', 'close', 'reject non-essential',
    ];

    // Common selectors for cookie banners
    const selectors = [
      '[class*="cookie"] button',
      '[class*="Cookie"] button',
      '[class*="consent"] button',
      '[class*="Consent"] button',
      '[class*="banner"] button',
      '[class*="osano"] button',
      '[id*="cookie"] button',
      '[id*="consent"] button',
      '[data-testid*="cookie"] button',
      '[data-testid*="consent"] button',
      'button[class*="accept"]',
      'button[class*="Accept"]',
      'a[class*="accept"]',
      '[role="dialog"] button',
    ];

    let found = false;

    // Strategy 1: Click buttons matching text patterns
    const allButtons = document.querySelectorAll('button, a[role="button"], [role="button"]');
    for (const btn of allButtons) {
      const text = (btn.textContent || '').trim().toLowerCase();
      if (patterns.some(p => text === p || text.startsWith(p))) {
        btn.click();
        found = true;
        break;
      }
    }

    // Strategy 2: Try known selectors
    if (!found) {
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) {
          el.click();
          found = true;
          break;
        }
      }
    }

    // Strategy 3: Osano-specific (KW uses this)
    if (!found) {
      const osanoAccept = document.querySelector('.osano-cm-accept-all, .osano-cm-save');
      if (osanoAccept) {
        osanoAccept.click();
        found = true;
      }
    }

    return found;
  });
  return dismissed;
}

/**
 * Check if current page is a Cloudflare challenge and wait for it to pass.
 * Returns true if challenge was detected (and waited), false if page is normal.
 */
async function handleCloudflare(page) {
  const title = await page.title();
  const isChallenge = /just a moment|cloudflare|security check|verif/i.test(title);
  if (isChallenge) {
    console.error(JSON.stringify({ cloudflare: true, waiting: 25000 }));
    await new Promise(r => setTimeout(r, 25000));
    // Check again
    const newTitle = await page.title();
    return /just a moment|cloudflare|security check|verif/i.test(newTitle);
  }
  return false;
}

/**
 * Navigate with retry — handles timeouts by falling back to 'load' event.
 * Also auto-dismisses cookie banners and handles Cloudflare.
 */
async function smartNavigate(page, url) {
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  } catch (err) {
    if (err.message.includes('timeout')) {
      // Page may have loaded but background requests are still running
      // Check if we have content
      const hasContent = await page.evaluate(() => document.body?.innerText?.length > 100).catch(() => false);
      if (!hasContent) {
        // Try with less strict wait
        try {
          await page.goto(url, { waitUntil: 'load', timeout: 30000 });
        } catch {
          // Still timeout — page may be partially loaded, continue anyway
        }
      }
    } else {
      throw err;
    }
  }

  await randomDelay(2000, 4000);

  // Handle Cloudflare challenge
  const stillBlocked = await handleCloudflare(page);
  if (stillBlocked) {
    return { success: false, blocked: true, title: await page.title(), url: page.url() };
  }

  // Auto-dismiss cookie banners
  await dismissCookieBanners(page).catch(() => {});

  const title = await page.title();
  const currentUrl = page.url();
  return { success: true, blocked: false, title, url: currentUrl };
}

/**
 * Scroll to bottom of page to trigger all lazy loading, then back to top.
 * Smarter than fixed scroll — detects when page stops growing.
 */
async function scrollToLoadAll(page, maxScrolls = 15) {
  let lastHeight = 0;
  let sameCount = 0;

  for (let i = 0; i < maxScrolls; i++) {
    await humanScroll(page, 1000);
    await randomDelay(500, 1000);

    const newHeight = await page.evaluate(() => document.body.scrollHeight);
    if (newHeight === lastHeight) {
      sameCount++;
      if (sameCount >= 2) break; // Page has stopped growing
    } else {
      sameCount = 0;
    }
    lastHeight = newHeight;
  }
}


// ====== LISTING EXTRACTORS (extract agents from search/listing pages) ======

// Universal mailto-based extractor helper.
// Finds all mailto: links, walks up to container, extracts name/phone/picture/profile.
function mailtoScanExtractor(baseUrl, profileLinkPattern) {
  return () => {
    const agents = [];
    const seen = new Set();
    const mailtoLinks = document.querySelectorAll('a[href^="mailto:"]');

    mailtoLinks.forEach(mailtoEl => {
      const email = mailtoEl.href.replace('mailto:', '').split('?')[0].trim().toLowerCase();
      if (!email || !email.includes('@') || seen.has(email)) return;
      seen.add(email);

      // Walk up to find the containing card
      const container = mailtoEl.closest(
        '[class*="card"], [class*="Card"], [class*="agent"], [class*="Agent"], ' +
        '[class*="result"], [class*="Result"], [class*="item"], [class*="Item"], ' +
        '[class*="member"], [class*="Member"], [class*="associate"], ' +
        'li, article, section, [data-testid]'
      ) || mailtoEl.parentElement?.parentElement?.parentElement?.parentElement;
      if (!container) return;

      // Find name — look for headings first, then bold/strong text
      const nameEl = container.querySelector('h1, h2, h3, h4, h5, [class*="name"], [class*="Name"]');
      let name = nameEl?.textContent?.trim();
      if (!name) {
        const strongEl = container.querySelector('strong, b, [class*="title"], [class*="Title"]');
        name = strongEl?.textContent?.trim();
      }
      if (!name || name.length < 3 || name.length > 80) return;
      // Filter out non-name text
      if (/view|more|contact|office|search|page|next|prev/i.test(name)) return;

      // Find profile link
      let profileUrl = null;
      if (profileLinkPattern) {
        const profileLink = container.querySelector(`a[href*="${profileLinkPattern}"]`);
        const href = profileLink?.getAttribute('href');
        if (href) {
          profileUrl = href.startsWith('http') ? href : new URL(href, baseUrl).href;
        }
      }
      if (!profileUrl) {
        const anyLink = nameEl?.closest('a') || container.querySelector('a[href]:not([href^="mailto:"]):not([href^="tel:"])');
        const href = anyLink?.getAttribute('href');
        if (href && href !== '#' && href !== '/') {
          profileUrl = href.startsWith('http') ? href : new URL(href, baseUrl).href;
        }
      }

      // Find phone
      const phoneEl = container.querySelector('a[href^="tel:"]');
      const phone = phoneEl?.href?.replace('tel:', '').trim() || null;

      // Find picture — normalize to absolute URL
      const img = container.querySelector('img[src]:not([src*="logo"]):not([src*="icon"])');
      let picture = img?.src || null;
      if (picture && !picture.startsWith('http')) {
        try { picture = new URL(picture, baseUrl).href; } catch { picture = null; }
      }

      // Find Instagram handle
      const igLink = container.querySelector('a[href*="instagram.com"]');
      const igHandle = igLink?.href?.match(/instagram\.com\/([^/?#]+)/)?.[1] || null;

      agents.push({ full_name: name, profile_url: profileUrl, profile_picture_url: picture, email, phone, instagram_handle: igHandle });
    });

    return agents;
  };
}

// Profile-link-based extractor helper for brokerages where email is NOT on listing page.
function profileLinkExtractor(baseUrl, linkSelector, nameSelector) {
  return () => {
    const agents = [];
    const seen = new Set();
    const links = document.querySelectorAll(linkSelector);

    links.forEach(link => {
      const href = link.getAttribute('href');
      if (!href || seen.has(href)) return;

      const container = link.closest(
        '[class*="card"], [class*="Card"], [class*="agent"], [class*="Agent"], ' +
        '[class*="result"], [class*="Result"], [class*="item"], [class*="Item"], ' +
        '[class*="member"], [class*="associate"], li, article'
      ) || link.parentElement?.parentElement;
      if (!container) return;

      const nameEl = nameSelector
        ? container.querySelector(nameSelector)
        : container.querySelector('h1, h2, h3, h4, h5, [class*="name"], [class*="Name"]');
      let name = nameEl?.textContent?.trim();
      if (!name) {
        name = link.textContent?.trim()?.split('\n')[0]?.trim();
      }
      if (!name || name.length < 3 || name.length > 80) return;
      if (/view|more|search|page|next|prev|load/i.test(name)) return;

      const fullUrl = href.startsWith('http') ? href : new URL(href, baseUrl).href;
      if (seen.has(fullUrl)) return;
      seen.add(fullUrl);

      const phoneEl = container.querySelector('a[href^="tel:"]');
      const phone = phoneEl?.href?.replace('tel:', '').trim() || null;

      const img = container.querySelector('img[src]:not([src*="logo"]):not([src*="icon"])');
      let picture = img?.src || null;
      if (picture && !picture.startsWith('http')) {
        try { picture = new URL(picture, baseUrl).href; } catch { picture = null; }
      }

      const igLink = container.querySelector('a[href*="instagram.com"]');
      const igHandle = igLink?.href?.match(/instagram\.com\/([^/?#]+)/)?.[1] || null;

      agents.push({
        full_name: name,
        profile_url: fullUrl,
        profile_picture_url: picture,
        email: null, // Must visit profile
        phone,
        instagram_handle: igHandle,
      });
    });

    return agents;
  };
}

// Profile page extractor helper — extracts email from a single agent's profile page.
function profilePageExtractor() {
  return () => {
    // Find email
    const mailtoEl = document.querySelector('a[href^="mailto:"]');
    let email = mailtoEl?.href?.replace('mailto:', '')?.split('?')[0]?.trim()?.toLowerCase() || null;

    // Fallback: regex scan visible text for email pattern
    if (!email) {
      const text = document.body.innerText;
      const match = text.match(/[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}/);
      email = match ? match[0].toLowerCase() : null;
    }

    // Find name for verification
    const nameEl = document.querySelector('h1, h2, [class*="name"], [class*="Name"], [class*="agent-name"]');
    const name = nameEl?.textContent?.trim() || null;

    // Find phone
    const phoneEl = document.querySelector('a[href^="tel:"]');
    const phone = phoneEl?.href?.replace('tel:', '').trim() || null;

    // Find Instagram handle
    const igLink = document.querySelector('a[href*="instagram.com"]');
    const igHandle = igLink?.href?.match(/instagram\.com\/([^/?#]+)/)?.[1] || null;

    return { full_name: name, email, phone, instagram_handle: igHandle };
  };
}


// ====== BROKERAGE-SPECIFIC EXTRACTORS ======

// KW (Keller Williams) — email on listing page
async function extractKW(page) {
  return page.evaluate(() => {
    const agents = [];
    const seen = new Set();
    const cards = document.querySelectorAll('.agent-card-info');
    cards.forEach(card => {
      const emailEl = card.querySelector('a[href^="mailto:"]');
      if (!emailEl) return;
      const email = emailEl.href.replace('mailto:', '').split('?')[0].trim().toLowerCase();
      if (!email || !email.includes('@') || seen.has(email)) return;
      seen.add(email);

      const name = card.querySelector('.agent-card-name')?.textContent?.trim() || null;
      if (!name || name.length < 3 || name.length > 80) return;

      // Profile picture from background-image style
      const avatarEl = card.querySelector('.agent-card-avatar');
      let picture = null;
      if (avatarEl) {
        const bg = avatarEl.getAttribute('style') || '';
        const m = bg.match(/url\(['"]?([^'")\s]+)['"]?\)/);
        if (m) picture = m[1];
      }

      const phoneEl = card.querySelector('a[href^="tel:"]');
      const phone = phoneEl?.href?.replace('tel:', '').trim() || null;

      const profileLink = card.querySelector('a[href*="/agent/"]');
      const href = profileLink?.getAttribute('href');
      let profileUrl = null;
      if (href) profileUrl = href.startsWith('http') ? href : 'https://kw.com' + href;

      const igLink = card.querySelector('a[href*="instagram.com"]');
      const igHandle = igLink?.href?.match(/instagram\.com\/([^/?#]+)/)?.[1] || null;

      const nameParts = name.trim().split(/\s+/);
      const first_name = nameParts[0] || null;
      const last_name = nameParts.slice(1).join(' ') || null;

      agents.push({ full_name: name, first_name, last_name, profile_url: profileUrl, profile_picture_url: picture, email, phone, instagram_handle: igHandle });
    });
    return agents;
  });
}

// Coldwell Banker — email on listing page via mailto:
// Uses dual strategy: URL slug for name + visible text fallback
async function extractColdwellBanker(page) {
  return page.evaluate(() => {
    const agents = [];
    const seen = new Set();

    // Strategy: find all mailto links, walk up to MUI Grid container
    const mailtoLinks = document.querySelectorAll('a[href^="mailto:"]');
    mailtoLinks.forEach(mailtoEl => {
      const email = mailtoEl.href.replace('mailto:', '').split('?')[0].trim().toLowerCase();
      if (!email || !email.includes('@') || seen.has(email)) return;

      // Walk up to find the grid item container (MUI uses MuiGrid-item)
      let container = mailtoEl;
      for (let i = 0; i < 15 && container; i++) {
        container = container.parentElement;
        if (!container) break;
        const cls = container.className || '';
        if (cls.includes('MuiGrid-item') || cls.includes('agent-card') || cls.includes('Agent')) break;
      }
      if (!container) return;

      // Find profile link (has /agents/ and aid- in href)
      const profileLink = container.querySelector('a[href*="/agents/"][href*="aid-"]');
      const href = profileLink?.getAttribute('href');
      if (!href) return; // Skip if no profile link — can't identify agent

      if (seen.has(href)) return;
      seen.add(email);
      seen.add(href);

      // Name: try URL slug first, then visible text
      let name = null;
      const slugMatch = href.match(/\/agents\/([^/]+)\/aid-/);
      if (slugMatch) {
        name = slugMatch[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      }

      // Fallback: look for visible name text near the profile link
      if (!name) {
        const linkText = profileLink.textContent?.trim();
        // CB link text is like "DADyar Abbas(832)..." — extract letters only
        if (linkText) {
          const cleaned = linkText.replace(/\([^)]*\)/g, '').replace(/Contact/gi, '').trim();
          // Remove leading initials (2 uppercase chars stuck to name)
          const nameMatch = cleaned.match(/^[A-Z]{0,3}([A-Z][a-z].+)/);
          if (nameMatch) name = nameMatch[1].trim();
          else if (cleaned.length >= 3 && cleaned.length <= 80) name = cleaned;
        }
      }

      if (!name || name.length < 3 || name.length > 80) return;

      const profileUrl = href.startsWith('http') ? href : 'https://www.coldwellbanker.com' + href;

      const phoneEl = container.querySelector('a[href^="tel:"]');
      const phone = phoneEl?.href?.replace('tel:', '').trim() || null;

      const img = container.querySelector('img[src]:not([src*="logo"]):not([src*="icon"]):not([src*="placeholder"])');
      let picture = img?.src || null;
      if (picture && !picture.startsWith('http')) {
        try { picture = new URL(picture, 'https://www.coldwellbanker.com').href; } catch { picture = null; }
      }

      const igLink = container.querySelector('a[href*="instagram.com"]');
      const igHandle = igLink?.href?.match(/instagram\.com\/([^/?#]+)/)?.[1] || null;

      const nameParts = name.trim().split(/\s+/);
      const first_name = nameParts[0] || null;
      const last_name = nameParts.slice(1).join(' ') || null;

      agents.push({ full_name: name, first_name, last_name, profile_url: profileUrl, profile_picture_url: picture, email, phone, instagram_handle: igHandle });
    });
    return agents;
  });
}

// Compass — email on listing page via mailto:
async function extractCompass(page) {
  return page.evaluate(mailtoScanExtractor('https://www.compass.com', '/agents/'));
}

// eXp Realty — listing page (profile URLs only, no email)
async function extractExp(page) {
  return page.evaluate(profileLinkExtractor(
    'https://www.exprealty.com',
    'a[href*="/agents-search/"][href*="_"]', // Profile links have Name_uuid format
    null
  ));
}

// BHHS — listing page (profile URLs only, no email)
async function extractBHHS(page) {
  return page.evaluate(profileLinkExtractor(
    'https://www.bhhs.com',
    'a[href*="/agent/"], a[href*="/associate/"], a[href*="cid-"]',
    null
  ));
}

// Sotheby's — listing page (profile URLs only, no email)
async function extractSothebys(page) {
  return page.evaluate(profileLinkExtractor(
    'https://www.sothebysrealty.com',
    'a[href*="/associate/"]',
    null
  ));
}

// Profile page extractors (for brokerages that need profile visits)
async function extractExpProfile(page) {
  return page.evaluate(profilePageExtractor());
}

async function extractBHHSProfile(page) {
  return page.evaluate(profilePageExtractor());
}

async function extractSothebysProfile(page) {
  return page.evaluate(profilePageExtractor());
}


const EXTRACTORS = {
  kw: extractKW,
  exp: extractExp,
  coldwellbanker: extractColdwellBanker,
  coldwell: extractColdwellBanker,
  bhhs: extractBHHS,
  compass: extractCompass,
  sothebys: extractSothebys,
};

const PROFILE_EXTRACTORS = {
  exp: extractExpProfile,
  bhhs: extractBHHSProfile,
  sothebys: extractSothebysProfile,
};

// ====== COMMANDS ======

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === 'help') {
    console.log(`Chrome Tool — Controls your real Chrome browser via CDP

Commands:
  navigate <url>           Navigate to URL (auto-handles timeouts, Cloudflare, cookies)
  html [selector]          Get rendered HTML (full page or CSS selector)
  text [selector]          Get text content (cleaner output)
  scroll [pixels]          Scroll down (default: 800px)
  scroll-all               Scroll entire page to trigger all lazy loading
  click <selector>         Click an element
  type <selector> <text>   Type text into an input field
  screenshot [file]        Save screenshot (default: /tmp/chrome-screenshot.png)
  agents <brokerage>       Extract agent data from listing page (kw, exp, coldwellbanker, bhhs, compass, sothebys)
  profile <brokerage>      Extract email from individual profile page (exp, bhhs, sothebys)
  dismiss-cookies          Dismiss cookie/consent banners
  instagram-search <handle>  Search/navigate to an Instagram profile
  instagram-dm <message>     Send a DM to the current Instagram profile
  wait <ms>                Wait for milliseconds
  url                      Get current page URL
  status                   Check Chrome connection

Prerequisites:
  Launch Chrome first: google-chrome --remote-debugging-port=9222`);
    return;
  }

  if (command === 'status') {
    try {
      const { browser } = await connectToChrome();
      const pages = await browser.pages();
      console.log(JSON.stringify({
        connected: true,
        tabs: pages.length,
        urls: await Promise.all(pages.map(p => p.url())),
      }, null, 2));
      await browser.disconnect();
    } catch {
      console.log(JSON.stringify({ connected: false }));
    }
    return;
  }

  let browser, page;
  try {
    ({ browser, page } = await connectToChrome());
  } catch (err) {
    console.error('ERROR: Cannot connect to Chrome. Make sure Chrome is running with:');
    console.error('  google-chrome --remote-debugging-port=9222');
    console.error('');
    console.error('Technical details:', err.message);
    process.exit(1);
  }

  try {
    switch (command) {
      case 'navigate': {
        const url = args[1];
        if (!url) { console.error('Usage: navigate <url>'); break; }
        console.log(`Navigating to: ${url}`);
        const result = await smartNavigate(page, url);
        console.log(JSON.stringify(result));
        break;
      }

      case 'html': {
        const selector = args[1];
        let html;
        if (selector) {
          html = await page.$eval(selector, el => el.innerHTML).catch(() => null);
          if (!html) {
            console.error(`Selector "${selector}" not found`);
            break;
          }
        } else {
          html = await page.content();
        }
        if (html.length > 50000) {
          html = html.substring(0, 50000) + '\n\n... [TRUNCATED — use a more specific selector]';
        }
        console.log(html);
        break;
      }

      case 'text': {
        const selector = args[1];
        let text;
        if (selector) {
          text = await page.$eval(selector, el => el.innerText).catch(() => null);
          if (!text) {
            console.error(`Selector "${selector}" not found`);
            break;
          }
        } else {
          text = await page.evaluate(() => document.body.innerText);
        }
        if (text.length > 30000) {
          text = text.substring(0, 30000) + '\n\n... [TRUNCATED]';
        }
        console.log(text);
        break;
      }

      case 'scroll': {
        const amount = parseInt(args[1]) || 800;
        await humanScroll(page, amount);
        console.log(JSON.stringify({ scrolled: amount }));
        break;
      }

      case 'scroll-all': {
        await scrollToLoadAll(page);
        const height = await page.evaluate(() => document.body.scrollHeight);
        console.log(JSON.stringify({ scrolled: 'all', pageHeight: height }));
        break;
      }

      case 'click': {
        const selector = args[1];
        if (!selector) { console.error('Usage: click <selector>'); break; }
        await page.click(selector);
        await randomDelay(500, 1500);
        console.log(JSON.stringify({ clicked: selector }));
        break;
      }

      case 'type': {
        const selector = args[1];
        const text = args.slice(2).join(' ');
        if (!selector || !text) { console.error('Usage: type <selector> <text>'); break; }
        await page.click(selector);
        await randomDelay(200, 500);
        for (const char of text) {
          await page.keyboard.type(char, { delay: Math.random() * 90 + 60 });
        }
        console.log(JSON.stringify({ typed: text, into: selector }));
        break;
      }

      case 'screenshot': {
        const file = args[1] || '/tmp/chrome-screenshot.png';
        await page.screenshot({ path: file, fullPage: false });
        console.log(JSON.stringify({ saved: file }));
        break;
      }

      case 'dismiss-cookies': {
        const dismissed = await dismissCookieBanners(page);
        console.log(JSON.stringify({ dismissed }));
        break;
      }

      case 'agents': {
        const brokerage = args[1];
        if (!brokerage) { console.error('Usage: agents <brokerage>'); break; }

        const extractor = EXTRACTORS[brokerage];
        if (!extractor) {
          console.error(`Unknown brokerage: ${brokerage}. Available: ${Object.keys(EXTRACTORS).join(', ')}`);
          break;
        }

        // Smart scroll to trigger lazy loading
        await scrollToLoadAll(page);
        await randomDelay(500, 1000);

        let agents = await extractor(page);

        // Deduplicate by email (preferred) or name as fallback
        const seenEmails = new Set();
        const seenNames = new Set();
        agents = agents.filter(a => {
          if (a.email) {
            if (seenEmails.has(a.email)) return false;
            seenEmails.add(a.email);
            return true;
          }
          // For profile-visit brokerages (no email yet), dedup by profile URL or name
          const key = a.profile_url || a.full_name?.toLowerCase();
          if (!key || seenNames.has(key)) return false;
          seenNames.add(key);
          return true;
        });

        // Split names into first/last (only if not already set)
        agents = agents.map(a => {
          if (a.first_name && a.last_name) return a;
          const parts = a.full_name.trim().split(/\s+/);
          return {
            ...a,
            first_name: a.first_name || parts[0] || '',
            last_name: a.last_name || parts.slice(1).join(' ') || '',
          };
        });

        console.log(JSON.stringify(agents, null, 2));
        break;
      }

      case 'profile': {
        const brokerage = args[1];
        if (!brokerage) { console.error('Usage: profile <brokerage>'); break; }

        const extractor = PROFILE_EXTRACTORS[brokerage];
        if (!extractor) {
          console.error(`No profile extractor for: ${brokerage}. Available: ${Object.keys(PROFILE_EXTRACTORS).join(', ')}`);
          break;
        }

        // Small scroll to trigger any lazy loading on profile page
        await humanScroll(page, 800);
        await randomDelay(500, 1000);

        const result = await extractor(page);
        console.log(JSON.stringify(result, null, 2));
        break;
      }

      case 'wait': {
        const ms = parseInt(args[1]) || 1000;
        await new Promise(resolve => setTimeout(resolve, ms));
        console.log(JSON.stringify({ waited: ms }));
        break;
      }

      case 'url': {
        console.log(page.url());
        break;
      }

      case 'instagram-search': {
        const handle = args[1];
        if (!handle) { console.error('Usage: instagram-search <handle>'); break; }
        const currentUrl = page.url();
        if (!currentUrl.includes('instagram.com')) {
          await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle2', timeout: 30000 });
          await randomDelay(2000, 3000);
        }
        try {
          await page.click('a[href="/explore/"]').catch(() => null);
          await randomDelay(500, 800);
          const searchInput = await page.$('input[placeholder*="Search"]') || await page.$('input[aria-label*="Search"]');
          if (searchInput) {
            await searchInput.click();
            await randomDelay(300, 500);
            await page.keyboard.down('Control');
            await page.keyboard.press('a');
            await page.keyboard.up('Control');
            await randomDelay(100, 200);
            for (const char of handle) {
              await page.keyboard.type(char, { delay: Math.random() * 90 + 60 });
            }
            await randomDelay(1500, 2500);
            console.log(JSON.stringify({ searched: handle, success: true }));
          } else {
            await page.goto(`https://www.instagram.com/${handle}/`, { waitUntil: 'networkidle2', timeout: 30000 });
            await randomDelay(2000, 3000);
            console.log(JSON.stringify({ searched: handle, success: true, method: 'direct_nav' }));
          }
        } catch (err) {
          await page.goto(`https://www.instagram.com/${handle}/`, { waitUntil: 'networkidle2', timeout: 30000 });
          await randomDelay(2000, 3000);
          console.log(JSON.stringify({ searched: handle, success: true, method: 'direct_nav' }));
        }
        break;
      }

      case 'instagram-dm': {
        const messageText = args.slice(1).join(' ');
        if (!messageText) { console.error('Usage: instagram-dm <message text>'); break; }
        try {
          const messageBtn = await page.$('div[role="button"]:has-text("Message")') ||
                             await page.$x('//div[@role="button"][contains(., "Message")]').then(els => els[0]);
          if (!messageBtn) {
            const btns = await page.$$('div[role="button"]');
            let found = false;
            for (const btn of btns) {
              const btnText = await page.evaluate(el => el.textContent, btn);
              if (btnText && btnText.trim() === 'Message') {
                await btn.click();
                found = true;
                break;
              }
            }
            if (!found) {
              console.error(JSON.stringify({ success: false, error: 'Message button not found' }));
              break;
            }
          } else {
            await messageBtn.click();
          }
          await randomDelay(2000, 3500);
          const msgInput = await page.$('textarea[placeholder*="Message"]') ||
                           await page.$('div[role="textbox"][contenteditable="true"]') ||
                           await page.$('textarea');
          if (!msgInput) {
            console.error(JSON.stringify({ success: false, error: 'Message input not found' }));
            break;
          }
          await msgInput.click();
          await randomDelay(300, 600);
          for (const char of messageText) {
            await page.keyboard.type(char, { delay: Math.random() * 90 + 60 });
          }
          await randomDelay(500, 1000);
          await page.keyboard.press('Enter');
          await randomDelay(1000, 2000);
          console.log(JSON.stringify({ success: true, sent: messageText.substring(0, 50) + '...' }));
        } catch (err) {
          console.error(JSON.stringify({ success: false, error: err.message }));
        }
        break;
      }

      default:
        console.error(`Unknown command: ${command}. Run with 'help' for usage.`);
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  } finally {
    await browser.disconnect();
  }
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
