#!/usr/bin/env node
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

// Types
interface Lead {
  full_name: string;
  first_name?: string;
  last_name?: string;
  phone: string;
  mobile_phone?: string;
  profile_url?: string;
  profile_picture_url?: string;
  source_brokerage: string;
  lead_category: 'calling';
  city: string;
  state_province: string;
  country: 'US' | 'CA';
  timezone?: string;
}

interface StateFile {
  version: number;
  last_run: string;
  daily_calling_target: number;
  session_calling_total: number;
  status_note: string;
}

interface ScraperConfig {
  source: 'realtor' | 'zillow' | 'realtor_ca';
  cities: Array<{ city: string; state: string; province?: string; country: string; timezone: string }>;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SERVICE_KEY');
  process.exit(1);
}

async function chromeTool(cmd: string): Promise<string> {
  try {
    const { stdout } = await execAsync(`node scripts/chrome-tool.js ${cmd}`);
    return stdout.trim();
  } catch (err: any) {
    console.error(`Chrome tool error: ${err.message}`);
    throw err;
  }
}

async function insertLead(lead: Lead): Promise<boolean> {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(lead)
    });

    if (response.status === 201) return true;
    if (response.status === 409) {
      console.log(`  ⊘ Duplicate: ${lead.full_name}`);
      return false;
    }
    console.log(`  ✗ Insert failed (${response.status}): ${lead.full_name}`);
    return false;
  } catch (err: any) {
    console.error(`  ✗ Insert error: ${err.message}`);
    return false;
  }
}

function parsePhoneNumber(phoneStr: string): string | null {
  if (!phoneStr) return null;
  const cleaned = phoneStr.replace(/\D/g, '');
  if (cleaned.length === 10) return `+1${cleaned}`;
  if (cleaned.length === 11 && cleaned[0] === '1') return `+${cleaned}`;
  if (cleaned.length === 11) return `+1${cleaned.slice(1)}`;
  if (cleaned.startsWith('1') && cleaned.length === 11) return `+${cleaned}`;
  return null;
}

function isValidName(name: string): boolean {
  if (!name || name.length < 2 || name.length > 50) return false;
  if (/^[A-Z\s]+$/.test(name) && name.split(' ').length > 1) return false; // ALL CAPS multi-word
  if (/LLC|Inc|Group|Team|Realty|Properties|Corp|Trust|Foundation/i.test(name)) return false;
  if (/\d/.test(name)) return false;
  if (name.split(' ').length === 1) return false; // Single word
  return true;
}

function getTimezone(state: string): string {
  const estStates = ['NY', 'PA', 'FL', 'GA', 'NC', 'VA', 'MA', 'MD', 'DC', 'OH', 'IN', 'MI', 'TN'];
  const cstStates = ['TX', 'IL', 'MO', 'MN', 'WI', 'AL', 'MS', 'LA', 'AR', 'IA', 'OK', 'KS'];
  const mstStates = ['AZ', 'CO', 'UT', 'NM', 'ID', 'WY', 'MT'];
  const pstStates = ['CA', 'WA', 'OR', 'NV'];

  if (estStates.includes(state)) return 'EST';
  if (cstStates.includes(state)) return 'CST';
  if (mstStates.includes(state)) return 'MST';
  if (pstStates.includes(state)) return 'PST';
  return 'CST';
}

