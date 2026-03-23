#!/usr/bin/env node

/**
 * Lead Deep Research Script
 * Researches real estate agent leads to find personal information
 * for personalized cold emails.
 *
 * Usage: set -a && source .env.local && set +a && npx tsx scripts/lead-research.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(__dirname, "../.env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("[FATAL] Missing SUPABASE_URL or SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const SEARCH_DELAY_MS = 3000;
const LEAD_DELAY_MS = 5000;
const FETCH_TIMEOUT_MS = 10000;
const BATCH_SIZE = 20;

// --- Types ---

interface PersonalResearch {
  linkedin_url: string | null;
  social_media: {
    instagram: string | null;
    facebook: string | null;
    twitter: string | null;
  };
  birthday: string | null;
  family: string | null;
  pets: string | null;
  schools: string[];
  hobbies: string[];
  website: string | null;
  bio_excerpt: string | null;
  raw_sources: string[];
}

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  city: string;
  state_province: string;
  source_brokerage: string;
  email: string;
}

// --- Helpers ---

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function timestamp(): string {
  return new Date().toISOString().replace("T", " ").substring(0, 19);
}

function log(msg: string): void {
  console.log(`[${timestamp()}] ${msg}`);
}

function logError(msg: string): void {
  console.error(`[${timestamp()}] [ERROR] ${msg}`);
}

/**
 * Fetch a URL with timeout and error handling.
 * Returns null on failure.
 */
async function safeFetch(
  url: string,
  options?: RequestInit
): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const resp = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        ...(options?.headers || {}),
      },
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      // Don't log the URL since it may contain PII-derived query strings
      log(`Fetch returned ${resp.status}, skipping`);
      return null;
    }

    const text = await resp.text();
    return text;
  } catch (err: any) {
    clearTimeout(timeout);
    if (err.name === "AbortError") {
      log("Fetch timed out, skipping");
    } else {
      log(`Fetch error: ${err.message || "unknown"}`);
    }
    return null;
  }
}

/**
 * Search DuckDuckGo HTML and return an array of result URLs.
 */
async function searchDuckDuckGo(query: string): Promise<string[]> {
  const encoded = encodeURIComponent(query);
  const url = `https://html.duckduckgo.com/html/?q=${encoded}`;

  const html = await safeFetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  if (!html) return [];

  // Extract result URLs from DuckDuckGo HTML results
  // DDG HTML wraps results in <a class="result__a" href="...">
  const urls: string[] = [];
  const linkRegex = /class="result__a"\s+href="([^"]+)"/g;
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    let href = match[1];
    // DDG sometimes wraps URLs in a redirect
    if (href.includes("uddg=")) {
      const uddg = new URL(href, "https://duckduckgo.com").searchParams.get(
        "uddg"
      );
      if (uddg) href = uddg;
    }
    // Only keep http(s) URLs
    if (href.startsWith("http")) {
      urls.push(href);
    }
  }

  // Fallback: try generic href extraction if the class-based one found nothing
  if (urls.length === 0) {
    const genericRegex = /href="(https?:\/\/[^"]+)"/g;
    while ((match = genericRegex.exec(html)) !== null) {
      const href = match[1];
      // Skip DDG internal links
      if (
        !href.includes("duckduckgo.com") &&
        !href.includes("duck.co")
      ) {
        urls.push(href);
      }
    }
  }

  return urls.slice(0, 10); // Cap at 10 results per query
}

/**
 * Strip HTML tags and collapse whitespace. Basic regex-based extraction.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Fetch a page and extract its text content (capped at 5000 chars).
 */
async function fetchPageText(url: string): Promise<string | null> {
  const html = await safeFetch(url);
  if (!html) return null;

  const text = stripHtml(html);
  return text.substring(0, 5000);
}

/**
 * Classify a URL into a category.
 */
