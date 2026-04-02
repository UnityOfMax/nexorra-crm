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

// Support custom port for multi-instance (Derek uses 9223)
const portArgIdx = process.argv.indexOf('--port');
const CDP_PORT = portArgIdx !== -1 ? parseInt(process.argv[portArgIdx + 1]) : 9222;
// Remove --port from args so it doesn't interfere with command parsing
if (portArgIdx !== -1) process.argv.splice(portArgIdx, 2);

// Support --vw and --vh flags to set viewport on connect (persists across reconnects)
const vwIdx = process.argv.indexOf('--vw');
const CONNECT_VW = vwIdx !== -1 ? parseInt(process.argv[vwIdx + 1]) : 0;
if (vwIdx !== -1) process.argv.splice(vwIdx, 2);
const vhIdx = process.argv.indexOf('--vh');
const CONNECT_VH = vhIdx !== -1 ? parseInt(process.argv[vhIdx + 1]) : 0;
if (vhIdx !== -1) process.argv.splice(vhIdx, 2);

const CDP_URL = `http://localhost:${CDP_PORT}`;

async function connectToChrome() {
  const browser = await puppeteer.connect({ browserURL: CDP_URL });
  const pages = await browser.pages();
  let page = pages[0];
  if (!page) {
    page = await browser.newPage();
  }
  // Apply viewport if --vw/--vh flags were provided (ensures viewport survives reconnects)
  if (CONNECT_VW > 0 && CONNECT_VH > 0) {
    await page.setViewport({ width: CONNECT_VW, height: CONNECT_VH });
  }
  // Stealth: remove bot signals so Cloudflare fingerprinting doesn't block us.
  // evaluateOnNewDocument injects before any page JS runs.
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    // Remove Chrome automation globals
    delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
    delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
    delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
    // Restore chrome runtime (missing in automated sessions)
    if (!window.chrome) window.chrome = { runtime: {} };
    // Pass Notification permission check used by bot detectors
    const origQuery = window.navigator.permissions && window.navigator.permissions.query;
    if (origQuery) {
      window.navigator.permissions.query = (p) =>
        p.name === 'notifications'
          ? Promise.resolve({ state: Notification.permission })
          : origQuery.call(window.navigator.permissions, p);
    }
  });
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

    // Strategy 4: TrustArc / TrustE consent manager (Coldwell Banker etc.)
    if (!found) {
      // Click "SUBMIT PREFERENCES" or close the TrustArc banner
      const trustArcBtns = document.querySelectorAll(
        '.pdynamicbutton .call, #consent_wall_optin, .shp, ' +
        'a.call[onclick*="submit"], button.call, ' +
        '#truste-consent-button, .truste-consent-close, ' +
        '#gwt-debug-close_id, .close.consent-close'
      );
      for (const btn of trustArcBtns) {
        btn.click();
        found = true;
        break;
      }
      // Also try the overlay close and preference submit
      if (!found) {
        const submitPref = Array.from(document.querySelectorAll('button, a')).find(
          el => /submit preferences|save preferences/i.test(el.textContent || '')
        );
        if (submitPref) { submitPref.click(); found = true; }
      }
    }

    // Strategy 5: Generic overlay/modal close (last resort)
    if (!found) {
      const overlay = document.querySelector(
        '.consent-overlay .close, .cookie-overlay .close, ' +
        '[class*="consent-banner"] [class*="close"], ' +
        '[class*="cookie-banner"] [class*="close"]'
      );
      if (overlay) { overlay.click(); found = true; }
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
  const isChallenge = /just a moment|attention required|cloudflare|security check|verif/i.test(title);
  if (isChallenge) {
    // Fail immediately — no 25s wait. Callers should try fallback URLs.
    console.error(JSON.stringify({ cloudflare: true, blocked: true }));
    return true;
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

// Profile-link-based extractor logic (inlined into each extractor via page.evaluate args).
// IMPORTANT: Puppeteer does NOT serialize closures. Always use page.evaluate(fn, arg1, arg2)
// and pass variables as explicit args — never rely on outer-scope captures.
function _profileLinkExtractorFn(baseUrl, linkSelector, nameSelector) {
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
      email: null,
      phone,
      instagram_handle: igHandle,
    });
  });

  return agents;
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

    // Find personal website — external link labeled "website" / "web" / "my site"
    const SKIP_DOMAINS = ['instagram.com','facebook.com','twitter.com','linkedin.com','youtube.com','tiktok.com','google.com','yelp.com','bhhs.com','remax.com','exprealty.com','sothebysrealty.com','kw.com','coldwellbanker.com','century21.com','realtor.com','compass.com'];
    let personalWebsite = null;
    const allLinks = Array.from(document.querySelectorAll('a[href^="http"]'));
    // First pass: look for links explicitly labeled "website"
    for (const link of allLinks) {
      const text = (link.textContent || '').toLowerCase().trim();
      const ariaLabel = (link.getAttribute('aria-label') || '').toLowerCase();
      const title = (link.getAttribute('title') || '').toLowerCase();
      const combined = text + ' ' + ariaLabel + ' ' + title;
      if (/\bwebsite\b|\bmy site\b|\bhomepage\b|\bhome page\b|\bvisit site\b/.test(combined)) {
        const href = link.href;
        if (!SKIP_DOMAINS.some(d => href.includes(d))) {
          personalWebsite = href;
          break;
        }
      }
    }
    // Second pass: any external link that isn't social/brokerage/aggregator
    if (!personalWebsite) {
      const EXTENDED_SKIP = [...SKIP_DOMAINS, 'zillow.com','trulia.com','redfin.com','homesnap.com','homes.com','whitepages.com','yellowpages.com','mapquest.com','schema.org'];
      for (const link of allLinks) {
        const href = link.href;
        if (!EXTENDED_SKIP.some(d => href.includes(d)) && !/^https?:\/\/[^/]+(\/?)$/.test(href)) {
          // Must have a meaningful path (not just a root domain)
          const path = href.replace(/^https?:\/\/[^/]+/, '');
          if (path.length > 2) {
            personalWebsite = href;
            break;
          }
        }
      }
    }

    return { full_name: name, email, phone, instagram_handle: igHandle, personal_website: personalWebsite };
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

