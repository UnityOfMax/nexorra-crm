/**
 * Demo generator — generates full custom HTML for local biz demos.
 * Uses:
 *   - All skills from load-design-skills.ts (frontend-design + designer-skills repo)
 *   - Design inspiration from the design-inspiration MCP static library
 *   - claude -p (OAuth) for generation — no ANTHROPIC_API_KEY required
 *   - Screenshot → Claude vision → targeted fix loop (up to 3 iterations)
 *
 * Replaces the static template fill in website-demo-builder.ts for new builds.
 */

import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import puppeteer, { Browser } from 'puppeteer';
import { DESIGN_SKILL_CONTEXT } from './load-design-skills';

const execAsync = promisify(exec);

// All generation uses claude -p (OAuth) — no ANTHROPIC_API_KEY needed.
// Uses spawn() with explicit stdin.end() — exec + shell redirect hangs on large prompts.
async function claudeP(promptFile: string, opts: { addFile?: string; addDir?: string; maxBuffer?: number; timeoutMs?: number } = {}): Promise<string> {
  const prompt = fs.readFileSync(promptFile, 'utf-8');
  const args = ['-p', '--output-format', 'text', '--no-session-persistence'];
  if (opts.addDir) args.push('--add-dir', opts.addDir);
  // Note: --add-file doesn't exist in this claude version; use --add-dir instead

  return new Promise((resolve, reject) => {
    const timeoutMs = opts.timeoutMs ?? 300000; // 5 min default
    const child = spawn('claude', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    let stdout = '';
    let stderr = '';
    const maxBuffer = opts.maxBuffer ?? 8 * 1024 * 1024;

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
      if (stdout.length > maxBuffer) {
        child.kill();
        reject(new Error(`[claude-p] stdout exceeded ${maxBuffer} bytes`));
      }
    });
    child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`[claude-p] timed out after ${timeoutMs}ms. stderr: ${stderr.slice(0, 300)}`));
    }, timeoutMs);

    child.on('close', (code) => {
      clearTimeout(timer);
      if (stderr.trim()) console.warn('[claude-p] stderr:', stderr.slice(0, 500));
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        console.error('[claude-p] FAILED — exit:', code);
        console.error('[claude-p] stderr:', stderr.slice(0, 800));
        console.error('[claude-p] stdout:', stdout.slice(0, 300));
        reject(new Error(`claude -p exited ${code}: ${stderr.slice(0, 300)}`));
      }
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });

    // Write prompt to stdin and close — critical: without end(), claude waits forever
    child.stdin.write(prompt, 'utf-8', (err) => {
      if (err) { reject(err); return; }
      child.stdin.end();
    });
  });
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GeneratedCopyForDemo {
  hero_headline:     string;
  hero_headline_em?: string;
  hero_subheadline:  string;
  about_text:        string;
  about_text_2:      string;
  cta_text:          string;
  services:          Array<{ name: string; desc: string; price: string }>;
  color_primary:     string;
  color_accent:      string;
  design_vibe:       string;   // e.g. "warm luxury"
  design_adjectives: string[]; // e.g. ["warm", "editorial", "boutique"]
  color_mood:        string;   // e.g. "espresso and champagne"
  business_category: string;  // e.g. "salon" — maps to static design library
}

export interface BizForDemo {
  name:           string;
  type:           string;
  city:           string;
  state:          string;
  phone:          string | null;
  address:        string | null;
  rating:         number | null;
  reviews:        number | null;
  photos:         string[];    // Real photo URLs (GMB or Facebook)
  hours?:         string;
  testimonials?:  string[];   // Review texts from GMB or Facebook
}

// ── Design inspiration (from static library in the MCP server) ────────────────
// We embed a compact version here for use without the MCP server running.

