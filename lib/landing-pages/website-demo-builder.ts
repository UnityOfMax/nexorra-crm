/**
 * Website Demo Builder — builds multi-page website demos in the dark-luxury style.
 * Stores home + subpages (services, gallery, about, booking) as separate landing_pages rows.
 * Slug pattern: {base-slug} (home), {base-slug}-services, {base-slug}-gallery, etc.
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import type { FastCopy } from '../local-biz/copy-generator';
import { buildAllPages, type BizPageData } from '../local-biz/multi-page-builder';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const TEMPLATES_DIR = path.resolve(__dirname, '../../assets/website-demo-templates');

// Category → template file mapping
const CATEGORY_TEMPLATE: Record<string, string> = {
  restaurant:           'restaurant.html',
  cafe:                 'food-service.html',
  bakery:               'food-service.html',
  'coffee shop':        'food-service.html',
  bar:                  'food-service.html',
  hairdresser:          'salon-barber.html',
  barber:               'salon-barber.html',
  'hair salon':         'salon-barber.html',
  'beauty salon':       'salon-barber.html',
  'nail salon':         'salon-barber.html',
  'day spa':            'salon-barber.html',
  gym:                  'fitness.html',
  'yoga studio':        'fitness.html',
  pilates:              'fitness.html',
  'fitness center':     'fitness.html',
  'martial arts':       'fitness.html',
  plumber:              'trades.html',
  electrician:          'trades.html',
  hvac:                 'trades.html',
  roofer:               'trades.html',
  'roofing contractor': 'trades.html',
  painter:              'home-services.html',
  landscaper:           'home-services.html',
  'lawn care':          'home-services.html',
  'cleaning service':   'home-services.html',
  'pest control':       'home-services.html',
  locksmith:            'home-services.html',
  'dog grooming':       'home-services.html',
  'pet grooming':       'home-services.html',
  'dog walking':        'home-services.html',
  dentist:              'professional.html',
  chiropractor:         'professional.html',
  physiotherapist:      'professional.html',
  accountant:           'professional.html',
  'law firm':           'professional.html',
  lawyer:               'professional.html',
  photographer:         'retail.html',
  florist:              'retail.html',
  jeweller:             'retail.html',
  jewelry:              'retail.html',
  'auto repair':        'trades.html',
  'car wash':           'retail.html',
  'wedding planner':    'professional.html',
  'general contractor': 'trades.html',
};

export interface LocalBizData {
  id: string;
  business_name: string;
  business_type: string;
  phone: string | null;
  email: string | null;
  website_url: string | null;
  address: string | null;
  city: string | null;
  state_province: string | null;
  country: string;
  gmb_rating: number | null;
  gmb_reviews: number | null;
  gmb_photos: string[] | null;
  // Enriched by research agent
  color_primary?: string;
  color_accent?: string;
  hero_headline?: string;
  hero_subheadline?: string;
  about_text?: string;
  services?: Array<{ name: string; desc: string; price?: string }>;
  reviews?: Array<{ text: string; author: string }>;
  hours?: string;
  cta_text?: string;
  years_in_business?: string;
}

/**
 * Select the best template for a business type.
 */
export function selectTemplate(businessType: string): string {
  const lower = businessType.toLowerCase();
  // Check direct match
  if (CATEGORY_TEMPLATE[lower]) return CATEGORY_TEMPLATE[lower];
  // Partial match
  for (const [key, tmpl] of Object.entries(CATEGORY_TEMPLATE)) {
    if (lower.includes(key) || key.includes(lower)) return tmpl;
  }
  // Default
  return 'professional.html';
}

/**
 * Replace all {{PLACEHOLDER}} tokens in the template with actual values.
 */
function applyData(template: string, vars: Record<string, string>): string {
  let html = template;
  for (const [key, value] of Object.entries(vars)) {
    // Replace all occurrences of {{KEY}}
    html = html.split(`{{${key}}}`).join(value || '');
  }
  // Remove any unreplaced placeholders
  html = html.replace(/\{\{[A-Z_0-9]+\}\}/g, '');
  return html;
}

/**
 * Pick a fallback image from Unsplash via CDN (deprecated Source API workaround: use direct CDN).
 * Falls back to a Supabase-hosted image per category.
 */
