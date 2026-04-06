#!/usr/bin/env npx tsx
/**
 * Design Inspiration MCP Server
 * Exposes 4 tools to Claude:
 *   - browse_dribbble(style)         — fetch popular web design shots
 *   - browse_godly(category)         — fetch curated godly.website designs
 *   - browse_awwwards(category)      — fetch AWWWWARD-winning sites
 *   - get_inspiration(business_type, vibe) — categorised refs for demo generation
 *
 * Scraping uses Chrome CDP on port 9232 (Petra's Chrome instance).
 * Results cached at /tmp/design-library.json for 24h.
 *
 * Register in .mcp.json:
 *   "design-inspiration": {
 *     "command": "npx",
 *     "args": ["tsx", "/home/max/crm/scripts/mcp/design-inspiration-server.ts"]
 *   }
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import puppeteer from 'puppeteer';
import * as fs from 'fs';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DesignRef {
  source:         'dribbble' | 'godly' | 'awwwards' | 'static';
  title:          string;
  preview_url?:   string;
  color_palette:  string[];
  fonts:          string[];
  layout_pattern: string;
  techniques:     string[];
  vibe_tags:      string[];
  biz_types:      string[];
  description:    string;
}

interface DesignLibraryCache {
  updated_at: string;
  dribbble:   DesignRef[];
  godly:      DesignRef[];
  awwwards:   DesignRef[];
  static:     DesignRef[];
}

// ── Static design library ─────────────────────────────────────────────────────
// Concrete, implementable patterns — one entry per business type × vibe.
// Claude uses these directly in generation prompts.

const STATIC_LIBRARY: DesignRef[] = [
  // ── SALON / SPA ───────────────────────────────────────────────────────────
  {
    source: 'static', title: 'Luxury Editorial Salon',
    color_palette: ['#1E120A', '#F4EFE6', '#C9A96E', '#FDFAF6', '#3D2B1F'],
    fonts: ['Cormorant Garamond (headings, 300–600 weight)', 'DM Sans (body, 400–500)'],
    layout_pattern: 'Split hero: 52% full-bleed portrait photo left, 40% dark espresso text panel right with large serif heading. Dark horizontal service strip (5 items + hours) below hero. 3-col service grid with large numbered watermarks (01–06) and hover border reveal. 4-col asymmetric gallery (tall + wide items). Dark booking form section. Warm about section with owner photo + badge.',
    techniques: ['full-bleed hero split', 'numbered service watermarks', 'hover gold border', 'dark bg booking form', '4-col editorial footer'],
    vibe_tags: ['luxury', 'editorial', 'warm', 'feminine', 'boutique'],
    biz_types: ['salon', 'spa', 'beauty', 'hairdresser', 'nail salon'],
    description: 'Espresso and champagne palette. Cormorant Garamond creates magazine gravitas. Split hero feels like Vogue editorial. Numbered service cards signal prestige.',
  },
  {
    source: 'static', title: 'Playful Fun Salon',
    color_palette: ['#FF6B9D', '#FFE4F0', '#1A1A2E', '#FFB347', '#FFFFFF'],
    fonts: ['Bricolage Grotesque (headings, 700)', 'Inter (body, 400)'],
    layout_pattern: 'Bold full-width hero with illustrated/playful background pattern. Bright card-based service grid with rounded corners and emoji icons. Floating CTA bubble. Colorful review section with large quote marks. Animated gradient booking CTA.',
    techniques: ['rounded card grid', 'gradient CTAs', 'illustrated backgrounds', 'large emoji accents', 'bouncy hover animations'],
    vibe_tags: ['playful', 'fun', 'youthful', 'vibrant', 'energetic'],
    biz_types: ['salon', 'beauty', 'nail salon', 'kids haircut'],
    description: 'Hot pink and amber. Bold rounded typography. Designed to feel like walking into a fun, lively salon. Very different from the luxury template — high energy.',
  },
  // ── BARBER ────────────────────────────────────────────────────────────────
  {
    source: 'static', title: 'Classic Masculine Barber',
    color_palette: ['#1C1C1E', '#2C1810', '#D4AF37', '#F5F0E8', '#8B4513'],
    fonts: ['Bebas Neue (hero headline)', 'DM Serif Display (section headers)', 'Work Sans (body)'],
    layout_pattern: 'Full-width dark hero with barbershop pole stripe detail. Service cards in dark panels with gold pricing. Testimonials on dark background with gold quotation marks. Map/location section with bold serif address. Dark footer with social links.',
    techniques: ['dark editorial panels', 'gold accent typography', 'stripe/geometric details', 'strong grid', 'bold hero typography'],
    vibe_tags: ['masculine', 'classic', 'vintage', 'premium', 'industrial'],
    biz_types: ['barber', 'men grooming', "men's salon"],
    description: 'Dark charcoal with gold. Bebas Neue at 120px for that classic barber poster feel. Every element communicates precision and tradition.',
  },
  // ── RESTAURANT / CAFE ─────────────────────────────────────────────────────
  {
    source: 'static', title: 'Upscale Restaurant',
    color_palette: ['#1A0A00', '#F2E6D0', '#8B6914', '#FDFAF6', '#3D1F00'],
    fonts: ['Playfair Display (headings)', 'Lato (body, 300–400)'],
    layout_pattern: 'Full-bleed moody food photography hero with dark overlay and centered serif headline. Menu preview in 2-col layout with category headers. Chef/story section with side photo and generous whitespace. Reservation form with dark background. Reviews in horizontal scroll.',
    techniques: ['dark photo overlay hero', 'menu grid', 'story split section', 'reservation form', 'horizontal review scroll'],
    vibe_tags: ['upscale', 'luxury', 'moody', 'sophisticated', 'warm'],
    biz_types: ['restaurant', 'fine dining', 'bistro', 'steakhouse'],
    description: 'Rich dark browns with gold accents. Heavy use of full-bleed photography. Playfair Display conveys elegance. Designed for a dining experience, not a fast food joint.',
  },
  {
    source: 'static', title: 'Cozy Independent Cafe',
    color_palette: ['#3D2B1F', '#F7F0E6', '#D4A76A', '#8B6343', '#FFF8F0'],
    fonts: ['Fraunces (display)', 'Plus Jakarta Sans (body)'],
    layout_pattern: 'Warm cream background with handwritten-style headline. Centered hero with cafe ambience photo. Menu in illustrated card grid. "Our Story" section with owner portrait. Loyalty/rewards strip. Footer with opening hours prominently displayed.',
    techniques: ['cream/warm bg', 'illustrated cards', 'story section', 'prominent hours', 'warm gradient accents'],
    vibe_tags: ['cozy', 'warm', 'artisan', 'independent', 'community'],
    biz_types: ['cafe', 'coffee shop', 'bakery', 'tea room'],
    description: 'Warm creams and dark espresso browns. Fraunces gives a handcrafted quality. Feels like a neighbourhood spot, not a chain.',
  },
  // ── FITNESS / WELLNESS ────────────────────────────────────────────────────
  {
    source: 'static', title: 'Premium Fitness Studio',
    color_palette: ['#0A0A0A', '#1A1A1A', '#E8FF00', '#FFFFFF', '#333333'],
    fonts: ['Monument Extended (hero)', 'Neue Haas Grotesk (body)'],
    layout_pattern: 'Dark full-screen hero with athlete photography and electric yellow accent. Class schedule in dark card grid. Trainer profiles in 3-col with hover reveal. Testimonials with before/after or achievement stats. Bold CTA with electric yellow background.',
    techniques: ['dark hero + electric accent', 'class schedule grid', 'trainer profiles', 'achievement stats', 'bold CTA'],
    vibe_tags: ['fitness', 'premium', 'bold', 'energetic', 'performance'],
    biz_types: ['gym', 'fitness studio', 'crossfit', 'personal training'],
    description: 'Black with electric yellow. Monument Extended at full width. High contrast, high energy. Feels like a serious training environment.',
  },
  {
    source: 'static', title: 'Calm Yoga / Wellness Studio',
    color_palette: ['#F5F0E8', '#C8D8CC', '#7B9E87', '#3D5A4A', '#1A2E20'],
    fonts: ['Italiana (headings)', 'Nunito (body, 300–400)'],
    layout_pattern: 'Light airy hero with nature/studio photography. Class offerings in soft card grid with pastel backgrounds. Instructor bios in gentle circular portraits. Testimonial quote section on sage green background. Membership/pricing with soft shadow cards.',
    techniques: ['light airy layout', 'soft pastel cards', 'circular portraits', 'sage green sections', 'generous whitespace'],
    vibe_tags: ['calm', 'wellness', 'organic', 'natural', 'mindful'],
    biz_types: ['yoga studio', 'pilates', 'meditation', 'wellness center'],
    description: 'Sage and cream. Italiana gives a gentle elegance. Generous whitespace mimics the mindful atmosphere of the studio itself.',
  },
  // ── TRADES ────────────────────────────────────────────────────────────────
  {
    source: 'static', title: 'Trustworthy Local Trades',
    color_palette: ['#1B2A4A', '#FFFFFF', '#E8A020', '#F5F7FA', '#2C3E6E'],
    fonts: ['Montserrat (headings, 700–800)', 'Open Sans (body)'],
    layout_pattern: 'Bold navy hero with professional job site photo and clear CTA. Trust signals strip (licensed, insured, years in business, guarantee). Services in icon + description grid. Review badges row (Google, BBB). Service area map or city list. Contact form with large phone number.',
    techniques: ['trust signals strip', 'icon service grid', 'review badges', 'service area list', 'prominent phone number'],
    vibe_tags: ['trustworthy', 'professional', 'reliable', 'local', 'trades'],
    biz_types: ['plumber', 'electrician', 'HVAC', 'roofer', 'landscaper', 'contractor', 'painter'],
    description: 'Navy and amber. Bold Montserrat. Trust signals are the hero — license, insurance, reviews front and center. Built to convert anxious homeowners.',
  },
  // ── PROFESSIONAL SERVICES ─────────────────────────────────────────────────
  {
    source: 'static', title: 'Clean Professional Services',
    color_palette: ['#0F172A', '#FFFFFF', '#3B82F6', '#F8FAFC', '#64748B'],
    fonts: ['DM Sans (headings, 600–700)', 'DM Sans (body, 400)'],
    layout_pattern: 'White background with subtle gradient hero. Value proposition in large text. Services in 2-col feature list with blue checkmarks. Team grid with credentials. Process/how-it-works in numbered steps. Contact form with clean card layout.',
    techniques: ['clean white bg', 'feature list', 'team credentials grid', 'numbered process steps', 'clean card form'],
    vibe_tags: ['professional', 'clean', 'trustworthy', 'modern', 'credible'],
    biz_types: ['accountant', 'lawyer', 'dentist', 'chiropractor', 'financial advisor'],
    description: 'White with blue accents. DM Sans throughout. Professional without being cold. Credentials and process steps build trust methodically.',
  },
  // ── PET SERVICES ──────────────────────────────────────────────────────────
  {
    source: 'static', title: 'Friendly Pet Services',
    color_palette: ['#FFF8F0', '#FF8C42', '#4A90A4', '#F0F7F4', '#2C5F6E'],
    fonts: ['Nunito (headings, 800)', 'Nunito (body, 400)'],
    layout_pattern: 'Warm cream hero with happy pet photography. Service cards with rounded corners and warm orange accents. Before/after pet grooming gallery. Owner/vet credentials. Fun animated booking CTA. Review section with pet owner photos.',
    techniques: ['warm cream bg', 'rounded service cards', 'before/after gallery', 'credentials section', 'animated CTA'],
    vibe_tags: ['friendly', 'warm', 'caring', 'playful', 'trustworthy'],
    biz_types: ['pet groomer', 'dog walker', 'veterinarian', 'pet care'],
    description: 'Warm orange and teal. Rounded Nunito feels approachable and trustworthy. Designed to reassure pet owners their animal is in good hands.',
  },
];

// ── Cache helpers ─────────────────────────────────────────────────────────────

const CACHE_FILE = '/tmp/design-library.json';
const CACHE_TTL = 24 * 60 * 60 * 1000;

function loadCache(): DesignLibraryCache | null {
  try {
    if (!fs.existsSync(CACHE_FILE)) return null;
    const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8')) as DesignLibraryCache;
    if (Date.now() - new Date(data.updated_at).getTime() > CACHE_TTL) return null;
    return data;
  } catch {
    return null;
  }
}

function saveCache(cache: DesignLibraryCache): void {
  try { fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2)); } catch { /* ignore */ }
}