const DESIGN_CATEGORY_MAP: Record<string, string> = {
  salon: 'luxury editorial salon',
  hairdresser: 'luxury editorial salon',
  'hair salon': 'luxury editorial salon',
  barber: 'classic masculine barber',
  restaurant: 'upscale restaurant',
  cafe: 'cozy independent cafe',
  'coffee shop': 'cozy independent cafe',
  bakery: 'cozy independent cafe',
  gym: 'premium fitness studio',
  'fitness studio': 'premium fitness studio',
  yoga: 'calm yoga wellness studio',
  pilates: 'calm yoga wellness studio',
  plumber: 'trustworthy local trades',
  electrician: 'trustworthy local trades',
  roofer: 'trustworthy local trades',
  contractor: 'trustworthy local trades',
  dentist: 'clean professional services',
  accountant: 'clean professional services',
  lawyer: 'clean professional services',
  'pet groomer': 'friendly pet services',
  'dog walker': 'friendly pet services',
};

function getBizCategory(type: string): string {
  const t = type.toLowerCase();
  for (const [key, val] of Object.entries(DESIGN_CATEGORY_MAP)) {
    if (t.includes(key)) return val;
  }
  return 'clean professional services';
}

// ── Main generation ───────────────────────────────────────────────────────────

export async function generateDemoHtml(
  biz: BizForDemo,
  copy: GeneratedCopyForDemo,
): Promise<string> {
  const bizCategory = getBizCategory(biz.type);
  const photoList = biz.photos.slice(0, 8).map((url, i) => `PHOTO_${i + 1}: ${url}`).join('\n');
  const serviceList = copy.services.map(s => `- ${s.name}: ${s.desc}${s.price ? ` (${s.price})` : ''}`).join('\n');
  const testimonialList = (biz.testimonials || []).slice(0, 3).map((t, i) => `Review ${i + 1}: "${t}"`).join('\n');

  const CALENDLY_URL = 'https://calendly.com/nexorra/demo-call';

  const prompt = `Build a stunning single-page website demo for a real local business. Output ONLY the complete HTML — no explanation, no markdown fences. Start with <!DOCTYPE html>.

BUSINESS: ${biz.name} — ${biz.type} in ${biz.city}, ${biz.state}
Phone: ${biz.phone || 'N/A'} | Address: ${biz.address || biz.city}
Rating: ${biz.rating ?? '?'}/5 (${biz.reviews ?? '?'} reviews)
Vibe: ${copy.design_vibe} — ${copy.color_mood}
Primary: ${copy.color_primary} | Accent: ${copy.color_accent}

COPY (verbatim):
Hero: "${copy.hero_headline}${copy.hero_headline_em ? ' ' + copy.hero_headline_em : ''}"
Sub: "${copy.hero_subheadline}"
About headline: "${copy.about_text}"
About body: "${copy.about_text_2}"
Services: ${copy.services.map(s => `${s.name} (${s.price}): ${s.desc}`).join(' | ')}
${testimonialList ? 'Reviews: ' + testimonialList : ''}

PHOTOS (use as <img src>):
${photoList}

TECH STACK:
- Tailwind CDN: <script src="https://cdn.tailwindcss.com"></script>
- <script>tailwind.config={theme:{extend:{colors:{primary:'${copy.color_primary}',accent:'${copy.color_accent}'}}}}</script>
- Google Fonts (1-2 fonts matching vibe — NOT Inter/Arial): @import in <style>
- Style block max 30 lines: @import only — NO .reveal CSS (sections are always visible)
- Smooth scroll on <html>: style="scroll-behavior:smooth"

SECTIONS (all required, all with id attr). CRITICAL: do NOT use opacity:0 or hidden on sections — all content must be visible immediately:
1. Nav — sticky, business name left, desktop links (hidden md:flex) right: #services #about #contact. Mobile: hamburger id="menu-btn" md:hidden, dropdown id="mobile-menu" hidden. JS before </body>: document.getElementById('menu-btn').addEventListener('click',()=>document.getElementById('mobile-menu').classList.toggle('hidden'))
2. id="hero" — full-bleed PHOTO_1 background, headline + subheadline + "Book Your Appointment" button. Button opens Calendly: onclick="window.open('${CALENDLY_URL}','_blank')"
3. id="services" — grid of ${copy.services.length} cards with name + desc + price. hover:scale-105
4. id="gallery" — 3 photos grid (PHOTO_2, PHOTO_3, PHOTO_4)
5. id="about" — text left + PHOTO_5 right (md:flex-row)
6. id="contact" — Calendly booking section. Include: heading "Book Your Appointment", subtext "Click below to pick a time that works for you", and a prominent button: <a href="${CALENDLY_URL}" target="_blank" class="...">Book Now on Calendly</a>. No form needed.
7. Footer — name, phone, address, hours

Design: ${copy.design_adjectives.join(', ')}. Palette: ${copy.color_primary} + ${copy.color_accent}. Distinctive typography. Real photos prominently. Make it look like THIS business's site.`;



  return runGeneration(prompt, biz.name, `${copy.design_vibe}`);
}

