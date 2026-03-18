const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages[0];

  // Try intercepting actual Solr request from page
  let captured = null;
  page.on('request', req => {
    if (req.url().includes('solrAgent')) console.log('REQUEST:', req.url());
  });
  page.on('response', async (res) => {
    if (res.url().includes('solrAgent')) {
      captured = await res.text();
      console.log('RESPONSE URL:', res.url(), 'Status:', res.status());
    }
  });

  await page.goto('https://www.bhhs.com/agent-search-results?city=Charlotte%2C%2BNC%2C%2BUSA', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 5000));
  
  if (captured) {
    const json = JSON.parse(captured);
    console.log('Count:', json['@odata.count'], 'Agents:', (json.value||[]).length);
  }
  await browser.disconnect();
})();
