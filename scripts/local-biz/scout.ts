#!/usr/bin/env npx tsx
/**
 * Petra Phase 1 — Scout
 * Picks random city+type combos, scrapes Google Maps via Outscraper,
 * deduplicates against DB, runs Apollo.io email enrichment, and
 * scores existing websites.
 *
 * Usage: npx tsx scripts/local-biz/scout.ts [--limit 15]
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(__dirname, '../../.env.local') });

import { createClient } from '@supabase/supabase-js';
import { OutscraperClient } from '../../lib/outscraper/client';
import { ApolloClient } from '../../lib/apollo/client';
import { analyzeWebsite } from './analyze-website';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// ─── City pools ─────────────────────────────────────────────────────────────

const US_CITIES: string[] = [
  // Top 5 per state — abbreviated for brevity
  'New York, NY', 'Buffalo, NY', 'Rochester, NY', 'Yonkers, NY', 'Syracuse, NY',
  'Los Angeles, CA', 'San Diego, CA', 'San Jose, CA', 'San Francisco, CA', 'Fresno, CA',
  'Houston, TX', 'San Antonio, TX', 'Dallas, TX', 'Austin, TX', 'Fort Worth, TX',
  'Chicago, IL', 'Aurora, IL', 'Naperville, IL', 'Rockford, IL', 'Joliet, IL',
  'Phoenix, AZ', 'Tucson, AZ', 'Mesa, AZ', 'Chandler, AZ', 'Scottsdale, AZ',
  'Philadelphia, PA', 'Pittsburgh, PA', 'Allentown, PA', 'Erie, PA', 'Reading, PA',
  'Jacksonville, FL', 'Miami, FL', 'Tampa, FL', 'Orlando, FL', 'St Petersburg, FL',
  'Columbus, OH', 'Cleveland, OH', 'Cincinnati, OH', 'Toledo, OH', 'Akron, OH',
  'Charlotte, NC', 'Raleigh, NC', 'Greensboro, NC', 'Durham, NC', 'Winston-Salem, NC',
  'Indianapolis, IN', 'Fort Wayne, IN', 'Evansville, IN', 'South Bend, IN', 'Carmel, IN',
  'Seattle, WA', 'Spokane, WA', 'Tacoma, WA', 'Vancouver, WA', 'Bellevue, WA',
  'Denver, CO', 'Colorado Springs, CO', 'Aurora, CO', 'Fort Collins, CO', 'Lakewood, CO',
  'Nashville, TN', 'Memphis, TN', 'Knoxville, TN', 'Chattanooga, TN', 'Clarksville, TN',
  'Louisville, KY', 'Lexington, KY', 'Bowling Green, KY', 'Owensboro, KY', 'Covington, KY',
  'Portland, OR', 'Salem, OR', 'Eugene, OR', 'Gresham, OR', 'Hillsboro, OR',
  'Las Vegas, NV', 'Henderson, NV', 'Reno, NV', 'North Las Vegas, NV', 'Sparks, NV',
  'Oklahoma City, OK', 'Tulsa, OK', 'Norman, OK', 'Broken Arrow, OK', 'Lawton, OK',
  'Milwaukee, WI', 'Madison, WI', 'Green Bay, WI', 'Kenosha, WI', 'Racine, WI',
  'Albuquerque, NM', 'Las Cruces, NM', 'Rio Rancho, NM', 'Santa Fe, NM', 'Roswell, NM',
  'Tucson, AZ', 'Mesa, AZ', 'Chandler, AZ', 'Glendale, AZ', 'Gilbert, AZ',
  'Baltimore, MD', 'Frederick, MD', 'Rockville, MD', 'Gaithersburg, MD', 'Bowie, MD',
  'Minneapolis, MN', 'Saint Paul, MN', 'Rochester, MN', 'Duluth, MN', 'Brooklyn Park, MN',
  'Atlanta, GA', 'Augusta, GA', 'Columbus, GA', 'Macon, GA', 'Savannah, GA',
  'Kansas City, MO', 'Saint Louis, MO', 'Springfield, MO', 'Columbia, MO', 'Independence, MO',
  'Omaha, NE', 'Lincoln, NE', 'Bellevue, NE', 'Grand Island, NE', 'Kearney, NE',
  'Mesa, AZ', 'Salt Lake City, UT', 'West Valley City, UT', 'Provo, UT', 'West Jordan, UT',
  'Richmond, VA', 'Virginia Beach, VA', 'Norfolk, VA', 'Chesapeake, VA', 'Arlington, VA',
  'Birmingham, AL', 'Montgomery, AL', 'Huntsville, AL', 'Mobile, AL', 'Tuscaloosa, AL',
  'Little Rock, AR', 'Fort Smith, AR', 'Fayetteville, AR', 'Springdale, AR', 'Jonesboro, AR',
  'Baton Rouge, LA', 'New Orleans, LA', 'Shreveport, LA', 'Lafayette, LA', 'Lake Charles, LA',
  'Jackson, MS', 'Gulfport, MS', 'Southaven, MS', 'Hattiesburg, MS', 'Biloxi, MS',
  'Columbia, SC', 'Charleston, SC', 'North Charleston, SC', 'Mount Pleasant, SC', 'Rock Hill, SC',
  'Des Moines, IA', 'Cedar Rapids, IA', 'Davenport, IA', 'Sioux City, IA', 'Iowa City, IA',
  'Wichita, KS', 'Overland Park, KS', 'Kansas City, KS', 'Topeka, KS', 'Olathe, KS',
  'Hartford, CT', 'New Haven, CT', 'Stamford, CT', 'Bridgeport, CT', 'Waterbury, CT',
  'Providence, RI', 'Cranston, RI', 'Warwick, RI', 'Pawtucket, RI', 'East Providence, RI',
  'Burlington, VT', 'Essex, VT', 'South Burlington, VT', 'Colchester, VT', 'Rutland, VT',
  'Manchester, NH', 'Nashua, NH', 'Concord, NH', 'Derry, NH', 'Dover, NH',
  'Portland, ME', 'Lewiston, ME', 'Bangor, ME', 'South Portland, ME', 'Auburn, ME',
  'Boston, MA', 'Worcester, MA', 'Springfield, MA', 'Lowell, MA', 'Cambridge, MA',
  'Newark, NJ', 'Jersey City, NJ', 'Paterson, NJ', 'Elizabeth, NJ', 'Trenton, NJ',
  'Wilmington, DE', 'Dover, DE', 'Newark, DE', 'Middletown, DE', 'Bear, DE',
  'Honolulu, HI', 'Pearl City, HI', 'Hilo, HI', 'Kailua, HI', 'Waipahu, HI',
  'Anchorage, AK', 'Fairbanks, AK', 'Juneau, AK', 'Sitka, AK', 'Ketchikan, AK',
  'Bismarck, ND', 'Fargo, ND', 'Grand Forks, ND', 'Minot, ND', 'West Fargo, ND',
  'Pierre, SD', 'Sioux Falls, SD', 'Rapid City, SD', 'Aberdeen, SD', 'Brookings, SD',
  'Cheyenne, WY', 'Casper, WY', 'Laramie, WY', 'Gillette, WY', 'Rock Springs, WY',
  'Helena, MT', 'Billings, MT', 'Great Falls, MT', 'Missoula, MT', 'Bozeman, MT',
  'Boise, ID', 'Nampa, ID', 'Meridian, ID', 'Idaho Falls, ID', 'Pocatello, ID',
];

const CANADA_CITIES: string[] = [
  // Top 5 per province
  'Toronto, ON', 'Ottawa, ON', 'Mississauga, ON', 'Brampton, ON', 'Hamilton, ON',
  'Montreal, QC', 'Quebec City, QC', 'Laval, QC', 'Gatineau, QC', 'Longueuil, QC',
  'Vancouver, BC', 'Surrey, BC', 'Burnaby, BC', 'Richmond, BC', 'Kelowna, BC',
  'Calgary, AB', 'Edmonton, AB', 'Red Deer, AB', 'Lethbridge, AB', 'St. Albert, AB',
  'Winnipeg, MB', 'Brandon, MB', 'Steinbach, MB', 'Thompson, MB', 'Portage la Prairie, MB',
  'Saskatoon, SK', 'Regina, SK', 'Prince Albert, SK', 'Moose Jaw, SK', 'Swift Current, SK',
  'Halifax, NS', 'Sydney, NS', 'Truro, NS', 'New Glasgow, NS', 'Glace Bay, NS',
  'Fredericton, NB', 'Moncton, NB', 'Saint John, NB', 'Dieppe, NB', 'Miramichi, NB',
  'Charlottetown, PE', 'Summerside, PE', 'Stratford, PE', 'Cornwall, PE', 'Montague, PE',
  "St. John's, NL", 'Mount Pearl, NL', 'Corner Brook, NL', 'Conception Bay South, NL', 'Grand Falls-Windsor, NL',
];

const ALL_CITIES = [...US_CITIES, ...CANADA_CITIES];

const BUSINESS_TYPES: string[] = [
  'hairdressers', 'barbers', 'restaurants', 'cafes', 'gyms', 'yoga studios', 'pilates studios',
  'plumbers', 'electricians', 'HVAC contractors', 'roofers', 'landscapers', 'painters',
  'general contractors', 'dentists', 'chiropractors', 'physiotherapists', 'accountants',
  'law firms', 'real estate agencies', 'car washes', 'auto repair shops', 'pet groomers',
  'dog walkers', 'cleaning services', 'pest control', 'locksmiths', 'photographers',
  'wedding planners', 'florists', 'jewellers',
];

function randomSample<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const limitIdx = args.indexOf('--limit');
  const COMBO_LIMIT = limitIdx >= 0 ? parseInt(args[limitIdx + 1]) : 15;

  const outscraper = new OutscraperClient();
  const apollo = new ApolloClient();

  console.log(`[scout] Starting Petra Phase 1 — scraping ${COMBO_LIMIT} city+type combos`);

  // Pick random city+type combos
  const cities = randomSample(ALL_CITIES, COMBO_LIMIT);
  const types = randomSample(BUSINESS_TYPES, COMBO_LIMIT);
  const combos = cities.map((city, i) => ({ city, type: types[i % types.length] }));

  let totalScraped = 0;
  let totalNew = 0;
  let totalQualified = 0;

  for (const combo of combos) {
    const query = `${combo.type} in ${combo.city}`;
    console.log(`[scout] Searching: ${query}`);

    let places;
    try {
      places = await outscraper.searchPlaces(query, 100);
    } catch (err) {
      console.log(`[scout] Failed: ${(err as Error).message}`);
      continue;
    }

    totalScraped += places.length;
    console.log(`[scout]  → ${places.length} results`);

    for (const place of places) {
      if (!place.place_id || !place.name) continue;

      // Check for existing record
      const { data: existing } = await supabaseAdmin
        .from('local_biz_leads')
        .select('id')
        .eq('gmb_place_id', place.place_id)
        .maybeSingle();

      if (existing) continue;

      totalNew++;

      // Parse photos
      const photos: string[] = [];
      if (place.photo) photos.push(place.photo);
      if (Array.isArray(place.photos)) photos.push(...place.photos.filter(Boolean));

      // Determine country from city string
      const country = CANADA_CITIES.some(c => c.includes(combo.city.split(',')[0].trim())) ? 'CA' : 'US';

      // Insert raw record
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from('local_biz_leads')
        .insert({
          gmb_place_id: place.place_id,
          business_name: place.name,
          business_type: combo.type.replace(/s$/, ''), // singularize
          phone: place.phone || null,
          website_url: place.site || null,
          address: place.full_address || null,
          city: place.city || combo.city.split(',')[0].trim(),
          state_province: place.state || combo.city.split(',')[1]?.trim() || null,
          country,
          gmb_rating: place.rating || null,
          gmb_reviews: place.reviews || null,
          gmb_photos: photos.length > 0 ? photos : null,
        })
        .select('id')
        .single();

      if (insertError || !inserted) {
        console.log(`[scout] Insert failed for ${place.name}: ${insertError?.message}`);
        continue;
      }

      // Website scoring — check if site is bad/missing
      let websiteScore: number | null = null;
      if (place.site) {
        try {
          websiteScore = await analyzeWebsite(place.site);
          await supabaseAdmin
            .from('local_biz_leads')
            .update({ website_score: websiteScore })
            .eq('id', inserted.id);
        } catch (e) {
          // Score stays null — qualifies for demo
        }
      }

      // Qualify: no website OR bad website (score < 50)
      const qualifies = !place.site || websiteScore === null || websiteScore < 50;
      if (!qualifies) continue;

      totalQualified++;

      // Apollo.io email enrichment
      let email: string | null = null;
      if (place.site) {
        try {
          const domain = new URL(place.site).hostname.replace(/^www\./, '');
          const enriched = await apollo.enrichByDomain(domain, place.name);
          email = enriched.email;
        } catch {
          // No domain parseable — try by name
          if (place.city) {
            try {
              const enriched = await apollo.enrichByName(place.name, place.city, place.state || '');
              email = enriched.email;
            } catch {}
          }
        }
      } else if (place.city) {
        try {
          const enriched = await apollo.enrichByName(place.name, place.city, place.state || '');
          email = enriched.email;
        } catch {}
      }

      if (email) {
        await supabaseAdmin
          .from('local_biz_leads')
          .update({
            email,
            outreach_channel: 'email',
          })
          .eq('id', inserted.id);
      } else if (place.phone) {
        await supabaseAdmin
          .from('local_biz_leads')
          .update({ outreach_channel: 'sms' })
          .eq('id', inserted.id);
      } else {
        await supabaseAdmin
          .from('local_biz_leads')
          .update({ outreach_channel: 'none' })
          .eq('id', inserted.id);
      }

      console.log(`[scout]  + ${place.name} (${place.city}) — email: ${email ? '✓' : 'x'}, website: ${websiteScore ?? 'none'}`);

      // Small delay between Apollo calls
      await new Promise(r => setTimeout(r, 500));
    }

    // Polite delay between Outscraper jobs
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log(`\n[scout] Phase 1 Complete:`);
  console.log(`  Scraped: ${totalScraped} | New: ${totalNew} | Qualified: ${totalQualified}`);
}

main().catch(err => {
  console.error('[scout] FATAL:', err.message);
  process.exit(1);
});
