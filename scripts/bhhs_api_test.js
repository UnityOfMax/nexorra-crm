const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({
    browserURL: 'http://localhost:9222',
    defaultViewport: null,
  });
  const pages = await browser.pages();
  const page = pages[0];

  const result = await page.evaluate(async () => {
    const url = 'https://www.bhhs.com/bin/bhhs/solrAgentSearchServlet?city=Charlotte%2C+NC%2C+USA&resultSize=50&sortType=3&page=0';
    const r = await fetch(url, { credentials: 'include' });
    return { status: r.status, text: await r.text() };
  });
  console.log('Status:', result.status);
  if (result.status === 200) {
    const json = JSON.parse(result.text);
    console.log('Count:', json['@odata.count']);
    console.log('Agents:', (json.value || []).length);
    if (json.value && json.value[0]) console.log('Sample:', JSON.stringify(json.value[0]).substring(0, 200));
  } else {
    console.log('Body:', result.text.substring(0, 500));
  }
  await browser.disconnect();
})();