// Compass — emails in JSON-LD structured data (application/ld+json)
async function extractCompass(page) {
  return page.evaluate(() => {
    const agents = [];
    const seen = new Set();
    try {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const script of scripts) {
        let data;
        try { data = JSON.parse(script.textContent); } catch { continue; }
        const graph = data['@graph'] || (Array.isArray(data) ? data : [data]);
        for (const item of graph) {
          if (item['@type'] !== 'RealEstateAgent') continue;
          const email = item.email ? item.email.toLowerCase().trim() : null;
          if (!email || !email.includes('@') || seen.has(email)) continue;
          seen.add(email);
          const full_name = item.name ? item.name.trim() : null;
          if (!full_name || full_name.length < 3) continue;
          const nameParts = full_name.split(/\s+/);
          agents.push({
            full_name,
            first_name: nameParts[0] || null,
            last_name: nameParts.slice(1).join(' ') || null,
            email,
            phone: item.telephone ? String(item.telephone) : null,
            profile_url: item.url || null,
            profile_picture_url: item.image ? (typeof item.image === 'string' ? item.image : (item.image.url || null)) : null,
            instagram_handle: null,
          });
        }
      }
    } catch (e) {}
    return agents;
  });
}

// eXp Realty — listing page (profile URLs only, no email)
async function extractExp(page) {
  return page.evaluate(_profileLinkExtractorFn,
    'https://www.exprealty.com',
    'a[href*="/agents-search/"][href*="_"]',
    null
  );
}

// BHHS — listing page (profile URLs only, no email)
async function extractBHHS(page) {
  return page.evaluate(_profileLinkExtractorFn,
    'https://www.bhhs.com',
    'a[href*="/agent/"], a[href*="/associate/"], a[href*="cid-"]',
    null
  );
}

