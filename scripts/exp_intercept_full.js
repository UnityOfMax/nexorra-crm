const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({
    browserURL: 'http://localhost:9222',
    defaultViewport: null,
  });

  const pages = await browser.pages();
  const page = pages[0];

  let captured = null;

  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('agentdir-api.expproptech.com/graphql')) {
      try {
        const text = await response.text();
        captured = text;
      } catch (e) {}
    }
  });

  await page.goto('https://www.exprealty.com/agents-search?page=2&country=US&m=f&location=Charlotte%2C+NC', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));
  
  if (captured) {
    const json = JSON.parse(captured);
    const agents = json.data?.search?.agents || json.data?.searchAgents?.results || [];
    console.log(`Agents: ${agents.length}`);
    if (agents.length > 0) {
      console.log('Sample:', JSON.stringify(agents[0], null, 2));
    }
  } else {
    console.log('Nothing captured');
  }
  
  await browser.disconnect();
})();
