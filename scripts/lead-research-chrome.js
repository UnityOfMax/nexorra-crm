#!/usr/bin/env node
/**
 * Lead Deep Research — Chrome Edition
 * Uses real Chrome (via chrome-tool.js) to research each lead across:
 *   Google → find LinkedIn, Instagram, Facebook, Twitter, website, YouTube
 *   LinkedIn → bio, specialties, years of experience, education
 *   Instagram → bio, interests, content themes
 *   Brokerage profile_url → bio, specialties, testimonials
 *   Personal website → bio, awards, interests
 *
 * Results stored in leads.personal_research (JSONB) + research_status = 'completed'
 *
 * Usage: set -a && source .env.local && set +a && node scripts/lead-research-chrome.js [--batch N]
 */

const { execFileSync } = require('child_process');
const fs = require('fs');

// Load env
const envFile = fs.readFileSync('/home/max/crm/.env.local', 'utf8');
envFile.split('\n').forEach(line => {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
});

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CHROME_TOOL = '/home/max/crm/scripts/chrome-tool.js';

const BATCH_SIZE = parseInt(process.argv[process.argv.indexOf('--batch') + 1] || '30');
const DELAY_BETWEEN_LEADS = 3000;
const NAV_TIMEOUT = 20000;

// ── Chrome Tool Helpers ───────────────────────────────────────────────────

function chromeTool(args, timeout = NAV_TIMEOUT) {
  try {
    const result = execFileSync('node', [CHROME_TOOL, ...args], {
      encoding: 'utf8',
      timeout,
      cwd: '/home/max/crm',
    });
    return result.trim();
  } catch (e) {
    return '';
  }
}

function chromeNav(url) {
  try {
    const raw = chromeTool(['navigate', url], 30000);
    // chrome-tool prepends "Navigating to: ...\n" before the JSON
    const jsonStart = raw.indexOf('{');
    if (jsonStart < 0) return false;
    const r = JSON.parse(raw.slice(jsonStart));
    return r.success && !r.blocked;
  } catch { return false; }
}

