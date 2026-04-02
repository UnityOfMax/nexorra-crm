#!/usr/bin/env node
/**
 * Capture a single website screenshot for video generation.
 * Single static screenshot — no scroll animation.
 * Chrome frame generated via ffmpeg drawtext (no Chrome round-trip).
 *
 * Output: 1 frame at 1920x1080 (88px Chrome header + 992px page content).
 *
 * Usage: npx tsx scripts/loom-video/capture-profile.ts <website_url> [profile_url]
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const CHROME_TOOL = path.join(__dirname, "..", "chrome-tool.js");
const DEFAULT_VIDEO_PORT = 9224;
const FONT_PATH = "/usr/share/fonts/truetype/ubuntu/Ubuntu-R.ttf";
const CHROME_FRAMES_DIR = path.join(__dirname, "../../assets/chrome-frames");

// Chrome header is 88px tall, page content fills 992px below it
const FRAME_WIDTH = 1920;
const HEADER_HEIGHT = 88;
const PAGE_HEIGHT = 1080 - HEADER_HEIGHT; // 992

// Module-level warmup cache: port → Set of already-warmed hostnames
// Avoids hitting homepage on every lead — once per process per hostname per port
const warmedHosts = new Map<number, Set<string>>();

// Hostname → brokerage key mapping (matches assets/chrome-frames/{key}.png)
const HOSTNAME_TO_BROKERAGE: Record<string, string> = {
  "compass.com":          "compass",
  "bhhs.com":             "bhhs",
  "remax.com":            "remax",
  "realtor.com":          "realtor",
  "sothebysrealty.com":   "sothebys",
  "sothebys.realty":      "sothebys",
  "exprealty.com":        "exp",
  "expcommercial.com":    "exp",
  "kw.com":               "kw",
  "kellerwilliams.com":   "kw",
  "coldwellbanker.com":   "coldwellbanker",
  "century21.com":        "century21",
  "instagram.com":        "instagram",
};

/**
 * Returns the brokerage key for a URL, or "default" if unknown.
 * Used to look up prerendered chrome frame PNGs.
 */
function getBrokerageKey(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    for (const [domain, key] of Object.entries(HOSTNAME_TO_BROKERAGE)) {
      if (hostname === domain || hostname.endsWith("." + domain)) return key;
    }
  } catch {}
  return "default";
}

export interface CaptureResult {
  screenshotDir: string;
  frameCount: number;
}

export interface CaptureOptions {
  websiteUrl?: string;   // Lead's personal website (preferred)
  profileUrl: string;    // Brokerage profile (fallback)
  fallbackUrls?: string[];
  port?: number;         // Chrome debug port (default 9224)
}

function sleep(ms: number) {
  execSync(`sleep ${ms / 1000}`);
}

/**
 * Get Chrome header PNG for a URL.
 * Prefers a prerendered brokerage frame (instant copy) over per-lead ffmpeg drawtext (~150ms).
 * Falls back to per-lead generation if prerendered frame not found.
 */
function generateChromeFrame(
  tmpDir: string,
  pageTitle: string,
  pageUrl: string
): string {
  const outputPath = path.join(tmpDir, "chrome-frame.png");

  // Use prerendered brokerage frame if available (~0ms vs ~150ms)
  const brokerageKey = getBrokerageKey(pageUrl);
  const prerenderedPath = path.join(CHROME_FRAMES_DIR, `${brokerageKey}.png`);
  if (fs.existsSync(prerenderedPath)) {
    fs.copyFileSync(prerenderedPath, outputPath);
    return outputPath;
  }

  // Fallback: per-lead ffmpeg drawtext (used when prerendered frames not generated yet)
  const tabTitle =
    pageTitle.length > 45 ? pageTitle.slice(0, 43) + "..." : pageTitle;
  let displayUrl = pageUrl;
  try {
    const u = new URL(pageUrl);
    displayUrl = u.hostname + u.pathname;
    if (displayUrl.length > 85) displayUrl = displayUrl.slice(0, 83) + "...";
  } catch {}

  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/:/g, "\\:");
  const escTitle = esc(tabTitle);
  const escUrl = esc(displayUrl);
  const fontArg = fs.existsSync(FONT_PATH) ? `fontfile=${FONT_PATH}:` : "";

  execSync(
    `ffmpeg -y -f lavfi -i "color=c=#202124:size=${FRAME_WIDTH}x${HEADER_HEIGHT}:r=1" \
      -vf "drawbox=x=8:y=5:w=265:h=35:color=#35363a@1.0:t=fill,\
drawbox=x=0:y=40:w=${FRAME_WIDTH}:h=48:color=#35363a@1.0:t=fill,\
drawbox=x=48:y=46:w=1828:h=35:color=#202124@1.0:t=fill,\
drawtext=${fontArg}fontcolor=white:fontsize=11:x=28:y=15:text='${escTitle}',\
drawtext=${fontArg}fontcolor=#9aa0a6:fontsize=13:x=74:y=54:text='${escUrl}'" \
      -frames:v 1 "${outputPath}"`,
    { stdio: "pipe", timeout: 5000 }
  );

  return outputPath;
}

