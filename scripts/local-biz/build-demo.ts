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
import { humanizeCopyFields } from '../../lib/local-biz/copy-humanizer';
import { generateDemoHtml, BizForDemo, GeneratedCopyForDemo } from '../../lib/local-biz/demo-generator';

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

const CALENDLY_LINK = process.env.CALENDLY_BOOKING_URL || 'https://calendly.com/nexorra/discovery';

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
  // Design direction
  design_vibe:       string;
  design_adjectives: string[];
  color_mood:        string;
  business_category: string;
  // Outreach personalisation
  website_pain_points: string[];
  review_insight: string | null;
  outreach_body_email: string;
  outreach_body_sms: string;
}

async function generateCopy(biz: {
  name: string; type: string; city: string; state: string;
  rating: number | null; reviews: number | null;
  hasWebsite: boolean; websiteScore: number | null;
  existingCopy: string; existingColors: string;
}): Promise<GeneratedCopy> {
  const client = getAnthropicClient();

  const websiteContext = biz.hasWebsite
    ? `Current website score: ${biz.websiteScore ?? 'not scored'}/100\nExisting site copy/tone: ${biz.existingCopy.slice(0, 500)}\nDetected brand colors: ${biz.existingColors || 'none'}`
    : 'They have NO website at all.';

  const prompt = `You are writing for a local business. Output ONLY valid JSON, no markdown, no explanation.

Business: ${biz.name}
Type: ${biz.type}
Location: ${biz.city}, ${biz.state}
Rating: ${biz.rating ?? 'unknown'} stars (${biz.reviews ?? '?'} reviews)
${websiteContext}

Generate all of the following in one JSON object:

1. Demo website copy (for a beautiful site we've built for them)
2. Pain points (2-3 specific issues with their current site/online presence — be concrete, not generic)
3. A personalised outreach email body. Use exactly this format (8 paragraphs, each separated by \\n\\n):
   - Para 1: "Hey [first name or 'there'],"
   - Para 2: "My name is Max, I've been looking for a [business type] in [city] and I found you on Google but [if no website: 'didn't see a website' / if bad website: 'found it really tricky to navigate your website']"
   - Para 3: "So I thought I'd make you one!"
   - Para 4: "Here it is: {{DEMO_LINK}}"
   - Para 5: "I've done this for a few other [business type]s and especially if their old website was a bit slow or dated they've often suddenly started booking another 5-10 more customers each week."
   - Para 6: "Given the area I'd imagine you're missing out on another 1-2k/m in revenue minimum (depending on service cost)"
   - Para 7: "Let me know if you like the website and I'd love to jump on a call to go through it more and change anything to work for you :)"
   - Para 8: "I made the demo to give you an idea of what it could look like but if you want to use it and have it work I generally charge 450-950 as a one-time fee (just so it doesn't come as a shock!)"
   Rules: no currency symbols (no £ or $), no em dashes, no Calendly link. Keep it casual and conversational.
4. A personalised SMS (2-3 short phrases, same tone, with {{DEMO_LINK}})

Output JSON:
{
  "hero_headline": "4-8 word punchy headline",
  "hero_headline_em": "2-4 word emphasis part (can be empty)",
  "hero_subheadline": "1-2 sentence description",
  "about_text": "Short punchy phrase used as the About section headline — e.g. 'Macon's most trusted hair salon since 2002' or 'Where every client leaves feeling their best'",
  "about_text_2": "2-3 sentence paragraph about the business, warm and personal",
  "cta_text": "1 warm sentence inviting them to book",
  "services": [
    {"name": "Service", "desc": "1 sentence", "price": "Starting at $X or empty"},
    {"name": "Service", "desc": "1 sentence", "price": ""},
    {"name": "Service", "desc": "1 sentence", "price": ""},
    {"name": "Service", "desc": "1 sentence", "price": ""}
  ],
  "color_primary": "#hex",
  "color_accent": "#hex",
  "design_vibe": "2-3 word vibe description e.g. 'warm luxury' or 'playful fun' or 'trustworthy trades'",
  "design_adjectives": ["adj1", "adj2", "adj3"],
  "color_mood": "1 sentence describing the colour atmosphere e.g. 'dark espresso backgrounds with cream and gold accents'",
  "business_category": "one of: salon, barber, restaurant, cafe, gym, yoga, plumber, dentist, accountant, pet groomer",
  "website_pain_points": ["specific issue 1", "specific issue 2"],
  "review_insight": "one notable thing about their online reputation, or null",
  "outreach_body_email": "8 paragraphs separated by \\n\\n. Follow the format above exactly. No currency symbols, no em dashes.",
  "outreach_body_sms": "3 phrases as one continuous message. Phrase 1: specific thing noticed. Phrase 2: built them a free site: {{DEMO_LINK}}. Phrase 3: happy to get on a call and set it up"
}`;

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1200,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = (msg.content[0] as any).text || '';
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');
    return JSON.parse(jsonMatch[0]) as GeneratedCopy;
  } catch {
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
      design_vibe: 'clean professional',
      design_adjectives: ['clean', 'professional', 'trustworthy'],
      color_mood: 'blue and white, modern and clean',
      business_category: 'professional',
      website_pain_points: biz.hasWebsite ? ['outdated design', 'no contact form'] : ['no website'],
      review_insight: null,
      outreach_body_email: `Hey there,\n\nMy name is Max, I've been looking for a ${biz.type} in ${biz.city} and I found you on Google but ${biz.hasWebsite ? 'found it really tricky to navigate your website' : "didn't see a website"}\n\nSo I thought I'd make you one!\n\nHere it is: {{DEMO_LINK}}\n\nI've done this for a few other ${biz.type}s and especially if their old website was a bit slow or dated they've often suddenly started booking another 5-10 more customers each week.\n\nGiven the area I'd imagine you're missing out on another 1-2k/m in revenue minimum (depending on service cost)\n\nLet me know if you like the website and I'd love to jump on a call to go through it more and change anything to work for you :)\n\nI made the demo to give you an idea of what it could look like but if you want to use it and have it work I generally charge 450-950 as a one-time fee (just so it doesn't come as a shock!)`,
      outreach_body_sms: `Hey — I noticed ${biz.name} doesn't have a proper site online, so I built one for you: {{DEMO_LINK}}\n\nIf you like it, happy to get on a quick call and set it all up — Max Fawcett`,
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

      // Generate copy + pain points + outreach copy with Haiku
      let copy = await generateCopy({
        name: lead.business_name,
        type: lead.business_type,
        city: lead.city || '',
        state: lead.state_province || '',
        rating: lead.gmb_rating,
        reviews: lead.gmb_reviews,
        hasWebsite: !!lead.website_url,
        websiteScore: lead.website_score ?? null,
        existingCopy,
        existingColors,
      });

      // Humanize outreach copy (stop-slop + humanizer) — eliminates em dashes and AI patterns
      try {
        const fieldsToHumanize = {
          hero_subheadline:    copy.hero_subheadline,
          about_text_2:        copy.about_text_2,
          outreach_body_email: copy.outreach_body_email,
          outreach_body_sms:   copy.outreach_body_sms,
        };
        const humanized = await humanizeCopyFields(
          fieldsToHumanize,
          `Copy for ${lead.business_name} (${lead.business_type}) in ${lead.city}, ${lead.state_province}. Outreach from Max Fawcett.`,
        );
        copy = {
          ...copy,
          hero_subheadline:    humanized.hero_subheadline    || copy.hero_subheadline,
          about_text_2:        humanized.about_text_2        || copy.about_text_2,
          outreach_body_email: humanized.outreach_body_email || copy.outreach_body_email,
          outreach_body_sms:   humanized.outreach_body_sms   || copy.outreach_body_sms,
        };
      } catch (err) {
        console.warn(`[build-demo]  Humanizer failed: ${(err as Error).message} — using original`);
      }

      // Use photos from Facebook if available (no-website leads), else GMB photos
      const photos: string[] = (lead as any).facebook_photos?.length
        ? (lead as any).facebook_photos
        : (lead.gmb_photos || []);

      // About text: use Facebook about for no-website leads
      const aboutText2 = (lead as any).facebook_about || copy.about_text_2;

      // Generate demo with new demo-generator (skills + QA loop)
      const bizForDemo: BizForDemo = {
        name:    lead.business_name,
        type:    lead.business_type,
        city:    lead.city || '',
        state:   lead.state_province || '',
        phone:   lead.phone,
        address: lead.address,
        rating:  lead.gmb_rating,
        reviews: lead.gmb_reviews,
        photos,
        testimonials: (lead as any).facebook_reviews || undefined,
      };

      const copyForDemo: GeneratedCopyForDemo = {
        hero_headline:     copy.hero_headline,
        hero_headline_em:  copy.hero_headline_em,
        hero_subheadline:  copy.hero_subheadline,
        about_text:        copy.about_text,
        about_text_2:      aboutText2,
        cta_text:          copy.cta_text,
        services:          copy.services,
        color_primary:     copy.color_primary,
        color_accent:      copy.color_accent,
        design_vibe:       copy.design_vibe || 'clean professional',
        design_adjectives: copy.design_adjectives || ['clean', 'professional'],
        color_mood:        copy.color_mood || 'blue and white',
        business_category: copy.business_category || 'professional',
      };

      const demoHtml = await generateDemoHtml(bizForDemo, copyForDemo);

      // Store in landing_pages
      const slugBase = lead.business_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const slug = `demo-${slugBase}-${Date.now().toString(36)}`;

      const { error: lpError } = await supabaseAdmin
        .from('landing_pages')
        .insert({
          account_id:       'da99b768-79dd-48f8-af86-abf95e61a69f',
          slug,
          name:             `${lead.business_name} — Website Demo`,
          content:          demoHtml,
          page_type:        'website-demo',
          published:        true,
          meta_title:       `${lead.business_name} | ${lead.city} ${lead.business_type}`,
          meta_description: `${lead.business_name} — serving ${lead.city}, ${lead.state_province}.`,
        });

      if (lpError) throw new Error(`landing_pages insert: ${lpError.message}`);

      await supabaseAdmin
        .from('local_biz_leads')
        .update({ demo_page_id: slug })
        .eq('id', lead.id);

      const pageId = slug;
      const demoUrl = `https://app.ainexorra.com/website-demo/${pageId}`;

      // Store outreach personalisation data — substitute placeholders
      const emailBody = (copy.outreach_body_email || '')
        .replace(/\{\{DEMO_LINK\}\}/g, demoUrl)
        .replace(/\{\{CALENDLY_LINK\}\}/g, CALENDLY_LINK);
      const smsBody = (copy.outreach_body_sms || '')
        .replace(/\{\{DEMO_LINK\}\}/g, demoUrl)
        .replace(/\{\{CALENDLY_LINK\}\}/g, CALENDLY_LINK);

      await supabaseAdmin
        .from('local_biz_leads')
        .update({
          website_pain_points: copy.website_pain_points || [],
          review_insight: copy.review_insight || null,
          outreach_body_email: emailBody,
          outreach_body_sms: smsBody,
        })
        .eq('id', lead.id);

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
