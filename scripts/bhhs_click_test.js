const puppeteer = require('puppeteer-core');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages[0];
  
  // Find the "1 OF 18" select and click it, then select "2"
  const selects = await page.$$('select');
  console.log('Selects found:', selects.length);
  
  // The page select should be the third one (index 2) with values 1-18
  // Let me verify by checking the options
  for (let i = 0; i < selects.length; i++) {
    const opts = await selects[i].evaluate(s => Array.from(s.options).map(o => o.value));
    console.log(`Select ${i}:`, opts.slice(0, 5));
  }
  
  // Use Puppeteer's select method on the page number select (last select that has numeric options)
  // First, let's intercept network requests
  const requests = [];
  page.on('request', req => {
    const url = req.url();
    if (!url.includes('analytics') && !url.includes('adobe') && !url.includes('static')) {
      requests.push({ method: req.method(), url: url.slice(0, 100) });
    }
  });
  
  // Try using Puppeteer's built-in select on the "1 OF 18" select
  const selectHandles = await page.$$('select');
  // Get all selects and find the one with the most page options  
  let pageSelectHandle = null;
  for (const handle of selectHandles) {
    const count = await handle.evaluate(s => s.options.length);
    const first = await handle.evaluate(s => s.options[0]?.value);
    if (count >= 5 && first === '1') {
      // This might be the page select - check if it has non-sort values
      const allVals = await handle.evaluate(s => Array.from(s.options).map(o => o.value));
      const isPageSelect = allVals.every(v => !isNaN(parseInt(v)) && parseInt(v) <= 50);
      const isSortSelect = allVals.some(v => v === '1' && parseInt(v) === 1) && allVals.length <= 6;
      console.log('Potential page select values:', allVals.slice(0, 8));
    }
  }
  
  // Use page.select() which dispatches proper events in Puppeteer
  const selectEls = await page.$$('select');
  // The 3rd select (index 2) should be the page number select based on earlier inspection
  if (selectEls.length >= 3) {
    // Get current URLs before change
    const beforeUrls = await page.evaluate(() => {
      return Array.from(new Set(Array.from(document.querySelectorAll('a[href*="cid-"]')).map(a => a.href)));
    });
    console.log('Before - URL count:', beforeUrls.length, 'first:', beforeUrls[0]?.slice(-40));
    
    // Click the select first to show options
    await selectEls[2].click();
    await sleep(500);
    
    // Take screenshot to see the open dropdown
    await page.screenshot({ path: '/tmp/bhhs-dropdown.png' });
    
    // Use the select value setter
    await page.select(await selectEls[2].getProperty('id').then(h => h ? h.jsonValue() : null) || '', '2');
    
    await sleep(3000);
    
    const afterUrls = await page.evaluate(() => {
      return Array.from(new Set(Array.from(document.querySelectorAll('a[href*="cid-"]')).map(a => a.href)));
    });
    console.log('After - URL count:', afterUrls.length, 'first:', afterUrls[0]?.slice(-40));
  }
  
  console.log('Requests made:', requests.slice(-5).map(r => r.url));
  
  await browser.disconnect();
}

run().catch(e => console.error('Error:', e.message));