function getOrInitCache(): DesignLibraryCache {
  return loadCache() ?? {
    updated_at: new Date().toISOString(),
    dribbble: [],
    godly: [],
    awwwards: [],
    static: STATIC_LIBRARY,
  };
}

// ── Chrome CDP helpers ────────────────────────────────────────────────────────

const CHROME_PORT = 9232;

async function fetchWithChrome(url: string): Promise<string> {
  let browser;
  try {
    browser = await puppeteer.connect({ browserURL: `http://localhost:${CHROME_PORT}`, defaultViewport: null });
  } catch {
    throw new Error('Chrome not running on port 9232 — start with scripts/chrome-launch-local-biz.sh');
  }

  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));
    return await page.evaluate(() => (document.body as HTMLElement).innerText || '');
  } finally {
    await page.close().catch(() => {});
  }
}

// ── Scrapers ──────────────────────────────────────────────────────────────────

async function scrapeDribbble(style: string): Promise<DesignRef[]> {
  let browser;
  try {
    browser = await puppeteer.connect({ browserURL: `http://localhost:${CHROME_PORT}`, defaultViewport: null });
  } catch {
    return [];
  }

  const page = await browser.newPage();
  try {
    const url = `https://dribbble.com/shots/popular/web-design?q=${encodeURIComponent(style)}`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 3000));

    const shots = await page.evaluate(() => {
      const results: Array<{ title: string; preview_url: string; tags: string[] }> = [];
      document.querySelectorAll('.shot-thumbnail').forEach(el => {
        const title = (el.querySelector('.shot-title') as HTMLElement)?.innerText?.trim() || '';
        const img = (el.querySelector('img') as HTMLImageElement)?.src || '';
        results.push({ title, preview_url: img, tags: [] });
      });
      return results.slice(0, 8);
    });

    return shots.map(s => ({
      source: 'dribbble' as const,
      title: s.title || 'Dribbble design',
      preview_url: s.preview_url,
      color_palette: [],
      fonts: [],
      layout_pattern: `Dribbble design: ${s.title}`,
      techniques: [],
      vibe_tags: [style],
      biz_types: [],
      description: `Popular web design shot from dribbble.com — ${s.title}`,
    }));
  } catch {
    return [];
  } finally {
    await page.close().catch(() => {});
  }
}

