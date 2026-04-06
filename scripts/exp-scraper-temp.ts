import puppeteer from 'puppeteer';

const puppeteerLib = require('puppeteer');

interface LeadData {
  full_name: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  profile_url: string | null;
  profile_picture_url: string | null;
  source_brokerage: string;
  country: string;
  state_province: string;
  city: string;
  timezone: string;
}

// List of all leads scraped
const allLeads: LeadData[] = [];

// Utility: Title case name
function titleCase(str: string): string {
  if (!str) return str;
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Utility: Extract first/last from full name
function extractNames(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) {
    return { first: fullName, last: '' };
  }
  const first = parts[0];
  const last = parts.slice(1).join(' ');
  return { first, last };
}

// Validate lead name quality
function isValidName(fullName: string): boolean {
  if (!fullName || fullName.trim().length === 0) return false;
  
  const skipPatterns = [
    /LLC|Inc|Inc\.|Corp|Corp\.|Ltd|Ltd\.|Group|Team|Realty|Properties|Homes|Real Estate|Agency|Brokerage|We Buy|Sell|Fast|Cash|Quick|Home Buyers|Home Sellers/i,
    /\d+/,
    /@|#|http/,
    /\|/,
    /\(|\)/,
    /"/,
    /&/,
    /,\s*(CRS|GRI|MBA|CCIM|ABR|CNE|SFR|CBR|FMA|SRES|TRC|PMN),/i,
  ];

  for (const pattern of skipPatterns) {
    if (pattern.test(fullName)) return false;
  }

  const words = fullName.split(/\s+/);
  if (words.length < 2 || words.length > 4) return false;
  if (fullName.length > 50) return false;
  if (words.some((w) => w === w.toUpperCase() && w.length > 1)) {
    // Allow all-caps if only one word
    const capsWords = words.filter((w) => w === w.toUpperCase() && w.length > 1);
    if (capsWords.length > 1) return false;
  }

  return true;
}

async function scrapeExpCity(
  browser: any,
  city: string,
  state: string,
  timezone: string
): Promise<void> {
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(30000);

  try {
    // Step 1: Navigate to eXp homepage to get cookies
    console.log(`[${city}] Navigating to eXp homepage...`);
    await page.goto('https://www.exprealty.com', { waitUntil: 'networkidle2' });
    await page.waitForTimeout(8000);

    // Step 2: Navigate to agent search
    const searchUrl = `https://www.exprealty.com/agents-search?page=1&country=US&m=f&location=${encodeURIComponent(
      city
    )}%2C+${state}`;
    console.log(`[${city}] Navigating to search: ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: 'networkidle2' });

    // Step 3: Paginate and collect profile URLs
    let pageNum = 1;
    let totalCollected = 0;

    while (pageNum <= 15) {
      // Max 15 pages per city
      console.log(`[${city}] Scraping page ${pageNum}...`);

      // Scroll to load all profiles on page
      await page.evaluate(() => {
        const scrollDiv = document.querySelector('[class*="scroll"]') || window;
        if (scrollDiv instanceof HTMLElement) {
          scrollDiv.scrollTop = scrollDiv.scrollHeight;
        } else {
          (scrollDiv as any).scrollY = document.documentElement.scrollHeight;
        }
      });
      await page.waitForTimeout(2000);

      // Extract profile URLs from current page
      const profileUrls = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href*="/agents-search/"]'));
        return links
          .map((a: any) => a.getAttribute('href'))
          .filter((url: string | null) => url && url.includes('/agents-search/') && !url.includes('page='))
          .map((url: string) => {
            return url.startsWith('http')
              ? url
              : 'https://www.exprealty.com' + url;
          });
      });

      if (profileUrls.length === 0) {
        console.log(`[${city}] No profiles found on page ${pageNum}, stopping.`);
        break;
      }

      // Visit each profile and extract email
      for (const profileUrl of profileUrls) {
        try {
          const profilePage = await browser.newPage();
          profilePage.setDefaultNavigationTimeout(10000);

          await profilePage.goto(profileUrl, { waitUntil: 'domcontentloaded' });
          await profilePage.waitForTimeout(1500);

          // Extract agent data from profile page
          const agentData = await profilePage.evaluate(() => {
            const fullName =
              document.querySelector('[class*="name"]')?.textContent?.trim() ||
              document.querySelector('h1')?.textContent?.trim();

            const emailEl = document.querySelector('a[href^="mailto:"]');
            const email = emailEl
              ? (emailEl as any).getAttribute('href')?.replace('mailto:', '').trim()
              : null;

            const phoneEl = document.querySelector('a[href^="tel:"]');
            const phone = phoneEl
              ? (phoneEl as any).getAttribute('href')?.replace('tel:', '').trim()
              : null;

            const picEl = document.querySelector('img[src*="agent"]');
            const picture = picEl ? (picEl as any).getAttribute('src') : null;

            return { fullName, email, phone, picture };
          });

          if (agentData.fullName && isValidName(agentData.fullName)) {
            const { first, last } = extractNames(agentData.fullName);
            const lead: LeadData = {
              full_name: titleCase(agentData.fullName),
              first_name: titleCase(first),
              last_name: titleCase(last),
              email: agentData.email || null,
              phone: agentData.phone || null,
              profile_url: profileUrl,
              profile_picture_url: agentData.picture || null,
              source_brokerage: 'exp',
              country: 'US',
              state_province: state,
              city: city,
              timezone: timezone,
            };

            if (lead.email) {
              allLeads.push(lead);
              totalCollected++;
              console.log(`[${city}] ✓ ${lead.full_name} (${totalCollected})`);
            }
          }

          await profilePage.close();
          await new Promise((r) => setTimeout(r, 3000)); // 3s between profiles
        } catch (err: any) {
          console.error(`[${city}] Profile error: ${err.message}`);
          continue;
        }
      }

      if (totalCollected >= 100) {
        console.log(`[${city}] Reached 100 leads, stopping.`);
        break;
      }

      // Next page
      pageNum++;
      await page.goto(
        `https://www.exprealty.com/agents-search?page=${pageNum}&country=US&m=f&location=${encodeURIComponent(
          city
        )}%2C+${state}`,
        { waitUntil: 'networkidle2' }
      );
      await page.waitForTimeout(5000);
    }

    console.log(`[${city}] Scraped ${totalCollected} agents.`);
  } finally {
    await page.close();
  }
}

async function main() {
  const browser = await puppeteerLib.connect({
    browserWSEndpoint: 'http://localhost:9222',
  });

  try {
    // Scrape Colorado Springs
    await scrapeExpCity(browser, 'Colorado Springs', 'CO', 'MST');

    console.log(`\n\n=== FINAL RESULTS ===`);
    console.log(`Total leads: ${allLeads.length}`);

    // Push to Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const apiKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    for (const lead of allLeads) {
      const res = await fetch(`${supabaseUrl}/rest/v1/leads`, {
        method: 'POST',
        headers: {
          apikey: apiKey!,
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify(lead),
      });

      if (res.status === 201) {
        console.log(`✓ Inserted: ${lead.full_name}`);
      } else if (res.status === 409) {
        console.log(`~ Duplicate: ${lead.full_name}`);
      } else {
        console.error(`✗ Error (${res.status}): ${lead.full_name}`);
      }

      await new Promise((r) => setTimeout(r, 5000)); // 5s between Supabase calls
    }
  } finally {
    await browser.disconnect();
  }
}

main().catch(console.error);
