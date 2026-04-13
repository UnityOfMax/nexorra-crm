/**
 * Spa De Da Day Spa — real business, Douglas GA.
 * 5.0★ (10 reviews) — no real website (just singleplatform listing).
 * Address: 1214 N Peterson Ave Ste L, Douglas, GA 31533
 * Phone:   (912) 383-0259
 * Services: pedicure, manicure, waxing, hair colouring, massages
 * Staff: Ciera, Dawn, Carol
 *
 * Run: set -a && source .env.local && set +a && npx tsx scripts/local-biz/demo-spada.ts
 */

import { createClient } from '@supabase/supabase-js';
import { buildDaySpaAllPages } from '../../lib/local-biz/dayspa-page-builder';
import type { BizPageData, TeamMember } from '../../lib/local-biz/multi-page-builder';
import { generateCopyFast } from '../../lib/local-biz/copy-generator';
import type { LocalBizData } from '../../lib/landing-pages/website-demo-builder';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const NEXORRA_ACCOUNT_ID = 'da99b768-79dd-48f8-af86-abf95e61a69f';

// Spa/wellness Unsplash photos (no GMB photos available for this business)
const PHOTOS = [
  'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=1400&q=80',  // spa treatment room
  'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=1200&q=80',  // foot pedicure
  'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=1200&q=80',  // manicure nails
  'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=1200&q=80',  // spa stones candles
  'https://images.unsplash.com/photo-1560750588-73207b1ef5b8?w=1200&q=80',    // massage table
  'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=1200&q=80', // hair styling
  'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1200&q=80', // beauty treatment
  'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1200&q=80', // spa candles zen
];

const BIZ: LocalBizData = {
  id:               'real-spa-de-da-douglas-ga',
  business_name:    'Spa De Da Day Spa',
  business_type:    'day spa',
  phone:            '(912) 383-0259',
  email:            null,
  website_url:      null,
  address:          '1214 N Peterson Ave Ste L, Douglas, GA 31533',
  city:             'Douglas',
  state_province:   'GA',
  country:          'US',
  gmb_rating:       5.0,
  gmb_reviews:      10,
  gmb_photos:       PHOTOS,
  hours:            'Mon – Fri  9:00 AM – 6:00 PM\nSat  9:00 AM – 4:00 PM\nSun  Closed',
  color_primary:    '#C4848A',
  color_accent:     '#7FA898',
  years_in_business: '10',
  services: [
    {
      name: 'Pedicure',
      desc: 'A relaxing soak, gentle exfoliation, nail shaping, and a finish that leaves your feet feeling brand new. Pure indulgence from start to finish.',
      price: 'From $35',
    },
    {
      name: 'Manicure',
      desc: 'Hand soak, cuticle care, nail shaping, and your choice of polish. A classic treatment that makes every detail shine.',
      price: 'From $20',
    },
    {
      name: 'Hair Colouring',
      desc: 'Full highlights, single process, or balayage — our colourists create natural, beautiful results tailored to your hair type and lifestyle.',
      price: 'From $65',
    },
    {
      name: 'Brazilian Wax',
      desc: 'Professional waxing in a clean, comfortable, private setting. Quick, thorough, and as gentle as possible.',
      price: 'From $50',
    },
    {
      name: 'Haircut',
      desc: "Women's or men's cut tailored to your face shape and style. Includes a relaxing shampoo and blow-dry finish.",
      price: 'From $30',
    },
    {
      name: 'Massage',
      desc: 'Unwind completely with a therapeutic massage designed to release tension and restore calm. Swedish or deep tissue available.',
      price: 'From $60',
    },
  ],
  reviews: [
    {
      text: "Ciera gave me a relaxing pedicure and beautiful manicure. I was in town for doctor appointments and decided on a whim to treat myself — I'm so glad I did. My favourite place in the south.",
      author: 'Teresa P.',
    },
    {
      text: "My twin girls Abby and Hanna got their nails done here and they are the best! We had such a wonderful time. We will always be back.",
      author: 'Michael J.',
    },
    {
      text: "These girls are awesome! Thanks Carol for all you do. We had an amazing day today as always — wouldn't go anywhere else in Douglas.",
      author: 'Rachael D.',
    },
  ],
};

const TEAM: TeamMember[] = [
  { name: 'Ciera', role: 'Senior Nail Technician' },
  { name: 'Dawn',  role: 'Spa Manager & Therapist' },
  { name: 'Carol', role: 'Stylist & Beauty Specialist' },
];

