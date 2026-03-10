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
 *   node scripts/chrome-tool.js agents <brokerage>       Extract agent data with brokerage-specific logic
 *   node scripts/chrome-tool.js wait <ms>                Wait for specified milliseconds
 *   node scripts/chrome-tool.js url                      Get current page URL
 *   node scripts/chrome-tool.js status                   Check if Chrome is connected
 */

const puppeteer = require('puppeteer');

const CDP_URL = 'http://localhost:9222';

async function connectToChrome() {
  const browser = await puppeteer.connect({ browserURL: CDP_URL });
  const pages = await browser.pages();
  // Use the first tab, or create one if none
  let page = pages[0];
  if (!page) {
    page = await browser.newPage();
  }
  return { browser, page };
}

// Human-like random delay
function randomDelay(min, max) {
  return new Promise(resolve => setTimeout(resolve, Math.random() * (max - min) + min));
}

// Human-like scroll
async function humanScroll(page, amount = 800) {
  const steps = Math.ceil(amount / 200);
  for (let i = 0; i < steps; i++) {
    await page.evaluate((scrollAmt) => window.scrollBy(0, scrollAmt), 200);
    await randomDelay(100, 300);
  }
}

// ====== BROKERAGE-SPECIFIC EXTRACTORS ======

async function extractRemax(page) {
  return page.evaluate(() => {
    const agents = [];
    // RE/MAX agent cards
    const cards = document.querySelectorAll('[data-testid="agent-card"], .agent-card, [class*="AgentCard"], [class*="agent-list"] a, .results-list a[href*="/real-estate-agent/"]');

    if (cards.length === 0) {
      // Fallback: find all links that look like agent profiles
      const links = document.querySelectorAll('a[href*="/real-estate-agent/"], a[href*="/real-estate-agents/"] + div a');
      links.forEach(link => {
        const name = link.querySelector('h2, h3, [class*="name"], [class*="Name"]')?.textContent?.trim()
          || link.textContent?.trim()?.split('\n')[0]?.trim();
        if (!name || name.length < 3 || name.length > 60) return;

        const href = link.getAttribute('href');
        const fullUrl = href?.startsWith('http') ? href : (href ? `https://www.remax.com${href}` : null);
        const img = link.querySelector('img');
        const emailEl = link.querySelector('a[href^="mailto:"]');
        const phoneEl = link.querySelector('a[href^="tel:"]');

        agents.push({
          full_name: name,
          profile_url: fullUrl,
          profile_picture_url: img?.src || null,
          email: emailEl?.href?.replace('mailto:', '') || null,
          phone: phoneEl?.href?.replace('tel:', '') || null,
        });
      });
    } else {
      cards.forEach(card => {
        const nameEl = card.querySelector('h2, h3, [class*="name"], [class*="Name"], [class*="agent-name"]');
        const name = nameEl?.textContent?.trim() || card.textContent?.trim()?.split('\n')[0]?.trim();
        if (!name || name.length < 3 || name.length > 60) return;

        const linkEl = card.tagName === 'A' ? card : card.querySelector('a[href*="agent"]');
        const href = linkEl?.getAttribute('href');
        const fullUrl = href?.startsWith('http') ? href : (href ? `https://www.remax.com${href}` : null);
        const img = card.querySelector('img');
        const emailEl = card.querySelector('a[href^="mailto:"]');
        const phoneEl = card.querySelector('a[href^="tel:"]');

        agents.push({
          full_name: name,
          profile_url: fullUrl,
          profile_picture_url: img?.src || null,
          email: emailEl?.href?.replace('mailto:', '') || null,
          phone: phoneEl?.href?.replace('tel:', '') || null,
        });
      });
    }

    return agents;
  });
}

