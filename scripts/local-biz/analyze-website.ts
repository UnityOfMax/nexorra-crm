#!/usr/bin/env npx tsx
/**
 * Website Quality Analyzer — scores an existing business website 0-100.
 * Uses Chrome CDP (port 9232) to fetch + evaluate the site.
 * Score < 50 = bad website (qualifies for demo outreach).
 *
 * Scoring criteria:
 * - Mobile responsiveness (viewport meta tag) — 20pts
 * - Page load speed proxy (page size) — 20pts
 * - Contact info present (phone/email) — 20pts
 * - Modern design signals (flexbox/grid CSS, JS framework) — 20pts
 * - Basic SEO (title, meta description, H1) — 20pts
 *
 * Usage: npx tsx scripts/local-biz/analyze-website.ts <url>
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(__dirname, '../../.env.local') });

import { execSync } from 'child_process';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);
const CHROME_TOOL = resolve(__dirname, '../chrome-tool.js');
const CHROME_PORT = 9232;

async function chrome(cmd: string, timeoutMs = 20000): Promise<string> {
  try {
    const { stdout } = await execAsync(
      `node "${CHROME_TOOL}" --port ${CHROME_PORT} ${cmd}`,
      { timeout: timeoutMs, maxBuffer: 2 * 1024 * 1024 },
    );
    return stdout.trim();
  } catch (e) {
    return '';
  }
}

/**
 * Score a website URL 0-100. Lower = worse website.
 * Returns null if the page can't be loaded.
 */
export async function analyzeWebsite(url: string): Promise<number | null> {
  // Check Chrome is available
  try {
    execSync(`curl -s --connect-timeout 2 http://localhost:${CHROME_PORT}/json/version`, { stdio: 'pipe' });
  } catch {
    // Chrome not available — use fallback heuristics only
    return scoreFallback(url);
  }

  const navResult = await chrome(`navigate "${url}"`);
  if (navResult.includes('"blocked":true') || navResult.includes('"cloudflare":true')) {
    return null; // Can't assess
  }

  await new Promise(r => setTimeout(r, 1500));

  const pageText = await chrome('text "body"');
  const pageTitle = await chrome('title');
  const htmlSource = await chrome('html');

  if (!pageText || pageText.length < 100) return null;

  return computeScore(htmlSource, pageText, pageTitle, url);
}

function computeScore(html: string, text: string, title: string, url: string): number {
  let score = 0;

  // 1. Mobile responsiveness (viewport meta) — 20pts
  if (/meta[^>]+viewport[^>]+content/i.test(html)) score += 20;

  // 2. Page quality proxy (text length > 500 chars = has content) — 20pts
  if (text.length > 500) score += 10;
  if (text.length > 1500) score += 10;

  // 3. Contact info — 20pts
  if (/\(\d{3}\)\s*\d{3}[-.\s]?\d{4}|\d{3}[-.\s]\d{3}[-.\s]\d{4}/.test(text)) score += 10; // phone
  if (/@/.test(text)) score += 10; // email

  // 4. Modern design signals — 20pts
  if (/flexbox|display:\s*flex|display:\s*grid/.test(html)) score += 10;
  if (/react|vue|angular|next\.js|webpack/i.test(html)) score += 5;
  if (/<link[^>]+stylesheet/i.test(html) && !/<style>\s*\/\* [Cc]reated/i.test(html)) score += 5;

  // 5. SEO basics — 20pts
  if (title && title.length > 5 && !/untitled/i.test(title)) score += 7;
  if (/meta[^>]+description/i.test(html)) score += 7;
  if (/<h1/i.test(html)) score += 6;

  return Math.min(100, score);
}

function scoreFallback(url: string): number | null {
  // Without Chrome, use URL heuristics only — crude but better than nothing
  if (!url) return null;
  let score = 30; // base assumption for having a site
  if (url.includes('wixsite') || url.includes('weebly') || url.includes('yolasite')) score = 25;
  if (url.includes('squarespace') || url.includes('shopify') || url.includes('wordpress.com')) score = 55;
  return score;
}

// CLI entry point
if (require.main === module) {
  const url = process.argv[2];
  if (!url) {
    console.error('Usage: npx tsx scripts/local-biz/analyze-website.ts <url>');
    process.exit(1);
  }
  analyzeWebsite(url).then(score => {
    console.log(`Score: ${score ?? 'null (could not load)'}`);
  }).catch(console.error);
}
