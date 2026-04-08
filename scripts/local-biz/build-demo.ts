#!/usr/bin/env npx tsx
/**
 * Petra Phase 2 — Build
 * For each qualified lead without a demo page:
 *   1. Generate personalised copy via claude -p (~15-20s, falls back to deterministic)
 *   2. Build HTML from category template (<1s)
 *   3. Store in landing_pages, update local_biz_leads.demo_page_id + outreach fields
 *
 * 4 parallel workers: ~4 sites per 25s = ~10 sites/min = 300 sites in ~30 min.
 * No ANTHROPIC_API_KEY needed — fully OAuth via claude -p.
 *
 * Usage: npx tsx scripts/local-biz/build-demo.ts [--limit 50]
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(__dirname, '../../.env.local') });

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import { buildWebsiteDemo, LocalBizData } from '../../lib/landing-pages/website-demo-builder';
import { generateCopyFast } from '../../lib/local-biz/copy-generator';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.ainexorra.com';
const CALENDLY_LINK = process.env.CALENDLY_BOOKING_URL || 'https://calendly.com/nexorra/discovery';
const TEMPLATES_DIR = resolve(__dirname, '../../assets/website-demo-templates');
const WORKER_COUNT = 4;

// ─── Chunk array into batches ─────────────────────────────────────────────────

function chunk<T>(arr: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    batches.push(arr.slice(i, i + size));
  }
  return batches;
}

// ─── Process one lead ─────────────────────────────────────────────────────────

async function processLead(lead: any): Promise<void> {
  const name = lead.business_name;

  // 1. Fast copy via claude -p (~15-20s) or deterministic fallback (instant)
  const copy = await generateCopyFast({
    business_name:  name,
    business_type:  lead.business_type,
    city:           lead.city,
    state_province: lead.state_province,
    gmb_rating:     lead.gmb_rating,
    gmb_reviews:    lead.gmb_reviews,
    website_url:    lead.website_url,
  });

  // 2. Build from template + insert into landing_pages (returns page UUID)
  const photos: string[] = (lead as any).facebook_photos?.length
    ? (lead as any).facebook_photos
    : (lead.gmb_photos || []);

  const bizData: LocalBizData = {
    id:              lead.id,
    business_name:   name,
    business_type:   lead.business_type,
    phone:           lead.phone,
    email:           lead.email,
    website_url:     lead.website_url,
    address:         lead.address,
    city:            lead.city,
    state_province:  lead.state_province,
    country:         lead.country || 'US',
    gmb_rating:      lead.gmb_rating,
    gmb_reviews:     lead.gmb_reviews,
    gmb_photos:      photos,
    about_text:      copy.about_text,
    services:        lead.services || undefined,
    reviews:         lead.reviews || undefined,
    hours:           lead.hours || undefined,
    years_in_business: lead.years_in_business || undefined,
    color_primary:   lead.color_primary || undefined,
    color_accent:    lead.color_accent || undefined,
  };

  const pageId = await buildWebsiteDemo(bizData, copy);
  const demoUrl = `${APP_URL}/website-demo/${pageId}`;

  // 3. Store outreach copy with resolved demo link
  const emailBody = (copy.outreach_body_email || '')
    .replace(/\{\{DEMO_LINK\}\}/g, demoUrl)
    .replace(/\{\{CALENDLY_LINK\}\}/g, CALENDLY_LINK);
  const smsBody = (copy.outreach_body_sms || '')
    .replace(/\{\{DEMO_LINK\}\}/g, demoUrl)
    .replace(/\{\{CALENDLY_LINK\}\}/g, CALENDLY_LINK);

  await supabaseAdmin
    .from('local_biz_leads')
    .update({
      outreach_body_email: emailBody,
      outreach_body_sms:   smsBody,
    })
    .eq('id', lead.id);

  console.log(`[build-demo]  ✓ ${name} → ${demoUrl}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Check templates exist
  const templateFiles = fs.readdirSync(TEMPLATES_DIR).filter(f => f.endsWith('.html'));
  if (templateFiles.length === 0) {
    console.error('[build-demo] No templates found in', TEMPLATES_DIR);
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

  console.log(`[build-demo] Building demos for ${leads.length} leads (${WORKER_COUNT} parallel workers)`);
  const t0 = Date.now();

  let built = 0;
  let failed = 0;

  for (const batch of chunk(leads, WORKER_COUNT)) {
    await Promise.all(batch.map(async (lead) => {
      try {
        await processLead(lead);
        built++;
      } catch (err) {
        console.error(`[build-demo]  ✗ ${lead.business_name}: ${(err as Error).message}`);
        failed++;
      }
    }));
  }

  const elapsed = Math.round((Date.now() - t0) / 1000);
  console.log(`\n[build-demo] Phase 2 Complete: ${built} built, ${failed} failed — ${elapsed}s total`);
  if (built > 0) {
    console.log(`[build-demo] Rate: ${(built / elapsed * 60).toFixed(1)} sites/min`);
  }
}

main().catch(err => {
  console.error('[build-demo] FATAL:', err.message);
  process.exit(1);
});
