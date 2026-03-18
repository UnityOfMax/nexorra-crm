// Coldwell Banker scraper using chrome-tool.js agents command
// Usage: node scripts/cb_city_scraper.js <City> <ST> <timezone>
const { execSync } = require('child_process');

const city = process.argv[2] || 'Atlanta';
const state = process.argv[3] || 'GA';
const timezone = process.argv[4] || 'EST';
const startPage = parseInt(process.argv[5] || '1', 10);

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MAX_LEADS = 100;

function run(cmd) {
  return execSync(cmd, { encoding: 'utf8', timeout: 60000 }).trim();
}

function insertLead(agent) {
  const data = JSON.stringify({
    full_name: agent.full_name,
    first_name: agent.first_name,
    last_name: agent.last_name,
    email: agent.email,
    phone: agent.phone || null,
    profile_url: agent.profile_url || null,
    profile_picture_url: agent.profile_picture_url || null,
    source_brokerage: 'coldwellbanker',
    country: 'US',
    state_province: state,
    city: city,
    timezone: timezone,
    instagram_handle: agent.instagram_handle || null,
  });
  try {
    return execSync(
      `curl -s -o /dev/null -w "%{http_code}" -X POST "${SUPABASE_URL}/rest/v1/leads" ` +
      `-H "apikey: ${SUPABASE_KEY}" ` +
      `-H "Authorization: Bearer ${SUPABASE_KEY}" ` +
      `-H "Content-Type: application/json" ` +
      `-H "Prefer: return=minimal" ` +
      `-d '${data.replace(/'/g, "'\\''")}'`,
      { encoding: 'utf8', timeout: 15000 }
    ).trim();
  } catch (e) { return 'error'; }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const citySlug = city.toLowerCase().replace(/\s+/g, '-');
  const stSlug = state.toLowerCase();
  const baseUrl = `https://www.coldwellbanker.com/city/${stSlug}/${citySlug}/agents`;
  
  let inserted = 0, skipped = 0;

  // Paginate by appending ?page=N or finding next link
  // CB uses ?page=N (1-indexed) based on page HTML links
  for (let pageNum = startPage; pageNum <= 50 && inserted < MAX_LEADS; pageNum++) {
    const url = pageNum === 1 ? baseUrl : `${baseUrl}?page=${pageNum}`;
    console.log(`\nPage ${pageNum}: ${url}`);
    
    run(`node scripts/chrome-tool.js navigate "${url}"`);
    await sleep(3000);
    run(`node scripts/chrome-tool.js scroll-all`);
    await sleep(1000);
    
    let agents = [];
    try {
      const raw = run(`node scripts/chrome-tool.js agents coldwellbanker`);
      agents = JSON.parse(raw);
    } catch (e) {
      console.log('Parse error, stopping');
      break;
    }

    if (agents.length === 0) {
      console.log('No agents, done');
      break;
    }
    console.log(`Found ${agents.length} agents`);

    for (const agent of agents) {
      if (inserted >= MAX_LEADS) break;
      if (!agent.email || !agent.email.includes('@')) { skipped++; continue; }
      
      const code = insertLead(agent);
      if (code === '201') { inserted++; console.log(`  + ${agent.full_name} <${agent.email}>`); }
      else if (code === '409') { skipped++; }
      else { console.log(`  ! ${agent.full_name} [${code}]`); }
      await sleep(200);
    }

    console.log(`Page ${pageNum} done. Inserted: ${inserted}, Skipped: ${skipped}`);
    await sleep(8000);
  }

  console.log(`\nFINAL: ${city} CB: Inserted ${inserted}, Skipped ${skipped}`);
  process.exit(0);
})();
