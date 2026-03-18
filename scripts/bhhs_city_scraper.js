// BHHS Solr API scraper
// Usage: node scripts/bhhs_city_scraper.js <City> <ST> <timezone> <country>
const puppeteer = require('puppeteer-core');
const { execSync } = require('child_process');

const city = process.argv[2] || 'Charlotte';
const state = process.argv[3] || 'NC';
const timezone = process.argv[4] || 'EST';
const country = process.argv[5] || 'US';
const countryFull = country === 'CA' ? 'Canada' : 'USA';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MAX_LEADS = 100;

function insertLead(agent) {
  const data = JSON.stringify({
    full_name: agent.full_name,
    first_name: agent.first_name,
    last_name: agent.last_name,
    email: agent.email,
    phone: agent.phone || null,
    profile_url: agent.profile_url || null,
    profile_picture_url: agent.profile_picture_url || null,
    source_brokerage: 'bhhs',
    country: country,
    state_province: state,
    city: city,
    timezone: timezone,
  });
  try {
    const result = execSync(
      `curl -s -o /dev/null -w "%{http_code}" -X POST "${SUPABASE_URL}/rest/v1/leads" ` +
      `-H "apikey: ${SUPABASE_KEY}" ` +
      `-H "Authorization: Bearer ${SUPABASE_KEY}" ` +
      `-H "Content-Type: application/json" ` +
      `-H "Prefer: return=minimal" ` +
      `-d '${data.replace(/'/g, "'\\''")}'`,
      { encoding: 'utf8', timeout: 15000 }
    );
    return result.trim();
  } catch (e) {
    return 'error';
  }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

(async () => {
  const browser = await puppeteer.connect({
    browserURL: 'http://localhost:9222',
    defaultViewport: null,
  });

  const pages = await browser.pages();
  const page = pages[0];

  // Navigate to BHHS first to get cookies
  const cityQuery = `${city}%2C+${state}%2C+${countryFull}`;
  console.log(`Navigating to BHHS for ${city}, ${state}...`);
  await page.goto(`https://www.bhhs.com/agent-search-results?city=${cityQuery}`, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(5000);

  let inserted = 0;
  let skipped = 0;

  // Use exact URL format matching what the page sends (page starts at 1, geo_sort params required)
  const geoValue = `${city}%2C%2B${state}%2C%2B${countryFull}`;
  for (let pageNum = 1; pageNum <= 20 && inserted < MAX_LEADS; pageNum++) {
    const apiUrl = `https://www.bhhs.com/bin/bhhs/solrAgentSearchServlet?city=${cityQuery}&resultSize=50&sortType=3&page=${pageNum}&geo_sort_param_name=city&geo_sort_param_value=${geoValue}`;
    
    console.log(`Page ${pageNum}: calling API...`);
    
    const result = await page.evaluate(async (url) => {
      try {
        const response = await fetch(url, { credentials: 'include' });
        const text = await response.text();
        return { ok: response.ok, status: response.status, text };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    }, apiUrl);

    if (!result.ok) {
      console.log(`API error: ${result.status || result.error}`);
      break;
    }

    let json;
    try { json = JSON.parse(result.text); } catch (e) { console.log('JSON parse error'); break; }

    const agents = json.value || [];
    if (agents.length === 0) {
      console.log('No agents on this page, done.');
      break;
    }

    console.log(`Found ${agents.length} agents`);

    for (const agent of agents) {
      if (inserted >= MAX_LEADS) break;

      const email = agent.MemberEmail;
      if (!email || !email.includes('@')) { skipped++; continue; }

      const fullName = agent.MemberFullName || '';
      if (!fullName || fullName.length < 3) { skipped++; continue; }

      const nameParts = fullName.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const lead = {
        full_name: fullName,
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone: agent.MemberMobilePhone || agent.MemberOfficePhone || null,
        profile_url: agent.ProfileUrl || null,
        profile_picture_url: agent.MemberPhotoURLSmall || null,
      };

      const code = insertLead(lead);
      if (code === '201') { inserted++; console.log(`  + ${fullName} <${email}> [${code}]`); }
      else if (code === '409') { skipped++; }
      else { console.log(`  ! ${fullName} [${code}]`); }
      await sleep(200);
    }

    console.log(`Page ${pageNum} done. Inserted: ${inserted}, Skipped: ${skipped}`);
    await sleep(5000);
  }

  console.log(`\nFINAL: Inserted ${inserted}, Skipped ${skipped}`);
  await browser.disconnect();
})();
