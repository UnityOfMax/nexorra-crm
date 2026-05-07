/**
 * Generates 4 demo home pages using v2 builders, writes to /tmp/precall-demos/
 * Run: npx tsx scripts/gen-demo-pages.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { buildRoofingV2AllPages }        from '../lib/local-biz/roofing-builder-v2';
import { buildLandscapingV2AllPages }    from '../lib/local-biz/landscaping-builder-v2';
import { buildKitchenRemodelV2AllPages } from '../lib/local-biz/kitchen-remodel-builder-v2';
import { buildPestControlAllPages }      from '../lib/local-biz/pest-control-builder';
import type { BizPageData }              from '../lib/local-biz/multi-page-builder';

const BASE = 'http://localhost:9991';
const OUT  = '/tmp/precall-demos';
fs.mkdirSync(OUT, { recursive: true });

const roofing: BizPageData = {
  name: 'Summit Roofing Co.',     type: 'Roofing',          businessCategory: 'trades',
  phone: '(555) 482-9901',        address: '1204 Commerce Blvd', city: 'Nashville', state: 'TN',
  rating: 4.9, reviews: 218,
  photos: [
    'https://images.unsplash.com/photo-1632207691143-643e2a9a9361?w=1200&q=85',
    'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=85',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=85',
    'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?w=1200&q=85',
    'https://images.unsplash.com/photo-1512207736890-6ffed8a84e8d?w=1200&q=85',
  ],
  hours: 'Mon–Sat 7am–6pm', colorPrimary: '#dc2626', colorAccent: '#ef4444',
  heroHeadline: 'Roof Replacements', heroHeadlineEm: 'Built to Last.',
  heroSub: 'Licensed & insured roofing in Nashville. Free inspections, storm damage experts, 25-year workmanship warranty.',
  aboutText: "Nashville's Most Trusted Roofers",
  aboutText2: 'Summit Roofing has protected Nashville homes for over 15 years. Storm damage repair to full reroof — quality that stands up to Tennessee weather.',
  ctaText: 'Get a Free Inspection',
  services: [
    { name: 'Roof Replacement', desc: 'Full reroof with premium shingles. Tear-off, underlayment, and clean-up included.', price: 'From $8,500' },
    { name: 'Storm Damage Repair', desc: 'Emergency tarping, insurance claim support, and fast scheduling.', price: 'Free Inspection' },
    { name: 'Roof Repair', desc: 'Fix leaks, replace missing shingles, seal flashing.', price: 'From $350' },
    { name: 'Gutter Replacement', desc: 'Seamless aluminum gutters with leaf guard options.', price: 'From $1,200' },
  ],
  reviewTexts: [
    'Storm took out most of our roof on a Sunday. Summit had a crew and tarps up by Monday morning. Full replacement done by Thursday.',
    'Got three bids. Summit was the only company that climbed on the roof before quoting. No mystery charges.',
    'Replaced our 22-year-old roof in a single day. Crew cleaned every nail from the yard.',
  ],
  yearsInBiz: '15', teamName: 'Marcus',
  team: [{ name: 'Marcus Webb', role: 'Owner & Lead Inspector', bio: 'GAF Master Elite certified.', img: '' }],
};

const landscaping: BizPageData = {
  name: 'GreenSpire Landscaping', type: 'Landscaping', businessCategory: 'trades',
  phone: '(555) 317-4820', address: '88 Oak Creek Drive', city: 'Austin', state: 'TX',
  rating: 4.9, reviews: 184,
  photos: [
    'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1200&q=85',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=85',
    'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=1200&q=85',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=85',
    'https://images.unsplash.com/photo-1574879948818-0b6e87b79099?w=1200&q=85',
  ],
  hours: 'Mon–Sat 7am–5pm', colorPrimary: '#2d8c4e', colorAccent: '#d4a853',
  heroHeadline: 'Outdoor Spaces', heroHeadlineEm: 'That Inspire.',
  heroSub: 'Full-service landscaping design and maintenance in Austin. From garden design to weekly lawn care.',
  aboutText: "Austin's Premier Landscaping Studio",
  aboutText2: 'GreenSpire turns overlooked yards into properties people stop and photograph. Design, installation, and ongoing maintenance.',
  ctaText: 'Get a Free Design Quote',
  services: [
    { name: 'Landscape Design', desc: 'Custom garden plans with 3D renders before a single plant goes in.', price: 'From $1,200' },
    { name: 'Full Installation', desc: 'Planting, turf, hardscaping, and irrigation by our crew.', price: 'From $4,500' },
    { name: 'Weekly Maintenance', desc: 'Mowing, edging, fertilising, and seasonal clean-up.', price: 'From $120/mo' },
    { name: 'Irrigation Systems', desc: 'Smart zone irrigation that cuts water bills year-round.', price: 'From $2,200' },
  ],
  reviewTexts: [
    'They spent two hours walking our property before drawing anything. The final install was exactly what we pictured.',
    'Third season with GreenSpire. The property looks better every year.',
    'Hired them before listing the house. Realtor said best curb appeal in the neighborhood. Sold in four days.',
  ],
  yearsInBiz: '11', teamName: 'Sofia',
  team: [{ name: 'Sofia Reyes', role: 'Lead Designer & Owner', bio: '11 years transforming Austin yards.', img: '' }],
};

const kitchen: BizPageData = {
  name: 'Craft Kitchen Studio', type: 'Kitchen Remodeling', businessCategory: 'trades',
  phone: '(555) 264-7731', address: '540 Industrial Parkway', city: 'Denver', state: 'CO',
  rating: 4.8, reviews: 97,
  photos: [
    'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&q=85',
    'https://images.unsplash.com/photo-1556909212-d5b604d0c90d?w=1200&q=85',
    'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200&q=85',
    'https://images.unsplash.com/photo-1600489000022-c2086d79f9d4?w=1200&q=85',
    'https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=1200&q=85',
  ],
  hours: 'Mon–Fri 8am–5pm', colorPrimary: '#b45309', colorAccent: '#d97706',
  heroHeadline: 'Kitchens', heroHeadlineEm: 'Built to Inspire.',
  heroSub: 'Custom kitchen remodeling in Denver. Design consultation included, full install, no surprise costs.',
  aboutText: "Denver's Craft Kitchen Specialists",
  aboutText2: 'We design and build custom kitchens — cabinets, countertops, lighting, and plumbing. Every project includes a full design consultation.',
  ctaText: 'Get a Free Design Consult',
  services: [
    { name: 'Full Kitchen Remodel', desc: 'Floor-to-ceiling redesign with custom cabinets and countertops.', price: 'From $22,000' },
    { name: 'Cabinet Refacing', desc: 'New doors, drawers, and hardware on existing frames.', price: 'From $6,500' },
    { name: 'Countertop Installation', desc: 'Quartz, granite, marble — templated, cut, and installed.', price: 'From $3,200' },
    { name: 'Kitchen Design', desc: '3D design package with material selection and contractor-ready plans.', price: 'From $1,500' },
  ],
  reviewTexts: [
    'Craft Kitchen took our 1980s galley and turned it into something out of a magazine.',
    'They finished in 18 days. Not a single unresolved punch list item when they handed keys back.',
    'The whole house feels different. Our kitchen is the room we show everyone who visits.',
  ],
  yearsInBiz: '9', teamName: 'James',
  team: [{ name: 'James Hollis', role: 'Owner & Lead Designer', bio: '9 years crafting Denver kitchens.', img: '' }],
};

const pest: BizPageData = {
  name: 'Shield Pest Pro', type: 'Pest Control', businessCategory: 'trades',
  phone: '(555) 893-5512', address: '221 Harbor Rd', city: 'Tampa', state: 'FL',
  rating: 4.9, reviews: 341,
  photos: [
    'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1200&q=85',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=85',
    'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200&q=85',
    'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1200&q=85',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=85',
  ],
  hours: 'Mon–Sat 7am–7pm', colorPrimary: '#15803d', colorAccent: '#22c55e',
  heroHeadline: 'Pest-Free,', heroHeadlineEm: 'Guaranteed.',
  heroSub: "Tampa's top-rated pest control. Termites, roaches, rodents — same-day service available, family-safe treatments.",
  aboutText: "Tampa's Most-Reviewed Pest Control",
  aboutText2: 'Shield Pest Pro has kept Tampa homes pest-free for over a decade. Every treatment is family and pet safe, every technician licensed.',
  ctaText: 'Book a Free Inspection',
  services: [
    { name: 'Termite Treatment', desc: 'Liquid barrier, bait system, or fumigation — whichever the infestation requires.', price: 'From $850' },
    { name: 'General Pest Control', desc: 'Roaches, ants, spiders on a quarterly plan.', price: 'From $89/visit' },
    { name: 'Rodent Exclusion', desc: 'Trap, remove, and seal every entry point. Guaranteed.', price: 'From $450' },
    { name: 'Mosquito Treatment', desc: 'Yard spray that cuts mosquito populations by up to 85%.', price: 'From $75/month' },
  ],
  reviewTexts: [
    'Shield found the termite colony on the first visit — three other companies missed it. Done the next day.',
    'My kids were back in the yard two hours after treatment. That peace of mind means everything.',
    'Four years on their quarterly plan. Not a single roach in a Florida summer.',
  ],
  yearsInBiz: '12', teamName: 'Ray',
  team: [{ name: 'Ray Dominguez', role: 'Owner & Head Technician', bio: 'Licensed Florida pest control operator.', img: '' }],
};

const demos: Array<{ key: string; biz: BizPageData; builder: (b: BizPageData, url: string) => Record<string, string> }> = [
  { key: 'roofing',     biz: roofing,     builder: buildRoofingV2AllPages as any },
  { key: 'landscaping', biz: landscaping, builder: buildLandscapingV2AllPages as any },
  { key: 'kitchen',     biz: kitchen,     builder: buildKitchenRemodelV2AllPages as any },
  { key: 'pest',        biz: pest,        builder: buildPestControlAllPages as any },
];

for (const { key, biz, builder } of demos) {
  try {
    const pages = builder(biz, BASE);
    const html  = pages['home'] || pages[Object.keys(pages)[0]];
    const file  = path.join(OUT, `${key}.html`);
    fs.writeFileSync(file, html);
    console.log(`✓ ${key}: ${Math.round(html.length / 1024)} KB → ${file}`);
  } catch (e: any) {
    console.error(`✗ ${key}: ${e.message}`);
  }
}

console.log('\nDone. Serve with: cd /tmp/precall-demos && python3 -m http.server 9991');