async function scrapeRealtorCom(city: string, state: string, timezone: string): Promise<Lead[]> {
  console.log(`\n🔵 realtor.com: ${city}, ${state}`);
  const leads: Lead[] = [];
  const citySlug = city.replace(/\s+/g, '_').toLowerCase();
  const stateSlug = state.toUpperCase();
  let page = 1;
  let yieldDropCount = 0;

  while (true) {
    const url = `https://www.realtor.com/realestateagents/${citySlug}_${stateSlug}/pg-${page}`;
    console.log(`  [Page ${page}] ${url}`);
    await chromeTool(`navigate "${url}"`);
    await chromeTool('wait 2000');

    try {
      const html = await chromeTool('html');

      // Extract agent cards with deal counts
      const agentRegex = /<a[^>]*href="([^"]*realestateagents[^"]*)"[^>]*>(?:[^<]*)<\/a>[^<]*<[^>]*>([^<]*(?:\d+\s+(?:homes|sales)[^<]*))/gi;
      const matches = [...html.matchAll(agentRegex)];

      if (matches.length === 0) {
        console.log(`  ✓ Page exhausted (0 agents)`);
        break;
      }

      let pageLeads = 0;
      for (const match of matches) {
        let profileUrl = match[1];
        if (!profileUrl.startsWith('http')) profileUrl = 'https://www.realtor.com' + profileUrl;

        // Check deal count filter
        const dealText = match[2] || '';
        const dealMatch = dealText.match(/(\d+)\s+(?:homes|sales)/i);
        const deals = dealMatch ? parseInt(dealMatch[1]) : null;

        if (deals !== null && deals < 12) {
          console.log(`    ⊘ Skip: < 12 deals (${deals})`);
          continue;
        }

        // Visit profile
        await chromeTool(`navigate "${profileUrl}"`);
        await chromeTool('wait 1500');

        try {
          const profileHtml = await chromeTool('html');

          // Extract name and phone from profile
          const nameMatch = profileHtml.match(/<h1[^>]*>([^<]+)<\/h1>/);
          const phoneMatch = profileHtml.match(/(?:Phone|Mobile)[:\s]+([+\d\-() .]+)/i) ||
                            profileHtml.match(/\(?(\d{3})\)?[\s.-]?(\d{3})[\s.-]?(\d{4})/);

          if (!nameMatch || !phoneMatch) {
            console.log(`    ⊘ Missing name/phone`);
            continue;
          }

          const fullName = nameMatch[1].trim();
          if (!isValidName(fullName)) {
            console.log(`    ⊘ Invalid name: ${fullName}`);
            continue;
          }

          let phone: string;
          if (typeof phoneMatch[0] === 'string' && phoneMatch[0].includes('(')) {
            phone = parsePhoneNumber(phoneMatch[0]) || '';
          } else if (phoneMatch.length === 4) {
            phone = parsePhoneNumber(`${phoneMatch[1]}${phoneMatch[2]}${phoneMatch[3]}`) || '';
          } else {
            phone = parsePhoneNumber(phoneMatch[1]) || '';
          }

          if (!phone) {
            console.log(`    ⊘ Invalid phone`);
            continue;
          }

          const nameParts = fullName.split(/\s+/);
          const lead: Lead = {
            full_name: fullName,
            first_name: nameParts[0],
            last_name: nameParts.slice(1).join(' '),
            phone,
            mobile_phone: phone,
            profile_url: profileUrl,
            source_brokerage: 'realtor',
            lead_category: 'calling',
            city,
            state_province: state,
            country: 'US',
            timezone
          };

          if (await insertLead(lead)) {
            leads.push(lead);
            pageLeads++;
            console.log(`    ✓ ${fullName} (${phone})`);
          }

          await chromeTool('wait 2000');
        } catch (e) {
          console.log(`    ✗ Profile parse error`);
        }
      }

      if (pageLeads < 5) {
        yieldDropCount++;
        if (yieldDropCount >= 2) {
          console.log(`  ✓ Low yield consecutive pages, moving on`);
          break;
        }
      } else {
        yieldDropCount = 0;
      }

      page++;
      if (page > 10) {
        console.log(`  ✓ Reached max pages (10)`);
        break;
      }
    } catch (e: any) {
      console.log(`  ✗ Page parse error: ${e.message}`);
      break;
    }
  }

  console.log(`  📊 realtor.com ${city}: +${leads.length} leads`);
  return leads;
}

