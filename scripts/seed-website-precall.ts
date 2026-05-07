/**
 * One-time seed: inserts (or replaces) the website precall page into landing_pages.
 *
 * Run once:  npx tsx scripts/seed-website-precall.ts
 *
 * Reads HTML from: scripts/website-precall.html
 * Inserts as slug: website-call-booked  (served at /website-call-booked)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const NEXORRA_ACCT  = 'da99b768-79dd-48f8-af86-abf95e61a69f';

async function seed() {
  const htmlPath = path.join(__dirname, 'website-precall.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  const payload = {
    slug:        'website-call-booked',
    title:       'Website Consultation — Pre-Call Page',
    content:     html,
    published:   true,
    account_id:  NEXORRA_ACCT,
    updated_at:  new Date().toISOString(),
  };

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/landing_pages?slug=eq.website-call-booked`,
    {
      method: 'HEAD',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        Prefer: 'count=exact',
      },
    }
  );
  const exists = res.headers.get('content-range') !== '*/0';

  if (exists) {
    console.log('Row exists — updating...');
    const up = await fetch(
      `${SUPABASE_URL}/rest/v1/landing_pages?slug=eq.website-call-booked`,
      {
        method: 'PATCH',
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify({ content: html, published: true, updated_at: new Date().toISOString() }),
      }
    );
    const data = await up.json();
    console.log('Updated:', JSON.stringify(data).slice(0, 120));
  } else {
    console.log('Row not found — inserting...');
    const ins = await fetch(
      `${SUPABASE_URL}/rest/v1/landing_pages`,
      {
        method: 'POST',
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify(payload),
      }
    );
    const data = await ins.json();
    console.log('Inserted:', JSON.stringify(data).slice(0, 120));
  }

  console.log('\nDone. Page is live at: /website-call-booked');
}

seed().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