function getFallbackImage(businessType: string, width = 1200, height = 800): string {
  // Map categories to reliable Unsplash photo IDs
  const UNSPLASH_IDS: Record<string, string> = {
    restaurant:    'photo-1517248135467-4c7edcad34c4',
    cafe:          'photo-1501339847302-ac426a4a7cbb',
    salon:         'photo-1605497788044-5a32c7078486',
    barber:        'photo-1503951914875-452162b0f3f1',
    gym:           'photo-1534438327276-14e5300c3a48',
    yoga:          'photo-1575052814086-f385e2e2ad1b',
    trades:        'photo-1581092160562-40aa08e78837',
    landscaping:   'photo-1416879595882-3373a0480b5b',
    cleaning:      'photo-1581578731548-c64695cc6952',
    dentist:       'photo-1606811971618-4486d14f3f99',
    default:       'photo-1497366216548-37526070297c',
  };
  const lower = businessType.toLowerCase();
  let photoId = UNSPLASH_IDS.default;
  if (lower.includes('restaurant') || lower.includes('food')) photoId = UNSPLASH_IDS.restaurant;
  else if (lower.includes('cafe') || lower.includes('coffee')) photoId = UNSPLASH_IDS.cafe;
  else if (lower.includes('salon') || lower.includes('hair')) photoId = UNSPLASH_IDS.salon;
  else if (lower.includes('barber')) photoId = UNSPLASH_IDS.barber;
  else if (lower.includes('gym') || lower.includes('fitness')) photoId = UNSPLASH_IDS.gym;
  else if (lower.includes('yoga') || lower.includes('pilates')) photoId = UNSPLASH_IDS.yoga;
  else if (lower.includes('plumb') || lower.includes('electr') || lower.includes('hvac') || lower.includes('roof')) photoId = UNSPLASH_IDS.trades;
  else if (lower.includes('landscape') || lower.includes('lawn')) photoId = UNSPLASH_IDS.landscaping;
  else if (lower.includes('clean')) photoId = UNSPLASH_IDS.cleaning;
  else if (lower.includes('dent')) photoId = UNSPLASH_IDS.dentist;
  return `https://images.unsplash.com/${photoId}?ixlib=rb-4.0.3&auto=format&fit=crop&w=${width}&h=${height}&q=80`;
}

// ── Service duration estimator ────────────────────────────────────────────────

const DURATION_KEYWORDS: Array<[string, string]> = [
  ['balayage', '2 hrs'], ['ombre', '2 hrs'], ['perm', '2 hrs'], ['relax', '2 hrs'],
  ['keratin', '2 hrs'], ['wedding', '2 hrs'], ['bridal', '2 hrs'],
  ['colour', '90 min'], ['color', '90 min'], ['highlights', '90 min'],
  ['foil', '90 min'], ['cap', '90 min'], ['updo', '90 min'],
  ['styling', '45 min'], ['style', '45 min'], ['cut', '45 min'], ['haircut', '45 min'],
  ['blowout', '45 min'], ['blow dry', '45 min'],
  ['pedicure', '60 min'], ['manicure', '60 min'], ['nail', '60 min'], ['gel', '60 min'],
  ['massage', '60 min'], ['deep tissue', '60 min'], ['facial', '45 min'],
  ['shampoo', '30 min'], ['wash', '30 min'], ['trim', '30 min'],
  ['wax', '30 min'], ['threading', '20 min'], ['consultation', '30 min'],
  ['quote', '30 min'], ['inspection', '60 min'], ['repair', '60 min'],
  ['prom', '90 min'], ['package', '90 min'],
];

function estimateDuration(serviceName: string): string {
  const n = serviceName.toLowerCase();
  for (const [kw, dur] of DURATION_KEYWORDS) {
    if (n.includes(kw)) return dur;
  }
  return '60 min';
}

// ── Team name extractor ───────────────────────────────────────────────────────

