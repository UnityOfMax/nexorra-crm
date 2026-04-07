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

// ── Copy generation ───────────────────────────────────────────────────────────

interface GeneratedCopy {
  hero_headline:     string;
  hero_headline_em:  string;
  hero_subheadline:  string;
  about_text:        string;
  about_text_2:      string;
  cta_text:          string;
  services:          Array<{ name: string; desc: string; price: string }>;
  color_primary:     string;
  color_accent:      string;
  design_vibe:       string;
  design_adjectives: string[];
  color_mood:        string;
  business_category: string;
  website_pain_points: string[];
  review_insight:    string | null;
  outreach_body_email: string;
  outreach_body_sms: string;
}

async function generateCopy(): Promise<GeneratedCopy> {
  const prompt = `You are writing copy for a local business website demo. Output ONLY valid JSON — no markdown, no explanation.

Business: A Hair Sensation
Type: Full-service women's hair + nail salon (colour, highlights, perms, cuts, styling, waxing, nails, weddings, proms)
Owner: Dawn
Location: Macon, GA — antique district on Ingleside Avenue
Rating: 4.8 stars (94 reviews)
Website issues (score 34/100): Times New Roman font, table-based layout from 2002, copyright "2002-2020", no online booking (only a phone number), no mobile layout, no contact form, 4.8 stars but ZERO social proof shown on site

Generate one JSON object:
{
  "hero_headline": "4-7 word headline for a boutique hair salon",
  "hero_headline_em": "2-4 word italic emphasis part",
  "hero_subheadline": "1-2 warm sentences specific to this Macon salon",
  "about_text": "Short punchy line as About headline — e.g. 'Macon's most trusted hair salon, since 2002'",
  "about_text_2": "2-3 warm sentences about Dawn and the salon — antique district, 20+ years",
  "cta_text": "1 warm sentence inviting them to book",
  "services": [
    {"name": "Colour & Highlights", "desc": "Expert colour, cap highlights and foils.", "price": "From $65"},
    {"name": "Cut & Style", "desc": "Precision cuts for women, men and children.", "price": "From $35"},
    {"name": "Perms", "desc": "Volume, texture, and lasting curl.", "price": "From $75"},
    {"name": "Shampoo & Set", "desc": "Classic wash and set.", "price": "From $30"}
  ],
  "color_primary": "#9B6F42",
  "color_accent": "#C9A55A",
  "design_vibe": "warm luxury",
  "design_adjectives": ["warm", "editorial", "boutique", "feminine", "antique-charm"],
  "color_mood": "espresso and champagne — dark warm backgrounds, soft cream neutrals, gold accents",
  "business_category": "salon",
  "website_pain_points": ["No online booking — visitors have to call, most just leave", "Site looks like 2005 — Times New Roman, table layout, no mobile version"],
  "review_insight": "4.8 stars from 94 reviews is genuinely strong — but none of that social proof appears on the current site",
  "outreach_body_email": "Hey Dawn,\\n\\nMy name is Max, I've been looking for a hair salon in Macon and I found you on Google but found it really tricky to navigate your website\\n\\nSo I thought I'd make you one!\\n\\nHere it is: {{DEMO_LINK}}\\n\\nI've done this for a few other hair salons and especially if their old website was a bit slow or dated they've often suddenly started booking another 5-10 more customers each week.\\n\\nGiven the area I'd imagine you're missing out on another 1-2k/m in revenue minimum (depending on service cost)\\n\\nLet me know if you like the website and I'd love to jump on a call to go through it more and change anything to work for you :)\\n\\nI made the demo to give you an idea of what it could look like but if you want to use it and have it work I generally charge 450-950 as a one-time fee (just so it doesn't come as a shock!)",
  "outreach_body_sms": "2-3 short casual phrases including {{DEMO_LINK}}"
}`;

  fs.writeFileSync('/tmp/petra-copy-prompt.txt', prompt, 'utf-8');

  try {
    const { stdout } = await execAsync(
      `claude -p --output-format text < /tmp/petra-copy-prompt.txt`,
      { timeout: 90000, maxBuffer: 2 * 1024 * 1024 },
    );
    const match = stdout.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON in response');
    return JSON.parse(match[0]) as GeneratedCopy;
  } catch (err) {
    console.warn('[test] Copy gen failed, using fallback:', (err as Error).message);
    return {
      hero_headline: 'Where every visit',
      hero_headline_em: 'becomes your best look',
      hero_subheadline: "Macon's favourite full-service hair and nail salon, in the heart of the antique district on Ingleside Avenue.",
      about_text: "Macon's most trusted hair salon, since 2002",
      about_text_2: "Dawn and her team have been transforming hair in Macon for over 20 years. Tucked into the charming antique district on Ingleside Avenue, A Hair Sensation is a warm, smoke-free space where every client feels at home.",
      cta_text: "Ready for a fresh look? Book your appointment and let Dawn take care of the rest.",
      services: [
        { name: 'Colour & Highlights', desc: 'Expert colour, cap highlights and foils.', price: 'From $65' },
        { name: 'Cut & Style', desc: 'Precision cuts for women, men and children.', price: 'From $35' },
        { name: 'Perms', desc: 'Volume, texture, and lasting curl.', price: 'From $75' },
        { name: 'Shampoo & Set', desc: 'Classic wash and set.', price: 'From $30' },
      ],
      color_primary: '#9B6F42',
      color_accent: '#C9A55A',
      design_vibe: 'warm luxury',
      design_adjectives: ['warm', 'editorial', 'boutique', 'feminine'],
      color_mood: 'espresso and champagne — dark warm backgrounds, soft cream neutrals, gold accents',
      business_category: 'salon',
      website_pain_points: ['No online booking — visitors have to call, most just leave', 'Site looks like 2005 — Times New Roman, table layout, no mobile version'],
      review_insight: '4.8 stars from 94 reviews but none of it appears on the site',
      outreach_body_email: "Hey Dawn,\n\nMy name is Max, I've been looking for a hair salon in Macon and I found you on Google but found it really tricky to navigate your website\n\nSo I thought I'd make you one!\n\nHere it is: {{DEMO_LINK}}\n\nI've done this for a few other hair salons and especially if their old website was a bit slow or dated they've often suddenly started booking another 5-10 more customers each week.\n\nGiven the area I'd imagine you're missing out on another 1-2k/m in revenue minimum (depending on service cost)\n\nLet me know if you like the website and I'd love to jump on a call to go through it more and change anything to work for you :)\n\nI made the demo to give you an idea of what it could look like but if you want to use it and have it work I generally charge 450-950 as a one-time fee (just so it doesn't come as a shock!)",
      outreach_body_sms: "Hey Dawn, I came across A Hair Sensation and put together a new site for you: {{DEMO_LINK}}\n\nNo obligation, just wanted to show you what it could look like. Happy to jump on a quick call if you're interested — Max",
    };
  }
}

