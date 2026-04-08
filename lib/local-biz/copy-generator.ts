/**
 * Fast copy generator for local biz demos.
 * Uses claude -p (OAuth) with a short JSON-only prompt (~15-20s).
 * Falls back to deterministic template variants if claude -p fails.
 * No ANTHROPIC_API_KEY needed.
 */

import { spawn } from 'child_process';

export interface FastCopy {
  hero_headline: string;
  hero_headline_em: string;
  hero_subheadline: string;
  about_text: string;
  about_text_2: string;
  cta_text: string;
  outreach_body_email: string;
  outreach_body_sms: string;
  services?: Array<{ name: string; desc: string; price: string }>;
}

// Strip common AI slop patterns
function stripSlop(text: string): string {
  return text
    .replace(/\s*—\s*/g, ' - ')
    .replace(/–/g, '-')
    .replace(/\bseamlessly\b/gi, '')
    .replace(/\btailored solutions\b/gi, 'personalised service')
    .replace(/\bin today's (fast-paced|competitive|digital) (world|landscape)\b/gi, '')
    .replace(/\bstate-of-the-art\b/gi, 'modern')
    .replace(/\bcutting-edge\b/gi, 'modern')
    .replace(/\bexceptional\b/gi, 'great')
    .replace(/\bworld-class\b/gi, '')
    .replace(/\brobust\b/gi, 'reliable')
    .replace(/  +/g, ' ')
    .trim();
}

// Spawn claude -p with a string prompt piped to stdin
async function claudePFast(promptText: string, timeoutMs = 60000): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = ['-p', '--output-format', 'text', '--no-session-persistence'];
    const child = spawn('claude', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`[copy-gen] timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0 && stdout.length > 10) {
        resolve(stdout.trim());
      } else {
        reject(new Error(`claude -p exited ${code}: ${stderr.slice(0, 200)}`));
      }
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });

    child.stdin.write(promptText, 'utf-8', (err) => {
      if (err) { reject(err); return; }
      child.stdin.end();
    });
  });
}

// Deterministic hash for fallback variant selection
function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// Deterministic fallback copy by business type + hash variant
function deterministicCopy(biz: {
  business_name: string;
  business_type: string;
  city: string | null;
  state_province: string | null;
  gmb_rating: number | null;
  gmb_reviews: number | null;
  website_url: string | null;
}): FastCopy {
  const h = hashCode(biz.business_name);
  const city = biz.city || 'your area';
  const type = biz.business_type;
  const name = biz.business_name;
  const firstName = name.split(/[\s']/)[0];
  const hasWebsite = !!biz.website_url;
  const websiteCtx = hasWebsite ? 'found it really tricky to navigate your website' : "didn't see a website";

  const headlines: Record<string, string[]> = {
    salon: ['Where every visit is your best look', 'Colour, cut, and confidence', 'Your hair, beautifully done'],
    barber: ['Sharp cuts, every time', 'The classic barbershop experience', 'Fresh cuts, great vibes'],
    restaurant: ['A table worth the reservation', 'Real food, real flavour', 'Come hungry, leave happy'],
    gym: ['Push further, every session', 'Your fitness, our passion', 'Results that speak for themselves'],
    trades: ['Fast, reliable service you can trust', 'No job too big, no job too small', 'Sorted — same day'],
    dentist: ['A smile you are proud of', 'Gentle care, great results', 'Dental health made easy'],
    default: [`Trusted in ${city}`, 'Quality service, every time', 'Local, reliable, and here for you'],
  };

  const t = type.toLowerCase();
  let cat = 'default';
  if (t.includes('salon') || t.includes('hair') || t.includes('hairdress') || t.includes('beauty') || t.includes('nail') || t.includes('spa')) cat = 'salon';
  else if (t.includes('barber')) cat = 'barber';
  else if (t.includes('restaurant') || t.includes('cafe') || t.includes('food')) cat = 'restaurant';
  else if (t.includes('gym') || t.includes('fitness') || t.includes('yoga') || t.includes('pilates')) cat = 'gym';
  else if (t.includes('plumb') || t.includes('electr') || t.includes('roof') || t.includes('hvac') || t.includes('contractor')) cat = 'trades';
  else if (t.includes('dent') || t.includes('chiroprac') || t.includes('physiother')) cat = 'dentist';

  const variants = headlines[cat];
  const headline = variants[h % variants.length];
  const stateStr = biz.state_province ? `, ${biz.state_province}` : '';

  const emailBody = `Hey ${firstName},\n\nMy name is Max, I've been looking for a ${type} in ${city} and I found you on Google but ${websiteCtx}\n\nSo I thought I'd make you one!\n\nHere it is: {{DEMO_LINK}}\n\nI've done this for a few other ${type}s and especially if their old website was a bit slow or dated they've often suddenly started booking another 5-10 more customers each week.\n\nGiven the area I'd imagine you're missing out on another 1-2k/m in revenue minimum (depending on service cost)\n\nLet me know if you like the website and I'd love to jump on a call to go through it more and change anything to work for you :)\n\nI made the demo to give you an idea of what it could look like but if you want to use it and have it work I generally charge 450-950 as a one-time fee (just so it doesn't come as a shock!)`;

  const smsBody = `Hey, I came across ${name} and put together a new website for you: {{DEMO_LINK}}\n\nNo obligation - happy to get on a quick call if you'd like to set it up. Max`;

  return {
    hero_headline:       headline,
    hero_headline_em:    '',
    hero_subheadline:    `${name} - trusted ${type} serving ${city}${stateStr}.`,
    about_text:          `${name} - trusted by ${city} since day one`,
    about_text_2:        `${name} has built a strong reputation in ${city} for quality, care, and reliability. With ${biz.gmb_rating ? biz.gmb_rating + ' stars' : 'excellent reviews'} from happy customers, you can trust us to deliver every time.`,
    cta_text:            'Ready to get started? Book your appointment today.',
    outreach_body_email: emailBody,
    outreach_body_sms:   smsBody,
  };
}

