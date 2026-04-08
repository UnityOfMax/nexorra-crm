/**
 * Rebuild A Hair Sensation demo with ALL real data from ahairsensation.com:
 * — 6 stylists with real photos
 * — All 8 services
 * — Products page (6 brands)
 * — Special Events (proms + weddings + occasions)
 * — Community Service page
 *
 * Run: set -a && source .env.local && set +a && npx tsx scripts/local-biz/rebuild-ahs.ts
 */

import { buildWebsiteDemo, type LocalBizData } from '../../lib/landing-pages/website-demo-builder';
import { generateCopyFast } from '../../lib/local-biz/copy-generator';
import type { TeamMember } from '../../lib/local-biz/multi-page-builder';

// Portfolio photos from ahairsensation.com/feat/ (40 unique, newest first)
const PORTFOLIO_PHOTOS = [
  'https://ahairsensation.com/feat/f194.jpg','https://ahairsensation.com/feat/f193.jpg',
  'https://ahairsensation.com/feat/f192.jpg','https://ahairsensation.com/feat/f191.jpg',
  'https://ahairsensation.com/feat/f190.jpg','https://ahairsensation.com/feat/f189.jpg',
  'https://ahairsensation.com/feat/f188.jpg','https://ahairsensation.com/feat/f187.jpg',
  'https://ahairsensation.com/feat/f186.jpg','https://ahairsensation.com/feat/f185.jpg',
  'https://ahairsensation.com/feat/f184.jpg','https://ahairsensation.com/feat/f183.jpg',
  'https://ahairsensation.com/feat/f182.jpg','https://ahairsensation.com/feat/f181.jpg',
  'https://ahairsensation.com/feat/f180.jpg','https://ahairsensation.com/feat/f179.jpg',
  'https://ahairsensation.com/feat/f178.jpg','https://ahairsensation.com/feat/f177.jpg',
  'https://ahairsensation.com/feat/f176.jpg','https://ahairsensation.com/feat/f175.jpg',
  'https://ahairsensation.com/feat/f174.jpg','https://ahairsensation.com/feat/f173.jpg',
  'https://ahairsensation.com/feat/f172.jpg','https://ahairsensation.com/feat/f171.jpg',
  'https://ahairsensation.com/feat/f170.jpg','https://ahairsensation.com/feat/f166.jpg',
  'https://ahairsensation.com/feat/f165.jpg','https://ahairsensation.com/feat/f164.jpg',
  'https://ahairsensation.com/feat/f163.jpg','https://ahairsensation.com/feat/f162.jpg',
  'https://ahairsensation.com/feat/f159.jpg','https://ahairsensation.com/feat/f158.jpg',
  'https://ahairsensation.com/feat/f157.jpg','https://ahairsensation.com/feat/f156.jpg',
  'https://ahairsensation.com/feat/f155.jpg','https://ahairsensation.com/feat/f152.jpg',
  'https://ahairsensation.com/feat/f151.jpg','https://ahairsensation.com/feat/f150.jpg',
  'https://ahairsensation.com/feat/f148.jpg','https://ahairsensation.com/feat/f147.jpg',
];

// Salon interior photos
const SALON_PHOTOS = [
  'https://ahairsensation.com/salonpics/8-27-10pic1S.jpg',
  'https://ahairsensation.com/salonpics/8-27-10pic2S.jpg',
  'https://ahairsensation.com/salonpics/8-27-10pic4S.jpg',
  'https://ahairsensation.com/salonpics/pic3b.jpg',
];

