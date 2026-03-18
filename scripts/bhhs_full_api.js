const puppeteer = require('puppeteer-core');
const { execSync } = require('child_process');
const fs = require('fs');

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
  
  // Capture the API URL
  let apiBaseUrl = null;
  page.on('request', req => {
    const url = req.url();
    if (url.includes('solrAgentSearchServlet')) {
      apiBaseUrl = url;
    }
  });
  
  await page.goto('https://www.bhhs.com/agent-search-results?city=Houston%2C+TX%2C+USA', { waitUntil: 'networkidle2' });
  await sleep(2000);
  
  const baseApiUrl = (apiBaseUrl || 'https://www.bhhs.com/bin/bhhs/solrAgentSearchServlet?city=Houston%2C+TX%2C+USA&resultSize=50&sortType=3&page=1&geo_sort_param_name=city&geo_sort_param_value=')
    .replace(/&page=\d+/, '')
    .replace(/resultSize=\d+/, 'resultSize=50');
  
  console.log('API URL:', baseApiUrl.slice(0, 120));
  
  const allAgents = [];
  
  for (let pageNum = 1; pageNum <= 4 && allAgents.length < 100; pageNum++) {
    const apiUrl = baseApiUrl + `&page=${pageNum}`;
    console.log(`\nFetching page ${pageNum}...`);
    
    // Write response to file via browser fetch
    const responseData = await page.evaluate(async (url) => {
      try {
        const resp = await fetch(url, { credentials: 'include' });
        const text = await resp.text();
        return { status: resp.status, body: text };
      } catch(e) {
        return { error: e.message };
      }
    }, apiUrl);
    
    if (responseData.error) {
      console.log('Error:', responseData.error);
      break;
    }
    
    // Write to file for parsing
    fs.writeFileSync('/tmp/bhhs_page_' + pageNum + '.json', responseData.body);
    console.log(`Status: ${responseData.status}, Size: ${responseData.body.length} bytes`);
    
    try {
      const data = JSON.parse(responseData.body);
      const agentList = data.value || data.response?.docs || data.agents || [];
      console.log(`Found ${agentList.length} agents, fields:`, agentList.length > 0 ? Object.keys(agentList[0]).slice(0, 10) : 'none');
      
      if (agentList.length > 0) {
        console.log('Sample:', JSON.stringify(agentList[0]).slice(0, 300));
      }
      
      agentList.forEach(a => allAgents.push(a));
    } catch(e) {
      console.log('Parse error:', e.message);
      console.log('Body start:', responseData.body.slice(0, 300));
    }
    
    await sleep(5000);
  }
  
  console.log(`\nTotal agents: ${allAgents.length}`);
  fs.writeFileSync('/tmp/bhhs_all_agents.json', JSON.stringify(allAgents, null, 2));
  console.log('Saved to /tmp/bhhs_all_agents.json');
  
  await browser.disconnect();
}

run().catch(e => console.error('Fatal:', e.message));
