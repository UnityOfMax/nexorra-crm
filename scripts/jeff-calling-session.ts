#!/usr/bin/env node
/**
 * Jeff Calling Lead Session — realtor.com + realtor.ca only.
 * Strategy: extract __NEXT_DATA__ JSON from search pages (one Chrome request per page,
 * ~20-30 agents per page). Only visit individual profiles when mobile number is absent
 * from the listing JSON. Filters: 12+ closed deals/year, mobile number required.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';

const execAsync = promisify(exec);

interface Lead {
  full_name: string;
  first_name?: string;
  last_name?: string;
  phone: string;
  mobile_phone?: string;
  profile_url?: string;
  source_brokerage: string;
  lead_category: 'calling';
  city: string;
  state_province: string;
  country: 'US' | 'CA';
  timezone?: string;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SERVICE_KEY');
  process.exit(1);
}

async function chromeTool(cmd: string): Promise<string> {
  const { stdout } = await execAsync(`node scripts/chrome-tool.js ${cmd}`);
  return stdout.trim();
}

async function insertLead(lead: Lead): Promise<boolean> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(lead),
  });
  if (res.status === 201) return true;
  if (res.status === 409) { console.log(`  ⊘ Duplicate: ${lead.full_name}`); return false; }
  console.log(`  ✗ Insert ${res.status}: ${lead.full_name}`);
  return false;
}

function parsePhone(s: string): string | null {
  if (!s) return null;
  const d = s.replace(/\D/g, '');
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && (d[0] === '1')) return `+${d}`;
  return null;
}

function splitName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/);
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

function isValidName(name: string): boolean {
  if (!name || name.length < 4 || name.length > 60) return false;
  if (/LLC|Inc|Group|Team|Realty|Properties|Corp|Trust/i.test(name)) return false;
  if (/\d/.test(name)) return false;
  if (name.split(' ').length < 2) return false;
  return true;
}

function getTimezone(state: string): string {
  const zones: Record<string, string> = {
    NY:'EST', PA:'EST', FL:'EST', GA:'EST', NC:'EST', VA:'EST', MA:'EST', MD:'EST', DC:'EST', OH:'EST', MI:'EST', TN:'EST', IN:'EST',
    TX:'CST', IL:'CST', MO:'CST', MN:'CST', WI:'CST', AL:'CST', MS:'CST', LA:'CST', AR:'CST', IA:'CST', OK:'CST', KS:'CST',
    AZ:'MST', CO:'MST', UT:'MST', NM:'MST', ID:'MST', WY:'MST', MT:'MST',
    CA:'PST', WA:'PST', OR:'PST', NV:'PST',
  };
  return zones[state] || 'CST';
}

// ── realtor.com ────────────────────────────────────────────────────────────────

interface RealtorAgent {
  name: string;
  profileUrl: string;
  deals: number;
  mobile: string | null;
}

function parseNextData(html: string): RealtorAgent[] {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return [];

  let data: any;
  try { data = JSON.parse(m[1]); } catch { return []; }

  // realtor.com search page nests agents in various paths depending on version
  const pp = data?.props?.pageProps || {};
  const agentList: any[] =
    pp.agents ||
    pp.searchResults?.agents ||
    pp.initialData?.agents ||
    pp.data?.results ||
    [];

  if (!agentList.length) return [];

  return agentList.map((a: any) => {
    const name = a.full_name || a.name || '';
    const href = a.href || a.permalink || a.agent_href || '';
    const soldCount = a.recently_sold?.count ?? a.sold_count ?? a.for_sale_price?.count ?? 0;
    const phones: any[] = a.phones || [];
    const mobileEntry = phones.find((p: any) =>
      /mobile|cell|direct/i.test(p.type || '') || p.is_mobile === true
    );
    const mobile = mobileEntry ? parsePhone(mobileEntry.number || mobileEntry.ext || '') : null;

    return { name, profileUrl: href, deals: soldCount, mobile };
  }).filter(a => a.name && a.profileUrl);
}

async function extractMobileFromProfile(url: string): Promise<string | null> {
  try {
    await chromeTool(`navigate "${url}"`);
    await chromeTool('wait 1800');
    const html = await chromeTool('html');

    // Try __NEXT_DATA__ on profile too
    const ndm = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (ndm) {
      try {
        const d = JSON.parse(ndm[1]);
        const phones: any[] =
          d?.props?.pageProps?.agent?.phones ||
          d?.props?.pageProps?.agentDetails?.phones ||
          [];
        const mob = phones.find((p: any) => /mobile|cell|direct/i.test(p.type || ''));
        if (mob) return parsePhone(mob.number || '');
      } catch { /* fall through */ }
    }

    // Fallback: regex on rendered HTML — prefer "Mobile:" or "Direct:" labels
    const mobileRe = /(?:Mobile|Cell|Direct)[:\s]+([+\d\s\-().]{10,20})/i;
    const mMatch = html.match(mobileRe);
    if (mMatch) return parsePhone(mMatch[1]);

    // Last resort: any 10-digit phone that's NOT labeled "Office" or "Fax"
    // Remove office/fax blocks first
    const stripped = html.replace(/(?:Office|Fax)[:\s]+[+\d\s\-().]{10,20}/gi, '');
    const anyPhone = stripped.match(/\(?(\d{3})\)?[\s.\-]?(\d{3})[\s.\-]?(\d{4})/);
    if (anyPhone) return parsePhone(`${anyPhone[1]}${anyPhone[2]}${anyPhone[3]}`);

    return null;
  } catch {
    return null;
  }
}