async function main() {
  console.log('Generating copy for Spa De Da...');
  const rawCopy = await generateCopyFast(BIZ);

  const slugBase = 'spa-de-da-douglas';
  const slug = `demo-${slugBase}-${Date.now().toString(36)}`;
  const baseUrl = `/website-demo/${slug}`;

  const bizPageData: BizPageData = {
    name:             'Spa De Da Day Spa',
    type:             'day spa',
    businessCategory: 'spa',
    phone:            BIZ.phone,
    address:          BIZ.address,
    city:             'Douglas',
    state:            'GA',
    rating:           5.0,
    reviews:          10,
    photos:           PHOTOS,
    hours:            BIZ.hours!,
    colorPrimary:     '#C4848A',
    colorAccent:      '#7FA898',
    heroHeadline:     rawCopy.hero_headline    || "Douglas's Favourite",
    heroHeadlineEm:   rawCopy.hero_headline_em || 'Day Spa Escape',
    heroSub:          rawCopy.hero_subheadline || 'A warm, welcoming escape in the heart of Douglas, Georgia.',
    aboutText:        rawCopy.about_text       || 'Your Sanctuary in Douglas',
    aboutText2:       rawCopy.about_text_2     || "Spa De Da has been Douglas's favourite escape for over a decade. Ciera, Dawn, and Carol bring warmth and expertise to every single appointment — pedicures, manicures, waxing, hair, and massage. We take our time because you deserve it.",
    ctaText:          rawCopy.cta_text         || "Call us to book your appointment — we'd love to see you.",
    services:         BIZ.services!.map(s => ({
      name:     s.name,
      desc:     s.desc,
      price:    s.price || '',
      duration: s.name.toLowerCase().includes('massage') ? '60 min' :
                s.name.toLowerCase().includes('colour') || s.name.toLowerCase().includes('highlight') ? '90 min' :
                s.name.toLowerCase().includes('pedicure') ? '45 min' : '30 min',
    })),
    reviewTexts:      BIZ.reviews!.map(r => r.text),
    yearsInBiz:       '10',
    teamName:         'Ciera',
    team:             TEAM,
  };

  console.log('Building 5-page Spa De Da demo...');
  const pages = buildDaySpaAllPages(bizPageData, baseUrl);

  const { data: homePage, error } = await supabaseAdmin
    .from('landing_pages')
    .insert({
      account_id:       NEXORRA_ACCOUNT_ID,
      slug,
      name:             'Spa De Da Day Spa — Website Demo',
      content:          pages.home,
      page_type:        'website-demo',
      published:        true,
      meta_title:       'Spa De Da Day Spa | Douglas, GA',
      meta_description: bizPageData.heroSub,
    })
    .select('id, slug')
    .single();

  if (error || !homePage) throw new Error(`Failed to insert home: ${error?.message}`);

  for (const [pageName, pageHtml] of Object.entries(pages).filter(([k]) => k !== 'home')) {
    const { error: spErr } = await supabaseAdmin
      .from('landing_pages')
      .insert({
        account_id: NEXORRA_ACCOUNT_ID,
        slug:       `${slug}-${pageName}`,
        name:       `Spa De Da — ${pageName.charAt(0).toUpperCase() + pageName.slice(1)}`,
        content:    pageHtml,
        page_type:  'website-demo',
        published:  true,
      });
    if (spErr) console.warn(`Subpage ${pageName} failed: ${spErr.message}`);
  }

  const base = `https://app.ainexorra.com/website-demo/${slug}`;
  console.log(`\n✓ Spa De Da demo built`);
  console.log(`  Home:     ${base}`);
  console.log(`  Services: ${base}-services`);
  console.log(`  Gallery:  ${base}-gallery`);
  console.log(`  Team:     ${base}-about`);
  console.log(`  Booking:  ${base}-booking`);

  console.log('\n' + '─'.repeat(70));
  console.log('OUTREACH — Call (912) 383-0259 or in person');
  console.log('─'.repeat(70));
  console.log(`Hi! We came across Spa De Da on Google — a perfect 5.0 from every review is genuinely rare, and it's clear you've built something special.

We build free demo websites for local spas and salons to show what a proper web presence could look like. We put one together for you:

👉 ${base}

It's got all your services, your team, a gallery, and a booking page — no charge, no strings.

If you ever want to talk about turning it into a real site, give us a call. Otherwise, hope it brings a smile!

— The Nexorra Team`);
  console.log('─'.repeat(70));

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
