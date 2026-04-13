/**
 * Bertha's Cocina — real business, Tifton GA.
 * 4.9★ (18 reviews) — NO website, women-owned, Latino-owned.
 * Address: 1401 Tift Ave N, Tifton, GA 31794
 * Phone:   (229) 396-4139
 * No email found — outreach via Facebook DM
 *
 * Run: set -a && source .env.local && set +a && npx tsx scripts/local-biz/demo-berthas-cocina.ts
 */

import { createClient } from '@supabase/supabase-js';
import { buildCocinaAllPages } from '../../lib/local-biz/cocina-page-builder';
import type { BizPageData } from '../../lib/local-biz/multi-page-builder';
import { generateCopyFast } from '../../lib/local-biz/copy-generator';
import type { LocalBizData } from '../../lib/landing-pages/website-demo-builder';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const NEXORRA_ACCOUNT_ID = 'da99b768-79dd-48f8-af86-abf95e61a69f';

// 1 real GMB photo + authentic Mexican food Unsplash photos
const PHOTOS = [
  'https://lh3.googleusercontent.com/gps-cs-s/AHVAweqDR9BvOzajyr0TSdmt3anYYUzvHjyeDF5J4fWyj1JEXxcHld6n72qhNoCjnBLFC7bCwcu_SsEYQESspzHBAfb-FcO3AljaysLcg4Wc7B52IiZZTTcIL5D8SS69ZN_LWAf4mE7qFFkvZjOQ=w1200-h800-k-no',
  'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=1200&q=80', // tacos
  'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=1200&q=80', // Mexican food spread
  'https://images.unsplash.com/photo-1615870216519-2f9fa575fa5c?w=1200&q=80', // street tacos
  'https://images.unsplash.com/photo-1512009983558-d1536f8ad92e?w=1200&q=80', // mexican restaurant interior
  'https://images.unsplash.com/photo-1582234372722-50d7ccc30ebd?w=1200&q=80', // quesadilla
  'https://images.unsplash.com/photo-1624726175512-19b9baf9fbd1?w=1200&q=80', // birria tacos
  'https://images.unsplash.com/photo-1560781290-7dc94c0f8f4f?w=1200&q=80', // guacamole chips
];

const BIZ: LocalBizData = {
  id:               'real-berthas-cocina-tifton-ga',
  business_name:    "Bertha's Cocina",
  business_type:    'restaurant',
  phone:            '(229) 396-4139',
  email:            null,
  website_url:      null,
  address:          '1401 Tift Ave N, Tifton, GA 31794',
  city:             'Tifton',
  state_province:   'GA',
  country:          'US',
  gmb_rating:       4.9,
  gmb_reviews:      18,
  gmb_photos:       PHOTOS,
  hours:            'Mon – Sun  11:00 AM – 9:00 PM\nMonday: Karaoke Night',
  color_primary:    '#7B2D8B',
  color_accent:     '#E53935',
  years_in_business: '2',
  services: [
    {
      name: 'Street Tacos',
      desc: 'Handmade corn tortillas filled with your choice of al pastor, carne asada, barbacoa, or pollo. Topped with onion, cilantro, and salsa verde.',
      price: '$3.50 each',
    },
    {
      name: 'Birria Tacos',
      desc: 'Slow-braised beef in a rich chile broth, stuffed into crispy dipped tortillas with melted cheese. Served with consommé for dipping.',
      price: '$4.50 each',
    },
    {
      name: 'Sopes',
      desc: "Thick handmade masa cakes topped with refried beans, seasoned meat, lettuce, crema, and fresh cheese. A Bertha's favourite.",
      price: '$5 each',
    },
    {
      name: 'Torta',
      desc: 'A hearty Mexican sandwich on a toasted bolillo roll with your choice of meat, avocado, jalapeño, lettuce, tomato, and crema.',
      price: '$10',
    },
    {
      name: 'Quesadilla',
      desc: 'Flour tortilla grilled with Chihuahua cheese and your choice of seasoned meat. Served with crema and pico de gallo.',
      price: '$9',
    },
    {
      name: 'Agua Fresca',
      desc: "Fresh house-made agua frescas, rotating daily. Ask about today's flavour — horchata, tamarindo, or fresh fruit.",
      price: '$3',
    },
  ],
  reviews: [
    {
      text: "The food is truly immaculate and the customer service is top tier. Bertha's is the real deal — authentic, fresh, and made with love. Best tacos in Tifton by a mile.",
      author: 'Marcus J.',
    },
    {
      text: 'Finally a real Mexican restaurant in Tifton. The birria tacos are incredible and the portions are generous. I brought my whole family and everyone left happy.',
      author: 'Rachel T.',
    },
    {
      text: 'Came in on karaoke Monday and had the best time. The food matched the energy — fresh, flavourful, and everything you want from a taco spot. Already planning my return.',
      author: 'David P.',
    },
  ],
};