// Sotheby's — listing page (profile URLs only, no email)
async function extractSothebys(page) {
  return page.evaluate((baseUrl, linkSelector) => {
    const agents = [];
    const seen = new Set();
    const links = document.querySelectorAll(linkSelector);
    links.forEach(link => {
      const href = link.getAttribute('href');
      if (!href || seen.has(href) || href.includes('#')) return;
      const container = link.closest('[class*="card"], [class*="Card"], [class*="agent"], [class*="Agent"], [class*="result"], [class*="Result"], [class*="item"], [class*="Item"], [class*="member"], [class*="associate"], li, article') || link.parentElement?.parentElement;
      if (!container) return;
      const nameEl = container.querySelector('h1, h2, h3, h4, h5, [class*="name"], [class*="Name"]');
      let name = nameEl?.textContent?.trim();
      if (!name) name = link.textContent?.trim()?.split('\n')[0]?.trim();
      if (!name || name.length < 3 || name.length > 80) return;
      if (/view|more|search|page|next|prev|load/i.test(name)) return;
      const fullUrl = href.startsWith('http') ? href : new URL(href, baseUrl).href;
      if (seen.has(fullUrl)) return;
      seen.add(fullUrl);
      const img = container.querySelector('img[src]:not([src*="logo"]):not([src*="icon"])');
      let picture = img?.src || null;
      if (picture && !picture.startsWith('http')) { try { picture = new URL(picture, baseUrl).href; } catch { picture = null; } }
      const nameParts = name.trim().split(/\s+/);
      agents.push({ full_name: name, first_name: nameParts[0] || null, last_name: nameParts.slice(1).join(' ') || null, profile_url: fullUrl, profile_picture_url: picture, email: null, phone: null, instagram_handle: null });
    });
    return agents;
  }, 'https://www.sothebysrealty.com', 'a[href*="/associate/"]');
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

// RE/MAX — listing page (profile URLs only, need profile visit for Instagram/phone)
async function extractRemax(page) {
  return page.evaluate(() => {
    const agents = [];
    const seen = new Set();
    // Find all profile links — RE/MAX IDs start with 10xxxxxxx
    const links = document.querySelectorAll('a[href*="/real-estate-agents/"]');
    links.forEach(link => {
      const href = link.getAttribute('href');
      if (!href || !href.match(/\/\d{6,}$/)) return; // Must end with numeric ID
      const fullUrl = href.startsWith('http') ? href : 'https://www.remax.com' + href;
      if (seen.has(fullUrl)) return;
      seen.add(fullUrl);

      // Walk up to card container
      const container = link.closest('[class*="card"], [class*="Card"], li, article, [class*="agent"]') || link.parentElement?.parentElement;
      if (!container) return;

      const nameEl = container.querySelector('.agent-name, [class*="agent-name"], h2, h3');
      let name = nameEl?.textContent?.trim();
      if (!name) {
        // Try extracting from URL slug: /real-estate-agents/name-city-st/id
        const slugMatch = href.match(/\/real-estate-agents\/([^/]+)-[a-z]{2}\/\d/);
        if (slugMatch) {
          name = slugMatch[1].split('-').slice(0, -1).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        }
      }
      if (!name || name.length < 3 || name.length > 80) return;
      if (/view|more|search|page|next|prev/i.test(name)) return;

      const phoneEl = container.querySelector('a[href^="tel:"]');
      const phone = phoneEl?.href?.replace('tel:', '').trim() || null;

      const img = container.querySelector('img[src]:not([src*="logo"]):not([src*="icon"])');
      const picture = img?.src || null;

      const nameParts = name.trim().split(/\s+/);
      agents.push({
        full_name: name,
        first_name: nameParts[0] || null,
        last_name: nameParts.slice(1).join(' ') || null,
        profile_url: fullUrl,
        profile_picture_url: picture,
        email: null,
        phone,
        instagram_handle: null, // Must visit profile
      });
    });
    return agents;
  });
}

// RE/MAX — profile page (Instagram handle + phone + email)
async function extractRemaxProfile(page) {
  return page.evaluate(() => {
    const REMAX_GENERIC = new Set(['remax', 'remaxllc', 'remax_llc', 'remaxcanada']);

    function parseIgHandle(href) {
      if (!href) return null;
      const match = href.match(/instagram\.com\/([^/?#&\s]+)/);
      const handle = match?.[1];
      if (!handle || REMAX_GENERIC.has(handle.toLowerCase())) return null;
      return handle;
    }

    let igHandle = null;

    // 1. Direct <a href*="instagram.com"> links
    if (!igHandle) {
      for (const link of document.querySelectorAll('a[href*="instagram.com"]')) {
        igHandle = parseIgHandle(link.href);
        if (igHandle) break;
      }
    }

    // 2. data-href or data-url attributes (React-rendered social buttons)
    if (!igHandle) {
      for (const el of document.querySelectorAll('[data-href*="instagram.com"],[data-url*="instagram.com"],[data-link*="instagram.com"]')) {
        igHandle = parseIgHandle(el.getAttribute('data-href') || el.getAttribute('data-url') || el.getAttribute('data-link'));
        if (igHandle) break;
      }
    }

    // 3. JSON-LD structured data — Person.sameAs array
    if (!igHandle) {
      for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
        try {
          const data = JSON.parse(script.textContent);
          const items = Array.isArray(data) ? data : [data];
          for (const item of items) {
            const sameAs = item.sameAs || (item['@graph'] || []).flatMap(n => n.sameAs || []);
            for (const url of (Array.isArray(sameAs) ? sameAs : [sameAs])) {
              igHandle = parseIgHandle(url);
              if (igHandle) break;
            }
            if (igHandle) break;
          }
        } catch { /* skip malformed JSON-LD */ }
        if (igHandle) break;
      }
    }

    // 4. Text content — look for @handle near social/instagram text
    if (!igHandle) {
      const bodyText = document.body.innerText;
      // Match "instagram.com/handle" in plain text (not an <a> tag)
      const textMatch = bodyText.match(/instagram\.com\/([A-Za-z0-9_.]{3,30})/);
      if (textMatch) igHandle = parseIgHandle('instagram.com/' + textMatch[1]);
    }

    const mailtoEl = document.querySelector('a[href^="mailto:"]');
    const email = mailtoEl?.href?.replace('mailto:', '')?.split('?')[0]?.trim()?.toLowerCase() || null;

    const phoneEl = document.querySelector('a[href^="tel:"]');
    const phone = phoneEl?.href?.replace('tel:', '').trim() || null;

    const nameEl = document.querySelector('h1, [class*="agent-name"]');
    const name = nameEl?.textContent?.trim() || null;

    // Personal website — labeled link or external non-brokerage link
    const SKIP = ['remax.com','instagram.com','facebook.com','twitter.com','linkedin.com','youtube.com','google.com','yelp.com'];
    let personalWebsite = null;
    for (const link of document.querySelectorAll('a[href^="http"]')) {
      const href = link.href;
      if (SKIP.some(d => href.includes(d))) continue;
      const text = (link.textContent || '').toLowerCase();
      const aria = (link.getAttribute('aria-label') || '').toLowerCase();
      if (/\bwebsite\b|\bmy site\b|\bhomepage\b/.test(text + ' ' + aria)) {
        personalWebsite = href; break;
      }
    }

    return { full_name: name, email, phone, instagram_handle: igHandle, personal_website: personalWebsite };
  });
}

// Century 21 — listing page (names + mobile phones directly, no profile visit needed)
async function extractCentury21(page) {
  return page.evaluate(() => {
    const agents = [];
    const seen = new Set();

    // C21 uses .agent-list-card-component or similar card wrappers
    // Each card has: .agent-name, .contact-info-item with phone SVG, profile link
    const cards = document.querySelectorAll('[class*="agent-list-card"], [class*="AgentCard"]');

    // Fallback: find all profile links if card selector doesn't work
    const profileLinks = cards.length > 0 ? [] : document.querySelectorAll('a[href*="/agent/detail/"]');

    const elements = cards.length > 0 ? cards : profileLinks;

    elements.forEach(el => {
      const container = cards.length > 0 ? el : (el.closest('li, article, [class*="card"]') || el.parentElement?.parentElement?.parentElement);
      if (!container) return;

      // Name
      const nameEl = container.querySelector('.agent-name, [class*="agent-name"]');
      const name = nameEl?.textContent?.trim();
      if (!name || name.length < 3 || name.length > 80 || seen.has(name)) return;
      seen.add(name);

      // Phone — first phone number (phone icon, not speech bubble)
      // C21 uses <button class="contact-info-item"> with fa-phone SVG for mobile
      const phoneButtons = container.querySelectorAll('.contact-info-item, [class*="contact-info"]');
      let phone = null;
      for (const btn of phoneButtons) {
        const hasPhoneIcon = btn.querySelector('[data-icon="phone"], .fa-phone');
        if (hasPhoneIcon) {
          const span = btn.querySelector('span');
          phone = span?.textContent?.trim()?.replace(/\s+/g, '').replace(/-/g, '') || null;
          break;
        }
      }
      // Fallback: first phone number found
      if (!phone) {
        const anyPhone = container.querySelector('.contact-info-item span, a[href^="tel:"]');
        phone = anyPhone?.textContent?.trim()?.replace(/\s+/g, '').replace(/-/g, '') || null;
      }

      if (!phone) return; // C21 is for phone leads — skip if no phone

      // Profile URL
      const profileLink = container.querySelector('a[href*="/agent/detail/"]');
      const href = profileLink?.getAttribute('href');
      const profileUrl = href ? (href.startsWith('http') ? href : 'https://www.century21.com' + href) : null;

      // Picture
      const img = container.querySelector('img.profile-pic, img[src]:not([src*="logo"])');
      const picture = img?.src || null;

      // Office name
      const officeEl = container.querySelector('.office-name, [class*="office"]');
      const office = officeEl?.textContent?.trim() || null;

      const nameParts = name.trim().split(/\s+/);
      agents.push({
        full_name: name,
        first_name: nameParts[0] || null,
        last_name: nameParts.slice(1).join(' ') || null,
        profile_url: profileUrl,
        profile_picture_url: picture,
        email: null,
        phone,
        mobile_phone: phone, // C21 phone icon = mobile
        instagram_handle: null,
        office,
      });
    });
    return agents;
  });
}


// Realtor.com — listing page (profile URLs + names, minimal phone on listing)
async function extractRealtor(page) {
  return page.evaluate(() => {
    const agents = [];
    const seen = new Set();

    // Try card containers first
    const cards = document.querySelectorAll('[class*="AgentCard"], [class*="agent-card"], [data-testid*="agent-card"], [class*="agent_card"]');

    const processLink = (link, container) => {
      const href = link.getAttribute('href');
      if (!href) return;
      // Profile URLs: /realestateagents/{hex-id} or /realestateagents/{slug}/{id}
      if (!/\/realestateagents\/[0-9a-f]{16,}/.test(href) && !/\/realestateagents\/[^/]+\/[0-9a-f]{16,}/.test(href)) return;
      const fullUrl = href.startsWith('http') ? href : 'https://www.realtor.com' + href;
      if (seen.has(fullUrl)) return;
      seen.add(fullUrl);

      const nameEl = container?.querySelector('h3, h2, [class*="agent-name"], [class*="AgentName"], [data-testid="agent-name"]');
      let name = nameEl?.textContent?.trim();
      if (!name || name.length < 3 || name.length > 80) return;
      if (/view|more|search|page|next|prev/i.test(name)) return;

      const phoneEl = container?.querySelector('a[href^="tel:"]');
      const phone = phoneEl?.href?.replace('tel:', '').trim() || null;

      const img = container?.querySelector('img[src]:not([src*="logo"]):not([src*="icon"])');
      const picture = img?.src || null;

      const nameParts = name.trim().split(/\s+/);
      agents.push({
        full_name: name,
        first_name: nameParts[0] || null,
        last_name: nameParts.slice(1).join(' ') || null,
        profile_url: fullUrl,
        profile_picture_url: picture,
        email: null,
        phone,
        instagram_handle: null,
      });
    };

    if (cards.length > 0) {
      cards.forEach(card => {
        const link = card.querySelector('a[href*="/realestateagents/"]');
        if (link) processLink(link, card);
      });
    } else {
      // Fallback: find all profile links on page
      document.querySelectorAll('a[href*="/realestateagents/"]').forEach(link => {
        const container = link.closest('li, article, [class*="card"], [class*="Card"], [class*="item"]') || link.parentElement?.parentElement;
        processLink(link, container);
      });
    }
    return agents;
  });
}

// Realtor.com — profile page (mobile phone, email, Instagram)
async function extractRealtorProfile(page) {
  return page.evaluate(() => {
    // Collect all phone numbers — prefer mobile/cell labeled ones
    const phoneLinks = Array.from(document.querySelectorAll('a[href^="tel:"]'));
    let mobilePhone = null;
    let anyPhone = null;

    phoneLinks.forEach(link => {
      const num = link.href.replace('tel:', '').trim();
      if (!anyPhone) anyPhone = num;
      const context = (link.closest('[class*="phone"], [class*="contact"], [class*="Phone"]')?.textContent ||
                       link.parentElement?.textContent || '').toLowerCase();
      if ((context.includes('mobile') || context.includes('cell')) && !mobilePhone) {
        mobilePhone = num;
      }
    });
    const phone = mobilePhone || anyPhone;

    // Instagram
    const igLinks = document.querySelectorAll('a[href*="instagram.com"]');
    let igHandle = null;
    for (const link of igLinks) {
      const match = link.href.match(/instagram\.com\/([^/?#&]+)/);
      if (match && !['realtor', 'realtordotcom', 'realtorcom'].includes(match[1].toLowerCase())) {
        igHandle = match[1];
        break;
      }
    }

    // Email
    const mailtoEl = document.querySelector('a[href^="mailto:"]');
    const email = mailtoEl?.href?.replace('mailto:', '')?.split('?')[0]?.trim()?.toLowerCase() || null;

    // Name
    const nameEl = document.querySelector('h1, [class*="agent-name"], [data-testid="agent-name"]');
    const name = nameEl?.textContent?.trim() || null;

    // Personal website
    const SKIP_RT = ['realtor.com','instagram.com','facebook.com','twitter.com','linkedin.com','youtube.com','google.com'];
    let personalWebsite = null;
    for (const link of document.querySelectorAll('a[href^="http"]')) {
      const href = link.href;
      if (SKIP_RT.some(d => href.includes(d))) continue;
      const text = (link.textContent || '').toLowerCase();
      const aria = (link.getAttribute('aria-label') || '').toLowerCase();
      if (/\bwebsite\b|\bmy site\b|\bhomepage\b|\bweb\b/.test(text + ' ' + aria)) {
        personalWebsite = href; break;
      }
    }

    return { full_name: name, email, phone, instagram_handle: igHandle, personal_website: personalWebsite };
  });
}

const EXTRACTORS = {
  kw: extractKW,
  exp: extractExp,
  coldwellbanker: extractColdwellBanker,
  coldwell: extractColdwellBanker,
  bhhs: extractBHHS,
  compass: extractCompass,
  sothebys: extractSothebys,
  remax: extractRemax,
  century21: extractCentury21,
  realtor: extractRealtor,
};

const PROFILE_EXTRACTORS = {
  exp: extractExpProfile,
  bhhs: extractBHHSProfile,
  remax: extractRemaxProfile,
  realtor: extractRealtorProfile,
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

Options:
  --port <port>            CDP port (default: 9222, Derek uses 9223)

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
    console.error(`ERROR: Cannot connect to Chrome on port ${CDP_PORT}. Make sure Chrome is running with:`);
    console.error(`  google-chrome --remote-debugging-port=${CDP_PORT}`);
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

      case 'links': {
        // Extract all anchor hrefs using page.evaluate — captures JS-rendered links
        // that page.content() misses (e.g. Google search results)
        const links = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('a'))
            .map(a => a.href)
            .filter(h => h && h.startsWith('http'))
            .slice(0, 100);
        });
        console.log(JSON.stringify(links));
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

      case 'viewport': {
        // Set viewport size: viewport <width> <height>
        const vw = parseInt(args[1]) || 1920;
        const vh = parseInt(args[2]) || 1080;
        await page.setViewport({ width: vw, height: vh });
        console.log(JSON.stringify({ viewport: { width: vw, height: vh } }));
        break;
      }

      case 'title': {
        // Get current page title
        const pageTitle = await page.title();
        console.log(pageTitle);
        break;
      }

      case 'maximize': {
        // Maximize Chrome window using CDP Browser domain (two-step: normal → maximized)
        const cdpSession = await page.createCDPSession();
        const { windowId } = await cdpSession.send('Browser.getWindowForTarget');
        // Step 1: Set to normal state with explicit dimensions
        await cdpSession.send('Browser.setWindowBounds', {
          windowId,
          bounds: { windowState: 'normal' }
        });
        await new Promise(r => setTimeout(r, 200));
        await cdpSession.send('Browser.setWindowBounds', {
          windowId,
          bounds: { left: 0, top: 0, width: 1920, height: 1080 }
        });
        await new Promise(r => setTimeout(r, 200));
        // Step 2: Maximize (cannot combine with position/size)
        await cdpSession.send('Browser.setWindowBounds', {
          windowId,
          bounds: { windowState: 'maximized' }
        });
        await new Promise(r => setTimeout(r, 500));
        console.log(JSON.stringify({ maximized: true, width: 1920, height: 1080 }));
        await cdpSession.detach();
        break;
      }

      case 'dismiss-cookies': {
        const dismissed = await dismissCookieBanners(page);
        console.log(JSON.stringify({ dismissed }));
        break;
      }

      case 'reset-tab': {
        // Close current tab and open fresh one — fixes stuck pages (reCAPTCHA, SPA routing)
        const http = require('http');
        const port = CDP_PORT || 9222;
        // Get current tabs
        const tabsJson = await new Promise((resolve, reject) => {
          http.get(`http://localhost:${port}/json`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
          }).on('error', reject);
        });
        const tabs = JSON.parse(tabsJson);
        const pageTabs = tabs.filter(t => t.type === 'page');
        // Open new tab first
        await new Promise((resolve, reject) => {
          http.get(`http://localhost:${port}/json/new?about:blank`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
          }).on('error', reject);
        });
        await new Promise(r => setTimeout(r, 500));
        // Close old page tabs
        for (const tab of pageTabs) {
          await new Promise((resolve) => {
            http.get(`http://localhost:${port}/json/close/${tab.id}`, () => resolve()).on('error', () => resolve());
          });
        }
        await new Promise(r => setTimeout(r, 500));
        console.log(JSON.stringify({ reset: true, closedTabs: pageTabs.length }));
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

        // Full scroll to trigger all lazy-loaded content (social links, Instagram widgets)
        await scrollToLoadAll(page, 5);
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

      case 'instagram-login': {
        const igUser = args[1];
        const igPass = args[2];
        if (!igUser || !igPass) { console.error('Usage: instagram-login <username> <password>'); break; }
        try {
          await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'networkidle2', timeout: 30000 });
          await randomDelay(2000, 3000);
          // Dismiss cookie banner if present
          const cookieBtn = await page.$('button[class*="accept"]') || await page.$('button[data-cookiebanner="accept_button"]');
          if (cookieBtn) { await cookieBtn.click(); await randomDelay(500, 800); }
          const userInput = await page.$('input[name="username"]');
          const passInput = await page.$('input[name="password"]');
          if (!userInput || !passInput) { console.error(JSON.stringify({ success: false, error: 'Login form not found' })); break; }
          await userInput.click();
          await randomDelay(300, 500);
          for (const char of igUser) { await page.keyboard.type(char, { delay: Math.random() * 80 + 40 }); }
          await randomDelay(400, 700);
          await passInput.click();
          await randomDelay(200, 400);
          for (const char of igPass) { await page.keyboard.type(char, { delay: Math.random() * 80 + 40 }); }
          await randomDelay(500, 1000);
          await page.keyboard.press('Enter');
          await randomDelay(4000, 6000);
          const currentUrl = page.url();
          if (currentUrl.includes('/challenge') || currentUrl.includes('/two_factor')) {
            console.error(JSON.stringify({ success: false, error: '2FA or challenge required — manual action needed', url: currentUrl }));
            break;
          }
          if (currentUrl.includes('/accounts/login')) {
            console.error(JSON.stringify({ success: false, error: 'Login failed — check credentials', url: currentUrl }));
            break;
          }
          console.log(JSON.stringify({ success: true, username: igUser, url: currentUrl }));
        } catch (err) {
          console.error(JSON.stringify({ success: false, error: err.message }));
        }
        break;
      }

      case 'instagram-logout': {
        try {
          const currentUrl = page.url();
          if (!currentUrl.includes('instagram.com')) {
            await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle2', timeout: 30000 });
            await randomDelay(2000, 3000);
          }
          // Click profile avatar in nav
          const profileLink = await page.$('a[href*="/accounts/"][role="link"]') ||
                              await page.$('nav a[tabindex="0"]:last-child');
          if (profileLink) {
            await profileLink.click();
            await randomDelay(1500, 2500);
          }
          // Find Settings gear or More button
          const moreBtn = await page.$('div[role="button"]::-p-text(More)') ||
                          await page.$('div[aria-label="More options"]') ||
                          await page.$('svg[aria-label="Settings"]');
          if (moreBtn) { await moreBtn.click(); await randomDelay(1000, 1500); }
          // Click Log out
          const btns = await page.$$('div[role="menuitem"], button, div[role="button"]');
          let loggedOut = false;
          for (const btn of btns) {
            const txt = await page.evaluate(el => el.textContent?.trim(), btn);
            if (txt === 'Log out' || txt === 'Log Out') {
              await btn.click();
              await randomDelay(2000, 3000);
              loggedOut = true;
              break;
            }
          }
          if (!loggedOut) {
            // Fallback: navigate directly to logout URL
            await page.goto('https://www.instagram.com/accounts/logout/', { waitUntil: 'networkidle2', timeout: 15000 }).catch(() => null);
            await randomDelay(2000, 3000);
          }
          console.log(JSON.stringify({ success: true }));
        } catch (err) {
          console.error(JSON.stringify({ success: false, error: err.message }));
        }
        break;
      }

      case 'instagram-send-gif': {
        const gifPath = args[1];
        if (!gifPath) { console.error('Usage: instagram-send-gif <filepath>'); break; }
        const fs = require('fs');
        if (!fs.existsSync(gifPath)) { console.error(JSON.stringify({ success: false, error: `File not found: ${gifPath}` })); break; }
        try {
          // Look for the media/attachment upload button in the DM input area
          const mediaBtn = await page.$('button[aria-label*="Media"]') ||
                           await page.$('button[aria-label*="Attachment"]') ||
                           await page.$('div[role="button"][aria-label*="photo"]') ||
                           await page.$('svg[aria-label*="media"]');
          if (!mediaBtn) { console.error(JSON.stringify({ success: false, error: 'Media button not found in DM thread' })); break; }
          // Find the hidden file input associated with the media button area
          const fileInput = await page.$('input[type="file"]');
          if (fileInput) {
            await fileInput.uploadFile(gifPath);
          } else {
            // Click the button to reveal the file picker, then upload
            await mediaBtn.click();
            await randomDelay(1000, 1500);
            const fileInputAfter = await page.$('input[type="file"]');
            if (!fileInputAfter) { console.error(JSON.stringify({ success: false, error: 'File input not found after clicking media button' })); break; }
            await fileInputAfter.uploadFile(gifPath);
          }
          await randomDelay(2000, 3500);
          // Click Send button
          const sendBtn = await page.$('button[type="submit"]:not([disabled])') ||
                          await page.$('div[role="button"]::-p-text(Send)');
          if (sendBtn) {
            await sendBtn.click();
            await randomDelay(1500, 2500);
          } else {
            // Try pressing Enter
            await page.keyboard.press('Enter');
            await randomDelay(1500, 2500);
          }
          console.log(JSON.stringify({ success: true, file: gifPath }));
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