async function scrapeZillow(city: string, state: string, timezone: string): Promise<Lead[]> {
  console.log(`\n🔵 zillow.com: ${city}, ${state}`);
  const leads: Lead[] = [];
  const citySlug = city.replace(/\s+/g, '-').toLowerCase();
  const stateSlug = state.toLowerCase();

  // Warmup
  await chromeTool('navigate "https://www.zillow.com"');
  await chromeTool('wait 5000');

  let page = 1;
  let yieldDropCount = 0;

  while (true) {
    const url = `https://www.zillow.com/professionals/real-estate-agent-reviews/${citySlug}-${stateSlug}/${page > 1 ? page + '/' : ''}`;
    console.log(`  [Page ${page}] ${url}`);
    await chromeTool(`navigate "${url}"`);
    await chromeTool('wait 2500');

    try {
      const html = await chromeTool('html');

      // Extract agent links and sales counts
      const agentRegex = /<a[^>]*href="([^"]*agent[^"]*)"[^>]*>(?:[^<]*)<\/a>[^<]*<[^>]*>([^<]*(?:\d+\s+(?:recent\s+)?sales[^<]*))/gi;
      const matches = [...html.matchAll(agentRegex)];

      if (matches.length === 0) {
        console.log(`  ✓ Page exhausted (0 agents)`);
        break;
      }

      let pageLeads = 0;
      for (const match of matches) {
        let profileUrl = match[1];
        if (!profileUrl.startsWith('http')) profileUrl = 'https://www.zillow.com' + profileUrl;

        const salesText = match[2] || '';
        const salesMatch = salesText.match(/(\d+)\s+(?:recent\s+)?sales/i);
        const sales = salesMatch ? parseInt(salesMatch[1]) : null;

        if (sales !== null && sales < 12) {
          console.log(`    ⊘ Skip: < 12 sales (${sales})`);
          continue;
        }

        await chromeTool(`navigate "${profileUrl}"`);
        await chromeTool('wait 1500');

        try {
          const profileHtml = await chromeTool('html');

          const nameMatch = profileHtml.match(/<h1[^>]*>([^<]+)<\/h1>/);
          const phoneMatch = profileHtml.match(/(?:Phone|Mobile|Call)[:\s]+([+\d\-() .]+)/i) ||
                            profileHtml.match(/\(?(\d{3})\)?[\s.-]?(\d{3})[\s.-]?(\d{4})/);

          if (!nameMatch || !phoneMatch) {
            console.log(`    ⊘ Missing name/phone`);
            continue;
          }

          const fullName = nameMatch[1].trim();
          if (!isValidName(fullName)) {
            console.log(`    ⊘ Invalid name: ${fullName}`);
            continue;
          }

          let phone: string;
          if (typeof phoneMatch[0] === 'string' && phoneMatch[0].includes('(')) {
            phone = parsePhoneNumber(phoneMatch[0]) || '';
          } else if (phoneMatch.length === 4) {
            phone = parsePhoneNumber(`${phoneMatch[1]}${phoneMatch[2]}${phoneMatch[3]}`) || '';
          } else {
            phone = parsePhoneNumber(phoneMatch[1]) || '';
          }

          if (!phone) {
            console.log(`    ⊘ Invalid phone`);
            continue;
          }

          const nameParts = fullName.split(/\s+/);
          const lead: Lead = {
            full_name: fullName,
            first_name: nameParts[0],
            last_name: nameParts.slice(1).join(' '),
            phone,
            mobile_phone: phone,
            profile_url: profileUrl,
            source_brokerage: 'zillow',
            lead_category: 'calling',
            city,
            state_province: state,
            country: 'US',
            timezone
          };

          if (await insertLead(lead)) {
            leads.push(lead);
            pageLeads++;
            console.log(`    ✓ ${fullName} (${phone})`);
          }

          await chromeTool('wait 2500');
        } catch (e) {
          console.log(`    ✗ Profile parse error`);
        }
      }

      if (pageLeads < 5) {
        yieldDropCount++;
        if (yieldDropCount >= 2) {
          console.log(`  ✓ Low yield consecutive pages, moving on`);
          break;
        }
      } else {
        yieldDropCount = 0;
      }

      page++;
      if (page > 8) {
        console.log(`  ✓ Reached max pages (8)`);
        break;
      }
    } catch (e: any) {
      console.log(`  ✗ Page parse error: ${e.message}`);
      break;
    }
  }

  console.log(`  📊 zillow.com ${city}: +${leads.length} leads`);
  return leads;
}

