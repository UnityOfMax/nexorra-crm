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

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import puppeteer, { Browser } from 'puppeteer';
import Anthropic from '@anthropic-ai/sdk';
import { DESIGN_SKILL_CONTEXT } from './load-design-skills';

const execAsync = promisify(exec);

function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('[demo-gen] ANTHROPIC_API_KEY not set');
  return new Anthropic({ apiKey });
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

  const prompt = `${DESIGN_SKILL_CONTEXT}

You are building a complete, standalone, production-quality website demo for a real local business.

This is NOT a template fill — generate fresh, unique HTML tailored to this specific business. Every design decision should reflect the business type, vibe, and actual data provided.

──────────────────────────────────────────────
BUSINESS PROFILE
──────────────────────────────────────────────
Name: ${biz.name}
Type: ${biz.type} (category: ${bizCategory})
Location: ${biz.city}, ${biz.state}
Phone: ${biz.phone || 'call for info'}
Address: ${biz.address || `${biz.city}, ${biz.state}`}
Rating: ${biz.rating ?? '?'}/5 (${biz.reviews ?? '?'} reviews)

DESIGN VIBE: ${copy.design_vibe}
DESIGN ADJECTIVES: ${copy.design_adjectives.join(', ')}
COLOUR MOOD: ${copy.color_mood}
PRIMARY COLOUR: ${copy.color_primary}
ACCENT COLOUR: ${copy.color_accent}

──────────────────────────────────────────────
COPY (use verbatim — do not paraphrase)
──────────────────────────────────────────────
Hero headline: ${copy.hero_headline}
Hero emphasis (italic): ${copy.hero_headline_em || ''}
Hero subheadline: ${copy.hero_subheadline}
About headline: ${copy.about_text}
About body: ${copy.about_text_2}
CTA text: ${copy.cta_text}

Services:
${serviceList}

${testimonialList ? `Customer reviews:\n${testimonialList}` : ''}

──────────────────────────────────────────────
PHOTOS (use these as actual <img> src values)
──────────────────────────────────────────────
${photoList}

──────────────────────────────────────────────
TECHNICAL REQUIREMENTS
──────────────────────────────────────────────
- Single self-contained HTML file (<!DOCTYPE html> to </html>)
- Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script>
- Google Fonts via @import in a <style> tag (pick fonts that match the vibe — NOT Inter, NOT Arial)
- CSS custom properties at :root level for all colours and font families
- Sections required:
  • Navigation bar (sticky, with business name + phone)
  • Hero section (photo-driven, not just text on a coloured background)
  • Services section (not just a list — use cards, grids, numbered items, etc.)
  • Gallery section (if salon/barber/restaurant/fitness — use 3+ photos in a real grid)
  • About section (with owner/team photo using PHOTO_3 or similar)
  • Testimonials section (use the review texts provided, or write 3 believable ones)
  • Booking/contact form (full form: first name, last name, phone, email, date picker, time select, service dropdown, notes, submit button with JS confirmation alert)
  • Footer (business name, phone, address, hours: ${biz.hours || 'Mon–Sat 9am–6pm'})
- Mobile responsive — works at 390px viewport
- Minimum 2 CSS animations:
  • Scroll-triggered reveal using IntersectionObserver — CRITICAL: define .reveal { opacity: 0; transform: translateY(32px); transition: ... } in CSS, then include a <script> at the end of <body> that runs an IntersectionObserver to add class 'visible' to all .reveal elements. Without this JS the page will be blank.
  • At least one hover micro-interaction on service cards or buttons
- Use CSS custom properties (--color-primary etc.) throughout — no hard-coded hex values in HTML
- Inline SVGs for any icons (no icon libraries, no CDN icon imports)
- All images use loading="lazy" and have descriptive alt text

CRITICAL JS REQUIREMENT — include this exact script at the end of <body> (without this the page is blank):
<script>
  document.addEventListener('DOMContentLoaded', () => {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
    }, { threshold: 0.1 });
    document.querySelectorAll('.reveal, .reveal-left, .reveal-right').forEach(el => io.observe(el));
  });
</script>

Apply ALL skills loaded above:
- frontend-design skill: distinctive typography, cohesive colour system, intentional layouts
- ui-design/color-system: build a coherent palette from the provided colours
- ui-design/typography-scale: establish a clear type hierarchy (at minimum 3 type sizes)
- ui-design/visual-hierarchy: guide the eye from hero → services → booking
- ui-design/layout-grid: use a real grid system, not arbitrary positioning
- ui-design/spacing-system: consistent spacing rhythm throughout
- interaction-design/animation-principles: purposeful, not decorative animations
- interaction-design/micro-interaction-spec: hover states, form field focus, button feedback
- design-systems/design-token: CSS custom properties for every design decision
- design-systems/theming-system: colours, typography, spacing all token-driven

Output ONLY the complete HTML document. No explanation, no markdown fences, no commentary.
Start with <!DOCTYPE html> and end with </html>.`;

  const tmpFile = `/tmp/demo-gen-${Date.now()}.txt`;
  fs.writeFileSync(tmpFile, prompt, 'utf-8');

  const promptContent = fs.readFileSync(tmpFile, 'utf-8');
  fs.unlink(tmpFile, () => {});
  console.log(`[demo-gen] Generating HTML for ${biz.name} (vibe: ${copy.design_vibe}, prompt: ${Math.round(promptContent.length / 1024)}KB)...`);

  const client = getAnthropicClient();
  let html = '';

  // Retry up to 3 times on overload (529)
  let lastErr: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const msg = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 8000,
        system: [
          {
            type: 'text',
            text: DESIGN_SKILL_CONTEXT,
            // @ts-ignore — prompt caching
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [{ role: 'user', content: promptContent }],
      });

      const text = (msg.content[0] as any).text || '';
      const match = text.match(/<!DOCTYPE[\s\S]*<\/html>/i);
      html = match ? match[0] : text.trim();
      lastErr = null;
      break;
    } catch (err: any) {
      lastErr = err;
      if (err?.status === 529 || err?.message?.includes('overloaded')) {
        const wait = (attempt + 1) * 30000;
        console.warn(`[demo-gen] Overloaded (529) — retrying in ${wait / 1000}s (attempt ${attempt + 1}/3)...`);
        await new Promise(r => setTimeout(r, wait));
      } else {
        throw err;
      }
    }
  }
  if (lastErr) throw lastErr;

  if (!html.includes('<!DOCTYPE') || html.length < 2000) {
    throw new Error(`[demo-gen] Generation produced invalid/short HTML (${html.length} chars)`);
  }

  // Inject IntersectionObserver script if model omitted it — guarantees .reveal elements become visible
  if (!html.includes('IntersectionObserver')) {
    const ioScript = `<script>
  document.addEventListener('DOMContentLoaded', function() {
    var io = new IntersectionObserver(function(entries) {
      entries.forEach(function(e) {
        if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
      });
    }, { threshold: 0.08 });
    document.querySelectorAll('.reveal, .reveal-left, .reveal-right').forEach(function(el) {
      io.observe(el);
    });
    // Immediately reveal anything already in the viewport on load
    document.querySelectorAll('.reveal, .reveal-left, .reveal-right').forEach(function(el) {
      var rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight) el.classList.add('visible');
    });
  });
</script>`;
    html = html.replace(/<\/body>/i, `${ioScript}\n</body>`);
    console.log('[demo-gen] Injected IntersectionObserver script (model omitted it)');
  }

  // Save a copy for inspection
  const debugPath = '/tmp/demo-latest.html';
  fs.writeFileSync(debugPath, html, 'utf-8');
  console.log(`[demo-gen] Generated ${html.length} chars — saved to ${debugPath}`);
  console.log('[demo-gen] Running visual QA loop...');
  return runVisualQALoop(html, biz.name, copy.design_vibe);
}

