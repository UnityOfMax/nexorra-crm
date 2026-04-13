#!/usr/bin/env npx tsx
/**
 * Petra Worker — single process doing the full loop:
 *   Scout one city+type combo → filter → build demo → outreach → repeat
 *
 * Spawned by petra-pipeline.ts. Each worker gets its own Chrome port.
 * Exits when per-worker cap is reached or too many empty scrapes in a row.
 *
 * Args:
 *   --port     <n>   Chrome port (9232–9236)
 *   --worker   <n>   Worker ID (0-based, for logging)
 *   --cap      <n>   Max demos to build this run
 *   --dry-run        Scout only, no demo build or outreach
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(__dirname, '../../.env.local') });

import { createClient } from '@supabase/supabase-js';
import { searchPlaces } from '../../lib/google-maps/scraper';
import { generateCopyFast } from '../../lib/local-biz/copy-generator';
import { buildWebsiteDemo, type LocalBizData } from '../../lib/landing-pages/website-demo-builder';
import { InstantlyClient } from '../../lib/instantly/client';
import { findEmail } from '../../lib/email-finder/client';
import { scrapeFacebookBusiness } from '../../lib/facebook/scraper';
import { analyzeWebsite } from './analyze-website';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const APP_URL   = process.env.NEXT_PUBLIC_APP_URL   || 'https://app.ainexorra.com';
const CALENDLY  = process.env.CALENDLY_BOOKING_URL  || 'https://calendly.com/nexorra/discovery';
const INSTANTLY_CAMPAIGN = process.env.INSTANTLY_LOCAL_BIZ_CAMPAIGN || '';
const NEXORRA_ACCOUNT_ID = 'da99b768-79dd-48f8-af86-abf95e61a69f';

// ── CLI args ─────────────────────────────────────────────────────────────────

function getArg(flag: string, fallback: string): string {
  const idx = process.argv.indexOf(flag);
  return idx >= 0 ? (process.argv[idx + 1] || fallback) : fallback;
}

const CHROME_PORT  = parseInt(getArg('--port',   '9232'));
const WORKER_ID    = parseInt(getArg('--worker',  '0'));
const WORKER_CAP   = parseInt(getArg('--cap',     '60'));
const DRY_RUN      = process.argv.includes('--dry-run');

const W = `[petra-w${WORKER_ID}]`;

// ── City + business type pools ────────────────────────────────────────────────
// Focused on smaller US cities where competition is lower and websites are rarer.

const CITIES = [
  // Southeast — highest density of no-website small businesses
  'Tifton, GA', 'Moultrie, GA', 'Douglas, GA', 'Fitzgerald, GA', 'Valdosta, GA',
  'Statesboro, GA', 'Waycross, GA', 'Thomasville, GA', 'Cordele, GA', 'Jesup, GA',
  'Dothan, AL', 'Enterprise, AL', 'Ozark, AL', 'Andalusia, AL', 'Selma, AL',
  'Tupelo, MS', 'Meridian, MS', 'Laurel, MS', 'Natchez, MS', 'Greenville, MS',
  'Florence, AL', 'Muscle Shoals, AL', 'Gadsden, AL', 'Talladega, AL', 'Anniston, AL',
  'Hattiesburg, MS', 'Biloxi, MS', 'Vicksburg, MS', 'Corinth, MS', 'Columbus, MS',
  'Rocky Mount, NC', 'Goldsboro, NC', 'Wilson, NC', 'Kinston, NC', 'Sanford, NC',
  'Henderson, NC', 'Lumberton, NC', 'Roanoke Rapids, NC', 'Shelby, NC', 'Morganton, NC',
  'Orangeburg, SC', 'Sumter, SC', 'Florence, SC', 'Conway, SC', 'Newberry, SC',
  'Aiken, SC', 'Beaufort, SC', 'Georgetown, SC', 'Gaffney, SC', 'Anderson, SC',
  'Paris, TN', 'Jackson, TN', 'Union City, TN', 'Dyersburg, TN', 'Brownsville, TN',
  'Cookeville, TN', 'Morristown, TN', 'Kingsport, TN', 'Bristol, TN', 'Athens, TN',
  'Opelousas, LA', 'Crowley, LA', 'Ruston, LA', 'Monroe, LA', 'Alexandria, LA',
  'Natchitoches, LA', 'Bogalusa, LA', 'Hammond, LA', 'Houma, LA', 'Morgan City, LA',
  // Midwest small cities
  'Joplin, MO', 'Cape Girardeau, MO', 'Poplar Bluff, MO', 'Sedalia, MO', 'Kirksville, MO',
  'Quincy, IL', 'Decatur, IL', 'Danville, IL', 'Carbondale, IL', 'Galesburg, IL',
  'Owensboro, KY', 'Bowling Green, KY', 'Hopkinsville, KY', 'Paducah, KY', 'Madisonville, KY',
  'Findlay, OH', 'Lima, OH', 'Zanesville, OH', 'Portsmouth, OH', 'Chillicothe, OH',
  'Muncie, IN', 'Anderson, IN', 'Terre Haute, IN', 'Kokomo, IN', 'Bloomington, IN',
  // Plains / rural states
  'Jonesboro, AR', 'Pine Bluff, AR', 'Conway, AR', 'Texarkana, AR', 'Hot Springs, AR',
  'Ardmore, OK', 'Durant, OK', 'Stillwater, OK', 'Enid, OK', 'Muskogee, OK',
  'Amarillo, TX', 'Lubbock, TX', 'Abilene, TX', 'Waco, TX', 'Tyler, TX',
  'Wichita Falls, TX', 'Texarkana, TX', 'Lufkin, TX', 'Nacogdoches, TX', 'Marshall, TX',
];

const BUSINESS_TYPES = [
  'restaurants', 'hair salons', 'barbers', 'nail salons', 'day spas',
  'plumbers', 'electricians', 'HVAC contractors', 'roofers', 'landscapers',
  'dentists', 'chiropractors', 'auto repair shops', 'pet groomers', 'gyms',
  'cleaning services', 'painters', 'florists', 'photographers', 'accountants',
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Chain detection ───────────────────────────────────────────────────────────

const CHAIN_NAMES = new Set([
  'great clips', 'supercuts', 'sport clips', 'fantastic sams', 'cookie cutters',
  'mcdonalds', 'subway', 'starbucks', 'dominos', 'papa johns', 'little caesars',
  'anytime fitness', 'planet fitness', 'snap fitness', 'orangetheory',
  'jiffy lube', 'midas', 'valvoline', 'maaco', 'meineke',
  'h&r block', 'jackson hewitt', 'liberty tax',
  '1-800', 'franchise',
]);

function isChain(name: string, website: string | null): boolean {
  const n = name.toLowerCase();
  if (Array.from(CHAIN_NAMES).some(c => n.includes(c))) return true;
  if (website && /franchise|locations|corporate|national/i.test(website)) return true;
  return false;
}

// ── Lead qualification ────────────────────────────────────────────────────────

function qualifies(place: any): boolean {
  // Must have some presence (phone or place_id at minimum)
  if (!place.name || !place.place_id) return false;
  // Skip if too many reviews (well-established, likely has web presence)
  if ((place.reviews || 0) > 100) return false;
  // Skip chains
  if (isChain(place.name, place.site || null)) return false;
  return true;
}

// ── Website scoring ───────────────────────────────────────────────────────────

async function getWebsiteScore(url: string): Promise<number | null> {
  try {
    return await analyzeWebsite(url);
  } catch {
    return null; // treat as bad website (null = unknown, build demo anyway)
  }
}

// ── Outreach body generation ─────────────────────────────────────────────────

function buildOutreachEmail(biz: { business_name: string; city: string }, demoUrl: string): string {
  return `Hi team,

We came across ${biz.business_name} on Google and were impressed — you clearly take pride in what you do.

We build free demo websites for local businesses like yours to show what a modern web presence could look like. We put one together for you:

👉 ${demoUrl}

No charge, no strings — just wanted to show you what's possible. If you'd like to talk about turning it into a real site, we'd love to help.

— The Nexorra Team`;
}

function buildOutreachSMS(biz: { business_name: string }, demoUrl: string): string {
  return `Hi! We built ${biz.business_name} a free website demo — ${demoUrl} — No catch, just wanted to show you what's possible. Reply if you're interested!`;
}

// ── Main worker loop ─────────────────────────────────────────────────────────

async function run() {
  log(`Starting — Chrome port ${CHROME_PORT}, cap ${WORKER_CAP}${DRY_RUN ? ' [DRY RUN]' : ''}`);

  const instantly = INSTANTLY_CAMPAIGN ? new InstantlyClient() : null;
  let builtCount   = 0;
  let emptyStreak  = 0;
  const MAX_EMPTY  = 8; // 8 combos with no new qualified leads → exit

  while (builtCount < WORKER_CAP) {
    const city = pickRandom(CITIES);
    const type = pickRandom(BUSINESS_TYPES);
    const query = `${type} in ${city}`;

    log(`Searching: ${query}`);

    // ── 1. Scrape GMB ────────────────────────────────────────────────────────
    let places: any[];
    try {
      places = await searchPlaces(query, 20, CHROME_PORT);
    } catch (err) {
      log(`Search failed: ${(err as Error).message}`);
      await sleep(5000);
      continue;
    }

    log(`  ${places.length} results`);

    let foundQualified = false;

    for (const place of places) {
      if (builtCount >= WORKER_CAP) break;
      if (!qualifies(place)) continue;

      // ── 2. Deduplicate against DB ────────────────────────────────────────
      const { data: existing } = await supabaseAdmin
        .from('local_biz_leads')
        .select('id')
        .eq('gmb_place_id', place.place_id)
        .maybeSingle();

      if (existing) continue;

      // ── 3. Website scoring ────────────────────────────────────────────────
      let websiteScore: number | null = null;
      if (place.site) {
        websiteScore = await getWebsiteScore(place.site);
        // Skip businesses with good websites (score >= 60)
        if (websiteScore !== null && websiteScore >= 60) {
          log(`  ⊘ Good website (${websiteScore}): ${place.name}`);
          continue;
        }
      }

      // ── 4. Facebook scraping (for no-website businesses) ─────────────────
      let fbAbout: string | null = null;
      let fbEmail: string | null = null;
      let fbPhotos: string[] = [];
      let fbReviews: string[] = [];

      if (!place.site && place.facebook_url) {
        try {
          const fb = await scrapeFacebookBusiness(place.facebook_url, CHROME_PORT);
          fbAbout   = fb.about_text;
          fbEmail   = fb.email;
          fbPhotos  = fb.photos;
          fbReviews = fb.reviews.map((r: any) => r.text);
        } catch { /* Facebook scrape optional — continue without */ }
      }

      // ── 5. Email enrichment ───────────────────────────────────────────────
      let email: string | null = fbEmail ?? place.email ?? null;
      if (!email && place.site) {
        try {
          email = await findEmail(place.site, place.name, city.split(',')[0]);
        } catch { /* no email found */ }
      }

      const outreachChannel = email ? 'email' : (place.phone ? 'sms' : 'none');
      if (outreachChannel === 'none') {
        log(`  ⊘ No outreach channel: ${place.name}`);
        continue;
      }

      const photos: string[] = fbPhotos.length ? fbPhotos : (place.photos || []);
      const isCanada = city.includes(', ON') || city.includes(', BC') || city.includes(', AB') || city.includes(', QC');

      // ── 6. Insert lead to DB ──────────────────────────────────────────────
      const { data: lead, error: insertError } = await supabaseAdmin
        .from('local_biz_leads')
        .insert({
          gmb_place_id:      place.place_id,
          business_name:     place.name,
          business_type:     type.replace(/s$/, ''),
          phone:             place.phone || null,
          email:             email,
          website_url:       place.site || null,
          address:           place.full_address || null,
          city:              place.city || city.split(',')[0].trim(),
          state_province:    place.state || city.split(',')[1]?.trim() || null,
          country:           isCanada ? 'CA' : 'US',
          gmb_rating:        place.rating || null,
          gmb_reviews:       place.reviews || null,
          gmb_photos:        photos.length > 0 ? photos : null,
          website_score:     websiteScore,
          outreach_channel:  outreachChannel,
          facebook_url:      place.facebook_url || null,
          facebook_photos:   fbPhotos.length > 0 ? fbPhotos : null,
          facebook_about:    fbAbout,
          facebook_email:    fbEmail,
          facebook_reviews:  fbReviews.length > 0 ? fbReviews : null,
        })
        .select('*')
        .single();

      if (insertError || !lead) {
        log(`  ✗ Insert failed: ${place.name} — ${insertError?.message}`);
        continue;
      }

      foundQualified = true;

      if (DRY_RUN) {
        log(`  [DRY RUN] Would build demo for: ${place.name} (${place.city}) — ${outreachChannel}`);
        builtCount++;
        continue;
      }

      // ── 7. Generate copy + build demo ─────────────────────────────────────
      let demoUrl: string;
      try {
        const copy = await generateCopyFast({
          business_name:  lead.business_name,
          business_type:  lead.business_type,
          city:           lead.city,
          state_province: lead.state_province,
          gmb_rating:     lead.gmb_rating,
          gmb_reviews:    lead.gmb_reviews,
          website_url:    lead.website_url,
        });

        const bizData: LocalBizData = {
          id:             lead.id,
          business_name:  lead.business_name,
          business_type:  lead.business_type,
          phone:          lead.phone,
          email:          lead.email,
          website_url:    lead.website_url,
          address:        lead.address,
          city:           lead.city,
          state_province: lead.state_province,
          country:        lead.country || 'US',
          gmb_rating:     lead.gmb_rating,
          gmb_reviews:    lead.gmb_reviews,
          gmb_photos:     photos,
        };

        const pageSlug = await buildWebsiteDemo(bizData, copy);
        demoUrl = `${APP_URL}/website-demo/${pageSlug}`;
      } catch (err) {
        log(`  ✗ Demo build failed: ${lead.business_name} — ${(err as Error).message}`);
        // Remove the lead insert so it can be retried tomorrow
        await supabaseAdmin.from('local_biz_leads').delete().eq('id', lead.id);
        continue;
      }

      // ── 8. Outreach ───────────────────────────────────────────────────────
      const emailBody = buildOutreachEmail(lead, demoUrl);
      const smsBody   = buildOutreachSMS(lead, demoUrl);

      await supabaseAdmin
        .from('local_biz_leads')
        .update({
          outreach_body_email: emailBody,
          outreach_body_sms:   smsBody,
        })
        .eq('id', lead.id);

      if (outreachChannel === 'email' && email && instantly) {
        try {
          await instantly.addLeads(INSTANTLY_CAMPAIGN, [{
            email,
            first_name: lead.business_name.split(' ')[0],
            last_name:  '',
            custom_variables: {
              business_name: lead.business_name,
              city:          lead.city || '',
              email_body:    emailBody,
            },
          }]);
          await supabaseAdmin
            .from('local_biz_leads')
            .update({ email_sent: true, email_sent_at: new Date().toISOString() })
            .eq('id', lead.id);
          log(`  ✓ ${lead.business_name} → ${demoUrl} [email queued]`);
        } catch (err) {
          log(`  ⚠ ${lead.business_name} — demo built but Instantly upload failed: ${(err as Error).message}`);
        }
      } else if (outreachChannel === 'sms') {
        // SMS outreach is time-gated — just mark as ready, sms-outreach.ts sends
        log(`  ✓ ${lead.business_name} → ${demoUrl} [sms queued]`);
      }

      builtCount++;
    }

    if (!foundQualified) {
      emptyStreak++;
      log(`  (no qualified leads — empty streak ${emptyStreak}/${MAX_EMPTY})`);
      if (emptyStreak >= MAX_EMPTY) {
        log(`Too many empty combos in a row. Exiting early (built ${builtCount}/${WORKER_CAP}).`);
        break;
      }
    } else {
      emptyStreak = 0;
    }

    await sleep(2000); // polite delay between GMB scrapes
  }

  log(`Done — built ${builtCount} demos.`);
}

function log(msg: string) {
  console.log(`${W} ${msg}`);
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

run().catch(err => {
  console.error(`${W} FATAL: ${err.message}`);
  process.exit(1);
});
