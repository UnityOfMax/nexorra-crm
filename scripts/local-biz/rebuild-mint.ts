/**
 * Rebuild The Mint Hair Salon demo with fresh/light design.
 * Completely different from A Hair Sensation — Syne font, light bg, forest green + mint palette.
 *
 * Run: set -a && source .env.local && set +a && npx tsx scripts/local-biz/rebuild-mint.ts
 */

import { createClient } from '@supabase/supabase-js';
import { buildMintAllPages, type BizPageData } from '../../lib/local-biz/mint-page-builder';
import type { TeamMember } from '../../lib/local-biz/multi-page-builder';
import { generateCopyFast } from '../../lib/local-biz/copy-generator';
import type { LocalBizData } from '../../lib/landing-pages/website-demo-builder';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const NEXORRA_ACCOUNT_ID = 'da99b768-79dd-48f8-af86-abf95e61a69f';

const MINT_BIZ: LocalBizData = {
  id: 'mint-hair-salon-macon-manual',
  business_name: 'The Mint Hair Salon',
  business_type: 'Hairdresser',
  phone: '+1 478-238-6101',
  email: null,
  website_url: null,
  address: '2360 Ingleside Ave, Macon, GA 31204',
  city: 'Macon',
  state_province: 'GA',
  country: 'US',
  gmb_rating: 4.9,
  gmb_reviews: 35,
  gmb_photos: [
    'https://lh3.googleusercontent.com/gps-cs-s/AHVAweoNfMBeSvFW0RvkVSRUPiGTopY8JWwtuXTwCnoHDNj-cZjbIVC3_wCmoM1N2RrulLXerHHqRpWUsCAHZQfBc2fAAXRaTmAQJWoxyzeRKHuhKb3DjNp1Wr18IxFsMzV4AMrn-qGo=w1200-h800-k-no',
    'https://lh3.googleusercontent.com/gps-cs-s/AHVAweolNnzddq46Zmn_iEsCMulztaKZEh5FUZ6yjue9zysaY4HfKFDBCxTtenNaoLn7rK8mJyi8PB0j58yoHXzhw5EGFGo_qnsS4UBFESEdMbwGgrJkFpOxpXKK5QjGCEJojvaypz_7IQ=w1200-h800-k-no',
    'https://lh3.googleusercontent.com/gps-cs-s/AHVAwepNlC6whPU8xLyT6mjFn8w3c7ngRJ2rwqTMICfbVsBCbc6SMJGVjPS8b-OLWNbghqHEhu2vq0MGZoiVc_aSIslVWPA6O9jdKb1JbWIMfq_I9rC-qXQPPS1pgeu8ypLIXnSI1GccuQ=w1200-h800-k-no',
    'https://lh3.googleusercontent.com/gps-cs-s/AHVAwepRBVx99KyVYWplCbun7R6boCzTYeDrjGoT31r5ngzw7prIcAQZ7p4ym0uGnm291BmuLyhjGCSxQiwHHY0aJ507VsKickNQYMOspwlaJDJkyEdhPEIVbYPgXc1HX0hrab6KeRcpxg=w1200-h800-k-no',
    'https://lh3.googleusercontent.com/gps-cs-s/AHVAweq4pz_9X8N9iEnC-Lu3L9V7gMx6KDRI-t9KFnuC8GcLTTXbV7vfDyIjkeHOPjPTXQ64_06dgSgt_hqr3BBVp-8TZcBUu3nPsDfn11nV5ySDTDp-P6t91XXU58jBUZCurRWhqKA=w1200-h800-k-no',
    'https://lh3.googleusercontent.com/gps-cs-s/AHVAwerLUTiB-mcz_B260bzp3XCJnz5sYhvVTxBP1TqLkyNaNLg671NuQpg1svo0Qn_ZGHz5E_JGe0ddbuEdW5qLdsapgDaLko56LfvNPufgh8fVRJ03pol2aQ5PNwqKkirZyufq5_Xu=w1200-h800-k-no',
    'https://lh3.googleusercontent.com/gps-cs-s/AHVAweovq2sx3apfzQct3nd4SmIpOheUT4FUB1sQ4gv0YoGosI2W4gPIKwNK6I1gYLe5m8zVl4AvnZgWD8ikPVyUyDUz-qUFqCGHCvC4qD5rSt80ir45ssvERmKvGy151f8ZJRAEmU00uC_w_np9=w1200-h800-k-no',
    'https://lh3.googleusercontent.com/gps-cs-s/AHVAweo7C5kpwreLh2sKQ6hjGHDDzNzzIBTi1NDBs83eE6IMOMIJQRb4iFSQ9p6KmEVaTIbN6kUZngphgjkjZAR-NucSdWkKZDdUt41of3vHTQCbPONMhJ_EEBMlU6LVBR0AOcU54cSp=w1200-h800-k-no',
  ],
  hours: 'Tue – Sat  9:00 AM – 6:00 PM',
  services: [
    { name: 'Haircut & Style', desc: 'Precision cut tailored to your face shape and lifestyle', price: 'From $45' },
    { name: 'Colour & Highlights', desc: 'Balayage, foils, full colour — expert blending for a natural finish', price: 'From $85' },
    { name: 'Blowout & Styling', desc: 'Smooth, voluminous blowout or custom styling for any occasion', price: 'From $35' },
    { name: 'Deep Conditioning', desc: 'Restorative treatment to bring shine and softness back to damaged hair', price: 'From $30' },
  ],
  reviews: [
    { text: 'My stylist Brianna is a genius. The whole place is professional and talented — best salon in Macon.', author: 'Laura Moore' },
    { text: 'All the staff are super friendly. Abigayle gives the most amazing head massage, and Jamie always nails my cut. Will be back!', author: 'Ryder Herringdine' },
    { text: 'Had my first appointment with Brandi after a hair disaster. She completely saved it. The atmosphere is warm and welcoming.', author: 'Stephanie Basey' },
  ],
  color_primary: '#1A3A2A',
  color_accent: '#4CAF85',
  years_in_business: '4',
};