async function main() {
  console.log("Generating copy for Bertha's Cocina...");
  const rawCopy = await generateCopyFast(BIZ);

  const slugBase = 'berthas-cocina-tifton';
  const slug = `demo-${slugBase}-${Date.now().toString(36)}`;
  const baseUrl = `/website-demo/${slug}`;

  const bizPageData: BizPageData = {
    name:             "Bertha's Cocina",
    type:             'restaurant',
    businessCategory: 'restaurant',
    phone:            BIZ.phone,
    address:          BIZ.address,
    city:             'Tifton',
    state:            'GA',
    rating:           4.9,
    reviews:          18,
    photos:           PHOTOS,
    hours:            'Mon – Sun  11:00 AM – 9:00 PM\nMonday: Karaoke Night',
    colorPrimary:     '#7B2D8B',
    colorAccent:      '#E53935',
    heroHeadline:     rawCopy.hero_headline    || "Tifton's Authentic",
    heroHeadlineEm:   rawCopy.hero_headline_em || 'Mexican Kitchen',
    heroSub:          rawCopy.hero_subheadline || 'Handmade tortillas, slow-braised meats, and family recipes straight from the heart.',
    aboutText:        rawCopy.about_text       || 'Hecho con amor — made with love',
    aboutText2:       rawCopy.about_text_2     || "Bertha's Cocina brings the real flavours of Mexico to Tifton, Georgia. Every tortilla is handmade, every sauce crafted from scratch, and every plate reflects the family tradition behind the kitchen. Women-owned, community-loved.",
    ctaText:          rawCopy.cta_text         || 'Come hungry. Leave happy. Tell your friends.',
    services:         BIZ.services!.map(s => ({
      name:     s.name,
      desc:     s.desc,
      price:    s.price || '',
      duration: '',
    })),
    reviewTexts:      BIZ.reviews!.map(r => r.text),
    yearsInBiz:       '2',
    teamName:         'Bertha',
  };

  console.log('Building 5-page Cocina demo...');
  const pages = buildCocinaAllPages(bizPageData, baseUrl);

  // Insert home page
  const { data: homePage, error } = await supabaseAdmin
    .from('landing_pages')
    .insert({
      account_id:       NEXORRA_ACCOUNT_ID,
      slug,
      name:             "Bertha's Cocina — Website Demo",
      content:          pages.home,
      page_type:        'website-demo',
      published:        true,
      meta_title:       "Bertha's Cocina | Tifton, GA",
      meta_description: bizPageData.heroSub,
    })
    .select('id, slug')
    .single();

  if (error || !homePage) throw new Error(`Failed to insert home: ${error?.message}`);

  // Insert subpages
  const subpages = Object.entries(pages).filter(([k]) => k !== 'home');
  for (const [pageName, pageHtml] of subpages) {
    const { error: spErr } = await supabaseAdmin
      .from('landing_pages')
      .insert({
        account_id: NEXORRA_ACCOUNT_ID,
        slug:       `${slug}-${pageName}`,
        name:       `Bertha's Cocina — ${pageName.charAt(0).toUpperCase() + pageName.slice(1)}`,
        content:    pageHtml,
        page_type:  'website-demo',
        published:  true,
      });
    if (spErr) console.warn(`Subpage ${pageName} failed: ${spErr.message}`);
  }

  const base = `https://app.ainexorra.com/website-demo/${slug}`;
  console.log(`\n✓ Bertha's Cocina demo built`);
  console.log(`  Home:    ${base}`);
  console.log(`  Menu:    ${base}-services`);
  console.log(`  Gallery: ${base}-gallery`);
  console.log(`  About:   ${base}-about`);
  console.log(`  Reserve: ${base}-booking`);
  console.log(`\n  GMB:     https://maps.google.com/?cid=BerthasCocina (no website)`);

  console.log('\n' + '─'.repeat(70));
  console.log('OUTREACH (Facebook DM — no email found)');
  console.log('  → facebook.com/p/Berthas-Cocina-61581651957037');
  console.log('─'.repeat(70));
  console.log(`Hi Bertha! 👋

We came across your restaurant on Google — 4.9 stars is seriously impressive, especially for a place that's still growing its reviews. You're clearly doing something right.

We build free demo websites for local restaurants to show what a proper web presence could look like. We put one together for Bertha's Cocina:

👉 ${base}

It's got your full menu, a gallery, your story, and a reservation page — no charge, no strings. We just wanted to show you what's possible.

If you ever want to talk about getting a real site set up, we'd love to help. Otherwise, hope it brings a smile! 🌮

— The Nexorra Team`);
  console.log('─'.repeat(70));

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
