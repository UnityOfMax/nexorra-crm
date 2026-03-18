const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({
    browserURL: 'http://localhost:9222',
    defaultViewport: null,
  });

  const pages = await browser.pages();
  const page = pages[0];

  // Listen to ALL XHR/fetch responses
  page.on('response', async (response) => {
    const url = response.url();
    const contentType = response.headers()['content-type'] || '';
    if (contentType.includes('json') && !url.includes('supabase') && !url.includes('vercel')) {
      console.log(`JSON response: ${url}`);
      try {
        const text = await response.text();
        if (text.includes('email') || text.includes('Email') || text.includes('agent')) {
          console.log(`  -> Interesting! First 200 chars: ${text.substring(0, 200)}`);
        }
      } catch (e) {}
    }
  });

  console.log('Navigating to eXp Charlotte...');
  await page.goto('https://www.exprealty.com/agents-search?page=1&country=US&m=f&location=Charlotte%2C+NC', { waitUntil: 'networkidle2', timeout: 30000 });
  
  await new Promise(r => setTimeout(r, 5000));
  console.log('Done intercepting');
  await browser.disconnect();
})();