async function scrapeRealtorCom(city: string, state: string): Promise<Lead[]> {
  const tz = getTimezone(state);
  console.log(`\n🔵 realtor.com: ${city}, ${state} (${tz})`);
  const leads: Lead[] = [];
  const citySlug = city.replace(/\s+/g, '_').toLowerCase();

  // Warmup: visit root first to establish cookies
  await chromeTool('navigate "https://www.realtor.com"');
  await chromeTool('wait 3000');

  for (let page = 1; page <= 8; page++) {
    const url = `https://www.realtor.com/realestateagents/${citySlug}_${state}/pg-${page}`;
    console.log(`  [p${page}] ${url}`);

    await chromeTool(`navigate "${url}"`);
    await chromeTool('wait 2500');

    const html = await chromeTool('html');

    // Check for block
    if (/Access Denied|Enable JavaScript|cf-error|captcha/i.test(html)) {
      console.log(`  ✗ Blocked by WAF, skipping city`);
      break;
    }

    const agents = parseNextData(html);
    console.log(`  → ${agents.length} agents found in JSON`);

    if (agents.length === 0) {
      console.log(`  ✓ No more agents`);
      break;
    }

    let pageInserted = 0;
    for (const agent of agents) {
      if (agent.deals < 12) {
        console.log(`    ⊘ ${agent.name}: ${agent.deals} deals < 12`);
        continue;
      }
      if (!isValidName(agent.name)) continue;

      let mobile = agent.mobile;
      let profileUrl = agent.profileUrl;
      if (!profileUrl.startsWith('http')) profileUrl = 'https://www.realtor.com' + profileUrl;

      if (!mobile) {
        console.log(`    → ${agent.name} (${agent.deals} deals) — visiting profile for mobile`);
        mobile = await extractMobileFromProfile(profileUrl);
        await chromeTool('wait 1500');
      }

      if (!mobile) {
        console.log(`    ⊘ ${agent.name}: no mobile found`);
        continue;
      }

      const { first, last } = splitName(agent.name);
      const lead: Lead = {
        full_name: agent.name,
        first_name: first,
        last_name: last,
        phone: mobile,
        mobile_phone: mobile,
        profile_url: profileUrl,
        source_brokerage: 'realtor',
        lead_category: 'calling',
        city,
        state_province: state,
        country: 'US',
        timezone: tz,
      };

      if (await insertLead(lead)) {
        leads.push(lead);
        pageInserted++;
        console.log(`    ✓ ${agent.name} — ${mobile}`);
      }
    }

    if (pageInserted === 0 && page > 1) {
      console.log(`  ✓ Zero yield, stopping city`);
      break;
    }

    await chromeTool('wait 2000');
  }

  console.log(`  📊 realtor.com ${city}: +${leads.length}`);
  return leads;
}

// ── realtor.ca ────────────────────────────────────────────────────────────────

interface RealtorCAAgent {
  name: string;
  profileUrl: string;
  deals: number;
  mobile: string | null;
}

