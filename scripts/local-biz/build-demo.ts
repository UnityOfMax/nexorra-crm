#!/usr/bin/env npx tsx
/**
 * Petra Phase 2 — Build
 * For each qualified lead without a demo page:
 *   1. Scrape their existing site (if any) + extract branding data
 *   2. Ask Claude Haiku to write personalised copy
 *   3. Build HTML from category template
 *   4. Store in landing_pages, update local_biz_leads.demo_page_id
 *
 * Usage: npx tsx scripts/local-biz/build-demo.ts [--limit 50]
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(__dirname, '../../.env.local') });

import { createClient } from '@supabase/supabase-js';
import { exec } from 'child_process';
import { promisify } from 'util';
import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';
import { buildWebsiteDemo, LocalBizData } from '../../lib/landing-pages/website-demo-builder';

const execAsync = promisify(exec);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const CHROME_TOOL = resolve(__dirname, '../chrome-tool.js');
const CHROME_PORT = 9232;
const TEMPLATES_DIR = resolve(__dirname, '../../assets/website-demo-templates');

// ─── Chrome helper ───────────────────────────────────────────────────────────

async function chrome(cmd: string, timeoutMs = 20000): Promise<string> {
  try {
    const { stdout } = await execAsync(
      `node "${CHROME_TOOL}" --port ${CHROME_PORT} ${cmd}`,
      { timeout: timeoutMs, maxBuffer: 2 * 1024 * 1024 },
    );
    return stdout.trim();
  } catch {
    return '';
  }
}

// ─── Haiku copy writer ───────────────────────────────────────────────────────

function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');
  return new Anthropic({ apiKey });
}

interface GeneratedCopy {
  hero_headline: string;
  hero_headline_em: string;
  hero_subheadline: string;
  about_text: string;
  about_text_2: string;
  cta_text: string;
  services: Array<{ name: string; desc: string; price: string }>;
  color_primary: string;
  color_accent: string;
}

async function generateCopy(biz: {
  name: string; type: string; city: string; state: string;
  rating: number | null; reviews: number | null;
  existingCopy: string; existingColors: string;
}): Promise<GeneratedCopy> {
  const client = getAnthropicClient();

  const prompt = `You are writing website copy for a local business. Output ONLY valid JSON, no markdown.

Business: ${biz.name}
Type: ${biz.type}
Location: ${biz.city}, ${biz.state}
Rating: ${biz.rating ?? 'unknown'} stars (${biz.reviews ?? '?'} reviews)
Existing site copy/tone (if available): ${biz.existingCopy.slice(0, 600)}
Detected brand colors (hex): ${biz.existingColors || 'none detected'}

Generate compelling website copy. Output JSON:
{
  "hero_headline": "short punchy headline (4-8 words)",
  "hero_headline_em": "italic/emphasis part of headline (2-4 words, can be empty)",
  "hero_subheadline": "1-2 sentence description of what makes them special",
  "about_text": "2-3 sentence paragraph about the business",
  "about_text_2": "1-2 sentence follow-up about their approach or values",
  "cta_text": "1 sentence call to action for the bottom section",
  "services": [
    {"name": "Service Name", "desc": "1 sentence description", "price": "Starting at $X or empty"},
    {"name": "Service Name", "desc": "1 sentence description", "price": ""},
    {"name": "Service Name", "desc": "1 sentence description", "price": ""},
    {"name": "Service Name", "desc": "1 sentence description", "price": ""}
  ],
  "color_primary": "#hex (their brand color or best fit for business type)",
  "color_accent": "#hex (complementary accent color)"
}`;

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = (msg.content[0] as any).text || '';
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');
    return JSON.parse(jsonMatch[0]) as GeneratedCopy;
  } catch {
    // Return sensible defaults
    return {
      hero_headline: `Welcome to ${biz.name}`,
      hero_headline_em: biz.city,
      hero_subheadline: `Trusted ${biz.type} serving ${biz.city}, ${biz.state}.`,
      about_text: `${biz.name} has built a reputation for quality and reliability in ${biz.city}.`,
      about_text_2: `We're committed to delivering the best experience every time.`,
      cta_text: `Ready to get started? Give us a call today.`,
      services: [
        { name: 'Core Service', desc: 'Our signature offering.', price: '' },
        { name: 'Consultation', desc: 'Free initial consultation.', price: 'Free' },
        { name: 'Custom Work', desc: 'Tailored to your needs.', price: '' },
        { name: 'Follow-up', desc: 'We stand behind our work.', price: '' },
      ],
      color_primary: '#2563eb',
      color_accent: '#f59e0b',
    };
  }
}

// ─── Site scraper ────────────────────────────────────────────────────────────

async function scrapeExistingSite(url: string): Promise<{ text: string; colors: string }> {
  if (!url) return { text: '', colors: '' };

  try {
    const navResult = await chrome(`navigate "${url}"`);
    if (navResult.includes('"blocked":true')) return { text: '', colors: '' };
    await new Promise(r => setTimeout(r, 1500));
    const text = await chrome('text "body"');
    // Very simple color extraction — look for hex codes in inline styles or CSS
    const html = await chrome('html');
    const hexMatches = html.match(/#[0-9A-Fa-f]{6}\b/g) || [];
    const uniqueColors = Array.from(new Set(hexMatches)).slice(0, 5).join(', ');
    return { text: text.slice(0, 1200), colors: uniqueColors };
  } catch {
    return { text: '', colors: '' };
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  // Check templates exist
  const templateFiles = fs.readdirSync(TEMPLATES_DIR).filter(f => f.endsWith('.html'));
  if (templateFiles.length === 0) {
    console.error('[build-demo] No templates found in', TEMPLATES_DIR);
    console.error('[build-demo] Run Vera + 21st.dev to build templates first.');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const limitIdx = args.indexOf('--limit');
  const LIMIT = limitIdx >= 0 ? parseInt(args[limitIdx + 1]) : 50;

  // Fetch qualified leads without demos
  const { data: leads, error } = await supabaseAdmin
    .from('local_biz_leads')
    .select('*')
    .is('demo_page_id', null)
    .neq('outreach_channel', 'none')
    .order('scraped_at', { ascending: true })
    .limit(LIMIT);

  if (error) {
    console.error('[build-demo] DB fetch failed:', error.message);
    process.exit(1);
  }

  if (!leads || leads.length === 0) {
    console.log('[build-demo] No qualified leads without demos. Nothing to do.');
    return;
  }

  console.log(`[build-demo] Building demos for ${leads.length} leads`);

  // Check Chrome
  try {
    await execAsync(`curl -s --connect-timeout 2 http://localhost:${CHROME_PORT}/json/version`);
  } catch {
    console.log(`[build-demo] Chrome not on port ${CHROME_PORT} — site scraping will be skipped`);
  }

  let built = 0;
  let failed = 0;

  for (const lead of leads) {
    try {
      console.log(`[build-demo] Building: ${lead.business_name} (${lead.city})`);

      // Scrape existing site for copy/color hints
      const { text: existingCopy, colors: existingColors } = await scrapeExistingSite(lead.website_url || '');

      // Generate copy with Haiku
      const copy = await generateCopy({
        name: lead.business_name,
        type: lead.business_type,
        city: lead.city || '',
        state: lead.state_province || '',
        rating: lead.gmb_rating,
        reviews: lead.gmb_reviews,
        existingCopy,
        existingColors,
      });

      // Build the demo
      const bizData: LocalBizData = {
        id: lead.id,
        business_name: lead.business_name,
        business_type: lead.business_type,
        phone: lead.phone,
        email: lead.email,
        website_url: lead.website_url,
        address: lead.address,
        city: lead.city,
        state_province: lead.state_province,
        country: lead.country || 'US',
        gmb_rating: lead.gmb_rating,
        gmb_reviews: lead.gmb_reviews,
        gmb_photos: lead.gmb_photos,
        color_primary: copy.color_primary,
        color_accent: copy.color_accent,
        hero_headline: copy.hero_headline,
        hero_subheadline: copy.hero_subheadline,
        about_text: copy.about_text,
        services: copy.services,
        cta_text: copy.cta_text,
      };

      const pageId = await buildWebsiteDemo(bizData);
      const demoUrl = `https://app.ainexorra.com/website-demo/${pageId}`;
      console.log(`[build-demo]  ✓ ${lead.business_name} → ${demoUrl}`);
      built++;
    } catch (err) {
      console.error(`[build-demo]  ✗ ${lead.business_name}: ${(err as Error).message}`);
      failed++;
    }

    // Small delay between builds
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n[build-demo] Phase 2 Complete: ${built} built, ${failed} failed`);
}

main().catch(err => {
  console.error('[build-demo] FATAL:', err.message);
  process.exit(1);
});