const TEAM: TeamMember[] = [
  { name: 'Brianna', role: 'Senior Stylist' },
  { name: 'Jamie', role: 'Stylist' },
  { name: 'Abigayle', role: 'Colour & Shampoo Specialist' },
  { name: 'Brandi', role: 'Stylist' },
];

async function main() {
  console.log('Generating copy for The Mint Hair Salon...');
  const rawCopy = await generateCopyFast(MINT_BIZ);

  const slugBase = 'the-mint-hair-salon';
  const slug = `demo-${slugBase}-${Date.now().toString(36)}`;
  const baseUrl = `/website-demo/${slug}`;

  const bizPageData: BizPageData = {
    name:             'The Mint Hair Salon',
    type:             'Hairdresser',
    businessCategory: 'salon',
    phone:            MINT_BIZ.phone,
    address:          MINT_BIZ.address,
    city:             'Macon',
    state:            'GA',
    rating:           4.9,
    reviews:          35,
    photos:           MINT_BIZ.gmb_photos || [],
    hours:            'Tue – Sat  9:00 AM – 6:00 PM',
    colorPrimary:     '#1A3A2A',
    colorAccent:      '#4CAF85',
    heroHeadline:     rawCopy.hero_headline || 'Macon\'s Favourite',
    heroHeadlineEm:   rawCopy.hero_headline_em || 'Hair Salon',
    heroSub:          rawCopy.hero_subheadline || 'The Mint Hair Salon brings Macon clients the kind of colour, cuts, and care that keeps them coming back.',
    aboutText:        rawCopy.about_text || 'Macon\'s most loved hair salon',
    aboutText2:       rawCopy.about_text_2 || 'With a 4.9-star rating from 35 happy clients in Macon, The Mint has built its reputation one great haircut at a time. Small team, big results.',
    ctaText:          rawCopy.cta_text || 'Book your visit at The Mint and see why Macon keeps coming back.',
    services:         MINT_BIZ.services!.map(s => ({
      name:     s.name,
      desc:     s.desc,
      price:    s.price || '',
      duration: s.name.toLowerCase().includes('colour') || s.name.toLowerCase().includes('highlight') ? '90 min' :
                s.name.toLowerCase().includes('condition') ? '45 min' : '45 min',
    })),
    reviewTexts:      MINT_BIZ.reviews!.map(r => r.text),
    yearsInBiz:       '4',
    teamName:         'Brianna',
    team:             TEAM,
  };

  console.log('Building 5-page Mint demo...');
  const pages = buildMintAllPages(bizPageData, baseUrl);

  // Insert home page
  const { data: homePage, error } = await supabaseAdmin
    .from('landing_pages')
    .insert({
      account_id:       NEXORRA_ACCOUNT_ID,
      slug,
      name:             'The Mint Hair Salon — Website Demo',
      content:          pages.home,
      page_type:        'website-demo',
      published:        true,
      meta_title:       'The Mint Hair Salon | Macon, GA',
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
        name:       `The Mint Hair Salon — ${pageName.charAt(0).toUpperCase() + pageName.slice(1)}`,
        content:    pageHtml,
        page_type:  'website-demo',
        published:  true,
      });
    if (spErr) console.warn(`Subpage ${pageName} failed: ${spErr.message}`);
  }

  const base = `https://app.ainexorra.com/website-demo/${slug}`;
  console.log(`\n✓ The Mint demo: ${base}`);
  console.log('  Services: ' + base + '-services');
  console.log('  Gallery:  ' + base + '-gallery');
  console.log('  About:    ' + base + '-about');
  console.log('  Booking:  ' + base + '-booking');

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
