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

import { execSync, exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const CHROME_TOOL = path.join(__dirname, "..", "chrome-tool.js");
const DEFAULT_VIDEO_PORT = 9224;
const FONT_PATH = "/usr/share/fonts/truetype/ubuntu/Ubuntu-R.ttf";
const CHROME_FRAMES_DIR = path.join(__dirname, "../../assets/chrome-frames");
const XDISPLAY = ":99";

// Chrome header is 88px tall, page content fills 992px below it
const FRAME_WIDTH = 1920;
const HEADER_HEIGHT = 88;
const PAGE_HEIGHT = 1080 - HEADER_HEIGHT; // 992

// Module-level warmup cache: port → Set of already-warmed hostnames
// Avoids hitting homepage on every lead — once per process per hostname per port
const warmedHosts = new Map<number, Set<string>>();

// Cache: port → X11 window ID (valid for process lifetime; re-queried if stale)
const portToWid = new Map<number, string>();

/** Find Chrome's X11 window ID by matching its user-data-dir to the port number. */
function getWindowId(port: number): string {
  // Check cache first (but re-verify the window still exists)
  if (portToWid.has(port)) {
    const wid = portToWid.get(port)!;
    try {
      execSync(`DISPLAY=${XDISPLAY} xwininfo -id ${wid} 2>/dev/null`, { stdio: "pipe" });
      return wid;
    } catch {
      portToWid.delete(port); // stale, re-query
    }
  }
  const tree = execSync(`DISPLAY=${XDISPLAY} xwininfo -root -tree 2>/dev/null`, {
    encoding: "utf-8", stdio: "pipe"
  });
  const re = new RegExp(`(0x[0-9a-f]+).*chrome.*${port}[^)]*\\)`, "i");
  const match = tree.match(re);
  if (!match) throw new Error(`Chrome window not found for port ${port}. Is Chrome running?`);
  portToWid.set(port, match[1]);
  return match[1];
}

/** Read Chrome's current page title from the X11 window title bar (no CDP). */
function getX11Title(wid: string): string {
  try {
    const info = execSync(`DISPLAY=${XDISPLAY} xwininfo -id ${wid} 2>/dev/null`, {
      encoding: "utf-8", stdio: "pipe"
    });
    const match = info.match(/"([^"]+)"\s*$/m);
    if (!match) return "";
    return match[1].replace(/ - Google Chrome$/i, "").trim();
  } catch {
    return "";
  }
}

/**
 * Navigate Chrome via xdotool (no CDP — eliminates Puppeteer fingerprint from the request).
 * Writes the URL via a temp file to avoid shell-escaping issues with special characters.
 * Uses the Chrome port in the filename to prevent race conditions between parallel workers.
 */
async function navigateX11(wid: string, url: string, port: number): Promise<void> {
  const urlFile = `/tmp/xdotool-url-port${port}.txt`;
  fs.writeFileSync(urlFile, url);
  try {
    execSync(`DISPLAY=${XDISPLAY} xdotool key --window ${wid} ctrl+l`, { stdio: "pipe" });
    await sleep(150);
    execSync(
      `DISPLAY=${XDISPLAY} xdotool type --window ${wid} --clearmodifiers --file "${urlFile}"`,
      { stdio: "pipe" }
    );
    await sleep(100);
    execSync(`DISPLAY=${XDISPLAY} xdotool key --window ${wid} Return`, { stdio: "pipe" });
  } finally {
    try { fs.unlinkSync(urlFile); } catch {}
  }
}

/**
 * Wait for Chrome to finish loading by polling the X11 window title (no CDP).
 * Handles:
 *   - "Just a moment…"   → waits up to 45s for the CF JS challenge to auto-resolve
 *   - "Attention Required!" → hard block, returns immediately
 *   - Normal titles      → returns as soon as title stabilises
 */
