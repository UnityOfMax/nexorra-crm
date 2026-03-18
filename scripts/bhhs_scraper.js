const puppeteer = require('puppeteer-core');
const { execSync } = require('child_process');
const fs = require('fs');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function insertLead(data) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  try {
    const result = execSync(`curl -s -o /dev/null -w "%{http_code}" -X POST "${url}/rest/v1/leads" -H "apikey: ${key}" -H "Authorization: Bearer ${key}" -H "Content-Type: application/json" -H "Prefer: return=minimal" -d '${JSON.stringify(data).replace(/'/g, "'\\''")}'`).toString();
    return result.trim();
  } catch(e) { return '000'; }
}

async function run() {
  const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages[0];
  
  let inserted = 0, skipped = 0;
  
  // Navigate to page 1
  await page.goto('https://www.bhhs.com/agent-search-results?city=Houston%2C+TX%2C+USA', { waitUntil: 'networkidle2' });
  await sleep(3000);
  
  for (let pageNum = 1; pageNum <= 18 && inserted < 100; pageNum++) {
    console.log(`\n=== BHHS Houston Page ${pageNum} ===`);
    
    // Get all cid- profile links
    const profileUrls = await page.evaluate(() => {
      const links = document.querySelectorAll('a[href*="cid-"]');
      const urls = new Set();
      links.forEach(l => {
        const href = l.getAttribute('href');
        if (href) urls.add(href.startsWith('http') ? href : 'https://www.bhhs.com' + href);
      });
      return [...urls];
    });
    
    console.log(`Found ${profileUrls.length} profiles`);
    
    for (const profileUrl of profileUrls) {
      if (inserted >= 100) break;
      
      console.log(`  Visiting: ${profileUrl.slice(0, 80)}`);
      
      try {
        await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await sleep(2000);
        
        const data = await page.evaluate(() => {
          const mailtoEl = document.querySelector('a[href^="mailto:"]');
          const email = mailtoEl ? mailtoEl.href.replace('mailto:', '').split('?')[0].trim().toLowerCase() : null;
          
          const h1 = document.querySelector('h1');
          let name = h1 ? h1.textContent.trim() : null;
          
          const phoneEl = document.querySelector('a[href^="tel:"]');
          const phone = phoneEl ? phoneEl.href.replace('tel:', '').trim() : null;
          
          const imgEl = document.querySelector('img[src*="bhhs"], .agent-image img, [class*="profile"] img, [class*="photo"] img');
          const photo = imgEl ? imgEl.src : null;
          
          return { email, name, phone, photo };
        });
        
        if (!data.email || !data.email.includes('@')) {
          console.log(`  -> No email, skipping`);
          skipped++;
          await sleep(5000);
          continue;
        }
        
        let name = data.name || '';
        // Clean name
        name = name.replace(/\s+/g, ' ').trim();
        const parts = name.split(' ');
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
        console.log(`  -> Error: ${e.message.slice(0, 50)}`);
        await sleep(5000);
      }
    }
    
    if (inserted >= 100 || pageNum >= 18) break;
    
    // Go to next page - BHHS uses a "X OF Y" select or arrow buttons
    await page.goto('https://www.bhhs.com/agent-search-results?city=Houston%2C+TX%2C+USA', { waitUntil: 'networkidle2' });
    await sleep(2000);
    
    // Find the pagination - try to select page by number or click next arrow
    const clickedNext = await page.evaluate((targetPage) => {
      // Look for select/dropdown with page numbers
      const selects = document.querySelectorAll('select');
      for (const sel of selects) {
        for (const opt of sel.options) {
          if (opt.text.includes(`${targetPage} OF`) || opt.value == targetPage) {
            sel.value = opt.value;
            sel.dispatchEvent(new Event('change', { bubbles: true }));
            return 'select page ' + targetPage;
          }
        }
      }
      // Try clicking right arrow / next button
      const arrows = document.querySelectorAll('[class*="right"], [class*="next"], [class*="arrow"]');
      for (const a of arrows) {
        if (a.tagName !== 'SCRIPT') {
          a.click();
          return 'arrow click';
        }
      }
      return 'not found';
    }, pageNum + 1);
    
    console.log(`Next page nav: ${clickedNext}`);
    await sleep(3000);
  }
  
  console.log(`\nBHHS Houston: ${inserted} inserted, ${skipped} skipped`);
  await browser.disconnect();
}

run().catch(e => console.error(e.message));
