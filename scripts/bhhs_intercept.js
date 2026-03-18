const puppeteer = require('puppeteer-core');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages[0];
  
  const calls = [];
  
  // Intercept all requests
  page.on('request', req => {
    const url = req.url();
    if (!url.includes('analytics') && !url.includes('google') && !url.includes('facebook') && 
        !url.includes('adobe') && !url.includes('static') && !url.includes('.js') && 
        !url.includes('.css') && !url.includes('.png') && !url.includes('.jpg') &&
        !url.includes('fonts') && !url.includes('trustarc')) {
      const postData = req.postData() || '';
      calls.push({ method: req.method(), url: url.slice(0, 120), body: postData.slice(0, 200) });
    }
  });
  
  // Fresh navigate
  await page.goto('https://www.bhhs.com/agent-search-results?city=Houston%2C+TX%2C+USA', { waitUntil: 'networkidle2' });
  await sleep(2000);
  
  console.log('Requests on page load:', calls.length);
  calls.forEach(c => console.log(c.method, c.url, c.body ? '| BODY: ' + c.body : ''));
  
  calls.length = 0; // Clear
  
  // Now try to trigger page 2 using the select
  // Use Puppeteer's evaluate to find and trigger the right handler
  const result = await page.evaluate(() => {
    const selects = document.querySelectorAll('select');
    // Find the "1 OF 18" select (has numeric values 1-18)
    for (const sel of selects) {
      const vals = Array.from(sel.options).map(o => parseInt(o.value));
      const sorted = [...vals].sort((a,b) => a-b);
      if (vals.length >= 3 && sorted[0] === 1 && sorted[sorted.length-1] >= 10) {
        // This is the page select
        sel.value = '2';
        
        // Try React fiber
        const fKey = Object.keys(sel).find(k => k.startsWith('__reactFiber'));
        if (fKey) {
          const props = sel[fKey]?.memoizedProps;
          if (props?.onChange) {
            props.onChange({ target: { value: '2' } });
            return 'called React onChange via fiber';
          }
        }
        
        // Try all event types
        ['input', 'change', 'select'].forEach(evt => {
          sel.dispatchEvent(new Event(evt, { bubbles: true }));
        });
        return 'dispatched events, options: ' + Array.from(sel.options).map(o=>o.value).join(',');
      }
    }
    return 'page select not found';
  });
  
  console.log('Result:', result);
  await sleep(3000);
  
  console.log('\nRequests after page change:', calls.length);
  calls.forEach(c => console.log(c.method, c.url, c.body ? '| BODY: ' + c.body.slice(0,100) : ''));
  
  // Check if agents changed
  const urls = await page.evaluate(() => {
    return Array.from(new Set(Array.from(document.querySelectorAll('a[href*="cid-"]')).map(a => a.href)));
  });
  console.log('\nAgent URLs:', urls.length, 'first:', urls[0]?.slice(-40));
  
  await browser.disconnect();
}

run().catch(e => console.error('Error:', e.message));