/**
 * Composite Chrome frame (88px) on top of page screenshot (992px) → 1920x1080.
 */
function compositeFrame(
  chromeFramePath: string,
  pageScreenshot: string,
  outputPath: string
): void {
  execSync(
    `ffmpeg -y -i "${chromeFramePath}" -i "${pageScreenshot}" \
      -filter_complex "[0:v]scale=${FRAME_WIDTH}:${HEADER_HEIGHT}[top];\
[1:v]scale=${FRAME_WIDTH}:${PAGE_HEIGHT}[bot];\
[top][bot]vstack=inputs=2[v]" \
      -map "[v]" -frames:v 1 "${outputPath}"`,
    { stdio: "pipe", timeout: 15000 }
  );
}

export async function captureProfile(
  urlOrOpts: string | CaptureOptions
): Promise<CaptureResult> {
  const opts =
    typeof urlOrOpts === "string"
      ? { profileUrl: urlOrOpts, fallbackUrls: [], port: DEFAULT_VIDEO_PORT }
      : urlOrOpts;

  const port = opts.port ?? DEFAULT_VIDEO_PORT;

  // Initialize warmup cache for this port if needed
  if (!warmedHosts.has(port)) warmedHosts.set(port, new Set());
  const portWarmed = warmedHosts.get(port)!;

  // Viewport: page content only (Chrome frame added via ffmpeg later)
  const vp = { vw: FRAME_WIDTH, vh: PAGE_HEIGHT };

  function chrome(cmd: string, timeoutMs = 30000): string {
    const vwArgs = `--vw ${vp.vw} --vh ${vp.vh}`;
    try {
      return execSync(`node "${CHROME_TOOL}" --port ${port} ${vwArgs} ${cmd}`, {
        encoding: "utf-8",
        timeout: timeoutMs,
      }).trim();
    } catch (e) {
      const msg = (e as any).stderr?.toString() || (e as Error).message;
      console.log(`[chrome:${port}] Warning: ${msg.slice(0, 200)}`);
      return "";
    }
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "loom-profile-"));
  const rawPath = path.join(tmpDir, "raw_00000.png");
  const framePath = path.join(tmpDir, "frame_00000.png");

  // 1. Check Chrome connection
  console.log(`[capture] Checking Chrome on port ${port}...`);
  const status = chrome("status");
  if (!status.includes("connected") && !status.includes("true") && !status.includes("tabs")) {
    throw new Error(`Chrome not connected on port ${port}. Run: bash scripts/chrome-launch-video.sh ${port}`);
  }

  // 2. Maximize + set viewport
  chrome("maximize");
  sleep(100);
  chrome(`viewport ${FRAME_WIDTH} ${PAGE_HEIGHT}`);

  // 3. URL priority: personal website → brokerage profile → fallbacks
  const urlsToTry = [
    opts.websiteUrl,
    opts.profileUrl,
    ...(opts.fallbackUrls || []),
  ].filter(Boolean) as string[];

  let loadedUrl = "";
  let pageTitle = "";

  for (const url of urlsToTry) {
    // Homepage warmup for cookies — only ONCE per port per hostname across all leads
    try {
      const siteUrl = new URL(url);
      const hostname = siteUrl.hostname;
      const homepage = `${siteUrl.protocol}//${hostname}`;

      if (!portWarmed.has(hostname)) {
        console.log(`[capture] Warming up ${hostname} for port ${port}...`);
        const homeResult = chrome(`navigate "${homepage}"`);
        portWarmed.add(hostname);
        if (!homeResult.includes('"blocked":true') && !homeResult.includes('"cloudflare":true')) {
          sleep(800);
          chrome("dismiss-cookies");
          sleep(300);
        }
      }
    } catch {}

    // Navigate to profile
    console.log(`[capture] Navigating to: ${url}`);
    const navResult = chrome(`navigate "${url}"`);
    if (navResult.includes('"blocked":true') || navResult.includes('"cloudflare":true')) {
      console.log(`[capture] Cloudflare blocked, trying next URL...`);
      continue;
    }

    // Wait for page render (JS frameworks need ~1s after DOMContentLoaded)
    sleep(1500);
    chrome("dismiss-cookies");
    sleep(300);

    // Check for bot/auth blocks via text + title
    const text = chrome('text "body"');
    const title = chrome("title");
    if (
      text.length < 200 ||
      text.includes("404") ||
      text.includes("Page Not Found") ||
      text.includes("request could not be processed") ||
      text.includes("access to this page has been denied") ||
      text === "chrome is not defined" ||
      /just a moment|attention required|security check|cloudflare/i.test(title) ||
      /sign (in|up)|log in|join now/i.test(title) ||
      ((title === "Loading..." || title === "") && text.length < 1000)
    ) {
      console.log(
        `[capture] Page blocked or empty (title: "${title}", chars: ${text.length}), trying next...`
      );
      continue;
    }

    loadedUrl = url;
    pageTitle = title || "Loading...";
    console.log(`[capture] Loaded: ${url} (${text.length} chars, "${pageTitle}")`);
    break;
  }

  if (!loadedUrl) {
    const currentTitle = chrome("title") || "";
    if (/attention required|cloudflare|security check|just a moment/i.test(currentTitle)) {
      throw new Error(
        `all-urls-cloudflare-blocked: all profile URLs Cloudflare-blocked (title: "${currentTitle}")`
      );
    }
    // Use whatever is loaded (best effort)
    loadedUrl = urlsToTry[0] || opts.profileUrl;
    pageTitle = currentTitle || "Loading...";
  }

  // 4. Scroll to top then take ONE static screenshot
  chrome("scroll -2000");
  sleep(200);
  chrome("scroll -2000");
  sleep(300);

  console.log(`[capture] Taking screenshot...`);
  chrome(`screenshot "${rawPath}"`, 45000);

  const shotSize = fs.existsSync(rawPath) ? fs.statSync(rawPath).size : 0;
  console.log(`[capture] Screenshot: ${(shotSize / 1024).toFixed(1)}KB`);
  if (shotSize < 5000) {
    console.log("[capture] WARNING: screenshot appears blank");
  }

  // 5. Generate Chrome frame via ffmpeg (fast, no Chrome navigate)
  const chromeFramePath = generateChromeFrame(tmpDir, pageTitle, loadedUrl);
  console.log(`[capture] Chrome frame: "${pageTitle.slice(0, 40)}" | ${loadedUrl.slice(0, 60)}`);

  // 6. Composite: chrome frame (88px) + page screenshot (992px) → 1920x1080
  compositeFrame(chromeFramePath, rawPath, framePath);

  // Clean up intermediate files
  try { fs.unlinkSync(rawPath); } catch {}
  try { fs.unlinkSync(chromeFramePath); } catch {}

  console.log(`[capture] Done. 1 frame → ${tmpDir}`);
  return { screenshotDir: tmpDir, frameCount: 1 };
}

// CLI entry point
if (require.main === module) {
  const websiteUrl = process.argv[2];
  const profileUrl = process.argv[3];

  if (!websiteUrl) {
    console.error("Usage: npx tsx scripts/loom-video/capture-profile.ts <website_url> [profile_url]");
    process.exit(1);
  }

  (async () => {
    try {
      const result = await captureProfile({
        websiteUrl,
        profileUrl: profileUrl || websiteUrl,
        fallbackUrls: [],
      });
      console.log(`Screenshot dir: ${result.screenshotDir} (${result.frameCount} frames)`);
    } catch (err) {
      console.error("[capture] FATAL:", (err as Error).message);
      process.exit(1);
    }
  })();
}