/**
 * Generate fast copy via claude -p (short JSON prompt, ~15-20s).
 * Falls back to deterministic copy if claude -p fails.
 */
export async function generateCopyFast(biz: {
  business_name: string;
  business_type: string;
  city: string | null;
  state_province: string | null;
  gmb_rating: number | null;
  gmb_reviews: number | null;
  website_url: string | null;
}): Promise<FastCopy> {
  const city = biz.city || 'the area';
  const state = biz.state_province ? ` ${biz.state_province}` : '';
  const firstName = biz.business_name.split(/[\s']/)[0];
  const hasWebsite = !!biz.website_url;
  const websiteCtx = hasWebsite ? 'found it really tricky to navigate your website' : "didn't see a website";

  // Email template is mostly fixed — only hero/about copy goes through AI
  const prompt = `Return ONLY a JSON object. No explanation, no markdown, no code fences.

{
  "hero_headline": "4-6 word headline for a ${biz.business_type} in ${city}",
  "hero_headline_em": "2-3 word italic emphasis or empty string",
  "hero_subheadline": "1 warm sentence specific to this business and city",
  "about_text": "Short punchy About headline e.g. '${city}'s most trusted ${biz.business_type}'",
  "about_text_2": "2 warm sentences about the business - specific to ${city}, not generic",
  "cta_text": "1 sentence inviting them to book"
}

Business: ${biz.business_name}, ${biz.business_type}, ${city}${state}. Rating: ${biz.gmb_rating ?? '?'}/5 (${biz.gmb_reviews ?? '?'} reviews).
Rules: no em dashes, no AI buzzwords (exceptional, seamless, state-of-the-art), keep it warm and human.`;

  try {
    console.log(`[copy-gen] Generating copy for ${biz.business_name}...`);
    const raw = await claudePFast(prompt, 60000);
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON in response');
    const parsed = JSON.parse(match[0]) as Partial<FastCopy>;

    // Build full result: AI creative copy + deterministic outreach
    const fallback = deterministicCopy(biz);
    return {
      hero_headline:       stripSlop(parsed.hero_headline || fallback.hero_headline),
      hero_headline_em:    stripSlop(parsed.hero_headline_em || ''),
      hero_subheadline:    stripSlop(parsed.hero_subheadline || fallback.hero_subheadline),
      about_text:          stripSlop(parsed.about_text || fallback.about_text),
      about_text_2:        stripSlop(parsed.about_text_2 || fallback.about_text_2),
      cta_text:            stripSlop(parsed.cta_text || fallback.cta_text),
      outreach_body_email: fallback.outreach_body_email,
      outreach_body_sms:   fallback.outreach_body_sms,
    };
  } catch (err) {
    console.warn(`[copy-gen] claude -p failed, using deterministic fallback: ${(err as Error).message}`);
    return deterministicCopy(biz);
  }
}
