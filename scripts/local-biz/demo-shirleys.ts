/**
 * Shirley's Soul Food 5th Street Sandwich Shop — real business, Moultrie GA.
 * 4.4★ (40 reviews) — NO website, neighbourhood institution since forever.
 * Address: 203 5th St NW, Moultrie, GA 31768
 * Phone:   (229) 891-2030
 * Open until midnight daily.
 *
 * Run: set -a && source .env.local && set +a && npx tsx scripts/local-biz/demo-shirleys.ts
 */

import { createClient } from '@supabase/supabase-js';
import { buildSoulFoodAllPages } from '../../lib/local-biz/soulfood-page-builder';
import type { BizPageData } from '../../lib/local-biz/multi-page-builder';
import { generateCopyFast } from '../../lib/local-biz/copy-generator';
import type { LocalBizData } from '../../lib/landing-pages/website-demo-builder';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const NEXORRA_ACCOUNT_ID = 'da99b768-79dd-48f8-af86-abf95e61a69f';

// 1 real GMB photo (exterior) + soul food Unsplash photos
const PHOTOS = [
  'https://lh3.googleusercontent.com/gps-cs-s/AHVAweqw7BsKMbkhha4JFHuzX1BkWGk4Q-Ph800Xco4ROt8-8oju-KcZ7TMIJCXMR6iaKtuCtUtbdIcJx59vgKXiXn5F_Nv2UAMsEkXSTiLsZaL2nuxKiFb8Uiu8J042drscGMOoxBU=w1200-h800-k-no',
  'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1200&q=80',   // burger
  'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=1200&q=80',   // fried chicken
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80',   // food platter
  'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=1200&q=80',   // fried chicken platter
  'https://images.unsplash.com/photo-1555992336-03a23c7b20ee?w=1200&q=80',      // waffle chicken
  'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=1200&q=80',   // smash burger
  'https://images.unsplash.com/photo-1562802378-063ec186a863?w=1200&q=80',      // diner burger
];

const BIZ: LocalBizData = {
  id:               'real-shirleys-soul-food-moultrie-ga',
  business_name:    "Shirley's Soul Food 5th Street Sandwich Shop",
  business_type:    'restaurant',
  phone:            '(229) 891-2030',
  email:            null,
  website_url:      null,
  address:          '203 5th St NW, Moultrie, GA 31768',
  city:             'Moultrie',
  state_province:   'GA',
  country:          'US',
  gmb_rating:       4.4,
  gmb_reviews:      40,
  gmb_photos:       PHOTOS,
  hours:            'Mon – Sun  Open until Midnight',
  color_primary:    '#8C1C13',
  color_accent:     '#C8960C',
  years_in_business: '20',
  services: [
    {
      name: 'Double Cheeseburger',
      desc: 'Two stacked beef patties with American cheese, lettuce, tomato, onion, and house sauce on a toasted bun. The one that made Shirley\'s famous.',
      price: 'Ask in store',
    },
    {
      name: 'Triple Cheeseburger',
      desc: 'Three patties, three slices of cheese, all the fixings. For the serious appetite.',
      price: 'Ask in store',
    },
    {
      name: 'Fried Chicken Plate',
      desc: 'Crispy Southern-fried chicken — juicy inside, crunchy out. Served with your choice of two sides.',
      price: 'Ask in store',
    },
    {
      name: 'Soul Food Combo',
      desc: 'Pick your protein and load up on Southern sides. Comfort food the way it was meant to be made.',
      price: 'Ask in store',
    },
    {
      name: 'Sides',
      desc: 'Collard greens, mac & cheese, cornbread, baked beans, coleslaw — rotating daily. All made from scratch.',
      price: 'Ask in store',
    },
    {
      name: 'Sweet Iced Tea',
      desc: "Georgia sweet tea, brewed strong and cold. The way your grandmother made it.",
      price: 'Ask in store',
    },
  ],
  reviews: [
    {
      text: "I'm always looking for the next great burger place. Well folks this place did not disappoint! Had two double cheeseburgers — off the chain. So if you're ever around Moultrie Georgia, check them out. You won't be disappointed.",
      author: 'Ronny A.',
    },
    {
      text: "I love this place and the food and service are A1. I've been eating here since I was a kid and it just keeps getting better. The people are so nice and polite. Best in Moultrie.",
      author: 'John Y.',
    },
    {
      text: "First time customer and new resident to Moultrie. Saw someone eating a delicious hamburger, asked where they got it — they said Shirley's. I went the next day and now I'm a regular.",
      author: 'Rosa B.',
    },
  ],
};

