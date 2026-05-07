/**
 * Generates 4 demo home pages using the v2 builders, saves them to /tmp,
 * then screenshots each hero section using Chrome CDP.
 *
 * Run: npx tsx scripts/gen-precall-demo-screenshots.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';

import { buildRoofingV2AllPages }      from '../lib/local-biz/roofing-builder-v2';
import { buildLandscapingV2AllPages }  from '../lib/local-biz/landscaping-builder-v2';
import { buildKitchenRemodelV2AllPages } from '../lib/local-biz/kitchen-remodel-builder-v2';
import { buildPestControlAllPages }    from '../lib/local-biz/pest-control-builder';
import type { BizPageData }            from '../lib/local-biz/multi-page-builder';

// ── Sample business data for each demo ────────────────────────────────────────

const roofingBiz: BizPageData = {
  name: 'Summit Roofing Co.',
  type: 'Roofing',
  businessCategory: 'trades',
  phone: '(555) 482-9901',
  address: '1204 Commerce Blvd',
  city: 'Nashville',
  state: 'TN',
  rating: 4.9,
  reviews: 218,
  photos: [
    'https://images.unsplash.com/photo-1632207691143-643e2a9a9361?w=1200&q=85',
    'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=85',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=85',
    'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?w=1200&q=85',
    'https://images.unsplash.com/photo-1512207736890-6ffed8a84e8d?w=1200&q=85',
  ],
  hours: 'Mon–Sat 7am–6pm',
  colorPrimary: '#dc2626',
  colorAccent:  '#ef4444',
  heroHeadline: 'Roof Replacements',
  heroHeadlineEm: 'Built to Last.',
  heroSub: 'Licensed & insured roofing in Nashville. Free inspections, storm damage experts, 25-year workmanship warranty.',
  aboutText: 'Nashville\'s Most Trusted Roofers',
  aboutText2: 'Summit Roofing has protected Nashville homes for over 15 years. From storm damage repair to full reroof projects, our crew delivers quality that stands up to whatever the Tennessee weather throws at it.',
  ctaText: 'Get a Free Inspection',
  services: [
    { name: 'Roof Replacement', desc: 'Full reroof with premium shingles. Includes tear-off, underlayment, and clean-up.', price: 'From $8,500' },
    { name: 'Storm Damage Repair', desc: 'Emergency tarping, insurance claim support, and fast repair scheduling.', price: 'Free Inspection' },
    { name: 'Roof Repair', desc: 'Fix leaks, replace missing shingles, and seal flashing without a full replacement.', price: 'From $350' },
    { name: 'Gutter Replacement', desc: 'Seamless aluminum gutters with leaf guard options. Installed same day.', price: 'From $1,200' },
  ],
  reviewTexts: [
    'Storm took out most of our roof on a Sunday. Summit had a crew and tarps up by Monday morning. Full replacement done by Thursday. Incredible response.',
    'Got three bids. Summit was the only company that actually climbed on the roof before quoting. No mystery charges, no upsells. Just honest work.',
    'Replaced our 22-year-old roof in a single day. Crew was on site at 7 AM, cleaned up every nail in the yard, gone by 4 PM. Neighbors all asked for their card.',
  ],
  yearsInBiz: '15',
  teamName: 'Marcus',
  team: [
    { name: 'Marcus Webb', role: 'Owner & Lead Inspector', bio: '15 years in roofing. GAF Master Elite certified.', img: '' },
    { name: 'Derek Kim', role: 'Project Manager', bio: 'Coordinates every crew and keeps schedules tight.', img: '' },
  ],
};

const landscapingBiz: BizPageData = {
  name: 'GreenSpire Landscaping',
  type: 'Landscaping',
  businessCategory: 'trades',
  phone: '(555) 317-4820',
  address: '88 Oak Creek Drive',
  city: 'Austin',
  state: 'TX',
  rating: 4.9,
  reviews: 184,
  photos: [
    'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1200&q=85',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=85',
    'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=1200&q=85',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=85',
    'https://images.unsplash.com/photo-1574879948818-0b6e87b79099?w=1200&q=85',
  ],
  hours: 'Mon–Sat 7am–5pm',
  colorPrimary: '#2d8c4e',
  colorAccent:  '#d4a853',
  heroHeadline: 'Outdoor Spaces',
  heroHeadlineEm: 'That Inspire.',
  heroSub: 'Full-service landscaping design and maintenance in Austin. From garden design to weekly lawn care.',
  aboutText: 'Austin\'s Premier Landscaping Studio',
  aboutText2: 'GreenSpire turns overlooked yards into properties people stop and photograph. We handle design, installation, and ongoing maintenance — so you never have to think about your lawn again.',
  ctaText: 'Get a Free Design Quote',
  services: [
    { name: 'Landscape Design', desc: 'Custom garden design plans with 3D renders before a single plant goes in.', price: 'From $1,200' },
    { name: 'Full Installation', desc: 'Planting, turf, hardscaping, and irrigation installed by our own crew.', price: 'From $4,500' },
    { name: 'Weekly Maintenance', desc: 'Mowing, edging, fertilising, and seasonal clean-up on a fixed schedule.', price: 'From $120/mo' },
    { name: 'Irrigation Systems', desc: 'Smart zone irrigation that cuts water bills and keeps plants healthy year-round.', price: 'From $2,200' },
  ],
  reviewTexts: [
    'They spent two hours walking our property before drawing anything. That upfront attention meant the final install was exactly what we pictured.',
    'Third season with GreenSpire. The property looks better every year. They proactively suggested moving some plantings last spring and it made a real difference.',
    'Hired them to redo the front before listing the house. Realtor said it was the best curb appeal she\'d seen in the neighborhood. Sold in four days.',
  ],
  yearsInBiz: '11',
  teamName: 'Sofia',
  team: [
    { name: 'Sofia Reyes', role: 'Lead Designer & Owner', bio: '11 years transforming Austin yards.', img: '' },
    { name: 'Carlos M.', role: 'Installation Lead', bio: 'Expert in hardscape and irrigation.', img: '' },
  ],
};

const kitchenBiz: BizPageData = {
  name: 'Craft Kitchen Studio',
  type: 'Kitchen Remodeling',
  businessCategory: 'trades',
  phone: '(555) 264-7731',
  address: '540 Industrial Parkway',
  city: 'Denver',
  state: 'CO',
  rating: 4.8,
  reviews: 97,
  photos: [
    'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&q=85',
    'https://images.unsplash.com/photo-1556909212-d5b604d0c90d?w=1200&q=85',
    'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200&q=85',
    'https://images.unsplash.com/photo-1600489000022-c2086d79f9d4?w=1200&q=85',
    'https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=1200&q=85',
  ],
  hours: 'Mon–Fri 8am–5pm',
  colorPrimary: '#b45309',
  colorAccent:  '#d97706',
  heroHeadline: 'Kitchens',
  heroHeadlineEm: 'Built to Inspire.',
  heroSub: 'Custom kitchen remodeling in Denver. Design consultation included, full install, no surprise costs.',
  aboutText: 'Denver\'s Craft Kitchen Specialists',
  aboutText2: 'We design and build custom kitchens from scratch — cabinets, countertops, lighting, and plumbing. Every project includes a full design consultation before any work begins.',
  ctaText: 'Get a Free Design Consult',
  services: [
    { name: 'Full Kitchen Remodel', desc: 'Floor-to-ceiling redesign with custom cabinets, countertops, and new layout.', price: 'From $22,000' },
    { name: 'Cabinet Refacing', desc: 'New doors, drawers, and hardware on existing cabinet frames. Fast turnaround.', price: 'From $6,500' },
    { name: 'Countertop Installation', desc: 'Quartz, granite, marble, and butcher block — templated, cut, and installed.', price: 'From $3,200' },
    { name: 'Kitchen Design', desc: 'Full 3D design package with material selection and contractor-ready plans.', price: 'From $1,500' },
  ],
  reviewTexts: [
    'Craft Kitchen took our 1980s galley and turned it into something out of a magazine. They matched every material we showed them on Pinterest and came in under budget.',
    'I was worried a custom kitchen would take months. They finished in 18 days. Not a single unresolved punch list item when they handed keys back.',
    'Our old kitchen had two broken drawers, mismatched appliances, and zero storage. Now it\'s the room we show everyone who visits. The whole house feels different.',
  ],
  yearsInBiz: '9',
  teamName: 'James',
  team: [
    { name: 'James Hollis', role: 'Owner & Lead Designer', bio: '9 years crafting Denver kitchens.', img: '' },
    { name: 'Priya S.', role: 'Interior Design Lead', bio: 'Material selection and space planning.', img: '' },
  ],
};

const pestBiz: BizPageData = {
  name: 'Shield Pest Pro',
  type: 'Pest Control',
  businessCategory: 'trades',
  phone: '(555) 893-5512',
  address: '221 Harbor Rd',
  city: 'Tampa',
  state: 'FL',
  rating: 4.9,
  reviews: 341,
  photos: [
    'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1200&q=85',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=85',
    'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200&q=85',
    'https://images.unsplash.com/photo-1560185007-5f0bb1866cab?w=1200&q=85',
    'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1200&q=85',
  ],
  hours: 'Mon–Sat 7am–7pm',
  colorPrimary: '#15803d',
  colorAccent:  '#22c55e',
  heroHeadline: 'Pest-Free,',
  heroHeadlineEm: 'Guaranteed.',
  heroSub: 'Tampa\'s top-rated pest control. Termites, roaches, rodents — same-day service available, family-safe treatments.',
  aboutText: 'Tampa\'s Most-Reviewed Pest Control',
  aboutText2: 'Shield Pest Pro has kept Tampa homes pest-free for over a decade. Every treatment is family and pet safe, every technician is licensed, and every job comes with a satisfaction guarantee.',
  ctaText: 'Book a Free Inspection',
  services: [
    { name: 'Termite Treatment', desc: 'Liquid barrier, bait system, or fumigation — whichever the infestation requires.', price: 'From $850' },
    { name: 'General Pest Control', desc: 'Roaches, ants, spiders, silverfish — treated and prevented on a quarterly plan.', price: 'From $89/visit' },
    { name: 'Rodent Exclusion', desc: 'Trap, remove, and seal every entry point. No more mice or rats. Guaranteed.', price: 'From $450' },
    { name: 'Mosquito Treatment', desc: 'Yard spray service that cuts mosquito populations by up to 85% within 48 hours.', price: 'From $75/month' },
  ],
  reviewTexts: [
    'We had a serious termite problem that three other companies missed. Shield found the colony on the first visit. Treatment was done the next day. Haven\'t seen one since.',
    'The technician explained every product they used and why. My kids were back in the yard two hours after treatment. That peace of mind means everything.',
    'Four years on their quarterly plan. Not a single roach in a Florida summer. That is basically impossible without them.',
  ],
  yearsInBiz: '12',
  teamName: 'Ray',
  team: [
    { name: 'Ray Dominguez', role: 'Owner & Head Technician', bio: 'Licensed Florida pest control operator, 12 years.', img: '' },
    { name: 'Tanya C.', role: 'Service Manager', bio: 'Schedules every job and handles all follow-ups.', img: '' },
  ],
};

// ── Generate pages and write to /tmp ──────────────────────────────────────────

async function main() {
  const BASE = 'http://localhost:9999';
  const OUT  = '/tmp/precall-demos';
  fs.mkdirSync(OUT, { recursive: true });

  const demos = [
    { key: 'roofing',    biz: roofingBiz,    builder: buildRoofingV2AllPages },
    { key: 'landscaping', biz: landscapingBiz, builder: buildLandscapingV2AllPages },
    { key: 'kitchen',    biz: kitchenBiz,    builder: buildKitchenRemodelV2AllPages },
    { key: 'pest',       biz: pestBiz,       builder: buildPestControlAllPages },
  ];

  for (const { key, biz, builder } of demos) {
    const pages = (builder as any)(biz, BASE);
    const html  = pages['home'] || pages[Object.keys(pages)[0]];
    const file  = path.join(OUT, `${key}.html`);
    fs.writeFileSync(file, html);
    console.log(`Wrote ${file} (${Math.round(html.length / 1024)} KB)`);
  }

  console.log('\nAll 4 demo pages written to /tmp/precall-demos/');
  console.log('Serving on port 9999...');

  // Serve files so Chrome can screenshot them
  const server = http.createServer((req, res) => {
    const file = path.join(OUT, (req.url || '/').replace(/^\//, '') || 'index.html');
    try {
      const content = fs.readFileSync(file);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(content);
    } catch {
      res.writeHead(404); res.end('not found');
    }
  });

  await new Promise<void>(r => server.listen(9999, r));
  console.log('Server ready. Now running screenshots via Chrome CDP...\n');

  // Take screenshots via Chrome CDP
  const CDP_HOST = 'localhost';
  const CDP_PORT = 9222;

  async function cdp(method: string, params: any = {}, sessionId?: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const body = JSON.stringify({ id: 1, method, params, ...(sessionId ? { sessionId } : {}) });
      const options = { host: CDP_HOST, port: CDP_PORT, path: '/json', method: 'GET' };
      // Use websocket via fetch workaround: POST to /json/new
      const req = http.request({ host: CDP_HOST, port: CDP_PORT, path: '/json/new', method: 'PUT' }, res => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => resolve(JSON.parse(data)));
      });
      req.on('error', reject);
      req.end();
    });
  }

  // Simpler: use puppeteer-like CDP via raw websocket
  // Actually, let's use the chrome-tool approach with shell commands
  server.close();
  console.log('Server closed. Use chrome-tool.js to screenshot:');
  for (const { key } of demos) {
    console.log(`  node scripts/chrome-tool.js screenshot http://localhost:9999/${key}.html /tmp/precall-demos/${key}-hero.png`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