// ── Visual QA loop ────────────────────────────────────────────────────────────

const CHROME_PORT = 9232;

async function getBrowser(): Promise<{ browser: Browser; launched: boolean }> {
  // Always launch a dedicated headless Chromium for QA screenshots.
  // Connecting to the shared Chrome on port 9232 doesn't render local pages reliably.
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1440,900',
    ],
    defaultViewport: { width: 1440, height: 900 },
  });
  return { browser, launched: true };
}

async function runVisualQALoop(
  html: string,
  bizName: string,
  vibe: string,
  maxIterations = 3,
): Promise<string> {
  let currentHtml = html;
  const client = getAnthropicClient();

  for (let i = 0; i < maxIterations; i++) {
    let screenshotPath: string | null = null;
    let launchedBrowser: Browser | null = null;

    try {
      // 1. Serve HTML via a temporary HTTP server (OS-assigned port to avoid conflicts)
      const htmlContent = currentHtml;
      const server = http.createServer((_req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(htmlContent);
      });
      const httpPort = await new Promise<number>((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', () => {
          resolve((server.address() as any).port);
        });
      });

      const { browser, launched } = await getBrowser();
      if (launched) launchedBrowser = browser;
      const page = await browser.newPage();

      try {
        // networkidle0 waits until Tailwind CDN + Google Fonts have loaded
        await page.goto(`http://127.0.0.1:${httpPort}/`, { waitUntil: 'networkidle0', timeout: 40000 });
        // Force all reveal elements visible for the QA screenshot
        await page.evaluate(() => {
          document.querySelectorAll<HTMLElement>('.reveal, .reveal-left, .reveal-right').forEach(el => {
            el.classList.add('visible');
          });
        });
        await new Promise(r => setTimeout(r, 1500)); // let transitions settle

        screenshotPath = `/tmp/qa-screenshot-${i}-${Date.now()}.jpg`;
        await page.screenshot({
          path: screenshotPath,
          fullPage: true,
          type: 'jpeg',
          quality: 70,
        });
      } finally {
        await page.close().catch(() => {});
        if (launchedBrowser) await launchedBrowser.close().catch(() => {});
        server.close();
      }

      // 2. Claude vision QA via Anthropic SDK (supports base64 image input)
      const imgData = fs.readFileSync(screenshotPath!).toString('base64');

      const qaMsg = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 512,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/jpeg', data: imgData },
            },
            {
              type: 'text',
              text: `You are reviewing a website demo for "${bizName}" (target vibe: ${vibe}).

Score these 5 dimensions — be strict:
1. Vibe match (1-10): Does it actually feel like ${vibe}? Generic = 2. Genuinely tailored = 8+.
2. Visual hierarchy (1-10): Hero → services → booking flow?
3. Typography (1-10): Fonts distinctive for the vibe? Clear size hierarchy?
4. Spacing (1-10): Breathing room appropriate?
5. Colour (1-10): Palette cohesive?

If total >= 40: output exactly: PASS

If total < 40: output FIX then list up to 3 SPECIFIC changes. Reference exact element + exact change.
BAD: "improve hero section"
GOOD: "hero heading text-3xl is too small — change to text-6xl md:text-8xl"

Output ONLY "PASS" or "FIX\n[instructions]". No score breakdown.`,
            },
          ],
        }],
      });

      const qaResult = ((qaMsg.content[0] as any).text || '').trim();
      if (screenshotPath) {
        // Save a copy at a fixed path for Telegram preview
        fs.copyFileSync(screenshotPath, '/tmp/qa-latest.jpg');
        fs.unlink(screenshotPath, () => {});
      }
      screenshotPath = null;

      if (qaResult.startsWith('PASS')) {
        console.log(`[qa] ${bizName}: PASS on iteration ${i + 1}`);
        return currentHtml;
      }

      // 3. Apply fixes via Anthropic SDK
      const fixInstructions = qaResult.replace(/^FIX\s*/i, '').trim();
      console.log(`[qa] ${bizName}: applying fixes (iteration ${i + 1}):\n${fixInstructions}`);

      const fixMsg = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 8000,
        messages: [{
          role: 'user',
          content: `Apply these specific HTML/CSS changes to the demo page. Return the COMPLETE updated HTML document — do not truncate or summarise.

Changes to make:
${fixInstructions}

Current HTML:
${currentHtml}`,
        }],
      });

      const fixText = ((fixMsg.content[0] as any).text || '').trim();
      // Extract HTML by finding first <!DOCTYPE and last </html> — works regardless of markdown fences
      const docStart = fixText.indexOf('<!DOCTYPE');
      const htmlEnd = fixText.lastIndexOf('</html>');
      if (docStart !== -1 && htmlEnd !== -1 && htmlEnd > docStart) {
        currentHtml = fixText.slice(docStart, htmlEnd + '</html>'.length);
        console.log(`[qa] ${bizName}: fixed HTML applied (${currentHtml.length} chars)`);
      } else {
        // Try <html> without doctype
        const htmlStart = fixText.indexOf('<html');
        if (htmlStart !== -1 && htmlEnd !== -1 && htmlEnd > htmlStart) {
          currentHtml = `<!DOCTYPE html>\n${fixText.slice(htmlStart, htmlEnd + '</html>'.length)}`;
          console.log(`[qa] ${bizName}: fixed HTML applied (no doctype, ${currentHtml.length} chars)`);
        } else {
          console.warn(`[qa] ${bizName}: fix response had no valid HTML — keeping previous`);
          break;
        }
      }

    } catch (err) {
      console.warn(`[qa] ${bizName}: iteration ${i + 1} error:`, (err as Error).message);
      if (screenshotPath) fs.unlink(screenshotPath, () => {});
      if (launchedBrowser) await launchedBrowser.close().catch(() => {});
      break;
    }
  }

  console.log(`[qa] ${bizName}: QA loop complete (${maxIterations} iterations max)`);
  return currentHtml;
}