async function main() {
  console.log("Generating copy for Shirley's Soul Food...");
  const rawCopy = await generateCopyFast(BIZ);

  const slugBase = 'shirleys-soul-food-moultrie';
  const slug = `demo-${slugBase}-${Date.now().toString(36)}`;
  const baseUrl = `/website-demo/${slug}`;

  const bizPageData: BizPageData = {
    name:             "Shirley's Soul Food 5th Street Sandwich Shop",
    type:             'restaurant',
    businessCategory: 'restaurant',
    phone:            BIZ.phone,
    address:          BIZ.address,
    city:             'Moultrie',
    state:            'GA',
    rating:           4.4,
    reviews:          40,
    photos:           PHOTOS,
    hours:            'Mon – Sun  Open until Midnight',
    colorPrimary:     '#8C1C13',
    colorAccent:      '#C8960C',
    heroHeadline:     rawCopy.hero_headline    || "Moultrie's Neighbourhood",
    heroHeadlineEm:   rawCopy.hero_headline_em || 'Soul Food Kitchen',
    heroSub:          rawCopy.hero_subheadline || 'Counter-service comfort. Open until midnight. Worth every mile.',
    aboutText:        rawCopy.about_text       || "MOULTRIE'S KITCHEN",
    aboutText2:       rawCopy.about_text_2     || "Shirley's has been feeding Moultrie one plate at a time for over two decades. People come back because the food is real — burgers stacked high, soul food plates that taste like home, and a counter that never closes before midnight.",
    ctaText:          rawCopy.cta_text         || "Come hungry. No reservations needed — just walk up and order.",
    services:         BIZ.services!.map(s => ({
      name:     s.name,
      desc:     s.desc,
      price:    s.price || '',
      duration: '',
    })),
    reviewTexts:      BIZ.reviews!.map(r => r.text),
    yearsInBiz:       '20',
    teamName:         'Shirley',
  };

  console.log("Building 5-page Shirley's demo...");
  const pages = buildSoulFoodAllPages(bizPageData, baseUrl);

  // Insert home page
  const { data: homePage, error } = await supabaseAdmin
    .from('landing_pages')
    .insert({
      account_id:       NEXORRA_ACCOUNT_ID,
      slug,
      name:             "Shirley's Soul Food — Website Demo",
      content:          pages.home,
      page_type:        'website-demo',
      published:        true,
      meta_title:       "Shirley's Soul Food | Moultrie, GA",
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
        name:       `Shirley's Soul Food — ${pageName.charAt(0).toUpperCase() + pageName.slice(1)}`,
        content:    pageHtml,
        page_type:  'website-demo',
        published:  true,
      });
    if (spErr) console.warn(`Subpage ${pageName} failed: ${spErr.message}`);
  }

  const base = `https://app.ainexorra.com/website-demo/${slug}`;
  console.log(`\n✓ Shirley's Soul Food demo built`);
  console.log(`  Home:    ${base}`);
  console.log(`  Menu:    ${base}-services`);
  console.log(`  Gallery: ${base}-gallery`);
  console.log(`  About:   ${base}-about`);
  console.log(`  Find Us: ${base}-booking`);

  console.log('\n' + '─'.repeat(70));
  console.log('OUTREACH (no email — in-person or phone)');
  console.log('─'.repeat(70));
  console.log(`To:   (229) 891-2030 [call or SMS]`);
  console.log('─'.repeat(70));
  console.log(`Hi! We found Shirley's Soul Food on Google — 4.4 stars and a reputation that goes back to when people were kids. You're clearly doing something right.

We build free demo websites for local restaurants to show what a proper web presence could look like. We put one together for you:

👉 ${base}

It's got your full menu, a gallery, your story, and your hours — no charge, no strings.

If you ever want to talk about getting a real site set up, give us a call. Otherwise, hope it puts a smile on your face.

— The Nexorra Team`);
  console.log('─'.repeat(70));

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
