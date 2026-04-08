#!/usr/bin/env npx tsx
/**
 * Petra Test Pipeline — A Hair Sensation, Macon GA
 * Single-location women's hair + nail salon. Owner: Dawn. Est. 2002.
 * Website score: 34/100 (Times New Roman, table layout, no booking, no mobile).
 *
 * This test run:
 * 1. Screenshots the original ahairsensation.com (so Max can compare)
 * 2. Generates copy via claude -p, then humanizes it (stop-slop + humanizer)
 * 3. Generates a full custom demo via demo-generator.ts (skills + QA loop)
 * 4. Sends Telegram: original screenshot + demo info + email preview
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(__dirname, '../../.env.local') });

import { createClient } from '@supabase/supabase-js';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';

const execAsync = promisify(exec);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.ainexorra.com';
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_CHAT = process.env.TELEGRAM_ADMIN_CHAT_ID || '5880638817';
const CHROME_TOOL = resolve(__dirname, '../chrome-tool.js');

// ── Target business ───────────────────────────────────────────────────────────

const BUSINESS = {
  name:         'A Hair Sensation',
  type:         'hairdresser',
  city:         'Macon',
  state:        'GA',
  phone:        '(478) 742-1094',
  email:        null as string | null,
  website:      'https://ahairsensation.com',
  address:      '2386 Ingleside Ave, Macon, GA 31204',
  rating:       4.8,
  reviews:      94,
  website_score: 34,
  hours:        'Tue–Sat, 8:00 AM–9:00 PM',
  photos: [
    'https://ahairsensation.com/feat/f185.jpg',
    'https://ahairsensation.com/feat/f184.jpg',
    'https://ahairsensation.com/feat/f176.jpg',
    'https://ahairsensation.com/feat/f167.jpg',
    'https://ahairsensation.com/feat/f186.jpg',
    'https://ahairsensation.com/feat/f166.jpg',
    'https://ahairsensation.com/feat/f152.jpg',
    'https://ahairsensation.com/salonpics/8-27-10pic2S.jpg',
  ],
};

// ── Telegram helpers ──────────────────────────────────────────────────────────

async function sendTelegramText(text: string): Promise<void> {
  const payload = JSON.stringify({ chat_id: TELEGRAM_CHAT, text, parse_mode: 'HTML' });
  fs.writeFileSync('/tmp/tg-text.json', payload, 'utf-8');
  const { stdout } = await execAsync(
    `curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage" -H "Content-Type: application/json" -d @/tmp/tg-text.json`,
    { timeout: 15000 },
  );
  const result = JSON.parse(stdout);
  if (!result.ok) throw new Error(`Telegram error: ${result.description}`);
}

async function sendTelegramPhoto(photoPath: string, caption: string): Promise<void> {
  const { stdout } = await execAsync(
    `curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto" -F "chat_id=${TELEGRAM_CHAT}" -F "photo=@${photoPath}" -F "caption=${caption.replace(/"/g, '\\"')}"`,
    { timeout: 30000 },
  );
  const result = JSON.parse(stdout);
  if (!result.ok) console.warn('[tg] Photo send issue:', result.description);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Screenshot original website ───────────────────────────────────────────────

async function screenshotOriginalSite(): Promise<string | null> {
  const outFile = '/tmp/ahair-original.jpg';
  try {
    console.log('[test] Navigating to ahairsensation.com...');
    await execAsync(
      `node "${CHROME_TOOL}" --port 9232 navigate "https://ahairsensation.com"`,
      { timeout: 20000 },
    );
    await new Promise(r => setTimeout(r, 3000));
    await execAsync(
      `node "${CHROME_TOOL}" --port 9232 screenshot "${outFile}"`,
      { timeout: 20000 },
    );
    console.log('[test] Original screenshot saved to', outFile);
    return outFile;
  } catch (err) {
    console.warn('[test] Original screenshot failed:', (err as Error).message);
    return null;
  }
}


// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('[test-pipeline] A Hair Sensation — Macon, GA\n');
  const t0 = Date.now();

  // ── Step 1: Screenshot original website ───────────────────────────────────
  console.log('[test-pipeline] 1/3 — Screenshotting original website...');
  const originalScreenshot = await screenshotOriginalSite();

  // ── Step 2: Generate copy + build template demo ────────────────────────────
  console.log('[test-pipeline] 2/3 — Generating copy + building demo...');

  // Upsert lead record
  let leadId: string;
  const { data: existing } = await supabaseAdmin
    .from('local_biz_leads')
    .select('id')
    .eq('gmb_place_id', 'test_ahairsensation_macon')
    .maybeSingle();

  if (existing?.id) {
    leadId = existing.id;
  } else {
    const { data: row, error } = await supabaseAdmin
      .from('local_biz_leads')
      .insert({
        gmb_place_id:      'test_ahairsensation_macon',
        business_name:     BUSINESS.name,
        business_type:     BUSINESS.type,
        phone:             BUSINESS.phone,
        email:             BUSINESS.email,
        website_url:       BUSINESS.website,
        address:           BUSINESS.address,
        city:              BUSINESS.city,
        state_province:    BUSINESS.state,
        country:           'US',
        gmb_rating:        BUSINESS.rating,
        gmb_reviews:       BUSINESS.reviews,
        website_score:     BUSINESS.website_score,
        outreach_channel:  BUSINESS.email ? 'email' : 'sms',
      })
      .select('id')
      .single();
    if (error || !row) throw new Error(error?.message || 'Insert failed');
    leadId = row.id;
  }

  const { generateCopyFast } = await import('../../lib/local-biz/copy-generator');
  const { buildWebsiteDemo } = await import('../../lib/landing-pages/website-demo-builder');

  // Fast copy: ~15-20s via claude -p (or instant deterministic fallback)
  const copy = await generateCopyFast({
    business_name:  BUSINESS.name,
    business_type:  BUSINESS.type,
    city:           BUSINESS.city,
    state_province: BUSINESS.state,
    gmb_rating:     BUSINESS.rating,
    gmb_reviews:    BUSINESS.reviews,
    website_url:    BUSINESS.website,
  });

  const bizData = {
    id:             leadId,
    business_name:  BUSINESS.name,
    business_type:  BUSINESS.type,
    phone:          BUSINESS.phone,
    email:          BUSINESS.email,
    website_url:    BUSINESS.website,
    address:        BUSINESS.address,
    city:           BUSINESS.city,
    state_province: BUSINESS.state,
    country:        'US',
    gmb_rating:     BUSINESS.rating,
    gmb_reviews:    BUSINESS.reviews,
    gmb_photos:     BUSINESS.photos,
    hours:          BUSINESS.hours,
    color_primary:  '#9B6F42',
    color_accent:   '#C9A55A',
    about_text:     copy.about_text,
    services: [
      { name: 'Colour & Highlights', desc: 'Expert colour, cap highlights and foils.', price: 'From $65' },
      { name: 'Cut & Style',          desc: 'Precision cuts for women, men and children.', price: 'From $35' },
      { name: 'Perms',                desc: 'Volume, texture, and lasting curl.', price: 'From $75' },
      { name: 'Shampoo & Set',        desc: 'Classic wash and set.', price: 'From $30' },
    ],
    years_in_business: '20+',
  };

  // Build + insert into landing_pages (returns page id)
  const pageId = await buildWebsiteDemo(bizData as any, copy);
  const demoUrl = `${APP_URL}/website-demo/${pageId}`;
  console.log(`[test-pipeline]  Generated in ${Math.round((Date.now() - t0) / 1000)}s`);
  console.log(`[test-pipeline]  Demo: ${demoUrl}\n`);

  // Store outreach copy with resolved demo link
  const emailBody = copy.outreach_body_email.replace(/\{\{DEMO_LINK\}\}/g, demoUrl);
  const smsBody = copy.outreach_body_sms.replace(/\{\{DEMO_LINK\}\}/g, demoUrl);

  await supabaseAdmin
    .from('local_biz_leads')
    .update({ outreach_body_email: emailBody, outreach_body_sms: smsBody })
    .eq('id', leadId);

  // ── Step 3: Send Telegram ──────────────────────────────────────────────────
  console.log('[test-pipeline] 3/3 — Sending Telegram...');

  if (originalScreenshot && fs.existsSync(originalScreenshot)) {
    try {
      await sendTelegramPhoto(originalScreenshot, `ORIGINAL: ahairsensation.com (score: ${BUSINESS.website_score}/100)`);
      console.log('[test-pipeline]  ✓ Original screenshot sent');
    } catch (err) {
      console.warn('[test-pipeline]  Original screenshot send failed:', (err as Error).message);
    }
  }

  const totalSecs = Math.round((Date.now() - t0) / 1000);
  const telegramMsg = `<b>Demo ready:</b> ${demoUrl}

<b>Business:</b> ${BUSINESS.name} | Score: ${BUSINESS.website_score}/100
<b>Time:</b> ${totalSecs}s (copy-gen + template)
<b>Headline:</b> ${escapeHtml(copy.hero_headline)}`;

  try {
    await sendTelegramText(telegramMsg);
    console.log('[test-pipeline]  ✓ Telegram sent');
  } catch (err) {
    console.error('[test-pipeline]  Telegram failed:', (err as Error).message);
    console.log('\n=== EMAIL ===\n', emailBody);
  }

  console.log('\n[test-pipeline] Done.');
  console.log(`Demo URL: ${demoUrl}`);
}

main().catch(err => {
  console.error('[test-pipeline] FATAL:', err.message);
  process.exit(1);
});
