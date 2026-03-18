const puppeteer = require('puppeteer-core');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages[0];
  
  const apiCalls = [];
  
  page.on('response', async (response) => {
    const url = response.url();
    if (!url.includes('.js') && !url.includes('.css') && !url.includes('.png') && 
        !url.includes('.jpg') && !url.includes('analytics') && !url.includes('google') &&
        !url.includes('fonts') && !url.includes('facebook')) {
      try {
        const ct = response.headers()['content-type'] || '';
        if (ct.includes('json')) {
          const body = await response.text();
          if (body.includes('associate') || body.includes('agent') || body.includes('email') || body.includes('Associate')) {
            apiCalls.push({ url: url.slice(0, 120), bodySlice: body.slice(0, 500) });
          }
        }
      } catch(e) {}
    }
  });
  
  await page.goto('https://www.sothebysrealty.com/eng/associates/houston-tx-usa', { waitUntil: 'networkidle2' });
  await sleep(3000);
  
  console.log('API calls with agent data:', apiCalls.length);
  apiCalls.forEach(c => {
    console.log('---');
    console.log('URL:', c.url);
    console.log('Body:', c.bodySlice);
  });
  
  await browser.disconnect();
}

run().catch(e => console.error('Error:', e.message));
