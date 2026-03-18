const puppeteer = require('puppeteer-core');
const { execSync } = require('child_process');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function insertLead(data) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const escaped = JSON.stringify(data).replace(/'/g, "'\\''");
  try {
    return execSync(`curl -s -o /dev/null -w "%{http_code}" -X POST "${url}/rest/v1/leads" -H "apikey: ${key}" -H "Authorization: Bearer ${key}" -H "Content-Type: application/json" -H "Prefer: return=minimal" -d '${escaped}'`, { timeout: 15000 }).toString().trim();
  } catch(e) { return '000'; }
}

async function extractKWAgents(page) {
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
      const avatarEl = card.querySelector('.agent-card-avatar');
      let picture = null;
      if (avatarEl) {
        const bg = avatarEl.getAttribute('style') || '';
        const m = bg.match(/url\(['"]?([^'")\s]+)['"]?\)/);
        if (m) picture = m[1];
      }
      const phoneEl = card.querySelector('a[href^="tel:"]');
      const phone = phoneEl?.href?.replace('tel:', '').trim() || null;
      const nameParts = name.trim().split(/\s+/);
      agents.push({ full_name: name, first_name: nameParts[0] || '', last_name: nameParts.slice(1).join(' ') || '', email, phone, profile_picture_url: picture });
    });
    return agents;
  });
}

async function run() {
  const city = process.argv[2] || 'Charlotte';
  const state = process.argv[3] || 'NC';
  const timezone = process.argv[4] || 'EST';
  const country = process.argv[5] || 'US';
  
  const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages[0];
  
  let inserted = 0, dupes = 0;
  const cityEncoded = encodeURIComponent(`${city}, ${state}`).replace(/%2C%20/g, '%2C+').replace(/%20/g, '+');
  
  for (let pageNum = 1; pageNum <= 10 && inserted < 100; pageNum++) {
    const url = `https://kw.com/agents?location=${cityEncoded}&page=${pageNum}`;
    console.log(`\n=== KW ${city}, ${state} Page ${pageNum} ===`);
    
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await sleep(3000);
    
    // Scroll to load all
    await page.evaluate(async () => {
      let prevH = 0;
      for (let i = 0; i < 20; i++) {
        window.scrollBy(0, 800);
        await new Promise(r => setTimeout(r, 500));
        if (document.body.scrollHeight === prevH) break;
        prevH = document.body.scrollHeight;
      }
    });
    await sleep(1000);
    
    const agents = await extractKWAgents(page);
    console.log(`Found ${agents.length} agents with email`);
    if (agents.length === 0) break;
    
    for (const a of agents) {
      if (inserted >= 100) break;
      
      const lead = {
        full_name: a.full_name,
        first_name: a.first_name,
        last_name: a.last_name,
        email: a.email,
        phone: a.phone || null,
        profile_url: null,
        profile_picture_url: a.profile_picture_url || null,
        source_brokerage: 'kw',
        country,
        state_province: state,
        city,
        timezone,
        instagram_handle: null
      };
      
      const code = insertLead(lead);
      if (code === '201') {
        inserted++;
        console.log(`  201 ${a.full_name} | ${a.email} (${inserted})`);
      } else if (code === '409') {
        dupes++;
      } else {
        console.log(`  ${code} ERROR ${a.full_name}`);
      }
      
      await sleep(300);
    }

    if (pageNum < 10 && inserted < 100) await sleep(8000);
  }
  
  console.log(`\nKW ${city}: ${inserted} inserted, ${dupes} dupes`);
  await browser.disconnect();
  process.exit(0);
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