async function scrapeRealtorCA(city: string, province: string, timezone: string): Promise<Lead[]> {
  console.log(`\n🔵 realtor.ca: ${city}, ${province}`);
  const leads: Lead[] = [];
  const citySlug = city.replace(/\s+/g, '-').toLowerCase();
  const provinceSlug = province.toLowerCase();
  let page = 1;
  let yieldDropCount = 0;

  while (true) {
    const url = `https://www.realtor.ca/agents/${citySlug}-${provinceSlug}${page > 1 ? `?page=${page}` : ''}`;
    console.log(`  [Page ${page}] ${url}`);
    await chromeTool(`navigate "${url}"`);
    await chromeTool('wait 2000');

    try {
      const html = await chromeTool('html');

      // Extract agent links
      const agentRegex = /<a[^>]*href="([^"]*agent[^"]*)"[^>]*>([^<]+)<\/a>/gi;
      const matches = [...html.matchAll(agentRegex)];

      if (matches.length === 0) {
        console.log(`  ✓ Page exhausted (0 agents)`);
        break;
      }

      let pageLeads = 0;
      for (const match of matches) {
        let profileUrl = match[1];
        if (!profileUrl.startsWith('http')) profileUrl = 'https://www.realtor.ca' + profileUrl;

        await chromeTool(`navigate "${profileUrl}"`);
        await chromeTool('wait 1500');

        try {
          const profileHtml = await chromeTool('html');

          const nameMatch = profileHtml.match(/<h1[^>]*>([^<]+)<\/h1>/);
          const phoneMatch = profileHtml.match(/(?:Phone|Mobile)[:\s]+([+\d\-() .]+)/i) ||
                            profileHtml.match(/\(?(\d{3})\)?[\s.-]?(\d{3})[\s.-]?(\d{4})/);

          if (!nameMatch || !phoneMatch) {
            console.log(`    ⊘ Missing name/phone`);
            continue;
          }

          const fullName = nameMatch[1].trim();
          if (!isValidName(fullName)) {
            console.log(`    ⊘ Invalid name: ${fullName}`);
            continue;
          }

          let phone: string;
          if (typeof phoneMatch[0] === 'string' && phoneMatch[0].includes('(')) {
            phone = parsePhoneNumber(phoneMatch[0]) || '';
          } else if (phoneMatch.length === 4) {
            phone = parsePhoneNumber(`${phoneMatch[1]}${phoneMatch[2]}${phoneMatch[3]}`) || '';
          } else {
            phone = parsePhoneNumber(phoneMatch[1]) || '';
          }

          if (!phone) {
            console.log(`    ⊘ Invalid phone`);
            continue;
          }

          const nameParts = fullName.split(/\s+/);
          const provinceAbb = province.slice(0, 2).toUpperCase();
          const lead: Lead = {
            full_name: fullName,
            first_name: nameParts[0],
            last_name: nameParts.slice(1).join(' '),
            phone,
            mobile_phone: phone,
            profile_url: profileUrl,
            source_brokerage: 'realtor.ca',
            lead_category: 'calling',
            city,
            state_province: provinceAbb,
            country: 'CA',
            timezone
          };

          if (await insertLead(lead)) {
            leads.push(lead);
            pageLeads++;
            console.log(`    ✓ ${fullName} (${phone})`);
          }

          await chromeTool('wait 1500');
        } catch (e) {
          console.log(`    ✗ Profile parse error`);
        }
      }

      if (pageLeads < 8) {
        yieldDropCount++;
        if (yieldDropCount >= 2) {
          console.log(`  ✓ Low yield, moving on`);
          break;
        }
      } else {
        yieldDropCount = 0;
      }

      page++;
      if (page > 6) {
        console.log(`  ✓ Reached max pages (6)`);
        break;
      }
    } catch (e: any) {
      console.log(`  ✗ Page parse error: ${e.message}`);
      break;
    }
  }

  console.log(`  📊 realtor.ca ${city}: +${leads.length} leads`);
  return leads;
}