const TEAM: TeamMember[] = [
  { name: 'Dawn', role: 'Owner & Master Stylist', photo: 'https://ahairsensation.com/stylists/Dawn/dawn_8-27-10S2.jpg', bio: 'Dawn founded A Hair Sensation in 2002 and has spent over 20 years building one of Macon\'s most trusted salons. Her passion for colour and precision keeps clients coming back year after year.' },
  { name: 'Billie Jo', role: 'Senior Stylist', photo: 'https://ahairsensation.com/stylists/BillieJo/bj_8-27-10S2.jpg', bio: 'With years of experience at A Hair Sensation, Billie Jo brings skill and warmth to every appointment. Clients love her attention to detail and her ability to truly listen.' },
  { name: 'Pennie', role: 'Stylist', photo: 'https://ahairsensation.com/stylists/Pennie/pennie_8-27-10S2.jpg', bio: 'Pennie is known for her versatility across cuts, colour, and styling — delivering polished results for every hair type and texture.' },
  { name: 'Carrol', role: 'Stylist', photo: 'https://ahairsensation.com/stylists/carol/carolS.jpg', bio: 'Carrol\'s warm chairside manner and consistent results have earned her a loyal following at the salon. Great for clients who want reliability and care in equal measure.' },
  { name: 'Mike', role: 'Stylist', photo: 'https://ahairsensation.com/stylists/Mike/mikes.jpg', bio: 'Mike handles cuts for women, men, and children with equal skill. His precision and friendly approach make every client feel at ease from start to finish.' },
  { name: 'Katy', role: 'Stylist', photo: 'https://ahairsensation.com/stylists/Katy/katyS.jpg', bio: 'Katy specialises in styling and finishing — whether it\'s a blowout, updo, or everyday look, she ensures you leave feeling your best.' },
];

const PROM_PHOTOS = [
  'https://ahairsensation.com/prom-s/p32_small.jpg','https://ahairsensation.com/prom-s/p33_small.jpg',
  'https://ahairsensation.com/prom-s/p34_small.jpg','https://ahairsensation.com/prom-s/p35_small.jpg',
  'https://ahairsensation.com/prom-s/p36_small.jpg','https://ahairsensation.com/prom-s/p37_small.jpg',
  'https://ahairsensation.com/prom-s/p38_small.jpg','https://ahairsensation.com/prom-s/p39_small.jpg',
  'https://ahairsensation.com/prom-s/p40_small.jpg','https://ahairsensation.com/prom-s/p41_small.jpg',
  'https://ahairsensation.com/prom-s/p42_small.jpg','https://ahairsensation.com/prom-s/p43_small.jpg',
  'https://ahairsensation.com/prom-s/p44_small.jpg','https://ahairsensation.com/prom-s/p12_small.jpg',
  'https://ahairsensation.com/prom-s/p13_small.jpg','https://ahairsensation.com/prom-s/p14_small.jpg',
  'https://ahairsensation.com/prom-s/p15_small.jpg','https://ahairsensation.com/prom-s/p16_small.jpg',
  'https://ahairsensation.com/prom-s/p17_small.jpg','https://ahairsensation.com/prom-s/p18_small.jpg',
  'https://ahairsensation.com/prom-s/p19_small.jpg','https://ahairsensation.com/prom-s/p20_small.jpg',
  'https://ahairsensation.com/prom-s/p21_small.jpg','https://ahairsensation.com/prom-s/p22_small.jpg',
];

const WEDDING_PHOTOS = [
  'https://ahairsensation.com/wedding-s/w10_small.jpg','https://ahairsensation.com/wedding-s/w11_small.jpg',
  'https://ahairsensation.com/wedding-s/w12_small.jpg','https://ahairsensation.com/wedding-s/w13_small.jpg',
  'https://ahairsensation.com/wedding-s/w14_small.jpg','https://ahairsensation.com/wedding-s/w15_small.jpg',
  'https://ahairsensation.com/wedding-s/w16_small.jpg','https://ahairsensation.com/wedding-s/w17_small.jpg',
  'https://ahairsensation.com/wedding-s/w18_small.jpg','https://ahairsensation.com/wedding-s/w19_small.jpg',
  'https://ahairsensation.com/wedding-s/w20_small.jpg','https://ahairsensation.com/wedding-s/w21_small.jpg',
  'https://ahairsensation.com/wedding-s/w22_small.jpg','https://ahairsensation.com/wedding-s/w23_small.jpg',
  'https://ahairsensation.com/wedding-s/w24_small.jpg','https://ahairsensation.com/wedding-s/w25_small.jpg',
  'https://ahairsensation.com/wedding-s/w26_small.jpg','https://ahairsensation.com/wedding-s/w27_small.jpg',
  'https://ahairsensation.com/wedding-s/w28_small.jpg','https://ahairsensation.com/wedding-s/w29_small.jpg',
  'https://ahairsensation.com/wedding-s/w30_small.jpg','https://ahairsensation.com/wedding-s/w31_small.jpg',
  'https://ahairsensation.com/wedding-s/w32_small.jpg','https://ahairsensation.com/wedding-s/w33_small.jpg',
];