// ── All-in-one generation (copy + HTML in one call) ──────────────────────────

export interface DemoResult {
  html: string;
  emailBody: string;
  headline: string;
}

/**
 * Generates a complete website demo + outreach email.
 * HTML is generated via 1 claude -p call.
 * Email is assembled from a template (no AI call) — matches Max's exact format.
 */
export async function generateDemoFull(
  biz: BizForDemo & {
    email?: string | null;
    hasWebsite: boolean;
    website_pain_points?: string[];
  },
): Promise<DemoResult> {
  const bizCategory = getBizCategory(biz.type);

  // ── Email template (no AI call — Max's exact format) ─────────────────────
  const firstName = biz.name.split(' ')[0];
  const websiteContext = biz.hasWebsite
    ? `found it really tricky to navigate your website`
    : `didn't see a website`;
  const emailBody = `Hey ${firstName},

My name is Max, I've been looking for a ${biz.type} in ${biz.city} and I found you on Google but ${websiteContext}

So I thought I'd make you one!

Here it is: {{DEMO_LINK}}

I've done this for a few other ${biz.type}s and especially if their old website was a bit slow or dated they've often suddenly started booking another 5-10 more customers each week.

Given the area I'd imagine you're missing out on another 1-2k/m in revenue minimum (depending on service cost)

Let me know if you like the website and I'd love to jump on a call to go through it more and change anything to work for you :)

I made the demo to give you an idea of what it could look like but if you want to use it and have it work I generally charge 450-950 as a one-time fee (just so it doesn't come as a shock!)`;

  // ── HTML generation via claude -p ─────────────────────────────────────────
  const photoList = biz.photos.slice(0, 8).map((url, i) => `PHOTO_${i + 1}: ${url}`).join('\n');
  const testimonialList = (biz.testimonials || []).slice(0, 3).map(t => `"${t}"`).join(', ');
  const CALENDLY_URL = 'https://calendly.com/nexorra/demo-call';

  const htmlPrompt = `Build a stunning single-page website demo for a real local business. Output ONLY the complete HTML from <!DOCTYPE html> to </html>.

BUSINESS: ${biz.name} — ${biz.type} in ${biz.city}, ${biz.state}
Phone: ${biz.phone || 'N/A'} | Address: ${biz.address || biz.city}
Rating: ${biz.rating ?? '?'}/5 (${biz.reviews ?? '?'} reviews)
${testimonialList ? `Reviews: ${testimonialList}` : ''}

PHOTOS:
${photoList}

DESIGN: Pick a vibe matching ${bizCategory}. Warm luxury for salons, clean/modern for professional, energetic for fitness. Choose rich palette with accent. Google Fonts (NOT Inter/Arial).

TECH: Tailwind CDN. tailwind.config custom colors. <style> max 30 lines (@import only). <html> smooth scroll.
CRITICAL: No opacity:0 on sections. All content immediately visible when page loads.

SECTIONS (all with id, all with visible content):
1. Sticky nav — business name left, links right (hidden md:flex): #services #gallery #about #contact. Mobile: hamburger id="menu-btn" (md:hidden) + dropdown id="mobile-menu"
2. id="hero" — full-bleed PHOTO_1 background, headline, subheadline, CTA button: onclick="window.open('${CALENDLY_URL}','_blank')"
3. id="services" — 4 service cards grid (infer from ${biz.type}), hover:scale-105
4. id="gallery" — PHOTO_2 PHOTO_3 PHOTO_4 in a grid
5. id="about" — text left, PHOTO_5 right (md:flex-row)
6. id="contact" — "Book Your Appointment" heading, prominent link button href="${CALENDLY_URL}" target="_blank", phone + address + hours below
7. Footer — name, phone, address, Mon-Sat 9am-6pm

JS before </body>: document.getElementById('menu-btn').addEventListener('click',()=>document.getElementById('mobile-menu').classList.toggle('hidden'))`;

  const html = await runGeneration(htmlPrompt, biz.name, bizCategory, false) as string;
  const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
  const headline = h1Match?.[1]?.replace(/<[^>]+>/g, '').trim() ?? biz.name;

  return { html, emailBody, headline };
}