async function waitForX11Load(
  wid: string,
  maxMs = 10000
): Promise<{ title: string; blocked: boolean; hardBlock: boolean }> {
  const deadline = Date.now() + maxMs;

  while (Date.now() < deadline) {
    await sleep(400);
    const title = getX11Title(wid);
    if (!title || title === "New Tab" || title === "" || title === "about:blank") continue;

    if (/attention required|access denied/i.test(title))
      return { title, blocked: true, hardBlock: true };

    if (/just a moment|checking your browser/i.test(title)) {
      // Soft CF challenge — wait WITHOUT any polling (CDP or xwininfo calls stall the JS).
      // Cloudflare's challenge JS needs uninterrupted time to run.
      const cfDeadline = Date.now() + 45000;
      while (Date.now() < cfDeadline) {
        await sleep(5000);
        const newTitle = getX11Title(wid);
        if (!/just a moment|checking your browser/i.test(newTitle))
          return { title: newTitle, blocked: false, hardBlock: false };
      }
      return { title, blocked: true, hardBlock: false };
    }

    if (/404|page not found|not found/i.test(title))
      return { title, blocked: true, hardBlock: false };

    return { title, blocked: false, hardBlock: false };
  }

  return { title: getX11Title(wid) || "Loading...", blocked: false, hardBlock: false };
}

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

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get Chrome header PNG for a URL.
 * Prefers a prerendered brokerage frame (instant copy) over per-lead ffmpeg drawtext (~150ms).
 * Falls back to per-lead generation if prerendered frame not found.
 */
async function generateChromeFrame(
  tmpDir: string,
  pageTitle: string,
  pageUrl: string
): Promise<string> {
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

  await execAsync(
    `ffmpeg -y -f lavfi -i "color=c=#202124:size=${FRAME_WIDTH}x${HEADER_HEIGHT}:r=1" \
      -vf "drawbox=x=8:y=5:w=265:h=35:color=#35363a@1.0:t=fill,\
drawbox=x=0:y=40:w=${FRAME_WIDTH}:h=48:color=#35363a@1.0:t=fill,\
drawbox=x=48:y=46:w=1828:h=35:color=#202124@1.0:t=fill,\
drawtext=${fontArg}fontcolor=white:fontsize=11:x=28:y=15:text='${escTitle}',\
drawtext=${fontArg}fontcolor=#9aa0a6:fontsize=13:x=74:y=54:text='${escUrl}'" \
      -frames:v 1 "${outputPath}"`,
    { timeout: 5000, maxBuffer: 2 * 1024 * 1024 }
  );

  return outputPath;
}

/**
 * Composite Chrome frame (88px) on top of page screenshot (992px) → 1920x1080.
 */