// ── Humanize copy ─────────────────────────────────────────────────────────────

async function humanizeCopyFields(copy: GeneratedCopy): Promise<GeneratedCopy> {
  const { humanizeCopyFields: doHumanize } = await import('../../lib/local-biz/copy-humanizer');

  const fields = {
    hero_subheadline:    copy.hero_subheadline,
    about_text_2:        copy.about_text_2,
    outreach_body_email: copy.outreach_body_email,
    outreach_body_sms:   copy.outreach_body_sms,
  };

  console.log('[test] Humanizing copy (stop-slop + humanizer)...');
  const humanized = await doHumanize(
    fields,
    `Copy for A Hair Sensation — women's hair salon in Macon GA. Owner: Dawn. Est. 2002. Email outreach from Max Fawcett.`,
  );

  return {
    ...copy,
    hero_subheadline:    humanized.hero_subheadline || copy.hero_subheadline,
    about_text_2:        humanized.about_text_2     || copy.about_text_2,
    outreach_body_email: humanized.outreach_body_email || copy.outreach_body_email,
    outreach_body_sms:   humanized.outreach_body_sms  || copy.outreach_body_sms,
  };
}

// ── Store in landing_pages ────────────────────────────────────────────────────

async function storeDemoHtml(html: string, leadId: string): Promise<string> {
  const slugBase = 'a-hair-sensation-macon';
  const slug = `demo-${slugBase}-${Date.now().toString(36)}`;

  const { data, error } = await supabaseAdmin
    .from('landing_pages')
    .insert({
      account_id:       'da99b768-79dd-48f8-af86-abf95e61a69f',
      slug,
      name:             `A Hair Sensation — Website Demo`,
      content:          html,
      page_type:        'website-demo',
      published:        true,
      meta_title:       'A Hair Sensation | Macon Hair Salon',
      meta_description: 'A Hair Sensation — Macon\'s most trusted hair salon since 2002.',
    })
    .select('id, slug')
    .single();

  if (error || !data) throw new Error(`landing_pages insert failed: ${error?.message}`);

  await supabaseAdmin
    .from('local_biz_leads')
    .update({ demo_page_id: data.id })
    .eq('id', leadId);

  return data.slug;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('[test-pipeline] A Hair Sensation — Macon, GA\n');

  // ── Step 1: Screenshot original website ────────────────────────────────────
  console.log('[test-pipeline] 1/5 — Screenshotting original website...');
  const originalScreenshot = await screenshotOriginalSite();

  // ── Step 2: Generate copy ──────────────────────────────────────────────────
  console.log('[test-pipeline] 2/5 — Generating copy...');
  let copy = await generateCopy();
  console.log(`[test-pipeline]  Headline: "${copy.hero_headline} ${copy.hero_headline_em}"`);

  // ── Step 3: Humanize copy ──────────────────────────────────────────────────
  console.log('[test-pipeline] 3/5 — Humanizing copy...');
  copy = await humanizeCopyFields(copy);

  // ── Step 4: Generate demo ──────────────────────────────────────────────────
  console.log('[test-pipeline] 4/5 — Generating demo HTML (with skills + QA loop)...');

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
        website_pain_points: copy.website_pain_points,
        review_insight:    copy.review_insight,
      })
      .select('id')
      .single();
    if (error || !row) throw new Error(error?.message || 'Insert failed');
    leadId = row.id;
  }

  // Generate HTML
  const { generateDemoHtml } = await import('../../lib/local-biz/demo-generator');

  const html = await generateDemoHtml(
    {
      name:    BUSINESS.name,
      type:    BUSINESS.type,
      city:    BUSINESS.city,
      state:   BUSINESS.state,
      phone:   BUSINESS.phone,
      address: BUSINESS.address,
      rating:  BUSINESS.rating,
      reviews: BUSINESS.reviews,
      photos:  BUSINESS.photos,
      hours:   BUSINESS.hours,
    },
    copy,
  );

  // Store
  const slug = await storeDemoHtml(html, leadId);
  const demoUrl = `${APP_URL}/website-demo/${slug}`;
  console.log(`[test-pipeline]  Demo: ${demoUrl}\n`);

  // Save outreach bodies
  const emailBody = copy.outreach_body_email.replace(/\{\{DEMO_LINK\}\}/g, demoUrl);
  const smsBody   = copy.outreach_body_sms.replace(/\{\{DEMO_LINK\}\}/g, demoUrl);

  await supabaseAdmin
    .from('local_biz_leads')
    .update({ outreach_body_email: emailBody, outreach_body_sms: smsBody })
    .eq('id', leadId);

  // ── Step 5: Send Telegram ──────────────────────────────────────────────────
  console.log('[test-pipeline] 5/5 — Sending Telegram...');

  // Send original site screenshot first
  if (originalScreenshot && fs.existsSync(originalScreenshot)) {
    try {
      await sendTelegramPhoto(originalScreenshot, `ORIGINAL: ahairsensation.com (score: ${BUSINESS.website_score}/100)`);
      console.log('[test-pipeline]  ✓ Original screenshot sent');
    } catch (err) {
      console.warn('[test-pipeline]  Original screenshot send failed:', (err as Error).message);
    }
  }

  // Send QA screenshot of the demo (after QA loop fixes applied)
  const qaScreenshot = '/tmp/qa-latest.jpg';
  if (fs.existsSync(qaScreenshot)) {
    try {
      await sendTelegramPhoto(qaScreenshot, `DEMO (after QA loop): ${demoUrl}`);
      console.log('[test-pipeline]  ✓ Demo screenshot sent');
    } catch (err) {
      console.warn('[test-pipeline]  Demo screenshot send failed:', (err as Error).message);
    }
  }

  // Send full email preview
  const fullEmail = `${emailBody}\n\nBest,\nMax Fawcett`;

  const telegramMsg = `📧 <b>TEST — You're Dawn. This email just landed in your inbox.</b>

<b>Business:</b> ${BUSINESS.name} | Score: ${BUSINESS.website_score}/100
<b>Demo:</b> ${demoUrl}
<b>Vibe:</b> ${copy.design_vibe} | <b>Skills used:</b> frontend-design + 10 designer-skills

─────────────────────────────
<b>Subject:</b> Something I built for A Hair Sensation

${escapeHtml(fullEmail)}
─────────────────────────────

<i>Pain points:
• ${copy.website_pain_points.join('\n• ')}</i>
${copy.review_insight ? `\n<i>${copy.review_insight}</i>` : ''}

<b>SMS:</b> ${escapeHtml(smsBody)}`;

  try {
    await sendTelegramText(telegramMsg);
    console.log('[test-pipeline]  ✓ Telegram sent');
  } catch (err) {
    console.error('[test-pipeline]  Telegram failed:', (err as Error).message);
    console.log('\n=== EMAIL ===\n', fullEmail);
  }

  console.log('\n[test-pipeline] Done.');
  console.log(`Demo URL: ${demoUrl}`);
}

main().catch(err => {
  console.error('[test-pipeline] FATAL:', err.message);
  process.exit(1);
});
