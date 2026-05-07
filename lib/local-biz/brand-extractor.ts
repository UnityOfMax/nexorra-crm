/**
 * Brand Extractor — pulls color palette and identity from a business's website or GMB.
 *
 * Strategy (in order):
 *   1. <meta name="theme-color"> — most reliable, explicit brand color
 *   2. CSS custom properties (--primary, --brand, --accent, --color-primary, etc.)
 *   3. Frequency analysis of all hex colors in CSS, filtering out near-white/black/gray
 *   4. OG image dominant color (not yet implemented — TODO with sharp)
 *   5. Niche defaults keyed to source_brokerage
 */

import https from 'https';
import http from 'http';

// ── Color utilities ────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16),
      parseInt(clean[1] + clean[1], 16),
      parseInt(clean[2] + clean[2], 16),
    ];
  }
  if (clean.length === 6) {
    return [
      parseInt(clean.slice(0, 2), 16),
      parseInt(clean.slice(2, 4), 16),
      parseInt(clean.slice(4, 6), 16),
    ];
  }
  return null;
}

function isVivid(hex: string): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  const [r, g, b] = rgb;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2 / 255;
  const saturation = max === min ? 0 : (max - min) / (1 - Math.abs(2 * lightness - 1)) / 255;
  // Must have meaningful saturation and not be near-white/black
  return saturation > 0.25 && lightness > 0.1 && lightness < 0.92;
}

function darkenHex(hex: string, amount = 0.15): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const [r, g, b] = rgb;
  const d = (v: number) => Math.max(0, Math.round(v * (1 - amount)));
  return '#' + [d(r), d(g), d(b)].map(v => v.toString(16).padStart(2, '0')).join('');
}

// ── HTTP fetch (no deps) ───────────────────────────────────────────────────────

function fetchHtml(url: string, timeoutMs = 8000): Promise<string> {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DemoBuilder/1.0)',
        Accept: 'text/html',
      },
    }, res => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchHtml(res.headers.location, timeoutMs).then(resolve).catch(reject);
        return;
      }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; if (body.length > 200_000) res.destroy(); });
      res.on('end', () => resolve(body));
    });
    req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
  });
}

// ── Core extraction ────────────────────────────────────────────────────────────

export interface BrandColors {
  primary: string;
  accent: string;
  source: 'theme-color' | 'css-variable' | 'frequency' | 'niche-default';
}

export async function extractColorsFromWebsite(websiteUrl: string): Promise<BrandColors> {
  try {
    const html = await fetchHtml(websiteUrl);

    // 1. <meta name="theme-color">
    const themeColor = html.match(/<meta[^>]+name=["']theme-color["'][^>]+content=["']([^"']+)["']/i)?.[1]
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']theme-color["']/i)?.[1];
    if (themeColor && themeColor.startsWith('#') && isVivid(themeColor)) {
      return { primary: themeColor, accent: darkenHex(themeColor), source: 'theme-color' };
    }

    // 2. CSS custom properties matching brand patterns
    const cssVarPatterns = [
      /--(?:primary|brand|accent|main|color-primary|color-brand|brand-primary)[^:]*:\s*(#[0-9a-fA-F]{3,8})/gi,
      /--(?:color-(?:primary|brand|main|accent))[^:]*:\s*(#[0-9a-fA-F]{3,8})/gi,
    ];
    const cssVarColors: string[] = [];
    for (const pat of cssVarPatterns) {
      let m;
      pat.lastIndex = 0;
      while ((m = pat.exec(html)) !== null) {
        if (isVivid(m[1])) cssVarColors.push(m[1]);
      }
    }
    if (cssVarColors.length >= 2) return { primary: cssVarColors[0], accent: cssVarColors[1], source: 'css-variable' };
    if (cssVarColors.length === 1) return { primary: cssVarColors[0], accent: darkenHex(cssVarColors[0]), source: 'css-variable' };

    // 3. Frequency analysis of all hex colors
    const hexRe = /#([0-9a-fA-F]{6})\b/g;
    const allHex: string[] = [];
    let hexM: RegExpExecArray | null;
    while ((hexM = hexRe.exec(html)) !== null) allHex.push('#' + hexM[1]);
    const freq: Record<string, number> = {};
    for (const c of allHex) {
      if (isVivid(c)) freq[c] = (freq[c] || 0) + 1;
    }
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]).map(([c]) => c);
    if (sorted.length >= 2) return { primary: sorted[0], accent: sorted[1], source: 'frequency' };
    if (sorted.length === 1) return { primary: sorted[0], accent: darkenHex(sorted[0]), source: 'frequency' };

  } catch {
    // fallthrough to niche default
  }

  return { primary: '#1a1a1a', accent: '#6b7280', source: 'niche-default' };
}

// ── Niche defaults ─────────────────────────────────────────────────────────────

const NICHE_DEFAULTS: Record<string, BrandColors> = {
  'pest control':         { primary: '#22c55e', accent: '#16a34a', source: 'niche-default' },
  'exterminator':         { primary: '#eab308', accent: '#ca8a04', source: 'niche-default' },
  'landscaping':          { primary: '#73cf11', accent: '#5aaa0d', source: 'niche-default' },
  'lawn care':            { primary: '#73cf11', accent: '#5aaa0d', source: 'niche-default' },
  'roofing contractor':   { primary: '#c8102e', accent: '#a00d24', source: 'niche-default' },
  'roofing':              { primary: '#c8102e', accent: '#a00d24', source: 'niche-default' },
  'kitchen remodel':      { primary: '#d97706', accent: '#b45309', source: 'niche-default' },
  'bathroom remodel':     { primary: '#92704a', accent: '#7a5c3a', source: 'niche-default' },
};

export function getNicheDefaults(bizType: string): BrandColors {
  const lower = bizType.toLowerCase();
  for (const [key, colors] of Object.entries(NICHE_DEFAULTS)) {
    if (lower.includes(key)) return colors;
  }
  return { primary: '#2563eb', accent: '#1d4ed8', source: 'niche-default' };
}

// ── Main export ────────────────────────────────────────────────────────────────

export async function extractBrandColors(
  websiteUrl: string | null,
  bizType: string,
): Promise<BrandColors> {
  if (websiteUrl) {
    try {
      const extracted = await extractColorsFromWebsite(websiteUrl);
      if (extracted.source !== 'niche-default') return extracted;
    } catch { /* fall through */ }
  }
  return getNicheDefaults(bizType);
}
