/**
 * 12 Bones Smokehouse South — real business demo.
 * Address: 2350 Hendersonville Rd, Arden, NC 28704
 * Phone:   (828) 687-1395
 * Email:   hello@12bones.com
 * Hours:   11am–8pm, 7 days a week
 * Rating:  4.5 ★ (3,500+ reviews)
 *
 * Run: set -a && source .env.local && set +a && npx tsx scripts/local-biz/demo-12bones.ts
 */

import { buildWebsiteDemo, type LocalBizData } from '../../lib/landing-pages/website-demo-builder';
import { generateCopyFast } from '../../lib/local-biz/copy-generator';

// Reliable BBQ / smokehouse food photos from Unsplash
const PHOTOS = [
  'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&q=80', // smoked brisket close-up
  'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=1200&q=80', // BBQ ribs
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&q=80', // warm restaurant interior
  'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=1200&q=80', // table setting
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80', // dining room
  'https://images.unsplash.com/photo-1550547660-d9450f859349?w=1200&q=80', // pulled pork
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80', // food platter
  'https://images.unsplash.com/photo-1432139509613-5c4255815697?w=1200&q=80', // rustic interior
];

const BIZ: LocalBizData = {
  id:               'real-12bones-smokehouse-south-arden-nc',
  business_name:    '12 Bones Smokehouse',
  business_type:    'restaurant',
  phone:            '(828) 687-1395',
  email:            'hello@12bones.com',
  website_url:      'https://12bones.com',
  address:          '2350 Hendersonville Rd, Arden, NC 28704',
  city:             'Asheville',
  state_province:   'NC',
  country:          'US',
  gmb_rating:       4.5,
  gmb_reviews:      3536,
  gmb_photos:       PHOTOS,
  hours:            'Mon – Sun  11:00 AM – 8:00 PM',
  color_primary:    '#1A1007',
  color_accent:     '#E8920A',
  years_in_business: '20',
  services: [
    {
      name: 'Brown Sugar-Rubbed Ribs',
      desc: 'Slow-smoked baby back ribs with our signature brown sugar rub. Tender, caramelised, and falling off the bone — served with your choice of house sauces.',
      price: 'From $9',
    },
    {
      name: 'Pulled Pork Sandwich',
      desc: 'Smoky hand-pulled pork piled on a toasted bun with jalapeño slaw. Served with chips or your choice of sides.',
      price: '$9.50',
    },
    {
      name: 'Turkey, Bacon & Brie Melt',
      desc: 'Sliced smoked turkey, sugar bacon, and brie cheese with pesto mayo on Texas toast. A house favourite that keeps people coming back.',
      price: '$13',
    },
    {
      name: 'Corn Pudding',
      desc: 'Our legendary side. Rich, creamy, lightly sweet corn pudding — the dish that makes first-timers understand what all the fuss is about.',
      price: 'Side',
    },
    {
      name: 'Jalapeño Cheddar Grits',
      desc: 'Stone-ground grits with sharp cheddar and a slow-building heat from roasted jalapeño. A Southern staple done exactly right.',
      price: 'Side',
    },
    {
      name: 'Smoked Potato Salad',
      desc: 'House-made potato salad with a smoky depth you won\'t find anywhere else. A perfect companion to any plate off the pit.',
      price: 'Side',
    },
  ],
  reviews: [
    {
      text: 'The best BBQ I\'ve ever had, and I\'ve eaten my way across the South. The ribs are unreal — that brown sugar crust is something else. Corn pudding alone is worth the drive.',
      author: 'James R.',
    },
    {
      text: 'Obama ate here and I completely understand why. Everything off the pit is incredible. The jalapeño cheddar grits converted a non-grits person. We waited in line and did not regret a single second.',
      author: 'Sarah M.',
    },
    {
      text: 'This is the kind of place locals are protective of. Perfectly smoked meats, sides that steal the show, and a no-frills atmosphere that lets the food do the talking. Asheville at its best.',
      author: 'Tom K.',
    },
  ],
};

async function main() {
  console.log('Generating copy for 12 Bones Smokehouse...');
  const copy = await generateCopyFast(BIZ);

  const enrichedCopy = {
    ...copy,
    hero_headline:    copy.hero_headline    || 'Asheville\'s Legendary',
    hero_headline_em: copy.hero_headline_em || 'BBQ Smokehouse',
    hero_subheadline: copy.hero_subheadline || 'Slow-smoked over hardwood since 2000. The ribs Obama keeps coming back for.',
    about_text:       copy.about_text       || 'Two decades of smoke and fire',
    about_text_2:     copy.about_text_2     || 'What started as a humble smokehouse in the River Arts District became Asheville\'s most celebrated pit stop. Twenty years later the philosophy hasn\'t changed: good wood, good meat, time, and nothing else. The corn pudding recipe stays secret.',
    cta_text:         copy.cta_text         || 'Come hungry. Order the corn pudding. Thank us later.',
  };

  console.log('Building demo...');
  const slug = await buildWebsiteDemo(BIZ, enrichedCopy);
  const base = `https://app.ainexorra.com/website-demo/${slug}`;

  console.log(`\n✓ 12 Bones Smokehouse demo built`);
  console.log(`  Home:    ${base}`);
  console.log(`  Menu:    ${base}-services`);
  console.log(`  Gallery: ${base}-gallery`);
  console.log(`  About:   ${base}-about`);
  console.log(`  Reserve: ${base}-booking`);

  const DEMO_URL = base;
  console.log('\n' + '─'.repeat(70));
  console.log('OUTREACH EMAIL');
  console.log('─'.repeat(70));
  console.log(`To:      hello@12bones.com`);
  console.log(`Subject: We built 12 Bones a free website — take a look`);
  console.log('─'.repeat(70));
  console.log(`Hi team,

We're big fans of 12 Bones — 4.5 stars from 3,500+ guests doesn't happen by accident, and the reputation speaks for itself.

We build free demo websites for local restaurants to show what a modern web presence could look like. We put one together for you:

👉 ${DEMO_URL}

It's got a full menu page, gallery, your story, and a reservation widget — all built around the smokehouse feel 12 Bones has earned. No obligation, no catch.

If you want to talk about turning it into a real site, we'd love to. Otherwise, hope it puts a smile on your face.

— The Nexorra Team
`);
  console.log('─'.repeat(70));

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