async function compositeFrame(
  chromeFramePath: string,
  pageScreenshot: string,
  outputPath: string
): Promise<void> {
  await execAsync(
    `ffmpeg -y -i "${chromeFramePath}" -i "${pageScreenshot}" \
      -filter_complex "[0:v]scale=${FRAME_WIDTH}:${HEADER_HEIGHT}[top];\
[1:v]scale=${FRAME_WIDTH}:${PAGE_HEIGHT}[bot];\
[top][bot]vstack=inputs=2[v]" \
      -map "[v]" -frames:v 1 "${outputPath}"`,
    { timeout: 15000, maxBuffer: 2 * 1024 * 1024 }
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

  /**
   * CDP wrapper — always uses --fast to skip evaluateOnNewDocument.
   * evaluateOnNewDocument is the actual Cloudflare fingerprint; CDP Page.navigate
   * by itself does not trigger Cloudflare detection.
   */
  async function cdp(cmd: string, timeoutMs = 65000): Promise<string> {
    try {
      const { stdout } = await execAsync(
        `node "${CHROME_TOOL}" --port ${port} --fast ${cmd}`,
        { timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 }
      );
      return stdout.trim();
    } catch (e) {
      const msg = (e as any).stderr?.toString() || (e as Error).message;
      console.log(`[cdp:${port}] Warning: ${msg.slice(0, 200)}`);
      return "";
    }
  }

  /**
   * Navigate via CDP Page.navigate (--fast mode, no evaluateOnNewDocument).
   * Returns parsed title/blocked status from chrome-tool.js JSON output.
   * chrome-tool.js navigate outputs "Navigating to: URL" then a JSON line — we take the last line.
   */
  async function cdpNavigate(url: string, timeoutMs = 65000): Promise<{
    title: string; blocked: boolean; hardBlock: boolean;
  }> {
    const raw = await cdp(`navigate "${url}"`, timeoutMs);
    // navigate outputs a "Navigating to:" log line then the JSON result — take the last non-empty line
    const jsonLine = raw.split("\n").map(l => l.trim()).filter(l => l.startsWith("{")).pop() || "";
    try {
      const parsed = JSON.parse(jsonLine);
      const title: string = parsed.title || "";
      const blocked: boolean = parsed.blocked || false;
      const hardBlock = blocked && /attention required|access denied/i.test(title);
      return { title, blocked, hardBlock };
    } catch {
      return { title: "", blocked: false, hardBlock: false };
    }
  }

  if (!warmedHosts.has(port)) warmedHosts.set(port, new Set());
  const portWarmed = warmedHosts.get(port)!;

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "loom-profile-"));
  const rawPath = path.join(tmpDir, "raw_00000.png");
  const framePath = path.join(tmpDir, "frame_00000.png");

  // URL priority: personal website → brokerage profile → fallbacks
  const urlsToTry = [
    opts.websiteUrl,
    opts.profileUrl,
    ...(opts.fallbackUrls || []),
  ].filter(Boolean) as string[];

  let loadedUrl = "";
  let pageTitle = "";

  for (const url of urlsToTry) {
    // Homepage warmup — once per port per hostname.
    // Establishes Cloudflare cookies/fingerprint so profile pages pass without re-challenge.
    try {
      const siteUrl = new URL(url);
      const hostname = siteUrl.hostname;
      const homepage = `${siteUrl.protocol}//${hostname}`;

      if (!portWarmed.has(hostname)) {
        console.log(`[capture] Warming up ${hostname} on port ${port}...`);
        const warmResult = await cdpNavigate(homepage, 65000);
        portWarmed.add(hostname);
        if (!warmResult.blocked) {
          await sleep(300);
          await cdp("dismiss-cookies");
          await sleep(200);
        }
      }
    } catch {}

    // Navigate to target page (CDP --fast, no JS injection)
    console.log(`[capture] Navigating to: ${url}`);
    const loadResult = await cdpNavigate(url, 65000);
    const { title, blocked, hardBlock } = loadResult;

    if (hardBlock) {
      console.log(`[capture] Hard block on ${url} (${title}) — trying next URL`);
      continue;
    }
    if (blocked) {
      console.log(`[capture] Page blocked/not found (${title}) — trying next URL`);
      continue;
    }

    // Check for auth walls via title
    if (/sign (in|up)|log in|join now/i.test(title)) {
      console.log(`[capture] Auth wall detected (${title}) — trying next URL`);
      continue;
    }

    loadedUrl = url;
    pageTitle = title || "Loading...";
    console.log(`[capture] Loaded: "${pageTitle}"`);
    break;
  }

  if (!loadedUrl) {
    // All URLs failed — use first URL anyway and capture whatever is on screen
    loadedUrl = urlsToTry[0] || opts.profileUrl;
    pageTitle = "Loading...";
    console.log(`[capture] All URLs blocked/failed — capturing fallback screenshot`);
  }

  // Dismiss cookies (post-load) — ignore failures (page may not have a cookie banner)
  await cdp("dismiss-cookies");
  await sleep(200);

  // Wait for React/SPA content to render before screenshotting.
  // 'load' event fires when resources download, but JS may still be rendering.
  await cdp("wait-content");

  // Take screenshot via CDP
  console.log(`[capture] Taking screenshot...`);
  await cdp(`screenshot "${rawPath}"`);

  let shotSize = fs.existsSync(rawPath) ? fs.statSync(rawPath).size : 0;
  console.log(`[capture] Screenshot: ${(shotSize / 1024).toFixed(1)}KB`);

  // Retry up to 3 times with increasing wait if blank/missing
  for (let attempt = 1; attempt <= 3 && shotSize < 5000; attempt++) {
    console.log(`[capture] Screenshot blank — waiting ${attempt * 2}s and retrying (${attempt}/3)...`);
    await sleep(attempt * 2000);
    await cdp("wait-content");
    await cdp(`screenshot "${rawPath}"`);
    shotSize = fs.existsSync(rawPath) ? fs.statSync(rawPath).size : 0;
    console.log(`[capture] Retry ${attempt} screenshot: ${(shotSize / 1024).toFixed(1)}KB`);
  }

  if (shotSize < 5000) {
    throw new Error(`screenshot-blank: page did not render at ${loadedUrl} (${pageTitle})`);
  }

  // Generate Chrome frame + composite
  const chromeFramePath = await generateChromeFrame(tmpDir, pageTitle, loadedUrl);
  console.log(`[capture] Chrome frame: "${pageTitle.slice(0, 40)}" | ${loadedUrl.slice(0, 60)}`);
  await compositeFrame(chromeFramePath, rawPath, framePath);

  // Reset tab to about:blank (stops background JS, frees renderer memory)
  try { await cdp('navigate "about:blank"', 5000); } catch {}

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
