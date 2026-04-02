/**
 * Website Demo Builder — personalises a category HTML template with real business data.
 * Inserts into landing_pages table (page_type='website-demo'), updates local_biz_leads.demo_page_id.
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

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

/**
 * Build the personalization variables from business data.
 */
function buildVars(biz: LocalBizData): Record<string, string> {
  const photos = biz.gmb_photos || [];
  const services = biz.services || [];
  const reviews = biz.reviews || [];
  const fallbackImg = getFallbackImage(biz.business_type);

  // Colors — default to professional blue if not detected
  const colorPrimary = biz.color_primary || '#2563eb';
  const colorAccent = biz.color_accent || '#f59e0b';

  const vars: Record<string, string> = {
    BUSINESS_NAME:   biz.business_name,
    BUSINESS_TYPE:   biz.business_type,
    PHONE:           biz.phone || '',
    ADDRESS:         biz.address || '',
    CITY:            biz.city || '',
    STATE:           biz.state_province || '',
    RATING:          biz.gmb_rating?.toString() || '4.8',
    REVIEW_COUNT:    biz.gmb_reviews?.toString() || '50',
    HOURS:           biz.hours || 'Mon–Sat 9am–6pm',
    COLOR_PRIMARY:   colorPrimary,
    COLOR_ACCENT:    colorAccent,
    HERO_IMAGE:      photos[0] || fallbackImg,
    HERO_HEADLINE:   biz.hero_headline || `Welcome to ${biz.business_name}`,
    HERO_HEADLINE_EM: '',
    HERO_HEADLINE_2: '',
    HERO_SUBHEADLINE: biz.hero_subheadline || `Serving ${biz.city || 'the area'} with pride.`,
    ABOUT_HEADLINE:  `About ${biz.business_name}`,
    ABOUT_TEXT:      biz.about_text || `${biz.business_name} has been a trusted name in ${biz.city || 'the community'}.`,
    ABOUT_TEXT_2:    '',
    CTA_TEXT:        biz.cta_text || `Call us today to learn more about what we can do for you.`,
    YEARS_IN_BIZ:    biz.years_in_business || '5',
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
    // Professional placeholders
    TEAM_1: 'Principal', TEAM_1_TITLE: 'Founder & Lead Professional', TEAM_1_BIO: '', TEAM_1_CRED: 'Licensed',
    TEAM_2: 'Associate', TEAM_2_TITLE: 'Senior Associate', TEAM_2_BIO: '', TEAM_2_CRED: 'Certified',
    // Retail placeholders
    PRODUCT_1: 'Featured Item', PRODUCT_1_DESC: '', PRODUCT_1_PRICE: '',
    PRODUCT_2: 'Best Seller', PRODUCT_2_DESC: '', PRODUCT_2_PRICE: '',
    PRODUCT_3: 'New Arrival', PRODUCT_3_DESC: '', PRODUCT_3_PRICE: '',
    PRODUCT_4: 'Staff Pick', PRODUCT_4_DESC: '', PRODUCT_4_PRICE: '',
    HOURS_WEEKDAY: '9:00 AM – 6:00 PM', HOURS_SAT: '10:00 AM – 4:00 PM', HOURS_SUN: 'Closed',
    YEARS_IN_BIZ: biz.years_in_business || '5',
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

/**
 * Build a website demo page for a local business.
 * Returns the landing_pages.id (used as the URL path segment).
 */
export async function buildWebsiteDemo(biz: LocalBizData): Promise<string> {
  const templateFile = selectTemplate(biz.business_type);
  const templatePath = path.join(TEMPLATES_DIR, templateFile);

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template not found: ${templatePath}. Run template builder first.`);
  }

  const templateHtml = fs.readFileSync(templatePath, 'utf-8');
  const vars = buildVars(biz);
  const finalHtml = applyData(templateHtml, vars);

  // Insert into landing_pages
  const { data: page, error } = await supabaseAdmin
    .from('landing_pages')
    .insert({
      name: `${biz.business_name} — Website Demo`,
      content: finalHtml,
      page_type: 'website-demo',
      published: true,
      meta_title: `${biz.business_name} | ${biz.city || ''} ${biz.business_type}`,
      meta_description: `${biz.business_name} — ${biz.hero_subheadline || `Serving ${biz.city || 'the area'}.`}`,
    })
    .select('id')
    .single();

  if (error || !page) {
    throw new Error(`Failed to insert landing page: ${error?.message}`);
  }

  // Update local_biz_leads.demo_page_id
  await supabaseAdmin
    .from('local_biz_leads')
    .update({ demo_page_id: page.id })
    .eq('id', biz.id);

  console.log(`[website-demo-builder] Built demo for ${biz.business_name}: /website-demo/${page.id}`);
  return page.id;
}