async function extractKW(page) {
  return page.evaluate(() => {
    const agents = [];
    const cards = document.querySelectorAll('[class*="agent"], [data-testid*="agent"], .search-results a[href*="agent"]');

    // Fallback: any link with agent in the URL
    const links = cards.length > 0 ? cards : document.querySelectorAll('a[href*="/agent/"], a[href*="/agents/"]');

    links.forEach(el => {
      const card = el.closest('[class*="card"], [class*="Card"], [class*="result"], li') || el;
      const nameEl = card.querySelector('h2, h3, [class*="name"], [class*="Name"]');
      const name = nameEl?.textContent?.trim() || el.textContent?.trim()?.split('\n')[0]?.trim();
      if (!name || name.length < 3 || name.length > 60) return;

      const linkEl = el.tagName === 'A' ? el : card.querySelector('a[href*="agent"]');
      const href = linkEl?.getAttribute('href');
      const fullUrl = href?.startsWith('http') ? href : (href ? `https://www.kw.com${href}` : null);
      const img = card.querySelector('img');
      const emailEl = card.querySelector('a[href^="mailto:"]');
      const phoneEl = card.querySelector('a[href^="tel:"]');

      agents.push({
        full_name: name,
        profile_url: fullUrl,
        profile_picture_url: img?.src || null,
        email: emailEl?.href?.replace('mailto:', '') || null,
        phone: phoneEl?.href?.replace('tel:', '') || null,
      });
    });

    return agents;
  });
}

async function extractCompass(page) {
  return page.evaluate(() => {
    const agents = [];
    const cards = document.querySelectorAll('[class*="agent"], [data-tn*="agent"], a[href*="/agents/"]');

    cards.forEach(el => {
      const card = el.closest('[class*="card"], [class*="Card"], [class*="result"], li, div[class*="agent"]') || el;
      const nameEl = card.querySelector('h2, h3, [class*="name"], [class*="Name"], [class*="displayName"]');
      const name = nameEl?.textContent?.trim() || el.textContent?.trim()?.split('\n')[0]?.trim();
      if (!name || name.length < 3 || name.length > 60) return;

      const linkEl = el.tagName === 'A' ? el : card.querySelector('a[href*="/agents/"]');
      const href = linkEl?.getAttribute('href');
      const fullUrl = href?.startsWith('http') ? href : (href ? `https://www.compass.com${href}` : null);
      const img = card.querySelector('img');
      const emailEl = card.querySelector('a[href^="mailto:"]');
      const phoneEl = card.querySelector('a[href^="tel:"]');

      agents.push({
        full_name: name,
        profile_url: fullUrl,
        profile_picture_url: img?.src || null,
        email: emailEl?.href?.replace('mailto:', '') || null,
        phone: phoneEl?.href?.replace('tel:', '') || null,
      });
    });

    return agents;
  });
}

async function extractCentury21(page) {
  return page.evaluate(() => {
    const agents = [];
    const cards = document.querySelectorAll('.agent-card, [class*="AgentCard"], a[href*="CENTURY"], a[href*="century21"]');
    const links = cards.length > 0 ? cards : document.querySelectorAll('a[href*="real-estate-agent"]');

    links.forEach(el => {
      const card = el.closest('[class*="card"], [class*="result"], li') || el;
      const nameEl = card.querySelector('h2, h3, [class*="name"], [class*="Name"]');
      const name = nameEl?.textContent?.trim() || el.textContent?.trim()?.split('\n')[0]?.trim();
      if (!name || name.length < 3 || name.length > 60) return;

      const linkEl = el.tagName === 'A' ? el : card.querySelector('a');
      const href = linkEl?.getAttribute('href');
      const fullUrl = href?.startsWith('http') ? href : (href ? `https://www.century21.com${href}` : null);
      const img = card.querySelector('img');
      const emailEl = card.querySelector('a[href^="mailto:"]');
      const phoneEl = card.querySelector('a[href^="tel:"]');

      agents.push({
        full_name: name,
        profile_url: fullUrl,
        profile_picture_url: img?.src || null,
        email: emailEl?.href?.replace('mailto:', '') || null,
        phone: phoneEl?.href?.replace('tel:', '') || null,
      });
    });

    return agents;
  });
}

