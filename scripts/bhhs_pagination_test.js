const puppeteer = require('puppeteer-core');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages[0];
  
  // Set up network interceptor
  const apiResponses = [];
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('bhhs') && response.request().method() === 'POST') {
      try {
        const body = await response.text();
        if (body.includes('cid-') || body.includes('agent')) {
          apiResponses.push({ url: url.slice(0, 80), body: body.slice(0, 200) });
        }
      } catch(e) {}
    }
  });
  
  // Get initial profile URLs
  const urls1 = await page.evaluate(() => {
    return Array.from(new Set(Array.from(document.querySelectorAll('a[href*="cid-"]')).map(a => a.getAttribute('href'))));
  });
  console.log('Page 1 URLs count:', urls1.length);
  console.log('First 2:', urls1.slice(0, 2));
  
  // Try to change page using React's value setter
  await page.evaluate(() => {
    const selects = Array.from(document.querySelectorAll('select'));
    // Index 2 is the page number select
    const pageSelect = selects[2];
    if (!pageSelect) return 'no select found';
    
    // Try React's internal fiber
    const reactKey = Object.keys(pageSelect).find(k => k.startsWith('__reactFiber'));
    if (reactKey) {
      const fiber = pageSelect[reactKey];
      const onChange = fiber?.memoizedProps?.onChange;
      if (onChange) {
        onChange({ target: { value: '2' }, currentTarget: { value: '2' } });
        return 'called react onChange with page 2';
      }
    }
    
    // Fallback: native setter
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
    nativeSetter.call(pageSelect, '2');
    pageSelect.dispatchEvent(new Event('change', { bubbles: true }));
    return 'native setter page 2';
  });
  
  await sleep(4000);
  
  const urls2 = await page.evaluate(() => {
    return Array.from(new Set(Array.from(document.querySelectorAll('a[href*="cid-"]')).map(a => a.getAttribute('href'))));
  });
  console.log('Page 2 URLs count:', urls2.length);
  console.log('First 2:', urls2.slice(0, 2));
  
  console.log('\nAPI responses intercepted:', apiResponses.length);
  
  await browser.disconnect();
}

run().catch(e => console.error('Error:', e.message));