async function main() {
  console.log('='.repeat(70));
  console.log('🔥 JEFF CALLING LEAD SESSION — 1,000 LEADS TARGET');
  console.log('='.repeat(70));

  const stateFile = 'agents/state/jeff-state.json';
  let state: StateFile = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));

  let totalInserted = 0;
  const batchSize = 10;
  let batchCount = 0;

  // Scrape config: alternate sources to avoid detection
  const config: Array<{ source: string; city: string; state: string; province?: string; timezone: string }> = [
    // realtor.com
    { source: 'realtor', city: 'Houston', state: 'TX', timezone: 'CST' },
    { source: 'realtor', city: 'Dallas', state: 'TX', timezone: 'CST' },
    { source: 'realtor', city: 'Austin', state: 'TX', timezone: 'CST' },
    { source: 'realtor', city: 'Atlanta', state: 'GA', timezone: 'EST' },

    // zillow.com
    { source: 'zillow', city: 'Chicago', state: 'IL', timezone: 'CST' },
    { source: 'zillow', city: 'Phoenix', state: 'AZ', timezone: 'MST' },

    // realtor.com again
    { source: 'realtor', city: 'Miami', state: 'FL', timezone: 'EST' },
    { source: 'realtor', city: 'Phoenix', state: 'AZ', timezone: 'MST' },

    // zillow.com again
    { source: 'zillow', city: 'Los Angeles', state: 'CA', timezone: 'PST' },

    // realtor.ca
    { source: 'realtor_ca', city: 'Toronto', province: 'ontario', timezone: 'EST' },
  ];

  for (const cfg of config) {
    if (totalInserted >= 1000) {
      console.log(`\n✅ TARGET REACHED: ${totalInserted} leads`);
      break;
    }

    try {
      let leadsBatch: Lead[] = [];

      if (cfg.source === 'realtor') {
        leadsBatch = await scrapeRealtorCom(cfg.city, cfg.state!, getTimezone(cfg.state!));
      } else if (cfg.source === 'zillow') {
        leadsBatch = await scrapeZillow(cfg.city, cfg.state!, getTimezone(cfg.state!));
      } else if (cfg.source === 'realtor_ca') {
        leadsBatch = await scrapeRealtorCA(cfg.city, cfg.province!, 'EST');
      }

      totalInserted += leadsBatch.length;
      batchCount++;

      // Update state every batch
      state.session_calling_total = totalInserted;
      state.last_run = new Date().toISOString();
      state.status_note = `Running: ${cfg.source} - ${cfg.city}. Total: ${totalInserted}/1000`;
      fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));

      console.log(`\n📈 SESSION TOTAL: ${totalInserted}/1000 (batches: ${batchCount})`);

      if (totalInserted >= 1000) break;

      // Anti-detection pause between sources
      await chromeTool('wait 3000');
    } catch (e: any) {
      console.error(`❌ Source error: ${e.message}`);
      continue;
    }
  }

  // Final update
  state.session_calling_total = totalInserted;
  state.last_run = new Date().toISOString();
  state.status_note = totalInserted >= 1000
    ? `✅ COMPLETE. ${totalInserted} calling leads inserted.`
    : `⏹ INCOMPLETE. ${totalInserted}/1000 leads. ${1000 - totalInserted} remaining.`;

  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));

  console.log('\n' + '='.repeat(70));
  console.log(`SESSION COMPLETE`);
  console.log(`📊 Total Inserted: ${totalInserted}`);
  console.log(`📋 Status: ${state.status_note}`);
  console.log('='.repeat(70));
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