async function extractColdwellBanker(page) {
  return page.evaluate(() => {
    const agents = [];
    const cards = document.querySelectorAll('.agent-card, [class*="AgentCard"], [class*="agent-list-item"], a[href*="real-estate-agent"]');

    cards.forEach(el => {
      const card = el.closest('[class*="card"], [class*="item"], li') || el;
      const nameEl = card.querySelector('h2, h3, [class*="name"], [class*="Name"]');
      const name = nameEl?.textContent?.trim() || el.textContent?.trim()?.split('\n')[0]?.trim();
      if (!name || name.length < 3 || name.length > 60) return;

      const linkEl = el.tagName === 'A' ? el : card.querySelector('a[href*="agent"]');
      const href = linkEl?.getAttribute('href');
      const fullUrl = href?.startsWith('http') ? href : (href ? `https://www.coldwellbanker.com${href}` : null);
      const img = card.querySelector('img');
      const emailEl = card.querySelector('a[href^="mailto:"]');
      const phoneEl = card.querySelector('a[href^="tel:"]');

      agents.push({
        full_name: name,
        profile_url: fullUrl,
        profile_picture_url: img?.src || null,
        email: emailEl?.href?.replace('mailto:', '') || null,
        phone: phoneEl?.href?.replace('tel:', '') || null,
      });
    });

    return agents;
  });
}

// Generic extractor — tries to find agent-like data on any page
async function extractGeneric(page) {
  return page.evaluate(() => {
    const agents = [];
    // Look for any cards/links that seem like agent profiles
    const selectors = [
      'a[href*="agent"]',
      'a[href*="realtor"]',
      'a[href*="associate"]',
      '[class*="agent-card"]',
      '[class*="AgentCard"]',
      '[class*="agent-list"]',
      '[data-testid*="agent"]',
    ];

    let elements = [];
    for (const sel of selectors) {
      const found = document.querySelectorAll(sel);
      if (found.length > 0) {
        elements = Array.from(found);
        break;
      }
    }

    elements.forEach(el => {
      const card = el.closest('[class*="card"], [class*="Card"], [class*="result"], [class*="item"], li') || el;
      const nameEl = card.querySelector('h2, h3, [class*="name"], [class*="Name"]');
      const name = nameEl?.textContent?.trim() || el.textContent?.trim()?.split('\n')[0]?.trim();
      if (!name || name.length < 3 || name.length > 60) return;

      const linkEl = el.tagName === 'A' ? el : card.querySelector('a');
      const href = linkEl?.getAttribute('href');
      const fullUrl = href?.startsWith('http') ? href : null;
      const img = card.querySelector('img');
      const emailEl = card.querySelector('a[href^="mailto:"]');
      const phoneEl = card.querySelector('a[href^="tel:"]');

      agents.push({
        full_name: name,
        profile_url: fullUrl,
        profile_picture_url: img?.src || null,
        email: emailEl?.href?.replace('mailto:', '') || null,
        phone: phoneEl?.href?.replace('tel:', '') || null,
      });
    });

    return agents;
  });
}

const EXTRACTORS = {
  remax: extractRemax,
  remax_ca: extractRemax,
  kw: extractKW,
  compass: extractCompass,
  century21: extractCentury21,
  coldwellbanker: extractColdwellBanker,
  coldwell: extractColdwellBanker,
  exp: extractGeneric,
  bhhs: extractGeneric,
  howardhanna: extractGeneric,
  sothebys: extractGeneric,
  royallepage: extractGeneric,
  sutton: extractGeneric,
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
  agents <brokerage>       Extract agent data using brokerage-specific logic
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
        // Truncate to 50KB to avoid overwhelming the agent
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
        // Type with human-like delays
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

        // Scroll through page first to trigger lazy loading
        await humanScroll(page, 2000);
        await randomDelay(1000, 2000);

        const extractor = EXTRACTORS[brokerage] || extractGeneric;
        let agents = await extractor(page);

        // Deduplicate by name
        const seen = new Set();
        agents = agents.filter(a => {
          if (seen.has(a.full_name)) return false;
          seen.add(a.full_name);
          return true;
        });

        // Split names into first/last
        agents = agents.map(a => {
          const parts = a.full_name.split(' ');
          return {
            ...a,
            first_name: parts[0] || '',
            last_name: parts.slice(1).join(' ') || '',
          };
        });

        console.log(JSON.stringify(agents, null, 2));
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
