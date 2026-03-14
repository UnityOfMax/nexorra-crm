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
        // Try any <a> that wraps the name or is nearby
        const anyLink = nameEl?.closest('a') || container.querySelector('a[href]:not([href^="mailto:"]):not([href^="tel:"])');
        const href = anyLink?.getAttribute('href');
        if (href && href !== '#' && href !== '/') {
          profileUrl = href.startsWith('http') ? href : new URL(href, baseUrl).href;
        }
      }

      // Find phone
      const phoneEl = container.querySelector('a[href^="tel:"]');
      const phone = phoneEl?.href?.replace('tel:', '').trim() || null;

      // Find picture
      const img = container.querySelector('img[src]:not([src*="logo"]):not([src*="icon"])');
      const picture = img?.src || null;

      // Find Instagram handle
      const igLink = container.querySelector('a[href*="instagram.com"]');
      const igHandle = igLink?.href?.match(/instagram\.com\/([^/?#]+)/)?.[1] || null;

      agents.push({ full_name: name, profile_url: profileUrl, profile_picture_url: picture, email, phone, instagram_handle: igHandle });
    });

    return agents;
  };
}

// Profile-link-based extractor helper for brokerages where email is NOT on listing page.
// Finds agent cards with profile links, returns them with email=null.
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
        // Try the link text itself
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
      const picture = img?.src || null;

      // Find Instagram handle
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
  return page.evaluate(mailtoScanExtractor('https://kw.com', '/agent'));
}

// Coldwell Banker — email on listing page via mailto:
async function extractColdwellBanker(page) {
  return page.evaluate(mailtoScanExtractor('https://www.coldwellbanker.com', 'real-estate-agent'));
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
  navigate <url>           Navigate to URL, wait for page load
  html [selector]          Get rendered HTML (full page or CSS selector)
  text [selector]          Get text content (cleaner output)
  scroll [pixels]          Scroll down (default: 800px)
  click <selector>         Click an element
  type <selector> <text>   Type text into an input field
  screenshot [file]        Save screenshot (default: /tmp/chrome-screenshot.png)
  agents <brokerage>       Extract agent data from listing page (kw, exp, coldwellbanker, bhhs, compass, sothebys)
  profile <brokerage>      Extract email from individual profile page (exp, bhhs, sothebys)
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
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        await randomDelay(2000, 4000);
        const title = await page.title();
        const currentUrl = page.url();
        console.log(JSON.stringify({ success: true, title, url: currentUrl }));
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

      case 'agents': {
        const brokerage = args[1];
        if (!brokerage) { console.error('Usage: agents <brokerage>'); break; }

        const extractor = EXTRACTORS[brokerage];
        if (!extractor) {
          console.error(`Unknown brokerage: ${brokerage}. Available: ${Object.keys(EXTRACTORS).join(', ')}`);
          break;
        }

        // Scroll through page first to trigger lazy loading
        await humanScroll(page, 2000);
        await randomDelay(1000, 2000);

        let agents = await extractor(page);

        // Deduplicate by name
        const seen = new Set();
        agents = agents.filter(a => {
          const key = a.full_name?.toLowerCase();
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        // Split names into first/last
        agents = agents.map(a => {
          const parts = a.full_name.trim().split(/\s+/);
          return {
            ...a,
            first_name: parts[0] || '',
            last_name: parts.slice(1).join(' ') || '',
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
        // Search for an Instagram user by handle
        const handle = args[1];
        if (!handle) { console.error('Usage: instagram-search <handle>'); break; }

        // Make sure we're on Instagram
        const currentUrl = page.url();
        if (!currentUrl.includes('instagram.com')) {
          await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle2', timeout: 30000 });
          await randomDelay(2000, 3000);
        }

        // Click the search icon/area
        try {
          await page.click('a[href="/explore/"]').catch(() => null);
          await randomDelay(500, 800);
          // Try the search input that appears
          const searchInput = await page.$('input[placeholder*="Search"]') || await page.$('input[aria-label*="Search"]');
          if (searchInput) {
            await searchInput.click();
            await randomDelay(300, 500);
            // Clear any existing text
            await page.keyboard.down('Control');
            await page.keyboard.press('a');
            await page.keyboard.up('Control');
            await randomDelay(100, 200);
            // Type the handle character by character
            for (const char of handle) {
              await page.keyboard.type(char, { delay: Math.random() * 90 + 60 });
            }
            await randomDelay(1500, 2500); // Wait for search results
            console.log(JSON.stringify({ searched: handle, success: true }));
          } else {
            // Fallback: navigate directly to the profile
            await page.goto(`https://www.instagram.com/${handle}/`, { waitUntil: 'networkidle2', timeout: 30000 });
            await randomDelay(2000, 3000);
            console.log(JSON.stringify({ searched: handle, success: true, method: 'direct_nav' }));
          }
        } catch (err) {
          // Fallback: direct navigation
          await page.goto(`https://www.instagram.com/${handle}/`, { waitUntil: 'networkidle2', timeout: 30000 });
          await randomDelay(2000, 3000);
          console.log(JSON.stringify({ searched: handle, success: true, method: 'direct_nav' }));
        }
        break;
      }

      case 'instagram-dm': {
        // Send a DM to the currently viewed Instagram profile
        const messageText = args.slice(1).join(' ');
        if (!messageText) { console.error('Usage: instagram-dm <message text>'); break; }

        try {
          // Click the "Message" button on the profile
          const messageBtn = await page.$('div[role="button"]:has-text("Message")') ||
                             await page.$x('//div[@role="button"][contains(., "Message")]').then(els => els[0]);

          if (!messageBtn) {
            // Try alternative selectors
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

          await randomDelay(2000, 3500); // Wait for DM thread to open

          // Find the message input
          const msgInput = await page.$('textarea[placeholder*="Message"]') ||
                           await page.$('div[role="textbox"][contenteditable="true"]') ||
                           await page.$('textarea');

          if (!msgInput) {
            console.error(JSON.stringify({ success: false, error: 'Message input not found' }));
            break;
          }

          await msgInput.click();
          await randomDelay(300, 600);

          // Type message character by character (human-like)
          for (const char of messageText) {
            await page.keyboard.type(char, { delay: Math.random() * 90 + 60 });
          }
          await randomDelay(500, 1000);

          // Press Enter to send
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