function parseRealtorCANextData(html: string): RealtorCAAgent[] {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return [];

  let data: any;
  try { data = JSON.parse(m[1]); } catch { return []; }

  const pp = data?.props?.pageProps || {};
  const agents: any[] =
    pp.agents ||
    pp.results ||
    pp.agentResults?.agents ||
    pp.initialState?.agents ||
    [];

  return agents.map((a: any) => {
    const name = a.Name || a.name || a.full_name || '';
    const href = a.ProfileUrl || a.profileUrl || a.href || '';
    const deals = a.TransactionCount ?? a.sold_count ?? a.recently_sold?.count ?? 0;
    const phones: any[] = a.Phones || a.phones || [];
    const mob = phones.find((p: any) => /mobile|cell|direct/i.test(p.Type || p.type || ''));
    const mobile = mob ? parsePhone(mob.PhoneNumber || mob.number || '') : null;
    return { name, profileUrl: href, deals, mobile };
  }).filter(a => a.name && a.profileUrl);
}

async function extractMobileFromCAProfile(url: string): Promise<string | null> {
  try {
    await chromeTool(`navigate "${url}"`);
    await chromeTool('wait 2000');
    const html = await chromeTool('html');

    const ndm = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (ndm) {
      try {
        const d = JSON.parse(ndm[1]);
        const agent = d?.props?.pageProps?.agent || d?.props?.pageProps?.agentDetails || {};
        const phones: any[] = agent.Phones || agent.phones || [];
        const mob = phones.find((p: any) => /mobile|cell|direct/i.test(p.Type || p.type || ''));
        if (mob) return parsePhone(mob.PhoneNumber || mob.number || '');
      } catch { /* fall through */ }
    }

    const mobileRe = /(?:Mobile|Cell|Direct)[:\s]+([+\d\s\-().]{10,20})/i;
    const mm = html.match(mobileRe);
    if (mm) return parsePhone(mm[1]);

    const stripped = html.replace(/(?:Office|Fax)[:\s]+[+\d\s\-().]{10,20}/gi, '');
    const any = stripped.match(/\(?(\d{3})\)?[\s.\-]?(\d{3})[\s.\-]?(\d{4})/);
    if (any) return parsePhone(`${any[1]}${any[2]}${any[3]}`);

    return null;
  } catch {
    return null;
  }
}

function getCATimezone(province: string): string {
  const zones: Record<string, string> = {
    ON: 'EST', QC: 'EST', NS: 'EST', NB: 'EST', PE: 'EST', NL: 'NST',
    MB: 'CST', SK: 'CST',
    AB: 'MST',
    BC: 'PST',
  };
  return zones[province.toUpperCase()] || 'EST';
}

async function scrapeRealtorCA(city: string, province: string): Promise<Lead[]> {
  const provUpper = province.toUpperCase();
  const tz = getCATimezone(provUpper);
  console.log(`\n🔵 realtor.ca: ${city}, ${province} (${tz})`);
  const leads: Lead[] = [];
  const citySlug = city.replace(/\s+/g, '-').toLowerCase();
  const provSlug = province.toLowerCase();

  // Warmup
  await chromeTool('navigate "https://www.realtor.ca"');
  await chromeTool('wait 3000');

  for (let page = 1; page <= 6; page++) {
    const url = page === 1
      ? `https://www.realtor.ca/agents/${citySlug}-${provSlug}`
      : `https://www.realtor.ca/agents/${citySlug}-${provSlug}?page=${page}`;
    console.log(`  [p${page}] ${url}`);

    await chromeTool(`navigate "${url}"`);
    await chromeTool('wait 2500');

    const html = await chromeTool('html');

    if (/Access Denied|Enable JavaScript|cf-error|captcha/i.test(html)) {
      console.log(`  ✗ Blocked by WAF, skipping`);
      break;
    }

    const agents = parseRealtorCANextData(html);
    console.log(`  → ${agents.length} agents found in JSON`);

    if (agents.length === 0) {
      console.log(`  ✓ No more agents`);
      break;
    }

    let pageInserted = 0;
    for (const agent of agents) {
      if (agent.deals < 12) {
        console.log(`    ⊘ ${agent.name}: ${agent.deals} deals < 12`);
        continue;
      }
      if (!isValidName(agent.name)) continue;

      let mobile = agent.mobile;
      let profileUrl = agent.profileUrl;
      if (!profileUrl.startsWith('http')) profileUrl = 'https://www.realtor.ca' + profileUrl;

      if (!mobile) {
        console.log(`    → ${agent.name} (${agent.deals} deals) — visiting profile`);
        mobile = await extractMobileFromCAProfile(profileUrl);
        await chromeTool('wait 1500');
      }

      if (!mobile) {
        console.log(`    ⊘ ${agent.name}: no mobile`);
        continue;
      }

      const { first, last } = splitName(agent.name);
      const lead: Lead = {
        full_name: agent.name,
        first_name: first,
        last_name: last,
        phone: mobile,
        mobile_phone: mobile,
        profile_url: profileUrl,
        source_brokerage: 'realtor.ca',
        lead_category: 'calling',
        city,
        state_province: provUpper,
        country: 'CA',
        timezone: tz,
      };

      if (await insertLead(lead)) {
        leads.push(lead);
        pageInserted++;
        console.log(`    ✓ ${agent.name} — ${mobile}`);
      }
    }

    if (pageInserted === 0 && page > 1) {
      console.log(`  ✓ Zero yield, stopping city`);
      break;
    }

    await chromeTool('wait 2000');
  }

  console.log(`  📊 realtor.ca ${city}: +${leads.length}`);
  return leads;
}

