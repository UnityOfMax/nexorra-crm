/**
 * Test: River Smoke BBQ — restaurant demo using the dark luxury multi-page builder.
 * Demonstrates the pipeline works for restaurant niche (menu highlights, table reservation).
 *
 * Run: set -a && source .env.local && set +a && npx tsx scripts/local-biz/rebuild-restaurant.ts
 */

import { buildWebsiteDemo, type LocalBizData } from '../../lib/landing-pages/website-demo-builder';
import { generateCopyFast } from '../../lib/local-biz/copy-generator';

// Reliable food/restaurant photos from Unsplash
const PHOTOS = [
  'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&q=80', // smoked brisket close-up
  'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=1200&q=80', // BBQ ribs
  'https://images.unsplash.com/photo-1432139509613-5c4255815697?w=1200&q=80', // rustic restaurant interior
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80', // warm dining room
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&q=80',   // restaurant tables
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80', // food platter
  'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=1200&q=80', // table setting
  'https://images.unsplash.com/photo-1550547660-d9450f859349?w=1200&q=80',   // pulled pork
];

const RESTAURANT: LocalBizData = {
  id: 'test-river-smoke-bbq-savannah-ga',
  business_name: 'River Smoke BBQ',
  business_type: 'restaurant',
  phone: '(912) 443-0187',
  email: null,
  website_url: null,
  address: '219 W River St, Savannah, GA 31401',
  city: 'Savannah',
  state_province: 'GA',
  country: 'US',
  gmb_rating: 4.7,
  gmb_reviews: 214,
  gmb_photos: PHOTOS,
  hours: 'Tue – Thu  11:00 AM – 10:00 PM\nFri – Sat  11:00 AM – 11:00 PM\nSun  11:00 AM – 9:00 PM\nMon  Closed',
  color_primary: '#7C3F1E',
  color_accent: '#D4890A',
  years_in_business: '9',
  services: [
    { name: 'Smoked Brisket Platter', desc: 'Slow-smoked over hickory for 14 hours. Served with house slaw, pickled onions, jalapeño, and your choice of two sides.', price: '$28' },
    { name: 'Whole Rack of Ribs', desc: 'Baby back ribs dry-rubbed with our house spice blend and smoked until fall-off-the-bone. Signature BBQ sauce on the side.', price: '$36' },
    { name: 'Pulled Pork Sandwich', desc: 'Smoky slow-pulled pork piled on a toasted brioche bun with house-made vinegar slaw and pickles. Fries included.', price: '$17' },
    { name: 'Smoked Half Chicken', desc: 'Free-range half chicken, spice-rubbed and smoked golden. Served with two sides and cornbread.', price: '$22' },
    { name: 'Pitmaster\'s Board', desc: 'Brisket, ribs, pulled pork — a sampling of everything the pit has to offer. Perfect for sharing. Feeds 2–3.', price: '$58' },
    { name: 'Bourbon Peach Cobbler', desc: 'Warm Georgia peach cobbler with a bourbon caramel drizzle and a scoop of vanilla bean ice cream.', price: '$9' },
  ],
  reviews: [
    { text: 'The brisket here is genuinely the best I\'ve had outside of Texas. Perfectly smoked, incredible bark, melt-in-your-mouth tender. This place is a must.', author: 'Marcus T.' },
    { text: 'Atmosphere is warm and incredible — old brick walls, wood beams, firelight. The ribs disappeared before I could take a photo. We\'ll be back next time we\'re in Savannah.', author: 'Sarah K.' },
    { text: 'Came for the pulled pork, stayed for the cobbler. Staff were so friendly and the portions are massive. Everything tasted like it was made with real care.', author: 'David H.' },
  ],
};

async function main() {
  console.log('Generating copy for River Smoke BBQ...');
  const copy = await generateCopyFast(RESTAURANT);

  // Supplement with restaurant-specific copy
  const enrichedCopy = {
    ...copy,
    hero_headline:    copy.hero_headline || 'Savannah\'s Home of',
    hero_headline_em: copy.hero_headline_em || 'Real Smoked BBQ',
    hero_subheadline: copy.hero_subheadline || 'Low & slow over hickory. River views. Cold beer. The way BBQ was meant to be.',
    about_text:       copy.about_text || 'Pit-fired since 2015',
    about_text_2:     copy.about_text_2 || 'On the banks of the Savannah River, we\'ve been smoking brisket, ribs, and whole chickens the old way — no shortcuts, no timers, just patience and hickory. Nine years in and the pit never cools.',
    cta_text:         copy.cta_text || 'Reserve your table and let the pit do the rest.',
  };

  console.log('Building restaurant demo...');
  const slug = await buildWebsiteDemo(RESTAURANT, enrichedCopy);

  const base = `https://app.ainexorra.com/website-demo/${slug}`;
  console.log(`\n✓ River Smoke BBQ: ${base}`);
  console.log('  Menu:     ' + base + '-services');
  console.log('  Gallery:  ' + base + '-gallery');
  console.log('  About:    ' + base + '-about');
  console.log('  Reserve:  ' + base + '-booking');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