function extractTeamName(biz: LocalBizData): string {
  // "Dawn's Salon" → "Dawn"
  const apostrophe = biz.business_name.match(/^([A-Z][a-z]{1,12})'/);
  if (apostrophe) return apostrophe[1];
  // "Owner: Dawn" in about text
  if (biz.about_text) {
    const m = biz.about_text.match(/owner[:\s]+([A-Z][a-z]{2,12})/i);
    if (m) return m[1];
  }
  return 'Our Stylist';
}

/**
 * Build the personalization variables from business data.
 */
function buildVars(biz: LocalBizData, enrichedCopy?: Partial<FastCopy>): Record<string, string> {
  const photos = biz.gmb_photos || [];
  const services = enrichedCopy?.services?.length ? enrichedCopy.services : (biz.services || []);
  const reviews = biz.reviews || [];
  const fallbackImg = getFallbackImage(biz.business_type);

  // Colors — default to professional blue if not detected
  const colorPrimary = biz.color_primary || '#2563eb';
  const colorAccent = biz.color_accent || '#f59e0b';

  // Merge enrichedCopy over biz defaults
  const heroHeadline    = enrichedCopy?.hero_headline    || biz.hero_headline    || `Welcome to ${biz.business_name}`;
  const heroHeadlineEm  = enrichedCopy?.hero_headline_em || '';
  const heroSub         = enrichedCopy?.hero_subheadline || biz.hero_subheadline || `Serving ${biz.city || 'the area'} with pride.`;
  const aboutText       = enrichedCopy?.about_text       || biz.about_text       || `${biz.business_name} — serving ${biz.city || 'the community'} with pride`;
  const aboutText2      = enrichedCopy?.about_text_2     || (biz as any).about_text_2 || `${biz.business_name} has built a strong reputation in ${biz.city || 'the area'} for quality and care.`;
  const ctaText         = enrichedCopy?.cta_text         || biz.cta_text         || 'Call us today to learn more about what we can do for you.';

  // Team
  const team1Name = extractTeamName(biz);
  const team1Initial = team1Name[0]?.toUpperCase() || '?';
  const team2Block = ''; // No second stylist data in current schema — placeholder renders empty

  const vars: Record<string, string> = {
    BUSINESS_NAME:   biz.business_name,
    BUSINESS_TYPE:   biz.business_type,
    PHONE:           biz.phone || '',
    ADDRESS:         biz.address || '',
    CITY:            biz.city || '',
    STATE:           biz.state_province || '',
    RATING:          biz.gmb_rating?.toString() || '4.8',
    REVIEW_COUNT:    biz.gmb_reviews?.toString() || '50',
    HOURS:           (biz as any).hours || biz.hours || 'Mon–Sat 9am–6pm',
    COLOR_PRIMARY:   colorPrimary,
    COLOR_ACCENT:    colorAccent,
    HERO_IMAGE:      photos[0] || fallbackImg,
    HERO_HEADLINE:   heroHeadline,
    HERO_HEADLINE_EM: heroHeadlineEm,
    HERO_HEADLINE_2: '',
    HERO_SUBHEADLINE: heroSub,
    ABOUT_HEADLINE:  `About ${biz.business_name}`,
    ABOUT_TEXT:      aboutText,
    ABOUT_TEXT_2:    aboutText2,
    CTA_TEXT:        ctaText,
    YEARS_IN_BIZ:    biz.years_in_business || '5',
    // Team (salon/barber)
    TEAM_1:          team1Name,
    TEAM_1_INITIAL:  team1Initial,
    TEAM_2_BLOCK:    team2Block,
    JOBS_DONE:       '200',
    MEMBER_COUNT:    '150',
    CLASS_COUNT:     '30',
    TRAINER_COUNT:   '4',
    TRADE_TYPE:      biz.business_type,
    CREDENTIALS:     'Licensed & Insured',
    CRED_1: 'Licensed & Insured', CRED_2: 'Free Consultations', CRED_3: 'Satisfaction Guaranteed',
    // Photos
    PHOTO_1: photos[0] || fallbackImg,
    PHOTO_2: photos[1] || fallbackImg,
    PHOTO_3: photos[2] || fallbackImg,
    PHOTO_4: photos[3] || fallbackImg,
    PHOTO_5: photos[4] || fallbackImg,
    // Services (up to 4)
    SERVICE_1: services[0]?.name || 'Our Core Service',
    SERVICE_1_DESC: services[0]?.desc || '',
    SERVICE_1_PRICE: services[0]?.price || '',
    SERVICE_2: services[1]?.name || 'Consultation',
    SERVICE_2_DESC: services[1]?.desc || '',
    SERVICE_2_PRICE: services[1]?.price || '',
    SERVICE_3: services[2]?.name || 'Custom Work',
    SERVICE_3_DESC: services[2]?.desc || '',
    SERVICE_3_PRICE: services[2]?.price || '',
    SERVICE_4: services[3]?.name || 'Emergency Service',
    SERVICE_4_DESC: services[3]?.desc || '',
    SERVICE_4_PRICE: services[3]?.price || '',
    // Service durations (rule-based — used in salon booking widget)
    SERVICE_1_DURATION: estimateDuration(services[0]?.name || ''),
    SERVICE_2_DURATION: estimateDuration(services[1]?.name || ''),
    SERVICE_3_DURATION: estimateDuration(services[2]?.name || ''),
    SERVICE_4_DURATION: estimateDuration(services[3]?.name || ''),
    // Reviews (up to 3)
    REVIEW_1: reviews[0]?.text || 'Absolutely fantastic service. Highly recommend!',
    REVIEWER_1: reviews[0]?.author || 'Google Reviewer',
    REVIEW_2: reviews[1]?.text || 'Professional, prompt, and great value.',
    REVIEWER_2: reviews[1]?.author || 'Google Reviewer',
    REVIEW_3: reviews[2]?.text || 'Will definitely be coming back. 5 stars!',
    REVIEWER_3: reviews[2]?.author || 'Google Reviewer',
    // Menu placeholders (restaurants/cafes)
    MENU_CAT_1: 'Starters', MENU_CAT_2: 'Mains', MENU_CAT_3: 'Desserts',
    MENU_ITEM_1: 'Signature Dish', MENU_ITEM_1_DESC: '', MENU_ITEM_1_PRICE: '',
    MENU_ITEM_2: 'Daily Special', MENU_ITEM_2_DESC: '', MENU_ITEM_2_PRICE: '',
    MENU_ITEM_3: 'Chef\'s Choice', MENU_ITEM_3_DESC: '', MENU_ITEM_3_PRICE: '',
    MENU_ITEM_4: 'Classic Favourite', MENU_ITEM_4_DESC: '', MENU_ITEM_4_PRICE: '',
    // Fitness placeholders
    CLASS_1: 'Morning Flow', CLASS_1_TIME: 'Mon/Wed/Fri · 7:00 AM', CLASS_1_DESC: '', CLASS_1_LEVEL: 'All Levels',
    CLASS_2: 'Power Training', CLASS_2_TIME: 'Tue/Thu · 6:30 AM', CLASS_2_DESC: '', CLASS_2_LEVEL: 'Intermediate',
    CLASS_3: 'HIIT Circuit', CLASS_3_TIME: 'Daily · 12:00 PM', CLASS_3_DESC: '', CLASS_3_LEVEL: 'Advanced',
    CLASS_4: 'Evening Yoga', CLASS_4_TIME: 'Mon–Fri · 6:00 PM', CLASS_4_DESC: '', CLASS_4_LEVEL: 'Beginner',
    TRAINER_1: 'Head Trainer', TRAINER_1_TITLE: 'Certified Personal Trainer', TRAINER_1_BIO: '',
    TRAINER_2: 'Group Instructor', TRAINER_2_TITLE: 'Yoga & Pilates Instructor', TRAINER_2_BIO: '',
    TRAINER_3: 'Strength Coach', TRAINER_3_TITLE: 'Strength & Conditioning', TRAINER_3_BIO: '',
    // Professional placeholders (TEAM_1 name already set above)
    TEAM_1_TITLE: 'Founder & Lead Professional', TEAM_1_BIO: '', TEAM_1_CRED: 'Licensed',
    TEAM_2: 'Associate', TEAM_2_TITLE: 'Senior Associate', TEAM_2_BIO: '', TEAM_2_CRED: 'Certified',
    // Retail placeholders
    PRODUCT_1: 'Featured Item', PRODUCT_1_DESC: '', PRODUCT_1_PRICE: '',
    PRODUCT_2: 'Best Seller', PRODUCT_2_DESC: '', PRODUCT_2_PRICE: '',
    PRODUCT_3: 'New Arrival', PRODUCT_3_DESC: '', PRODUCT_3_PRICE: '',
    PRODUCT_4: 'Staff Pick', PRODUCT_4_DESC: '', PRODUCT_4_PRICE: '',
    HOURS_WEEKDAY: '9:00 AM – 6:00 PM', HOURS_SAT: '10:00 AM – 4:00 PM', HOURS_SUN: 'Closed',
    // Home services
    TRUST_1: 'Licensed, bonded, and insured',
    TRUST_2: 'Free quotes with no obligation',
    TRUST_3: '100% satisfaction guarantee',
    TRUST_4: 'Same-day and emergency service',
    AREA_TEXT: `We proudly serve ${biz.city || 'the local area'} and surrounding communities.`,
    CITY_1: biz.city || '', CITY_2: '', CITY_3: '', CITY_4: '', CITY_5: '', CITY_6: '',
  };

  return vars;
}

// ── Business category detection ───────────────────────────────────────────────

export function detectBizCategory(businessType: string): string {
  const t = businessType.toLowerCase();
  if (t.includes('salon') || t.includes('hair') || t.includes('hairdress') || t.includes('beauty') || t.includes('nail') || t.includes('spa')) return 'salon';
  if (t.includes('barber')) return 'barber';
  if (t.includes('restaurant') || t.includes('cafe') || t.includes('food') || t.includes('bakery') || t.includes('bistro')) return 'restaurant';
  if (t.includes('gym') || t.includes('fitness') || t.includes('yoga') || t.includes('pilates') || t.includes('martial')) return 'fitness';
  if (t.includes('plumb') || t.includes('electr') || t.includes('roof') || t.includes('hvac') || t.includes('contractor') || t.includes('builder')) return 'trades';
  if (t.includes('dent') || t.includes('chiroprac') || t.includes('account') || t.includes('law') || t.includes('consult') || t.includes('physio')) return 'professional';
  return 'professional';
}

// ── Team extractor from review text ──────────────────────────────────────────

export function extractTeamFromReviews(
  reviews: Array<{ text: string; author: string }>,
  category: string,
): Array<{ name: string; role: string; photo?: string }> {
  if (!['salon', 'barber', 'fitness', 'gym'].includes(category)) return [];
  const names = new Set<string>();
  const SKIP = new Set(['The', 'And', 'But', 'She', 'He', 'They', 'Was', 'Has', 'Her', 'His', 'You', 'We', 'My', 'Our', 'Your']);
  for (const r of reviews) {
    // Pattern 1: "my stylist Brianna", "stylist is Jamie"
    const re1 = /(?:stylist|hairdress\w*|cut|shampoo|wash|trainer|instructor)\s+(?:is\s+)?([A-Z][a-z]{2,12})/g;
    let m1; while ((m1 = re1.exec(r.text)) !== null) { if (!SKIP.has(m1[1])) names.add(m1[1]); }
    // Pattern 2: "Brianna was amazing", "Jamie did my hair"
    const re2 = /([A-Z][a-z]{2,12})\s+(?:was|did|is|has|always|who|made|gave|helped|cut|styled|worked)/g;
    let m2; while ((m2 = re2.exec(r.text)) !== null) { if (!SKIP.has(m2[1])) names.add(m2[1]); }
    // Pattern 3: "ask for Brianna"
    const re3 = /ask\s+for\s+([A-Z][a-z]{2,12})/g;
    let m3; while ((m3 = re3.exec(r.text)) !== null) { if (!SKIP.has(m3[1])) names.add(m3[1]); }
  }
  const defaultRole = category === 'fitness' ? 'Trainer' : 'Stylist';
  return Array.from(names).slice(0, 4).map(name => ({ name, role: defaultRole }));
}

/**
 * Build a multi-page website demo for a local business.
 * Stores 5 separate pages: home, services, gallery, about, booking.
 * Returns the base slug (home page) — subpages are at {slug}-{page}.
 */
export async function buildWebsiteDemo(biz: LocalBizData, enrichedCopy?: Partial<FastCopy>): Promise<string> {
  const NEXORRA_ACCOUNT_ID = 'da99b768-79dd-48f8-af86-abf95e61a69f';
  const slugBase = biz.business_name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  const slug = `demo-${slugBase}-${Date.now().toString(36)}`;
  const baseUrl = `/website-demo/${slug}`;

  // Build vars for fallback (used if no enrichedCopy)
  const vars = buildVars(biz, enrichedCopy);

  // Detect business category for booking widget type
  const bizCat = detectBizCategory(biz.business_type);

  // Use team from enrichedCopy if provided (real scraped team), else extract from reviews
  const enrichedAny = enrichedCopy as any;
  const team = enrichedAny?.team?.length
    ? enrichedAny.team
    : extractTeamFromReviews(biz.reviews || [], bizCat);

  // Extra content pages (products, community, special events)
  const products   = enrichedAny?.products   || null;
  const community  = enrichedAny?.community  || null;
  const specialEvents = enrichedAny?.specialEvents || null;

  // Assemble BizPageData for the multi-page builder
  const services = biz.services?.length
    ? biz.services.map((s, i) => ({
        name: s.name,
        desc: s.desc,
        price: s.price || '',
        duration: vars[`SERVICE_${i + 1}_DURATION`] || '',
      }))
    : [
        { name: vars.SERVICE_1, desc: vars.SERVICE_1_DESC, price: vars.SERVICE_1_PRICE, duration: vars.SERVICE_1_DURATION },
        { name: vars.SERVICE_2, desc: vars.SERVICE_2_DESC, price: vars.SERVICE_2_PRICE, duration: vars.SERVICE_2_DURATION },
        { name: vars.SERVICE_3, desc: vars.SERVICE_3_DESC, price: vars.SERVICE_3_PRICE, duration: vars.SERVICE_3_DURATION },
        { name: vars.SERVICE_4, desc: vars.SERVICE_4_DESC, price: vars.SERVICE_4_PRICE, duration: vars.SERVICE_4_DURATION },
      ];

  // Build extra nav links based on what content will exist
  const extraNavLinks: Array<{ href: string; label: string }> = [];
  extraNavLinks.push({ href: `${baseUrl}/services`, label: 'Services' });
  extraNavLinks.push({ href: `${baseUrl}/gallery`, label: 'Gallery' });
  if (team.length > 0)    extraNavLinks.push({ href: `${baseUrl}/stylists`, label: 'Our Stylists' });
  extraNavLinks.push({ href: `${baseUrl}/about`, label: 'About' });
  if (products?.length)   extraNavLinks.push({ href: `${baseUrl}/products`, label: 'Products' });
  if (specialEvents)      extraNavLinks.push({ href: `${baseUrl}/events`, label: 'Special Events' });
  if (community?.length)  extraNavLinks.push({ href: `${baseUrl}/community`, label: 'Community' });

  const bizPageData: BizPageData = {
    name:             biz.business_name,
    type:             biz.business_type,
    businessCategory: bizCat,
    phone:            biz.phone,
    address:          biz.address,
    city:             biz.city,
    state:            biz.state_province,
    rating:           biz.gmb_rating,
    reviews:          biz.gmb_reviews,
    photos:           biz.gmb_photos || [],
    hours:            vars.HOURS,
    colorPrimary:     vars.COLOR_PRIMARY,
    colorAccent:      vars.COLOR_ACCENT,
    heroHeadline:     vars.HERO_HEADLINE,
    heroHeadlineEm:   vars.HERO_HEADLINE_EM,
    heroSub:          vars.HERO_SUBHEADLINE,
    aboutText:        vars.ABOUT_TEXT,
    aboutText2:       vars.ABOUT_TEXT_2,
    ctaText:          vars.CTA_TEXT,
    services,
    reviewTexts:      (biz.reviews || []).map(r => r.text),
    yearsInBiz:       vars.YEARS_IN_BIZ,
    teamName:         vars.TEAM_1,
    team,
    products:         products || undefined,
    community:        community || undefined,
    specialEvents:    specialEvents || undefined,
    extraNavLinks:    extraNavLinks.length > 4 ? extraNavLinks : undefined,
  };

  const pages = buildAllPages(bizPageData, baseUrl);

  // Insert home page
  const { data: homePage, error } = await supabaseAdmin
    .from('landing_pages')
    .insert({
      account_id:      NEXORRA_ACCOUNT_ID,
      slug,
      name:            `${biz.business_name} — Website Demo`,
      content:         pages.home,
      page_type:       'website-demo',
      published:       true,
      meta_title:      `${biz.business_name} | ${biz.city || ''} ${biz.business_type}`,
      meta_description: `${biz.business_name} — ${vars.HERO_SUBHEADLINE}`,
    })
    .select('id')
    .single();

  if (error || !homePage) {
    throw new Error(`Failed to insert home page: ${error?.message}`);
  }

  // Insert subpages (services, gallery, about, booking)
  const subpages = Object.entries(pages).filter(([k]) => k !== 'home');
  for (const [pageName, pageHtml] of subpages) {
    const { error: spError } = await supabaseAdmin
      .from('landing_pages')
      .insert({
        account_id: NEXORRA_ACCOUNT_ID,
        slug:       `${slug}-${pageName}`,
        name:       `${biz.business_name} — ${pageName.charAt(0).toUpperCase() + pageName.slice(1)}`,
        content:    pageHtml,
        page_type:  'website-demo',
        published:  true,
      });
    if (spError) console.warn(`[website-demo-builder] Subpage ${pageName} insert failed: ${spError.message}`);
  }

  // Update local_biz_leads.demo_page_id with home page UUID
  await supabaseAdmin
    .from('local_biz_leads')
    .update({ demo_page_id: homePage.id })
    .eq('id', biz.id);

  console.log(`[website-demo-builder] Built 5-page demo for ${biz.business_name}: /website-demo/${slug}`);
  return slug;
}