// ── Shared generation runner ──────────────────────────────────────────────────

async function runGeneration(prompt: string, bizName: string, vibe: string, parseEmail = false): Promise<any> {
  const tmpFile = `/tmp/demo-gen-${Date.now()}.txt`;
  fs.writeFileSync(tmpFile, prompt, 'utf-8');
  console.log(`[demo-gen] Generating for ${bizName} (prompt: ${Math.round(prompt.length / 1024)}KB)...`);

  let rawText = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      rawText = await claudeP(tmpFile, { maxBuffer: 16 * 1024 * 1024, timeoutMs: 420000 });
      if (rawText.length > 1000) break;
      throw new Error('Output too short');
    } catch (err: any) {
      if (attempt === 0) {
        console.warn(`[demo-gen] Attempt 1 failed — retrying in 5s... (${err.message?.slice(0, 80)})`);
        await new Promise(r => setTimeout(r, 5000));
      } else {
        throw err;
      }
    }
  }
  fs.unlink(tmpFile, () => {});

  let html = '';
  let emailBody = '';
  let headline = '';

  if (parseEmail) {
    // Split on === EMAIL === and === HTML === markers
    const emailMatch = rawText.match(/=== EMAIL ===\s*([\s\S]*?)(?:=== HTML ===|$)/);
    const htmlMatch = rawText.match(/=== HTML ===([\s\S]*)/);
    emailBody = emailMatch?.[1]?.trim() ?? '';
    const htmlRaw = htmlMatch?.[1]?.trim() ?? rawText;
    const docStart = htmlRaw.indexOf('<!DOCTYPE');
    const htmlEnd = htmlRaw.lastIndexOf('</html>');
    html = docStart !== -1 && htmlEnd !== -1 ? htmlRaw.slice(docStart, htmlEnd + '</html>'.length) : htmlRaw;
    const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
    headline = h1Match?.[1]?.replace(/<[^>]+>/g, '').trim() ?? bizName;
  } else {
    const docStart = rawText.indexOf('<!DOCTYPE');
    const htmlEnd = rawText.lastIndexOf('</html>');
    html = docStart !== -1 && htmlEnd !== -1 ? rawText.slice(docStart, htmlEnd + '</html>'.length) : rawText.trim();
    headline = bizName;
  }

  if (!html.includes('<!DOCTYPE') || html.length < 2000) {
    throw new Error(`[demo-gen] Invalid HTML output (${html.length} chars)`);
  }

  fs.writeFileSync('/tmp/demo-latest.html', html, 'utf-8');
  console.log(`[demo-gen] Generated ${html.length} chars`);

  // Take QA screenshot (no claude vision — just save for Telegram)
  await takeQAScreenshot(html).catch(e => console.warn('[demo-gen] QA screenshot failed:', e.message));

  if (parseEmail) {
    return { html, emailBody, headline } as DemoResult;
  }
  return html;
}

// ── Screenshot for Telegram preview ──────────────────────────────────────────

export async function takeQAScreenshot(html: string, outPath = '/tmp/qa-latest.jpg'): Promise<string> {
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  });
  const httpPort = await new Promise<number>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve((server.address() as any).port));
  });

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    defaultViewport: { width: 1440, height: 900 },
  });

  try {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${httpPort}/`, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.evaluate(() => {
      document.querySelectorAll<HTMLElement>('.reveal, .reveal-left, .reveal-right').forEach(el => el.classList.add('visible'));
    });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: outPath, fullPage: false, type: 'jpeg', quality: 75 });
    await page.close();
    console.log(`[qa] Screenshot saved to ${outPath} (${Math.round(require('fs').statSync(outPath).size / 1024)}KB)`);
    return outPath;
  } finally {
    await browser.close();
    server.close();
  }
}