// Manually construct LocalBizData with all enriched fields
// We bypass generateCopyFast and pass custom copy directly
const AHS: LocalBizData & {
  _team?: TeamMember[];
  _products?: Array<{ name: string; img?: string; desc?: string }>;
  _community?: Array<{ title: string; desc: string }>;
  _specialEvents?: Record<string, unknown>;
  _extraNavLinks?: Array<{ href: string; label: string }>;
} = {
  id: '67138039-be93-4ce0-8dd4-1ad30946cdd1',
  business_name: 'A Hair Sensation',
  business_type: 'hairdresser',
  phone: '(478) 742-1094',
  email: null,
  website_url: 'https://ahairsensation.com',
  address: '2386 Ingleside Ave, Macon, GA 31204',
  city: 'Macon',
  state_province: 'GA',
  country: 'US',
  gmb_rating: 4.8,
  gmb_reviews: 94,
  // Salon interior photos first, then portfolio
  gmb_photos: [...SALON_PHOTOS, ...PORTFOLIO_PHOTOS],
  hours: 'Tue – Sat  8:00 AM – 9:00 PM\nOther days & hours available by appointment',
  color_primary: '#9B6F42',
  color_accent: '#C9A55A',
  hero_headline: 'Macon\'s Full-Service',
  hero_subheadline: 'Six experienced stylists. One warm, welcoming salon in the heart of Ingleside Village.',
  about_text: 'A Macon original since 2002',
  services: [
    { name: 'Coloring', desc: 'Rich, vibrant colour results with expert application and toning — from full colour to subtle dimension.', price: '' },
    { name: 'Cap Highlights', desc: 'Classic highlighting technique for all-over lightness and brightness.', price: '' },
    { name: 'Foil Highlights & Lowlights', desc: 'Precise foil work for multi-tonal dimension and natural-looking depth.', price: '' },
    { name: 'Perms', desc: 'Long-lasting texture and curl, tailored to your hair type and desired result.', price: '' },
    { name: 'Styling', desc: 'Blowout, updo, or everyday style — finished to perfection for any occasion.', price: '' },
    { name: 'Cutting', desc: 'Precision cuts for women, men, and children. Every length, every texture.', price: '' },
    { name: 'Shampoo & Sets', desc: 'Classic shampoo and set service with a professional finish you can count on.', price: '' },
    { name: 'Waxing', desc: 'Quick, effective waxing services for brows, lip, and facial areas.', price: '' },
  ],
  reviews: [
    { text: 'Dawn and her team are absolute professionals. I\'ve been coming here for years and I\'m always amazed at the results.', author: 'Google Reviewer' },
    { text: 'Such a warm, welcoming atmosphere. Everyone on the team is talented and really listens to what you want.', author: 'Google Reviewer' },
    { text: 'Best salon in Macon. I won\'t go anywhere else. 4.8 stars speaks for itself!', author: 'Google Reviewer' },
  ],
  years_in_business: '22',
  cta_text: 'Come see us for the newest trends in hair styling and a warm, inviting smoke-free atmosphere.',
};