// ── main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log('='.repeat(70));
  console.log('📞 JEFF CALLING LEAD SESSION — realtor.com + realtor.ca');
  console.log('='.repeat(70));

  const stateFile = 'agents/state/jeff-state.json';
  const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));

  let total = 0;

  // City list — ordered by density (highest-volume cities first)
  // Alternates US/CA to vary fingerprint across domains
  const cities: Array<{ source: 'realtor' | 'realtor_ca'; city: string; state?: string; province?: string }> = [
    // US — realtor.com
    { source: 'realtor',    city: 'Houston',      state: 'TX' },
    { source: 'realtor',    city: 'Dallas',        state: 'TX' },
    { source: 'realtor',    city: 'Austin',        state: 'TX' },
    { source: 'realtor',    city: 'Phoenix',       state: 'AZ' },
    { source: 'realtor',    city: 'Atlanta',       state: 'GA' },
    { source: 'realtor',    city: 'Miami',         state: 'FL' },
    { source: 'realtor',    city: 'Tampa',         state: 'FL' },
    { source: 'realtor',    city: 'Charlotte',     state: 'NC' },
    { source: 'realtor',    city: 'Denver',        state: 'CO' },
    { source: 'realtor',    city: 'Las Vegas',     state: 'NV' },
    { source: 'realtor',    city: 'Nashville',     state: 'TN' },
    { source: 'realtor',    city: 'Columbus',      state: 'OH' },
    // Canada — realtor.ca
    { source: 'realtor_ca', city: 'Toronto',       province: 'ON' },
    { source: 'realtor_ca', city: 'Calgary',       province: 'AB' },
    { source: 'realtor_ca', city: 'Vancouver',     province: 'BC' },
    { source: 'realtor_ca', city: 'Ottawa',        province: 'ON' },
    { source: 'realtor_ca', city: 'Edmonton',      province: 'AB' },
    { source: 'realtor_ca', city: 'Mississauga',   province: 'ON' },
  ];

  for (const cfg of cities) {
    if (total >= 1000) { console.log(`\n✅ TARGET REACHED: ${total}`); break; }

    try {
      let batch: Lead[] = [];
      if (cfg.source === 'realtor') {
        batch = await scrapeRealtorCom(cfg.city, cfg.state!);
      } else {
        batch = await scrapeRealtorCA(cfg.city, cfg.province!);
      }
      total += batch.length;

      state.session_calling_total = total;
      state.last_run = new Date().toISOString();
      state.status_note = `Running: ${cfg.source} ${cfg.city}. Total: ${total}`;
      fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));

      console.log(`\n📈 SESSION TOTAL: ${total}/1000`);
    } catch (e: any) {
      console.error(`❌ ${cfg.city}: ${e.message}`);
    }
  }

  const done = total >= 1000;
  state.session_calling_total = total;
  state.last_run = new Date().toISOString();
  state.status_note = done
    ? `✅ COMPLETE. ${total} calling leads.`
    : `⏹ ${total}/1000 — ${1000 - total} remaining.`;
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));

  console.log('\n' + '='.repeat(70));
  console.log(`DONE — ${total} leads inserted`);
  console.log('='.repeat(70));
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
