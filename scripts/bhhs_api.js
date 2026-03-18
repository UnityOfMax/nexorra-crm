const puppeteer = require('puppeteer-core');
const { execSync } = require('child_process');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function insertLead(data) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const escaped = JSON.stringify(data).replace(/'/g, "'\\''");
  try {
    const result = execSync(`curl -s -o /dev/null -w "%{http_code}" -X POST "${url}/rest/v1/leads" -H "apikey: ${key}" -H "Authorization: Bearer ${key}" -H "Content-Type: application/json" -H "Prefer: return=minimal" -d '${escaped}'`, { timeout: 15000 }).toString();
    return result.trim();
  } catch(e) { return '000'; }
}

async function run() {
  const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages[0];
  
  // Capture the API URL and cookies
  let apiBaseUrl = null;
  page.on('request', req => {
    const url = req.url();
    if (url.includes('solrAgentSearchServlet')) {
      apiBaseUrl = url;
    }
  });
  
  await page.goto('https://www.bhhs.com/agent-search-results?city=Houston%2C+TX%2C+USA', { waitUntil: 'networkidle2' });
  await sleep(2000);
  
  console.log('API URL captured:', apiBaseUrl ? apiBaseUrl.slice(0, 120) : 'NOT FOUND');
  
  if (!apiBaseUrl) {
    console.log('Trying manual API call...');
    apiBaseUrl = 'https://www.bhhs.com/bin/bhhs/solrAgentSearchServlet?city=Houston%2C+TX%2C+USA&resultSize=50&sortType=3&page=1';
  }
  
  // Extract base URL without the page param, change to resultSize=50
  const baseApiUrl = apiBaseUrl.replace(/&page=\d+/, '').replace(/resultSize=\d+/, 'resultSize=50');
  console.log('Base API URL:', baseApiUrl.slice(0, 150));
  
  // Use browser fetch to call the API with existing cookies
  const agents = [];
  
  for (let pageNum = 1; pageNum <= 4 && agents.length < 100; pageNum++) {
    const apiUrl = baseApiUrl + `&page=${pageNum}`;
    console.log(`\nFetching page ${pageNum}...`);
    
    const response = await page.evaluate(async (url) => {
      try {
        const resp = await fetch(url, { credentials: 'include' });
        const text = await resp.text();
        return { status: resp.status, body: text.slice(0, 5000) };
      } catch(e) {
        return { error: e.message };
      }
    }, apiUrl);
    
    if (response.error) {
      console.log('API error:', response.error);
      break;
    }
    
    console.log(`Status: ${response.status}, Body length: ${response.body.length}`);
    
    try {
      // Parse the JSON response
      let data;
      try {
        data = JSON.parse(response.body);
      } catch(e) {
        // Try to find JSON in body
        const match = response.body.match(/\{[\s\S]*\}/);
        if (match) data = JSON.parse(match[0]);
      }
      
      if (!data) {
        console.log('Body sample:', response.body.slice(0, 200));
        continue;
      }
      
      // BHHS response structure can vary
      const agentList = data.response?.docs || data.agents || data.results || data.docs || [];
      console.log(`Found ${agentList.length} agents`);
      
      if (agentList.length === 0) {
        console.log('Response keys:', Object.keys(data));
        console.log('Body sample:', response.body.slice(0, 500));
        break;
      }
      
      agentList.forEach(a => {
        agents.push(a);
      });
      
    } catch(e) {
      console.log('Parse error:', e.message, 'Body sample:', response.body.slice(0, 200));
    }
    
    await sleep(5000);
  }
  
  console.log(`\nTotal agents from API: ${agents.length}`);
  if (agents.length > 0) {
    console.log('Sample agent keys:', Object.keys(agents[0]));
    console.log('Sample:', JSON.stringify(agents[0]).slice(0, 300));
  }
  
  await browser.disconnect();
}

run().catch(e => console.error('Fatal:', e.message));