function chromeText(selector = 'body') {
  const out = chromeTool(['text', selector], 15000);
  return out || '';
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Supabase Helpers ──────────────────────────────────────────────────────

async function supabaseFetch(path, method = 'GET', body = null) {
  const opts = {
    method,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, opts);
  if (method === 'GET') return await res.json();
  return res.status;
}

// ── Text Parsing Helpers ──────────────────────────────────────────────────

function extractSocialUrls(text) {
  const links = { linkedin: null, instagram: null, facebook: null, twitter: null, youtube: null, website: null };

  // Match both full URLs and Google-style citations (linkedin.com › john-doe)
  const urlRegex = /https?:\/\/[^\s"'<>]+/g;
  const citationRegex = /(?:^|\s)((?:www\.)?(?:linkedin|instagram|facebook|twitter|x|youtube)\.com[^\s"'<>›]+)/gm;

  const urls = text.match(urlRegex) || [];

  // Also extract from Google citation lines like "linkedin.com › in › john-doe"
  let citationMatch;
  while ((citationMatch = citationRegex.exec(text)) !== null) {
    const raw = citationMatch[1].replace(/›/g, '/').replace(/\/+/g, '/').trim();
    if (!raw.startsWith('http')) urls.push('https://' + raw);
  }

  for (const url of urls) {
    if (!links.linkedin && url.includes('linkedin.com/in/')) links.linkedin = url.split('?')[0].replace(/\/$/, '');
    if (!links.instagram && url.includes('instagram.com/') && !url.includes('/p/') && !url.includes('/reel/')) {
      const handle = url.match(/instagram\.com\/([^/?#\s›]+)/)?.[1];
      if (handle && handle.length > 1 && !['explore', 'p', 'reel', 'stories', 'accounts'].includes(handle)) links.instagram = handle;
    }
    if (!links.facebook && url.includes('facebook.com/') && !url.includes('/sharer')) links.facebook = url.split('?')[0].replace(/\/$/, '');
    if (!links.twitter && (url.includes('twitter.com/') || url.includes('x.com/')) && !url.includes('/status/')) links.twitter = url.split('?')[0].replace(/\/$/, '');
    if (!links.youtube && url.includes('youtube.com/')) links.youtube = url.split('?')[0].replace(/\/$/, '');
  }

  return links;
}

function extractBioInfo(text) {
  const info = { bio_excerpt: null, specialties: [], awards: [], years_experience: null, hobbies: [], family: null, pets: null };
  if (!text || text.length < 20) return info;

  // Specialties
  const specMatch = text.match(/specialt(?:y|ies)[:\s]+([^\n.]{10,120})/i);
  if (specMatch) info.specialties = specMatch[1].split(/[,;]/).map(s => s.trim()).filter(s => s.length > 2).slice(0, 5);

  // Years of experience
  const yrMatch = text.match(/(\d+)\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:experience|in\s+real\s+estate)/i);
  if (yrMatch) info.years_experience = parseInt(yrMatch[1]);

  // Awards
  const awardMatch = text.match(/(top\s+\d+%?|president'?s?\s+circle|diamond|platinum|award|recognized|million\s+dollar)[^\n.]{0,80}/gi);
  if (awardMatch) info.awards = awardMatch.slice(0, 3).map(s => s.trim());

  // Family
  const famMatch = text.match(/(?:married|husband|wife|spouse|children?|kids?|son|daughter|parent|family)[^\n.]{0,60}/i);
  if (famMatch) info.family = famMatch[0].trim().replace(/^[^a-zA-Z]+/, '').slice(0, 100);

  // Pets
  const petMatch = text.match(/\b(?:dog|cat|puppy|kitten|pet lover)[^\n.]{0,50}/i);
  if (petMatch) info.pets = petMatch[0].trim().slice(0, 60);

  // Hobbies
  const hobbyKeywords = ['golf', 'tennis', 'hiking', 'cycling', 'travel', 'cooking', 'running', 'yoga', 'fitness', 'photography', 'music', 'reading', 'fishing', 'skiing', 'swimming', 'volunteering', 'charity'];
  info.hobbies = hobbyKeywords.filter(h => new RegExp(h, 'i').test(text)).slice(0, 5);

  // Bio excerpt — first meaningful paragraph, skip navigation/UI noise
  const noisePattern = /cookie|privacy|terms|copyright|skip to|accessibility|sign in|filters|all images|no results found|did you mean|showing results for|search instead/i;
  const paras = text.split(/\n{2,}|\r\n\r\n/).map(p => p.trim()).filter(p => p.length > 60 && !noisePattern.test(p) && p.split(' ').length > 8);
  if (paras.length > 0) info.bio_excerpt = paras[0].slice(0, 220).replace(/\s+/g, ' ');

  return info;
}

// ── Research Functions ────────────────────────────────────────────────────

async function researchGoogleSearch(lead) {
  const { first_name, last_name, source_brokerage, city, state_province } = lead;
  const query = `"${first_name} ${last_name}" "${city}" real estate agent ${source_brokerage}`;
  const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;

  console.log(`    Google: ${query}`);
  const ok = chromeNav(googleUrl);
  if (!ok) return null;
  await sleep(2000);

  const text = chromeText('body');
  return text;
}

async function researchLinkedIn(url) {
  if (!url) return null;
  console.log(`    LinkedIn: ${url}`);
  const ok = chromeNav(url);
  if (!ok) return null;
  await sleep(3000);
  const text = chromeText('main, #main-content, .pv-profile-section, body');
  return text.slice(0, 3000); // Cap at 3KB
}

async function researchInstagram(handle) {
  if (!handle) return null;
  const url = `https://www.instagram.com/${handle}/`;
  console.log(`    Instagram: @${handle}`);
  const ok = chromeNav(url);
  if (!ok) return null;
  await sleep(3000);
  const text = chromeText('body');
  return text.slice(0, 1500);
}

async function researchBrokerageProfile(profileUrl) {
  if (!profileUrl) return null;
  console.log(`    Profile: ${profileUrl.slice(0, 60)}...`);
  const ok = chromeNav(profileUrl);
  if (!ok) return null;
  await sleep(2500);
  const text = chromeText('main, .agent-bio, .profile-bio, [class*="bio"], [class*="about"], body');
  return text.slice(0, 2000);
}

async function researchWebsite(url) {
  if (!url) return null;
  console.log(`    Website: ${url}`);
  const ok = chromeNav(url);
  if (!ok) return null;
  await sleep(2500);
  const text = chromeText('main, .about, [class*="bio"], body');
  return text.slice(0, 2000);
}

// ── Main Research Orchestrator ────────────────────────────────────────────

async function researchLead(lead) {
  const research = {
    linkedin_url: null,
    instagram_handle: lead.instagram_handle || null,
    facebook_url: null,
    twitter_url: null,
    youtube_url: null,
    website: null,
    bio_excerpt: null,
    specialties: [],
    years_experience: null,
    awards: [],
    hobbies: [],
    family: null,
    pets: null,
    sources_checked: [],
  };

  const allText = [];

  // Step 1: Visit brokerage profile (fastest, always available if we have URL)
  if (lead.profile_url) {
    const profileText = await researchBrokerageProfile(lead.profile_url);
    if (profileText && profileText.length > 100) {
      allText.push(profileText);
      research.sources_checked.push('brokerage_profile');
      // Extract social links from profile page
      const links = extractSocialUrls(profileText);
      if (links.instagram && !research.instagram_handle) research.instagram_handle = links.instagram;
      if (links.linkedin) research.linkedin_url = links.linkedin;
      if (links.facebook) research.facebook_url = links.facebook;
      if (links.twitter) research.twitter_url = links.twitter;
      if (links.website) research.website = links.website;
    }
    await sleep(2000);
  }

  // Step 2: Google search for additional social profiles
  const googleText = await researchGoogleSearch(lead);
  if (googleText && googleText.length > 100) {
    allText.push(googleText);
    research.sources_checked.push('google');
    const links = extractSocialUrls(googleText);
    if (!research.linkedin_url && links.linkedin) research.linkedin_url = links.linkedin;
    if (!research.instagram_handle && links.instagram) research.instagram_handle = links.instagram;
    if (!research.facebook_url && links.facebook) research.facebook_url = links.facebook;
    if (!research.twitter_url && links.twitter) research.twitter_url = links.twitter;
    if (!research.youtube_url && links.youtube) research.youtube_url = links.youtube;
    // Extract personal website — only accept if domain contains part of agent's name
    // This avoids noise from Google result snippets (arxiv, government sites, etc.)
    const firstName = (lead.first_name || '').toLowerCase().replace(/[^a-z]/g, '');
    const lastName = (lead.last_name || '').toLowerCase().replace(/[^a-z]/g, '');
    const skipDomains = /google|kw\.com|coldwellbanker|bhhs|exprealty|sothebysrealty|compass\.com|realtor|zillow|trulia|redfin|homes|facebook|instagram|linkedin|twitter|youtube|nestfully|movoto|apartments|rent\.|yelp|bbb\.|angieslist|yellowpages|whitepages|radaris|spokeo|peoplefinder|intelius|arxiv|wikipedia|gov\b|marxists|academia|springer|jstor|blob\.core/i;
    const urlRegex = /https?:\/\/[^\s"'<>]+/g;
    const allFoundUrls = googleText.match(urlRegex) || [];
    for (const url of allFoundUrls) {
      if (skipDomains.test(url)) continue;
      const domain = url.match(/https?:\/\/(?:www\.)?([^/\s]+)/)?.[1]?.toLowerCase() || '';
      // Only accept if domain plausibly belongs to this agent
      if ((firstName.length > 2 && domain.includes(firstName)) ||
          (lastName.length > 3 && domain.includes(lastName)) ||
          domain.match(/^[a-z]+-[a-z]+-realt(or|y)|agent|homes|realty|properties|group/) ) {
        if (!research.website) { research.website = url.split('?')[0]; break; }
      }
    }
  }
  await sleep(2000);

  // Step 3: LinkedIn (if found)
  if (research.linkedin_url) {
    const liText = await researchLinkedIn(research.linkedin_url);
    if (liText && liText.length > 100) {
      allText.push(liText);
      research.sources_checked.push('linkedin');
    }
    await sleep(2000);
  }

  // Step 4: Instagram (if found)
  if (research.instagram_handle) {
    const igText = await researchInstagram(research.instagram_handle);
    if (igText && igText.length > 100) {
      allText.push(igText);
      research.sources_checked.push('instagram');
    }
    await sleep(2000);
  }

  // Step 5: Personal website (if found and different from brokerage site)
  if (research.website && !research.sources_checked.includes('brokerage_profile')) {
    const webText = await researchWebsite(research.website);
    if (webText && webText.length > 100) {
      allText.push(webText);
      research.sources_checked.push('website');
    }
    await sleep(1500);
  }

  // Extract bio info from all collected text
  const combinedText = allText.join('\n\n');
  const bioInfo = extractBioInfo(combinedText);
  research.bio_excerpt = bioInfo.bio_excerpt;
  research.specialties = bioInfo.specialties;
  research.years_experience = bioInfo.years_experience;
  research.awards = bioInfo.awards;
  research.hobbies = bioInfo.hobbies;
  if (!research.family) research.family = bioInfo.family;
  if (!research.pets) research.pets = bioInfo.pets;

  return research;
}

// ── Main ─────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const resetFailed = args.includes('--reset-failed');
  const statusFilter = resetFailed ? ['pending', 'failed'] : ['pending'];

  console.log(`=== Lead Research (Chrome) — batch ${BATCH_SIZE} ===`);
  console.log(`Researching leads with status: ${statusFilter.join(' or ')}`);

  // Check Chrome
  const statusOut = chromeTool(['status'], 5000);
  let connected = false;
  try { const j = statusOut.slice(statusOut.indexOf('{')); connected = JSON.parse(j).connected; } catch {}
  if (!connected) {
    console.error('Chrome not connected. Launch with: google-chrome --remote-debugging-port=9222');
    process.exit(1);
  }

  // Fetch pending leads
  const statusQuery = statusFilter.map(s => `research_status.eq.${s}`).join(',');
  const leads = await supabaseFetch(
    `leads?select=id,first_name,last_name,full_name,city,state_province,source_brokerage,email,profile_url,instagram_handle&or=(${statusQuery})&order=scraped_at.asc&limit=${BATCH_SIZE}`
  );

  if (!leads || leads.length === 0) {
    console.log('No leads to research. Done.');
    return;
  }

  console.log(`Found ${leads.length} leads to research\n`);
  let completed = 0;
  let failed = 0;

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    const label = `${lead.first_name} ${lead.last_name} (${lead.city}, ${lead.source_brokerage})`;
    console.log(`\n[${i + 1}/${leads.length}] ${label}`);

    // Mark in_progress
    await supabaseFetch(`leads?id=eq.${lead.id}`, 'PATCH', { research_status: 'in_progress' });

    try {
      const research = await researchLead(lead);

      // Log what we found
      const found = [];
      if (research.linkedin_url) found.push('LinkedIn');
      if (research.instagram_handle) found.push('Instagram');
      if (research.facebook_url) found.push('Facebook');
      if (research.twitter_url) found.push('Twitter');
      if (research.youtube_url) found.push('YouTube');
      if (research.website) found.push('website');
      if (research.bio_excerpt) found.push('bio');
      if (research.hobbies.length) found.push(`hobbies(${research.hobbies.slice(0,2).join(',')})`);
      if (research.specialties.length) found.push('specialties');
      console.log(`  Found: ${found.length ? found.join(', ') : 'minimal'} (checked: ${research.sources_checked.join(', ')})`);

      await supabaseFetch(`leads?id=eq.${lead.id}`, 'PATCH', {
        personal_research: research,
        research_status: 'completed',
        research_completed_at: new Date().toISOString(),
      });
      completed++;
    } catch (err) {
      console.error(`  Error: ${err.message}`);
      await supabaseFetch(`leads?id=eq.${lead.id}`, 'PATCH', { research_status: 'failed' });
      failed++;
    }

    if (i < leads.length - 1) await sleep(DELAY_BETWEEN_LEADS);
  }

  console.log(`\n=== Done: ${completed} completed, ${failed} failed ===`);
  process.exit(0);
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
