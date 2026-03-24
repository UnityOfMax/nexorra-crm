// RE/MAX Instagram handle scraper
// Usage: node scripts/remax_instagram_scraper.js <City> <ST> <timezone> <country> <target>
const puppeteer = require('puppeteer-core');
const { execSync } = require('child_process');

const city = process.argv[2] || 'Nashville';
const state = process.argv[3] || 'TN';
const timezone = process.argv[4] || 'CST';
const country = process.argv[5] || 'US';
const target = parseInt(process.argv[6] || '50'); // default 50 per city

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Generic handles to skip (corporate/team accounts)
const GENERIC_HANDLES = new Set([
  'remax',
  'remaxusa',
  'remaxagent',
  'century21',
  'century21agent',
  'kw',
  'kellerwalliams',
  'bhhs',
  'exprealty',
  'compass',
  'sothebys',
  'coldwellbanker',
  'realestateagent',
  'realtor',
  'propertysales',
  'homesales'
]);

function insertLead(agent) {
  const data = JSON.stringify({
    full_name: agent.full_name,
    first_name: agent.first_name,
    last_name: agent.last_name,
    instagram_handle: agent.instagram_handle,
    profile_url: agent.profile_url,
    source_brokerage: 'remax',
    lead_category: 'instagram',
    country: country,
    state_province: state,
    city: city,
    timezone: timezone,
  });
  try {
    const result = execSync(
      `curl -s -o /dev/null -w "%{http_code}" -X POST "${SUPABASE_URL}/rest/v1/leads" ` +
      `-H "apikey: ${SUPABASE_KEY}" ` +
      `-H "Authorization: Bearer ${SUPABASE_KEY}" ` +
      `-H "Content-Type: application/json" ` +
      `-H "Prefer: return=minimal" ` +
      `-d '${data.replace(/'/g, "'\\''")}'`,
      { encoding: 'utf8', timeout: 15000 }
    );
    return result.trim();
  } catch (e) {
    return 'error';
  }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function extractInstagramHandle(url) {
  try {
    // Extract handle from instagram.com/xxx
    const match = url.match(/instagram\.com\/([a-zA-Z0-9._-]+)/i);
    if (match && match[1]) {
      const handle = match[1].toLowerCase();
      // Skip generic handles
      if (!GENERIC_HANDLES.has(handle)) {
        return handle;
      }
    }
  } catch (e) {}
  return null;
}

function normalizeNames(fullName) {
  // Title case: each word first letter uppercase, rest lowercase
  const parts = fullName.trim().split(/\s+/);
  const firstName = parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase() : '';
  const lastName = parts.slice(1).map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ') || '';
  return { firstName, lastName };
}

(async () => {
  const browser = await puppeteer.connect({
    browserURL: 'http://localhost:9222',
    defaultViewport: null,
  });

  const pages = await browser.pages();
  const page = pages[0];

  let inserted = 0;
  let skipped = 0;

  const citySlug = city.toLowerCase().replace(/\s+/g, '-');
  const stateSlug = state.toLowerCase();

  for (let pageNum = 1; inserted < target && pageNum <= 20; pageNum++) {
    const url = `https://www.remax.com/real-estate-agents/${citySlug}-${stateSlug}?page=${pageNum}`;
    console.log(`Page ${pageNum}: ${url}`);

    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
      await sleep(3000);

      // Get all agent cards
      const agents = await page.evaluate(() => {
        const results = [];
        const cards = document.querySelectorAll('[data-testid="agent-card"], .agent-card, [class*="AgentCard"]');

        if (cards.length === 0) {
          // Try generic approach
          const links = document.querySelectorAll('a[href*="/real-estate-agent/"]');
          links.forEach((link) => {
            const text = link.textContent.trim();
            const href = link.href;
            if (text && href) {
              results.push({ full_name: text, profile_url: href });
            }
          });
        } else {
          cards.forEach((card) => {
            const nameEl = card.querySelector('h2, h3, [class*="name"]');
            const linkEl = card.querySelector('a[href*="/real-estate-agent/"], a');
            if (nameEl && linkEl) {
              results.push({
                full_name: nameEl.textContent.trim(),
                profile_url: linkEl.href
              });
            }
          });
        }
        return results;
      });

      console.log(`Found ${agents.length} agents on page`);

      if (agents.length === 0) {
        console.log('No agents on page, done.');
        break;
      }

      let pageInstagram = 0;

      for (const agent of agents) {
        if (inserted >= target) break;

        const fullName = agent.full_name || '';
        if (!fullName || fullName.length < 3) continue;

        // Visit profile to find Instagram
        try {
          await page.goto(agent.profile_url, { waitUntil: 'networkidle2', timeout: 30000 });
          await sleep(2000);

          const igData = await page.evaluate(() => {
            const igLinks = document.querySelectorAll('a[href*="instagram.com"]');
            for (const link of igLinks) {
              const href = link.href;
              if (href.includes('instagram.com')) {
                return href;
              }
            }
            return null;
          });

          if (igData) {
            const igHandle = extractInstagramHandle(igData);
            if (igHandle) {
              const { firstName, lastName } = normalizeNames(fullName);
              const lead = {
                full_name: fullName.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '),
                first_name: firstName,
                last_name: lastName,
                instagram_handle: igHandle,
                profile_url: agent.profile_url,
              };

              const code = insertLead(lead);
              if (code === '201') {
                inserted++;
                pageInstagram++;
                console.log(`  + ${fullName} @${igHandle} [${code}]`);
              } else if (code === '409') {
                skipped++;
              } else {
                console.log(`  ! ${fullName} @${igHandle} [${code}]`);
              }
            }
          }
        } catch (e) {
          // Profile error, continue
        }

        await sleep(2000);
      }

      console.log(`Page ${pageNum} done. Instagram found: ${pageInstagram}, Total: ${inserted}`);
      await sleep(8000);
    } catch (e) {
      console.log(`Page error: ${e.message}`);
      break;
    }
  }

  console.log(`\nFINAL: Inserted ${inserted}, Skipped ${skipped}`);
  await browser.disconnect();
})();