// Patch extra fields onto the object (these are read by buildWebsiteDemo via enrichedCopy)
const enrichedCopy = {
  hero_headline: 'Macon\'s Full-Service',
  hero_headline_em: 'Hair Salon',
  hero_subheadline: 'Six experienced stylists. One warm, welcoming salon on Ingleside Avenue.',
  about_text: 'A Macon original since 2002',
  about_text_2: 'In the antique shop district on Ingleside Avenue, across from Ingleside Village Pizza — A Hair Sensation has served Macon families for over two decades. Dawn and her team provide a full range of hair services in a light, cheery, smoke-free atmosphere.',
  cta_text: 'Come see us for the newest trends in hair styling and a warm inviting atmosphere.',
  // These are passed through to BizPageData
  team: TEAM,
  products: [
    { name: 'Moroccan Oil', img: 'https://ahairsensation.com/product_images/moroccan_shampooa.jpg', desc: 'Argan oil-infused haircare for smooth, frizz-free results' },
    { name: 'Moroccan Hydrating', img: 'https://ahairsensation.com/product_images/morrocanoilHydrating.jpg', desc: 'Deep hydration for dry, colour-treated hair' },
    { name: 'Olive Oil', img: 'https://ahairsensation.com/product_images/olive_oil_shampooa.jpg', desc: 'Nourishing olive-based shampoo for strength and shine' },
    { name: 'Matrix', img: 'https://ahairsensation.com/product_images/matrix.gif', desc: 'Professional colour and styling range' },
    { name: 'Graham Webb', img: 'https://ahairsensation.com/product_images/grahamwebba.gif', desc: 'Salon-grade styling and treatment products' },
    { name: 'Mizani', img: 'https://ahairsensation.com/product_images/mizani%20copy.gif', desc: 'Expert formulas for textured and relaxed hair' },
  ],
  community: [
    { title: 'Disney On Ice — Make-A-Wish Princess Tea', desc: 'A Hair Sensation was proud to support the Make-A-Wish Georgia/Alabama Foundation Princess Tea, bringing joy to children and families in our community.' },
    { title: 'Fairy Tale Ball — "Rooms From The Heart"', desc: 'A Hair Sensation participated in the Fairy Tale Ball supporting Rooms From The Heart in 2011, 2012, 2013, 2014, and 2015 — helping to create beautiful spaces for families in need.' },
  ],
  specialEvents: {
    promsText: 'We do hair styling for Proms and other special events. Just call and let us know what you need — we\'ll make sure you look your absolute best for the big night.',
    weddingsText: 'We do special hair styling for the bride and her entire wedding party, providing a formal and consistent look to enhance the beauty of the wedding and photographs. Our stylists will style at our salon or come to your location the morning of the wedding. A pre-wedding style consultation is highly recommended.',
    occasionsItems: [
      'Birthday Parties: Want a unique party for your daughter? Try a salon party at A Hair Sensation. Birthday girls can have their hair styled and/or fingernails done as part of the celebration. We have an area in our salon to accommodate a small party — and we\'re just across the street from Ingleside Pizza!',
      '1st Hair Cut: Call ahead and we\'ll have a First Hair Cut certificate ready to celebrate your child\'s very first cut.',
    ],
    promPhotos: PROM_PHOTOS,
    weddingPhotos: WEDDING_PHOTOS,
  },
} as any;

async function main() {
  console.log('Building A Hair Sensation full demo...');
  const slug = await buildWebsiteDemo(AHS, enrichedCopy);
  const base = `https://app.ainexorra.com/website-demo/${slug}`;
  console.log(`\n✓ A Hair Sensation demo: ${base}`);
  console.log('  Services:  ' + base + '-services');
  console.log('  Gallery:   ' + base + '-gallery');
  console.log('  About:     ' + base + '-about');
  console.log('  Stylists:  ' + base + '-stylists');
  console.log('  Products:  ' + base + '-products');
  console.log('  Events:    ' + base + '-events');
  console.log('  Community: ' + base + '-community');
  console.log('  Booking:   ' + base + '-booking');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