async function scrapeGodly(): Promise<DesignRef[]> {
  let browser;
  try {
    browser = await puppeteer.connect({ browserURL: `http://localhost:${CHROME_PORT}`, defaultViewport: null });
  } catch {
    return [];
  }

  const page = await browser.newPage();
  try {
    await page.goto('https://godly.website/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 3000));

    const sites = await page.evaluate(() => {
      const results: Array<{ title: string; preview_url: string }> = [];
      document.querySelectorAll('a[href*="/website/"]').forEach(el => {
        const title = (el as HTMLElement).innerText?.trim() || '';
        const img = (el.querySelector('img') as HTMLImageElement)?.src || '';
        if (title) results.push({ title, preview_url: img });
      });
      return results.slice(0, 8);
    });

    return sites.map(s => ({
      source: 'godly' as const,
      title: s.title,
      preview_url: s.preview_url,
      color_palette: [],
      fonts: [],
      layout_pattern: `Godly.website curated design: ${s.title}`,
      techniques: ['curated from godly.website'],
      vibe_tags: ['modern', 'curated', 'award-worthy'],
      biz_types: [],
      description: `Featured on godly.website — ${s.title}`,
    }));
  } catch {
    return [];
  } finally {
    await page.close().catch(() => {});
  }
}

async function scrapeAwwwards(category: string): Promise<DesignRef[]> {
  let browser;
  try {
    browser = await puppeteer.connect({ browserURL: `http://localhost:${CHROME_PORT}`, defaultViewport: null });
  } catch {
    return [];
  }

  const page = await browser.newPage();
  try {
    await page.goto('https://www.awwwards.com/websites/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 3000));

    const sites = await page.evaluate(() => {
      const results: Array<{ title: string; preview_url: string; tags: string[] }> = [];
      document.querySelectorAll('.mix').forEach(el => {
        const title = (el.querySelector('h2, h3') as HTMLElement)?.innerText?.trim() || '';
        const img = (el.querySelector('img') as HTMLImageElement)?.src || '';
        const tagEls = Array.from(el.querySelectorAll('.label'));
        const tags = tagEls.map(t => (t as HTMLElement).innerText.trim());
        if (title) results.push({ title, preview_url: img, tags });
      });
      return results.slice(0, 8);
    });

    return sites.map(s => ({
      source: 'awwwards' as const,
      title: s.title,
      preview_url: s.preview_url,
      color_palette: [],
      fonts: [],
      layout_pattern: `Awwwards site: ${s.title}`,
      techniques: s.tags,
      vibe_tags: [category, ...s.tags],
      biz_types: [],
      description: `Award-winning design from awwwards.com — ${s.title}`,
    }));
  } catch {
    return [];
  } finally {
    await page.close().catch(() => {});
  }
}

// ── get_inspiration — main tool ───────────────────────────────────────────────

function getInspiration(businessType: string, vibe: string): DesignRef[] {
  const cache = getOrInitCache();
  const allRefs = [...cache.static, ...cache.dribbble, ...cache.godly, ...cache.awwwards];

  const bizType = businessType.toLowerCase();
  const vibeTag = vibe.toLowerCase();

  // Score each ref by match quality
  const scored = allRefs.map(ref => {
    let score = 0;
    if (ref.biz_types.some(b => bizType.includes(b) || b.includes(bizType))) score += 3;
    if (ref.vibe_tags.some(v => vibeTag.includes(v) || v.includes(vibeTag))) score += 2;
    if (ref.source === 'static') score += 1; // static refs have more detail
    return { ref, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // Return top 5, always include at least 1 static ref if available
  const top = scored.slice(0, 5).map(s => s.ref);
  const hasStatic = top.some(r => r.source === 'static');
  if (!hasStatic && cache.static.length > 0) {
    top[top.length - 1] = cache.static[0];
  }

  return top;
}

// ── MCP Server ────────────────────────────────────────────────────────────────

const server = new Server(
  { name: 'design-inspiration', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'browse_dribbble',
      description: 'Fetch popular web design shots from Dribbble matching a style. Returns 5-8 design refs with preview URLs.',
      inputSchema: {
        type: 'object',
        properties: {
          style: { type: 'string', description: 'Style keyword e.g. "luxury salon", "minimal", "playful"' },
        },
        required: ['style'],
      },
    },
    {
      name: 'browse_godly',
      description: 'Fetch curated award-winning web designs from godly.website.',
      inputSchema: {
        type: 'object',
        properties: {
          category: { type: 'string', description: 'Category filter e.g. "agency", "portfolio", "ecommerce"' },
        },
        required: ['category'],
      },
    },
    {
      name: 'browse_awwwards',
      description: 'Fetch award-winning web designs from Awwwards.',
      inputSchema: {
        type: 'object',
        properties: {
          category: { type: 'string', description: 'Category e.g. "restaurant", "fitness", "professional"' },
        },
        required: ['category'],
      },
    },
    {
      name: 'get_inspiration',
      description: 'Get categorised design references for a specific business type and vibe. Returns 4-6 DesignRef objects with concrete color palettes, fonts, layout patterns, and implementation techniques. Use this before generating any demo HTML.',
      inputSchema: {
        type: 'object',
        properties: {
          business_type: { type: 'string', description: 'e.g. "salon", "barber", "restaurant", "gym", "plumber"' },
          vibe:          { type: 'string', description: 'e.g. "luxury", "playful", "clean minimal", "masculine", "warm cozy"' },
        },
        required: ['business_type', 'vibe'],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;

  if (name === 'get_inspiration') {
    const refs = getInspiration(args!.business_type as string, args!.vibe as string);
    return { content: [{ type: 'text', text: JSON.stringify(refs, null, 2) }] };
  }

  if (name === 'browse_dribbble') {
    const cache = getOrInitCache();
    const fresh = await scrapeDribbble(args!.style as string);
    cache.dribbble = [...fresh, ...cache.dribbble].slice(0, 50);
    cache.updated_at = new Date().toISOString();
    saveCache(cache);
    return { content: [{ type: 'text', text: JSON.stringify(fresh, null, 2) }] };
  }

  if (name === 'browse_godly') {
    const cache = getOrInitCache();
    const fresh = await scrapeGodly();
    cache.godly = [...fresh, ...cache.godly].slice(0, 50);
    cache.updated_at = new Date().toISOString();
    saveCache(cache);
    return { content: [{ type: 'text', text: JSON.stringify(fresh, null, 2) }] };
  }

  if (name === 'browse_awwwards') {
    const cache = getOrInitCache();
    const fresh = await scrapeAwwwards(args!.category as string);
    cache.awwwards = [...fresh, ...cache.awwwards].slice(0, 50);
    cache.updated_at = new Date().toISOString();
    saveCache(cache);
    return { content: [{ type: 'text', text: JSON.stringify(fresh, null, 2) }] };
  }

  throw new Error(`Unknown tool: ${name}`);
});

// ── Start ─────────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
server.connect(transport).catch(console.error);
