const puppeteer = require('puppeteer-core');
const fs = require('fs');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages[0];
  
  // Intercept API calls
  const apiCalls = [];
  
  page.on('request', req => {
    const url = req.url();
    if (url.includes('execute-api') || url.includes('sotheby') && !url.includes('.js') && !url.includes('.css')) {
      apiCalls.push({
        method: req.method(),
        url: url.slice(0, 200),
        body: req.postData()?.slice(0, 500) || null
      });
    }
  });
  
  const responses = [];
  page.on('response', async (resp) => {
    const url = resp.url();
    if (url.includes('execute-api') || (url.includes('sotheby') && !url.includes('.js') && !url.includes('.css') && !url.includes('.png'))) {
      try {
        const ct = resp.headers()['content-type'] || '';
        if (ct.includes('json') || ct.includes('text')) {
          const body = await resp.text();
          responses.push({ url: url.slice(0, 100), body: body.slice(0, 1000) });
        }
      } catch(e) {}
    }
  });
  
  await page.goto('https://www.sothebysrealty.com/eng/associates/houston-tx-usa', { waitUntil: 'networkidle2' });
  await sleep(3000);
  
  console.log('API requests:', apiCalls.length);
  apiCalls.forEach(c => {
    console.log('---');
    console.log(c.method, c.url);
    if (c.body) console.log('Body:', c.body);
  });
  
  console.log('\nAPI responses:', responses.length);
  responses.forEach(r => {
    console.log('---');
    console.log('URL:', r.url);
    console.log('Body:', r.body);
  });
  
  await browser.disconnect();
}

run().catch(e => console.error('Error:', e.message));
