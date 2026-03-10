#!/usr/bin/env node

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STATE_FILE = path.join(__dirname, '..', 'agents', 'state', 'jeff-state.json');
const MEMORY_FILE = path.join(__dirname, '..', 'agents', 'memory', 'lead-gen.md');

// Brokerages with URL patterns
const BROKERAGES = {
  kw: {
    name: 'Keller Williams',
    url: (city, state) => `https://www.kw.com/kw/agents/search?location=${encodeURIComponent(city + ', ' + state)}`
  },
  remax: {
    name: 'RE/MAX',
    url: (city, state) => `https://www.remax.com/real-estate-agents/${slugify(city)}-${state.toLowerCase()}`
  },
  remax_ca: {
    name: 'RE/MAX Canada',
    url: (city, province) => `https://www.remax.com/real-estate-agents/${slugify(city)}-${province.toLowerCase()}`
  },
  compass: {
    name: 'Compass',
    url: (city, state) => `https://www.compass.com/agents/${state.toLowerCase()}/${slugify(city)}/`
  }
};

let stats = {
  inserted: 0,
  skipped: 0,
  errors: 0,
  total: 0
};

function slugify(text) {
  return text.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

async function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
  }
  return { version: 1, last_run: null, total_scraped_lifetime: 0, cities: {} };
}

async function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  await sleep(5000);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomDelay(min, max) {
  return Math.random() * (max - min) + min;
}

async function insertLead(lead) {
  const headers = {
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
  };

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
      method: 'POST',
      headers,
      body: JSON.stringify(lead)
    });

    if (response.status === 201) {
      stats.inserted++;
      return true;
    } else if (response.status === 409) {
      stats.skipped++;
      return true;
    } else {
      stats.errors++;
      console.error(`Error inserting lead: ${response.status}`);
      return false;
    }
  } catch (err) {
    stats.errors++;
    console.error('Insert failed:', err.message);
    return false;
  }
}

async function extractAgents(page) {
  const selectors = [
    '[class*="agent-card"]',
    '[data-testid="agent-card"]',
    '[role="link"][href*="agent"]',
    'a[href*="/agents/"]',
    '[class*="Agent"]'
  ];

  let agents = [];

  for (const selector of selectors) {
    try {
      agents = await page.$$eval(selector, elements => {
        return elements.slice(0, 50).map(el => {
          const text = el.innerText || el.textContent;
          const href = el.getAttribute('href') || el.querySelector('a')?.getAttribute('href');
          const img = el.querySelector('img');

          return {
            text,
            href,
            img: img?.src || null
          };
        });
      });

      if (agents.length > 0) break;
    } catch (e) {
      // Continue
    }
  }

  return agents;
}

async function scrapeBrokerage(browser, brokerage, city, state, timezone, country) {
  console.log(`Starting ${brokerage} in ${city}, ${state}...`);

  const brokerageConfig = BROKERAGES[brokerage];
  if (!brokerageConfig) {
    console.log(`⏭️  Skipping unknown brokerage: ${brokerage}`);
    return 0;
  }

  const url = brokerageConfig.url(city, state);
  console.log(`URL: ${url}`);

  const page = await browser.newPage();
  page.setViewport({ width: 1280, height: 800 });

  let citySlugs = `${city.toLowerCase().replace(/\s+/g, '-')}, ${state.toLowerCase()}`;
  let leadCount = 0;

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
    await sleep(randomDelay(3000, 8000));
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight);
    });

    const agents = await extractAgents(page);
    console.log(`Found ${agents.length} agent cards`);

    for (const agent of agents.slice(0, 50)) {
      const nameParts = (agent.text || '').split('\n')[0].trim().split(' ');
      const firstName = nameParts[0] || 'Unknown';
      const lastName = nameParts.slice(1).join(' ') || 'Agent';
      const fullName = `${firstName} ${lastName}`.trim();

      if (fullName === 'Unknown Agent' || fullName.length < 3) {
        continue;
      }

      const lead = {
        full_name: fullName,
        first_name: firstName,
        last_name: lastName,
        email: `${firstName.toLowerCase()}@${citySlugs.replace(/[, ]/g, '')}.local`,
        phone: null,
        profile_url: agent.href || url,
        profile_picture_url: agent.img || null,
        source_brokerage: brokerage,
        country,
        state_province: state,
        city,
        timezone
      };

      const inserted = await insertLead(lead);
      if (inserted) {
        leadCount++;
        stats.total++;
      }

      if (leadCount >= 100) {
        console.log(`Reached 100 leads for ${brokerage} in ${city}`);
        break;
      }

      await sleep(randomDelay(1000, 3000));
    }

    console.log(`Completed ${brokerage} in ${city}: ${leadCount} leads`);
    return leadCount;

  } catch (err) {
    console.error(`Error scraping ${brokerage} in ${city}:`, err.message);
    return leadCount;
  } finally {
    await page.close();
  }
}

async function main() {
  console.log('🚀 Jeff Lead Gen — Starting session');
  console.log(`Env check: SUPABASE_URL=${SUPABASE_URL ? '✓' : '✗'}`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  let state = await loadState();

  try {
    let targetCity = null;
    for (const [cityName, cityData] of Object.entries(state.cities)) {
      let hasInProgress = false;
      for (const brokerageData of Object.values(cityData.brokerages)) {
        if (brokerageData.status === 'in_progress' || brokerageData.status === 'not_started') {
          hasInProgress = true;
          break;
        }
      }
      if (hasInProgress) {
        targetCity = { name: cityName, data: cityData };
        break;
      }
    }

    if (!targetCity) {
      console.log('No cities to scrape. All complete!');
      await browser.close();
      return;
    }

    console.log(`\nTarget city: ${targetCity.name}`);

    for (const [brokerage, brokerageData] of Object.entries(targetCity.data.brokerages)) {
      if (brokerageData.status === 'complete' || brokerageData.status === 'rate_limited') {
        console.log(`⏭️  Skipping ${brokerage} (${brokerageData.status})`);
        continue;
      }

      const count = await scrapeBrokerage(
        browser,
        brokerage,
        targetCity.name.split(',')[0].trim(),
        targetCity.name.split(',')[1].trim(),
        targetCity.data.timezone,
        targetCity.data.country
      );

      brokerageData.count += count;
      brokerageData.status = 'complete';
      await saveState(state);
      await sleep(randomDelay(30000, 60000));
    }

    state.total_scraped_lifetime += stats.inserted;
    state.last_run = new Date().toISOString();
    await saveState(state);

    console.log('\n' + '='.repeat(50));
    console.log('📊 SESSION COMPLETE');
    console.log(`Inserted: ${stats.inserted}`);
    console.log(`Skipped (duplicates): ${stats.skipped}`);
    console.log(`Errors: ${stats.errors}`);
    console.log(`Total this run: ${stats.total}`);
    console.log(`Lifetime total: ${state.total_scraped_lifetime}`);

  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
