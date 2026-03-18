const puppeteer = require('puppeteer-core');
const { execSync } = require('child_process');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function insertLead(data) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const escaped = JSON.stringify(data).replace(/'/g, "'\\''");
  try {
    const result = execSync(`curl -s -o /dev/null -w "%{http_code}" -X POST "${url}/rest/v1/leads" -H "apikey: ${key}" -H "Authorization: Bearer ${key}" -H "Content-Type: application/json" -H "Prefer: return=minimal" -d '${escaped}'`, { timeout: 15000 }).toString();
    return result.trim();
  } catch(e) { return '000'; }
}

async function run() {
  const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages[0];
  
  let inserted = 0, skipped = 0;
  const allProfileUrls = [];
  
  // Navigate to search, set 50 per page
  await page.goto('https://www.bhhs.com/agent-search-results?city=Houston%2C+TX%2C+USA', { waitUntil: 'networkidle2' });
  await sleep(3000);
  
  // Change results per page to 50
  await page.evaluate(() => {
    const selects = document.querySelectorAll('select');
    // Second select is results-per-page (10, 20, 30, 40, 50)
    const perPageSelect = Array.from(selects).find(s => Array.from(s.options).some(o => o.value === '50'));
    if (perPageSelect) {
      perPageSelect.value = '50';
      perPageSelect.dispatchEvent(new Event('change', { bubbles: true }));
      console.log('Changed to 50 per page');
    }
  });
  await sleep(3000);
  
  // Collect all profile URLs across pages
  for (let pageNum = 1; pageNum <= 4; pageNum++) {
    console.log(`\n=== Getting profile URLs from page ${pageNum} ===`);
    
    const urls = await page.evaluate(() => {
      const links = document.querySelectorAll('a[href*="cid-"]');
      const urlSet = new Set();
      links.forEach(l => {
        const href = l.getAttribute('href');
        if (href) urlSet.add(href.startsWith('http') ? href : 'https://www.bhhs.com' + href);
      });
      return [...urlSet];
    });
    
    console.log(`Found ${urls.length} profiles on this page`);
    urls.forEach(u => { if (!allProfileUrls.includes(u)) allProfileUrls.push(u); });
    
    if (allProfileUrls.length >= 100 || pageNum >= 4) break;
    
    // Go to next page - click page number
    const clicked = await page.evaluate((targetPage) => {
      const selects = document.querySelectorAll('select');
      const pageSelect = Array.from(selects).find(s => 
        Array.from(s.options).some(o => parseInt(o.value) >= 1 && parseInt(o.value) <= 20)
        && !Array.from(s.options).some(o => o.text.includes('A-Z') || o.text === '50')
      );
      if (pageSelect) {
        // Find option matching targetPage
        for (const opt of pageSelect.options) {
          if (parseInt(opt.value) === targetPage || opt.text === String(targetPage)) {
            pageSelect.value = opt.value;
            pageSelect.dispatchEvent(new Event('change', { bubbles: true }));
            return 'selected page ' + opt.value;
          }
        }
        return 'page not in select: ' + Array.from(pageSelect.options).map(o=>o.value).join(',');
      }
      return 'no page select found';
    }, pageNum + 1);
    
    console.log('Pagination:', clicked);
    await sleep(3000);
  }
  
  console.log(`\nTotal unique profile URLs: ${allProfileUrls.length}`);
  
  // Now visit each profile
  const profilesNeeded = Math.min(allProfileUrls.length, 100);
  
  for (let i = 0; i < profilesNeeded; i++) {
    const profileUrl = allProfileUrls[i];
    console.log(`\n[${i+1}/${profilesNeeded}] ${profileUrl.slice(-50)}`);
    
    try {
      await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await sleep(2000);
      
      const data = await page.evaluate(() => {
        // Name with specific selector
        const nameEl = document.querySelector('h1.cmp-agent__name');
        const name = nameEl ? nameEl.textContent.trim() : null;
        
        // Email
        const mailtoEl = document.querySelector('a[href^="mailto:"]');
        const email = mailtoEl ? mailtoEl.href.replace('mailto:', '').split('?')[0].trim().toLowerCase() : null;
        
        // Phone
        const phoneEl = document.querySelector('a[href^="tel:"]');
        const phone = phoneEl ? phoneEl.href.replace('tel:', '').replace('%20', '').trim() : null;
        
        // Photo
        const photoEl = document.querySelector('.cmp-agent__image img, .agent-photo img, [class*="profile-photo"] img');
        const photo = photoEl ? photoEl.src : null;
        
        // Fallback: title parsing
        const titleName = document.title.split(' - ')[0].trim();
        
        return { name: name || titleName, email, phone, photo };
      });
      
      if (!data.email || !data.email.includes('@')) {
        console.log(`  -> No email, skipping`);
        skipped++;
        await sleep(5000);
        continue;
      }
      
      const name = data.name || '';
      const parts = name.trim().split(/\s+/);
      const first = parts[0] || '';
      const last = parts.slice(1).join(' ') || '';
      
      const lead = {
        full_name: name,
        first_name: first,
        last_name: last,
        email: data.email,
        phone: data.phone || null,
        profile_url: profileUrl,
        profile_picture_url: data.photo || null,
        source_brokerage: 'bhhs',
        country: 'US',
        state_province: 'TX',
        city: 'Houston',
        timezone: 'CST',
        instagram_handle: null
      };
      
      const code = await insertLead(lead);
      if (code === '201') {
        inserted++;
        console.log(`  -> 201 ${name} | ${data.email} (${inserted} total)`);
      } else if (code === '409') {
        console.log(`  -> 409 dupe ${name}`);
      } else {
        console.log(`  -> ${code} ERROR ${name}`);
      }
      
      await sleep(5000);
      
    } catch(e) {
      console.log(`  -> Error: ${e.message.slice(0, 60)}`);
      await sleep(5000);
    }
  }
  
  console.log(`\nBHHS Houston DONE: ${inserted} inserted, ${skipped} skipped`);
  await browser.disconnect();
}

run().catch(e => console.error('Fatal:', e.message));