function classifyUrl(
  url: string
): "linkedin" | "instagram" | "facebook" | "twitter" | "website" | "other" {
  const lower = url.toLowerCase();
  if (lower.includes("linkedin.com/in/")) return "linkedin";
  if (lower.includes("instagram.com/")) return "instagram";
  if (lower.includes("facebook.com/")) return "facebook";
  if (lower.includes("twitter.com/") || lower.includes("x.com/"))
    return "twitter";
  // Skip generic aggregator/directory sites
  if (
    lower.includes("zillow.com") ||
    lower.includes("realtor.com") ||
    lower.includes("yelp.com") ||
    lower.includes("bbb.org") ||
    lower.includes("yellowpages.com") ||
    lower.includes("whitepages.com")
  ) {
    return "other";
  }
  return "website";
}

/**
 * Extract a social media handle from a URL.
 */
function extractHandle(url: string, platform: string): string | null {
  try {
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    if (pathParts.length > 0) {
      const handle = pathParts[0].replace(/[?#].*$/, "");
      // Skip generic pages
      if (
        ["about", "help", "explore", "login", "signup", "p", "reel"].includes(
          handle.toLowerCase()
        )
      ) {
        return null;
      }
      return platform === "instagram" || platform === "twitter"
        ? `@${handle}`
        : url;
    }
  } catch {
    // ignore
  }
  return null;
}

// --- Extraction patterns ---

const BIRTHDAY_PATTERNS = [
  /(?:birthday|born|birth date|dob)[:\s]*([A-Z][a-z]+ \d{1,2})/i,
  /(?:birthday|born)[:\s]*(\d{1,2}\/\d{1,2})/i,
  /(?:born on|celebrates?.+birthday on)\s+([A-Z][a-z]+ \d{1,2})/i,
];

const FAMILY_PATTERNS = [
  /(?:married|husband|wife|spouse|partner)[^.]{0,80}/i,
  /(?:mother|father|parent) of (\d+|two|three|four|five) (?:kids|children|sons|daughters)[^.]{0,40}/i,
  /(?:family|kids|children|son|daughter)[^.]{0,80}/i,
];

const PET_PATTERNS = [
  /(?:dog|cat|pet|puppy|kitten|golden retriever|labrador|poodle|german shepherd)(?:s)?\s+(?:named|called)\s+(\w+)/i,
  /(?:proud |loving )?(?:dog|cat|pet) (?:owner|parent|lover|mom|dad)[^.]{0,60}/i,
  /(?:has|have|own|loves?) (?:a |an )?(?:\w+ )?(?:dog|cat|puppy|kitten|pet)[^.]{0,60}/i,
];

const SCHOOL_PATTERNS = [
  /(?:university|college|school|institute|academy) of [A-Z][^,.\n]{3,50}/gi,
  /(?:graduated|alumni|alumna|alumnus|studied|degree) (?:from |at )?([A-Z][^,.\n]{3,60})/gi,
  /[A-Z][a-zA-Z\s]+ (?:University|College|Institute|School of [A-Z][a-z]+)/g,
];

const HOBBY_KEYWORDS = [
  "golf",
  "tennis",
  "hiking",
  "cycling",
  "running",
  "yoga",
  "photography",
  "cooking",
  "gardening",
  "fishing",
  "skiing",
  "snowboarding",
  "surfing",
  "sailing",
  "volunteering",
  "painting",
  "music",
  "travel",
  "reading",
  "wine",
  "marathon",
  "triathlon",
  "CrossFit",
  "pilates",
  "camping",
  "hunting",
  "horseback riding",
  "scuba diving",
  "rock climbing",
  "kayaking",
  "paddleboarding",
];

/**
 * Extract structured personal data from collected text and URLs.
 */
function extractPersonalData(
  texts: string[],
  urls: string[],
  leadName: string
): PersonalResearch {
  const allText = texts.join(" ");
  const lowerText = allText.toLowerCase();

  // LinkedIn URL
  let linkedin_url: string | null = null;
  for (const url of urls) {
    if (classifyUrl(url) === "linkedin") {
      linkedin_url = url;
      break;
    }
  }

  // Social media
  const social_media: PersonalResearch["social_media"] = {
    instagram: null,
    facebook: null,
    twitter: null,
  };
  for (const url of urls) {
    const type = classifyUrl(url);
    if (type === "instagram" && !social_media.instagram) {
      social_media.instagram = extractHandle(url, "instagram");
    }
    if (type === "facebook" && !social_media.facebook) {
      social_media.facebook = extractHandle(url, "facebook");
    }
    if (type === "twitter" && !social_media.twitter) {
      social_media.twitter = extractHandle(url, "twitter");
    }
  }

  // Birthday
  let birthday: string | null = null;
  for (const pattern of BIRTHDAY_PATTERNS) {
    const m = allText.match(pattern);
    if (m) {
      birthday = m[1] || m[0];
      break;
    }
  }

  // Family
  let family: string | null = null;
  for (const pattern of FAMILY_PATTERNS) {
    const m = allText.match(pattern);
    if (m) {
      family = m[0].trim().substring(0, 120);
      break;
    }
  }

  // Pets
  let pets: string | null = null;
  for (const pattern of PET_PATTERNS) {
    const m = allText.match(pattern);
    if (m) {
      pets = m[0].trim().substring(0, 120);
      break;
    }
  }

  // Schools
  const schoolSet = new Set<string>();
  for (const pattern of SCHOOL_PATTERNS) {
    let m;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((m = regex.exec(allText)) !== null) {
      const school = (m[1] || m[0]).trim();
      if (school.length > 5 && school.length < 80) {
        schoolSet.add(school);
      }
    }
  }
  const schools = Array.from(schoolSet).slice(0, 5);

  // Hobbies
  const hobbies: string[] = [];
  for (const hobby of HOBBY_KEYWORDS) {
    if (lowerText.includes(hobby.toLowerCase())) {
      hobbies.push(hobby);
    }
  }

  // Website (personal/brokerage site, not social)
  let website: string | null = null;
  for (const url of urls) {
    const type = classifyUrl(url);
    if (type === "website") {
      website = url;
      break;
    }
  }

  // Bio excerpt — look for text that mentions the lead's name
  let bio_excerpt: string | null = null;
  const nameLower = leadName.toLowerCase();
  for (const text of texts) {
    const idx = text.toLowerCase().indexOf(nameLower);
    if (idx !== -1) {
      // Grab surrounding context
      const start = Math.max(0, idx - 20);
      const end = Math.min(text.length, idx + 200);
      let excerpt = text.substring(start, end).trim();
      // Try to start at a sentence boundary
      const sentenceStart = excerpt.indexOf(". ");
      if (sentenceStart !== -1 && sentenceStart < 30) {
        excerpt = excerpt.substring(sentenceStart + 2);
      }
      bio_excerpt = excerpt.substring(0, 200);
      break;
    }
  }

  return {
    linkedin_url,
    social_media,
    birthday,
    family,
    pets,
    schools,
    hobbies: hobbies.slice(0, 8),
    website,
    bio_excerpt,
    raw_sources: urls.filter(
      (u) => classifyUrl(u) !== "other"
    ).slice(0, 10),
  };
}

// --- Main research function for a single lead ---

async function researchLead(lead: Lead): Promise<PersonalResearch> {
  const { first_name, last_name, source_brokerage, city, state_province } =
    lead;
  const location = [city, state_province].filter(Boolean).join(", ");

  // Build search queries
  const queries = [
    `"${first_name} ${last_name}" ${source_brokerage} ${location} site:linkedin.com`,
    `"${first_name} ${last_name}" ${source_brokerage} ${location} real estate`,
    `"${first_name} ${last_name}" ${location} instagram OR facebook`,
  ];

  const allUrls: string[] = [];
  const allTexts: string[] = [];
  const fetchedUrls = new Set<string>();

  // Execute searches
  for (let i = 0; i < queries.length; i++) {
    log(`  Search ${i + 1}/${queries.length}`);
    const urls = await searchDuckDuckGo(queries[i]);
    log(`  Found ${urls.length} URLs`);

    for (const url of urls) {
      if (!fetchedUrls.has(url)) {
        allUrls.push(url);
        fetchedUrls.add(url);
      }
    }

    if (i < queries.length - 1) {
      await sleep(SEARCH_DELAY_MS);
    }
  }

  // Fetch top relevant pages (LinkedIn, social, personal sites)
  const pagesToFetch = allUrls
    .filter((u) => classifyUrl(u) !== "other")
    .slice(0, 6);

  for (const url of pagesToFetch) {
    log(`  Fetching page (${classifyUrl(url)})`);
    const text = await fetchPageText(url);
    if (text) {
      allTexts.push(text);
    }
    await sleep(SEARCH_DELAY_MS);
  }

  const research = extractPersonalData(allTexts, allUrls, lead.full_name);

  // Summary of what we found
  const foundItems: string[] = [];
  if (research.linkedin_url) foundItems.push("LinkedIn");
  if (research.social_media.instagram) foundItems.push("Instagram");
  if (research.social_media.facebook) foundItems.push("Facebook");
  if (research.website) foundItems.push("website");
  if (research.schools.length > 0) foundItems.push("schools");
  if (research.hobbies.length > 0) foundItems.push("hobbies");
  if (research.birthday) foundItems.push("birthday");
  if (research.family) foundItems.push("family");
  if (research.pets) foundItems.push("pets");
  if (research.bio_excerpt) foundItems.push("bio");

  log(`  Found: ${foundItems.length > 0 ? foundItems.join(", ") : "minimal data"}`);

  return research;
}

// --- Main ---

async function main(): Promise<void> {
  log("=== Lead Deep Research Script ===");

  // Fetch pending leads
  const { data: leads, error } = await supabaseAdmin
    .from("leads")
    .select(
      "id, first_name, last_name, full_name, city, state_province, source_brokerage, email"
    )
    .eq("research_status", "pending")
    .order("scraped_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (error) {
    logError(`Failed to fetch leads: ${error.message}`);
    process.exit(1);
  }

  if (!leads || leads.length === 0) {
    log("No pending leads to research. Done.");
    return;
  }

  log(`Found ${leads.length} leads to research`);

  let completed = 0;
  let failed = 0;

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i] as Lead;
    log(`\n[${i + 1}/${leads.length}] Researching lead ${lead.id.substring(0, 8)}...`);

    // Set status to in_progress
    await supabaseAdmin
      .from("leads")
      .update({ research_status: "in_progress" })
      .eq("id", lead.id);

    try {
      const research = await researchLead(lead);

      // Store results
      const { error: updateError } = await supabaseAdmin
        .from("leads")
        .update({
          personal_research: research,
          research_status: "completed",
          research_completed_at: new Date().toISOString(),
        })
        .eq("id", lead.id);

      if (updateError) {
        logError(`Failed to save research for ${lead.id.substring(0, 8)}: ${updateError.message}`);
        await supabaseAdmin
          .from("leads")
          .update({ research_status: "failed" })
          .eq("id", lead.id);
        failed++;
      } else {
        completed++;
      }
    } catch (err: any) {
      logError(`Research failed for ${lead.id.substring(0, 8)}: ${err.message || "unknown error"}`);
      await supabaseAdmin
        .from("leads")
        .update({ research_status: "failed" })
        .eq("id", lead.id);
      failed++;
    }

    // Rate limit between leads
    if (i < leads.length - 1) {
      await sleep(LEAD_DELAY_MS);
    }
  }

  log(`\n=== Research complete: ${completed} completed, ${failed} failed ===`);
}

main().catch((err) => {
  logError(`Fatal error: ${err.message || err}`);
  process.exit(1);
});
