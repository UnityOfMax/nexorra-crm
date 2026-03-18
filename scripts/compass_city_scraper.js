// Compass scraper - discovers location ID then paginates
// Usage: node scripts/compass_city_scraper.js <City> <ST> <timezone> [location_id]
const puppeteer = require('puppeteer-core');
const { execSync } = require('child_process');

const city = process.argv[2] || 'Atlanta';
const state = process.argv[3] || 'GA';
const timezone = process.argv[4] || 'EST';
let locationId = process.argv[5] || null;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MAX_LEADS = 100;

function insertLead(agent) {
  const data = JSON.stringify({
    full_name: agent.full_name,
    first_name: agent.first_name,
    last_name: agent.last_name,
    email: agent.email,
    phone: agent.phone || null,
    profile_url: agent.profile_url || null,
    profile_picture_url: agent.profile_picture_url || null,
    source_brokerage: 'compass',
    country: 'US',
    state_province: state,
    city: city,
    timezone: timezone,
    instagram_handle: agent.instagram_handle || null,
  });
  try {
    return execSync(
      `curl -s -o /dev/null -w "%{http_code}" -X POST "${SUPABASE_URL}/rest/v1/leads" ` +
      `-H "apikey: ${SUPABASE_KEY}" ` +
      `-H "Authorization: Bearer ${SUPABASE_KEY}" ` +
      `-H "Content-Type: application/json" ` +
      `-H "Prefer: return=minimal" ` +
      `-d '${data.replace(/'/g, "'\\''")}'`,
      { encoding: 'utf8', timeout: 15000 }
    ).trim();
  } catch (e) { return 'error'; }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages[0];
  
  const citySlug = `${city.toLowerCase().replace(/\s+/g, '-')}-${state.toLowerCase()}`;

  // Step 1: Discover location ID if not cached
  if (!locationId) {
    console.log('Discovering Compass location ID...');
    await page.goto(`https://www.compass.com/agents/${citySlug}/`, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(3000);
    const currentUrl = page.url();
    console.log('Redirect URL:', currentUrl);
    const match = currentUrl.match(/\/locations\/[\w-]+\/(\d+)\//);
    if (match) {
      locationId = match[1];
      console.log(`Found location ID: ${locationId}`);
    } else {
      // Try to find in page HTML
      const html = await page.content();
      const m2 = html.match(/\/locations\/[\w-]+\/(\d+)\//);
      if (m2) {
        locationId = m2[1];
        console.log(`Found location ID in HTML: ${locationId}`);
      } else {
        console.log('Could not find location ID, stopping');
        await browser.disconnect();
        process.exit(1);
      }
    }
  }

  let inserted = 0, skipped = 0;

  for (let pageNum = 1; pageNum <= 20 && inserted < MAX_LEADS; pageNum++) {
    const url = `https://www.compass.com/agents/locations/${citySlug}/${locationId}/page-${pageNum}/`;
    console.log(`\nPage ${pageNum}: ${url}`);
    
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(3000);
    
    // Scroll to load lazy content
    await page.evaluate(async () => {
      for (let i = 0; i < 10; i++) {
        window.scrollBy(0, 800);
        await new Promise(r => setTimeout(r, 300));
      }
    });
    await sleep(1000);

    // Extract agents using page.evaluate
    const agents = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      // Find agent cards - Compass uses various selectors
      const cards = document.querySelectorAll('[data-test="agent-card"], .uc-agentCard, article[class*="agent"], .agent-card');
      cards.forEach(card => {
        const emailEl = card.querySelector('a[href^="mailto:"]');
        if (!emailEl) return;
        const email = emailEl.href.replace('mailto:', '').split('?')[0].trim().toLowerCase();
        if (!email || !email.includes('@') || seen.has(email)) return;
        seen.add(email);
        
        const nameEl = card.querySelector('h2, h3, [class*="name"], [class*="Name"]');
        const name = nameEl?.textContent?.trim();
        if (!name || name.length < 3) return;
        
        const phoneEl = card.querySelector('a[href^="tel:"]');
        const phone = phoneEl?.href?.replace('tel:', '') || null;
        
        const imgEl = card.querySelector('img');
        const picture = imgEl?.src || null;
        
        const profileEl = card.querySelector('a[href*="/agents/"]');
        const profileUrl = profileEl ? `https://www.compass.com${profileEl.getAttribute('href')}` : null;
        
        const nameParts = name.split(/\s+/);
        results.push({
          full_name: name,
          first_name: nameParts[0] || '',
          last_name: nameParts.slice(1).join(' ') || '',
          email,
          phone,
          profile_url: profileUrl,
          profile_picture_url: picture,
        });
      });
      return results;
    });

    if (agents.length === 0) {
      // Try text parsing as fallback
      const text = await page.evaluate(() => document.body.innerText);
      const emailMatches = text.match(/[\w.+-]+@[\w.-]+\.\w+/g) || [];
      if (emailMatches.length === 0) {
        console.log('No agents found, done');
        break;
      }
      console.log(`No cards found but found ${emailMatches.length} emails in text`);
    }

    console.log(`Found ${agents.length} agents`);
    
    for (const agent of agents) {
      if (inserted >= MAX_LEADS) break;
      const code = insertLead(agent);
      if (code === '201') { inserted++; console.log(`  + ${agent.full_name} <${agent.email}>`); }
      else if (code === '409') { skipped++; }
      else { console.log(`  ! ${agent.full_name} [${code}]`); }
      await sleep(200);
    }

    console.log(`Page ${pageNum} done. Inserted: ${inserted}, Skipped: ${skipped}`);
    await sleep(10000);
  }

  console.log(`\nFINAL: ${city} Compass: Inserted ${inserted}, Skipped ${skipped}, LocationID: ${locationId}`);
  await browser.disconnect();
})();
