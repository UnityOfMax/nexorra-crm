/**
 * Prospect Demo Builder
 *
 * Takes scraped research data for a specific lead and builds a personalised
 * demo website using the correct niche template (roofing, pest control, etc.).
 *
 * Pipeline:
 *   1. Load lead from Supabase
 *   2. Select the right builder from source_brokerage
 *   3. Map scraped data → BizPageData
 *   4. Generate any missing copy via claude -p
 *   5. Call builder → get HTML pages
 *   6. Upsert all pages to landing_pages table
 *   7. Write demo_slug back to leads row
 *
 * Usage:
 *   npx tsx scripts/local-biz/research-prospect.ts --lead-id=<uuid>
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { extractBrandColors } from './brand-extractor';
import { detectBizCategory } from '../landing-pages/website-demo-builder';
import { buildPestControlAllPages }      from './pest-control-builder';
import { buildPestControlV2AllPages }    from './pest-control-builder-v2';
import { buildExterminatorAllPages }     from './exterminator-builder';
import { buildExterminatorV2AllPages }   from './exterminator-builder-v2';
import { buildLandscapingAllPages }      from './landscaping-builder';
import { buildLandscapingV2AllPages }    from './landscaping-builder-v2';
import { buildLandscapingV3AllPages }    from './landscaping-builder-v3';
import { buildRoofingAllPages }          from './roofing-builder';
import { buildRoofingV2AllPages }        from './roofing-builder-v2';
import { buildKitchenRemodelAllPages }   from './kitchen-remodel-builder';
import { buildKitchenRemodelV2AllPages } from './kitchen-remodel-builder-v2';
import { buildBathroomRemodelAllPages }  from './bathroom-remodel-builder';
import { buildBathroomRemodelV2AllPages } from './bathroom-remodel-builder-v2';
import { buildAllPages, type BizPageData } from './multi-page-builder';

function pick<T>(...variants: T[]): T {
  return variants[Math.floor(Math.random() * variants.length)];
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const NEXORRA_ACCOUNT_ID = 'da99b768-79dd-48f8-af86-abf95e61a69f';

// ── Builder registry ───────────────────────────────────────────────────────────

function selectBuilder(bizCat: string): (biz: BizPageData, baseUrl: string) => Record<string, string | undefined> {
  switch (bizCat) {
    case 'pest-control':     return pick(buildPestControlAllPages, buildPestControlV2AllPages);
    case 'exterminator':     return pick(buildExterminatorAllPages, buildExterminatorV2AllPages);
    case 'landscaping':      return pick(buildLandscapingAllPages, buildLandscapingV2AllPages, buildLandscapingV3AllPages);
    case 'roofing':          return pick(buildRoofingAllPages, buildRoofingV2AllPages);
    case 'kitchen-remodel':  return pick(buildKitchenRemodelAllPages, buildKitchenRemodelV2AllPages);
    case 'bathroom-remodel': return pick(buildBathroomRemodelAllPages, buildBathroomRemodelV2AllPages);
    default:                 return buildAllPages;
  }
}

// ── Input / output types ───────────────────────────────────────────────────────

export interface ProspectResearchData {
  leadId:        string;
  businessName:  string;
  bizType:       string;           // from source_brokerage, e.g. "roofing contractor"
  phone:         string | null;
  address:       string | null;
  city:          string | null;
  state:         string | null;
  timezone:      string | null;
  website:       string | null;    // their current website URL if found
  // Scraped from Google Maps / GMB
  googleRating:  number | null;
  reviewCount:   number | null;
  reviewTexts:   string[];         // up to 8 real customer reviews
  photos:        string[];         // GMB photo URLs (public CDN)
  hours:         string | null;    // formatted hours string
  // Brand
  colorPrimary:  string | null;    // extracted or null (falls back to niche default)
  colorAccent:   string | null;
  logoUrl:       string | null;
  // AI-generated copy (optional — generated here if empty)
  heroHeadline:  string | null;
  heroSub:       string | null;
  aboutText:     string | null;
  aboutBody:     string | null;
  ctaText:       string | null;
}

export interface ProspectDemoResult {
  slug:        string;
  pageCount:   number;
  demoUrl:     string;
}

// ── Slug generator ─────────────────────────────────────────────────────────────

function makeDemoSlug(businessName: string): string {
  const nameSlug = businessName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 32);
  const uid = randomUUID().slice(0, 8);
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `demo-${date}-${nameSlug}-${uid}`;
}

// ── Copy generation fallback ───────────────────────────────────────────────────

function buildFallbackCopy(data: ProspectResearchData): {
  heroHeadline: string; heroHeadlineEm: string; heroSub: string;
  aboutText: string; aboutText2: string; ctaText: string;
} {
  const city = data.city || 'the area';
  const state = data.state || '';
  const location = state ? `${city}, ${state}` : city;
  const biz = data.businessName;
  const type = (data.bizType || 'home services').toLowerCase();

  const templates: Record<string, ReturnType<typeof buildFallbackCopy>> = {
    'roofing': {
      heroHeadline: biz, heroHeadlineEm: `${location}'s Trusted Roofers.`,
      heroSub: `Premium roofing installation and repair in ${location}. Free inspections.`,
      aboutText: `Protecting ${location} Homes Since Day One`,
      aboutText2: `${biz} has built a reputation for quality craftsmanship, reliable timelines, and work that stands up to whatever the weather brings.`,
      ctaText: 'Get your free roof inspection today.',
    },
    'pest control': {
      heroHeadline: biz, heroHeadlineEm: `${location}'s Pest Experts.`,
      heroSub: `Protecting homes and businesses across ${location} from pests of every kind.`,
      aboutText: `${location}'s Most Trusted Pest Professionals`,
      aboutText2: `${biz} uses proven, EPA-approved methods to eliminate pests and keep them gone. We stand behind every treatment.`,
      ctaText: 'Get a free inspection today.',
    },
    'landscaping': {
      heroHeadline: biz, heroHeadlineEm: `${location}'s Landscape Experts.`,
      heroSub: `Premium landscape design and installation across ${location}.`,
      aboutText: `Transforming ${location} Outdoor Spaces`,
      aboutText2: `${biz} brings together design expertise and skilled installation to create outdoor environments that look great and last for years.`,
      ctaText: 'Request your free consultation.',
    },
  };

  for (const [key, copy] of Object.entries(templates)) {
    if (type.includes(key)) return copy;
  }

  return {
    heroHeadline: biz, heroHeadlineEm: `Serving ${location}.`,
    heroSub: `Professional ${type} services in ${location}.`,
    aboutText: `About ${biz}`,
    aboutText2: `${biz} is committed to delivering quality ${type} services to homes and businesses across ${location}.`,
    ctaText: 'Contact us today.',
  };
}

// ── Main builder function ──────────────────────────────────────────────────────

export async function buildProspectDemo(data: ProspectResearchData): Promise<ProspectDemoResult> {
  console.log(`[prospect-demo] Building demo for ${data.businessName} (${data.bizType})`);

  // 1. Extract brand colors if not provided
  let colorPrimary = data.colorPrimary;
  let colorAccent  = data.colorAccent;
  if (!colorPrimary) {
    const brand = await extractBrandColors(data.website, data.bizType);
    colorPrimary = brand.primary;
    colorAccent  = brand.accent;
    console.log(`[prospect-demo] Colors: ${colorPrimary} / ${colorAccent} (source: ${brand.source})`);
  }

  // 2. Build copy
  const copy = buildFallbackCopy(data);

  // 3. Assemble BizPageData
  const bizPageData: BizPageData = {
    name:             data.businessName,
    type:             data.bizType,
    businessCategory: detectBizCategory(data.bizType),
    phone:            data.phone,
    address:          data.address,
    city:             data.city,
    state:            data.state,
    rating:           data.googleRating,
    reviews:          data.reviewCount,
    photos:           data.photos,
    hours:            data.hours || 'Mon–Fri 8am–6pm',
    colorPrimary:     colorPrimary || '#1a1a1a',
    colorAccent:      colorAccent  || '#6b7280',
    heroHeadline:     data.heroHeadline || copy.heroHeadline,
    heroHeadlineEm:   copy.heroHeadlineEm,
    heroSub:          data.heroSub || copy.heroSub,
    aboutText:        data.aboutText || copy.aboutText,
    aboutText2:       data.aboutBody || copy.aboutText2,
    ctaText:          data.ctaText || copy.ctaText,
    services:         [],
    reviewTexts:      data.reviewTexts,
    yearsInBiz:       '5',
    teamName:         data.businessName.split(' ')[0],
    team:             [],
  };

  // 4. Select builder and generate pages
  const bizCat = detectBizCategory(data.bizType);
  const builder = selectBuilder(bizCat);
  const slug = makeDemoSlug(data.businessName);
  const baseUrl = `/website-demo/${slug}`;
  const pages = builder(bizPageData, baseUrl);

  console.log(`[prospect-demo] Generated ${Object.keys(pages).length} pages — slug: ${slug}`);

  // 5. Upsert home page
  const { error: homeErr } = await supabase.from('landing_pages').upsert({
    account_id:       NEXORRA_ACCOUNT_ID,
    slug,
    name:             `${data.businessName} — Website Demo`,
    content:          pages.home,
    page_type:        'website-demo',
    published:        true,
    meta_title:       `${data.businessName} | ${data.city || ''} ${data.bizType}`,
    meta_description: bizPageData.heroSub,
  }, { onConflict: 'slug' });

  if (homeErr) throw new Error(`Failed to insert home page: ${homeErr.message}`);

  // 6. Upsert subpages
  const subpages = Object.entries(pages).filter(([k]) => k !== 'home');
  for (const [pageName, pageHtml] of subpages) {
    if (!pageHtml) continue;
    const subSlug = `${slug}-${pageName}`;
    await supabase.from('landing_pages').upsert({
      account_id: NEXORRA_ACCOUNT_ID,
      slug:       subSlug,
      name:       `${data.businessName} — ${pageName}`,
      content:    pageHtml,
      page_type:  'website-demo',
      published:  true,
    }, { onConflict: 'slug' });
  }

  // 7. Write demo_slug back to leads row
  await supabase.from('leads').update({
    demo_slug:    slug,
    demo_built_at: new Date().toISOString(),
  }).eq('id', data.leadId);

  const demoUrl = `https://app.nexorra.io/website-demo/${slug}`;
  console.log(`[prospect-demo] Done — ${demoUrl}`);

  return { slug, pageCount: Object.keys(pages).length, demoUrl };
}
