/**
 * Find a real restaurant via Outscraper, build a 5-page demo, and print the outreach email.
 * Searches for high-rated restaurants in a mid-size US city with GMB photos + email.
 *
 * Run: set -a && source .env.local && set +a && npx tsx scripts/local-biz/demo-real-restaurant.ts
 */

import { OutscraperClient } from '../../lib/outscraper/client';
import { buildWebsiteDemo, type LocalBizData } from '../../lib/landing-pages/website-demo-builder';
import { generateCopyFast } from '../../lib/local-biz/copy-generator';
import { findEmail } from '../../lib/email-finder/client';

const outscraper = new OutscraperClient();

// Cities likely to have good GMB coverage + real emails
const SEARCH_TARGETS = [
  'restaurants in Savannah, GA',
  'restaurants in Chattanooga, TN',
  'restaurants in Asheville, NC',
  'restaurants in Bozeman, MT',
];

async function main() {
  let place: any = null;

  for (const query of SEARCH_TARGETS) {
    console.log(`\nSearching: ${query}...`);
    try {
      const results = await outscraper.searchPlaces(query, 20);
      // Filter: 4.3+ stars, 50+ reviews, has photos, has phone
      const candidates = results.filter(r =>
        (r.rating || 0) >= 4.3 &&
        (r.reviews || 0) >= 50 &&
        r.phone &&
        (r.photos?.length || 0) >= 3
      );
      console.log(`  Found ${results.length} results, ${candidates.length} meet criteria`);
      if (candidates.length > 0) {
        // Pick highest review count (most established)
        place = candidates.sort((a, b) => (b.reviews || 0) - (a.reviews || 0))[0];
        break;
      }
    } catch (e: any) {
      console.warn(`  Search failed: ${e.message}`);
    }
  }

  if (!place) {
    console.error('No qualifying restaurant found. Try adjusting search criteria.');
    process.exit(1);
  }

  console.log(`\n✓ Selected: ${place.name}`);
  console.log(`  ${place.full_address}`);
  console.log(`  ★${place.rating} (${place.reviews} reviews)`);
  console.log(`  Photos: ${place.photos?.length || 0}`);
  console.log(`  Phone: ${place.phone}`);
  console.log(`  Website: ${place.site || 'none'}`);

  // Try to find email
  let email: string | null = null;
  if (place.site) {
    console.log('\nLooking for email...');
    try {
      email = await findEmail(place.site, place.name);
      if (email) console.log(`  Email found: ${email}`);
      else console.log('  No email found on website');
    } catch {
      console.log('  Email lookup failed');
    }
  }

  // Build LocalBizData
  const biz: LocalBizData = {
    id:               place.place_id || `outscraper-${Date.now()}`,
    business_name:    place.name,
    business_type:    place.type || 'restaurant',
    phone:            place.phone,
    email:            email,
    website_url:      place.site || null,
    address:          place.full_address,
    city:             place.city,
    state_province:   place.state,
    country:          place.country_code || 'US',
    gmb_rating:       place.rating,
    gmb_reviews:      place.reviews,
    gmb_photos:       place.photos || (place.photo ? [place.photo] : []),
  };

  // Generate copy
  console.log('\nGenerating copy...');
  const copy = await generateCopyFast(biz);
  console.log(`  Headline: ${copy.hero_headline} ${copy.hero_headline_em}`);

  // Build demo
  console.log('\nBuilding 5-page demo...');
  const slug = await buildWebsiteDemo(biz, copy);
  const baseUrl = `https://app.ainexorra.com/website-demo/${slug}`;

  console.log(`\n✓ Demo built: ${baseUrl}`);
  console.log(`  Menu:    ${baseUrl}-services`);
  console.log(`  Gallery: ${baseUrl}-gallery`);
  console.log(`  About:   ${baseUrl}-about`);
  console.log(`  Reserve: ${baseUrl}-booking`);

  // Print the outreach email
  const businessFirst = place.name.split(' ')[0];
  console.log('\n' + '─'.repeat(70));
  console.log('OUTREACH EMAIL:');
  console.log('─'.repeat(70));
  console.log(`To: ${email || '[email not found — use contact form]'}`);
  console.log(`Subject: We built ${place.name} a free website — have a look`);
  console.log('─'.repeat(70));
  console.log(`Hi ${businessFirst},

We came across ${place.name} on Google — ${place.rating} stars from ${place.reviews} reviews is genuinely impressive.

We build free demo websites for local restaurants to show what a modern web presence could look like for you. We made one for ${place.name}:

👉 ${baseUrl}

No strings attached — we just wanted to show you what's possible. If you like it and want to talk about getting a real version set up, we're happy to chat.

${place.phone ? `You can reach us at this number or reply to this email.` : 'Just reply to this email if you want to talk.'}

— The Nexorra Team`);
  console.log('─'.repeat(70));

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
