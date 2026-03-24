#!/usr/bin/env node

/**
 * Capture Profile Screenshots
 * Connects to Chrome remote debugging, navigates to a lead's profile page,
 * and captures screenshots for video generation.
 *
 * Usage: npx tsx scripts/loom-video/capture-profile.ts <profile_url>
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { execSync } from "child_process";
import puppeteer, { Browser, Page } from "puppeteer";

const CHROME_DEBUG_URL = "http://localhost:9222";
const VIEWPORT_WIDTH = 1920;
const VIEWPORT_HEIGHT = 1080;
const BROWSER_CHROME_HEIGHT = 88; // Height of Chrome tab bar + URL bar
const PAGE_LOAD_WAIT_MS = 3000;
const SCROLL_DISTANCE = 500;
const SCROLL_STEP = 80;         // Big steps for fast flick
const SCROLL_INTERVAL_MS = 8;   // Very fast between steps
const SCROLL_PAUSE_MS = 200;    // Brief pause at bottom

// FPS for the scroll portion (frames captured per second)
const SCROLL_FPS = 15;

export interface CaptureResult {
  screenshotDir: string;
  frameCount: number;
}

async function smoothScroll(
  page: Page,
  distance: number,
  direction: "down" | "up"
): Promise<void> {
  const steps = Math.ceil(Math.abs(distance) / SCROLL_STEP);
  const delta = direction === "down" ? SCROLL_STEP : -SCROLL_STEP;
  for (let i = 0; i < steps; i++) {
    await page.evaluate((d) => window.scrollBy(0, d), delta);
    await new Promise((r) => setTimeout(r, SCROLL_INTERVAL_MS));
  }
}

async function dismissCookies(page: Page): Promise<void> {
  await page.evaluate(() => {
    // Click any visible accept/agree button
    const candidates = Array.from(document.querySelectorAll('button, a, div[role="button"], span[role="button"]'));
    for (const el of candidates) {
      const text = (el.textContent || '').toLowerCase().trim();
      const isVisible = (el as HTMLElement).offsetParent !== null;
      if (!isVisible) continue;
      if (
        text === 'accept' || text === 'accept all' || text === 'accept cookies' ||
        text === 'i agree' || text === 'agree' || text === 'got it' ||
        text === 'allow all' || text === 'allow' || text === 'ok' ||
        text === 'continue' || text === 'dismiss'
      ) {
        (el as HTMLElement).click();
        return;
      }
    }
    // Try common CSS selectors
    const selectors = [
      '.osano-cm-accept-all', '#onetrust-accept-btn-handler',
      '[data-testid="cookie-accept"]', '.cookie-consent-accept',
      '.cc-accept', '.cc-btn.cc-dismiss', '.gdpr-accept',
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel) as HTMLElement;
      if (el && el.offsetParent !== null) { el.click(); return; }
    }
    // Nuclear: remove any fixed/sticky overlay that covers viewport
    document.querySelectorAll('div, section, aside').forEach((el) => {
      const style = getComputedStyle(el);
      if ((style.position === 'fixed' || style.position === 'sticky') && parseInt(style.zIndex || '0') > 100) {
        const rect = el.getBoundingClientRect();
        if (rect.width > window.innerWidth * 0.5 && rect.height > 100) {
          (el as HTMLElement).style.display = 'none';
        }
      }
    });
  });
}

/**
 * Generate a browser chrome frame (tab bar + URL bar) as a canvas PNG.
 * This gets composited on top of page screenshots to look like a real browser window.
 */
async function generateBrowserFrame(page: Page, url: string, outputPath: string): Promise<void> {
  // Create a canvas-rendered browser chrome at the top
  // Windows Chrome style (no traffic lights, minimize/maximize/close on right)
  const hostname = new URL(url).hostname;
  const frameHtml = `
    <html><body style="margin:0;padding:0;background:#202124">
    <div style="width:1920px;height:${BROWSER_CHROME_HEIGHT}px;background:#202124;font-family:'Segoe UI',system-ui,sans-serif;color:#e8eaed;display:flex;flex-direction:column">
      <div style="height:40px;display:flex;align-items:center;background:#202124">
        <div style="flex:1;display:flex;align-items:flex-end;padding:0 8px 0 80px;height:100%">
          <div style="background:#35363a;border-radius:8px 8px 0 0;padding:8px 16px;font-size:12px;display:flex;align-items:center;gap:8px;max-width:220px;height:32px">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#9aa0a6"><circle cx="12" cy="12" r="10"/></svg>
            <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${hostname}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#9aa0a6" style="flex-shrink:0"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          </div>
          <div style="padding:10px 8px;font-size:18px;color:#9aa0a6;cursor:pointer">+</div>
        </div>
        <div style="display:flex;align-items:center;height:100%">
          <div style="width:46px;height:100%;display:flex;align-items:center;justify-content:center"><svg width="10" height="1" viewBox="0 0 10 1"><rect width="10" height="1" fill="#9aa0a6"/></svg></div>
          <div style="width:46px;height:100%;display:flex;align-items:center;justify-content:center"><svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#9aa0a6" stroke-width="1"><rect x="0.5" y="0.5" width="9" height="9"/></svg></div>
          <div style="width:46px;height:100%;display:flex;align-items:center;justify-content:center;background:transparent"><svg width="12" height="12" viewBox="0 0 24 24" fill="#9aa0a6"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></div>
        </div>
      </div>
      <div style="height:48px;display:flex;align-items:center;padding:0 12px;background:#35363a;border-bottom:1px solid #5f6368">
        <div style="display:flex;gap:8px;padding-right:12px;align-items:center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#9aa0a6"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#9aa0a6"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#9aa0a6"><path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
        </div>
        <div style="flex:1;background:#202124;border-radius:24px;padding:7px 16px;font-size:14px;display:flex;align-items:center;gap:8px">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#9aa0a6"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
          <span style="color:#9aa0a6;font-size:13px">${url}</span>
        </div>
        <div style="display:flex;gap:12px;padding-left:12px;align-items:center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#9aa0a6"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
        </div>
      </div>
    </div>
    </body></html>`;

  // Render the browser frame
  const framePage = await page.browser().newPage();
  await framePage.setViewport({ width: 1920, height: BROWSER_CHROME_HEIGHT });
  await framePage.setContent(frameHtml);
  await framePage.screenshot({ path: outputPath, type: 'png' });
  await framePage.close();
}

async function connectToChrome(): Promise<Browser> {
  try {
    const browser = await puppeteer.connect({
      browserURL: CHROME_DEBUG_URL,
      defaultViewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
    });
    return browser;
  } catch (err) {
    throw new Error(
      `Failed to connect to Chrome at ${CHROME_DEBUG_URL}. ` +
        `Make sure Chrome is running with --remote-debugging-port=9222. ` +
        `Error: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

export interface CaptureOptions {
  profileUrl: string;
  fallbackUrls?: string[]; // website, instagram, facebook — tried in order if profileUrl fails
}

export async function captureProfile(
  profileUrlOrOpts: string | CaptureOptions
): Promise<CaptureResult> {
  const opts = typeof profileUrlOrOpts === 'string'
    ? { profileUrl: profileUrlOrOpts, fallbackUrls: [] }
    : profileUrlOrOpts;
  let profileUrl = opts.profileUrl;
  const tmpDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "loom-profile-")
  );
  let browser: Browser | null = null;
  let page: Page | null = null;
  let frameIndex = 0;

  const screenshotPath = (idx: number) =>
    path.join(tmpDir, `frame_${String(idx).padStart(5, "0")}.png`);

  try {
    browser = await connectToChrome();
    page = await browser.newPage();
    await page.setViewport({
      width: VIEWPORT_WIDTH,
      height: VIEWPORT_HEIGHT,
    });

    // Step 1: Navigate to site HOMEPAGE first to accept cookies (stored per domain)
    const siteUrl = new URL(profileUrl);
    const homepage = `${siteUrl.protocol}//${siteUrl.hostname}`;
    console.log(`[capture] Visiting homepage first for cookies: ${homepage}`);
    await page.goto(homepage, { waitUntil: "networkidle2", timeout: 15000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 2000));

    // Dismiss cookie banners aggressively
    await dismissCookies(page);
    await new Promise((r) => setTimeout(r, 1500));
    // Try again after scroll (lazy-loaded banners)
    await page.evaluate(() => window.scrollBy(0, 300));
    await new Promise((r) => setTimeout(r, 500));
    await dismissCookies(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise((r) => setTimeout(r, 500));

    // Step 2: Navigate to actual profile page (cookies already accepted)
    // Try profile URL first, then fallback to website/social if it redirects or fails
    const urlsToTry = [profileUrl, ...(opts.fallbackUrls || [])].filter(Boolean);
    let loadedUrl = '';

    for (const url of urlsToTry) {
      console.log(`[capture] Navigating to: ${url}`);
      try {
        await page.goto(url, { waitUntil: "networkidle2", timeout: 20000 });
      } catch (navErr) {
        console.log(`[capture] Navigation warning: ${(navErr as Error).message.slice(0, 60)}`);
      }

      // Check if page has real content (not redirect to search/404)
      const currentUrl = page.url();
      const pageTitle = await page.title();
      const hasContent = await page.evaluate(() => {
        const body = document.body.innerText || '';
        return body.length > 200; // meaningful content
      });

      if (hasContent && !pageTitle.includes('404') && !pageTitle.includes('Not Found')) {
        loadedUrl = currentUrl;
        console.log(`[capture] Loaded: ${currentUrl.slice(0, 80)}`);
        break;
      }
      console.log(`[capture] Page empty or redirected, trying next URL...`);
    }

    if (!loadedUrl) {
      console.log(`[capture] All URLs failed, using whatever loaded`);
    }
    // Use the loaded URL for the browser frame
    profileUrl = loadedUrl || profileUrl;

    // Wait for content to settle
    await new Promise((r) => setTimeout(r, PAGE_LOAD_WAIT_MS));

    // Dismiss any remaining banners on profile page
    await dismissCookies(page);
    await new Promise((r) => setTimeout(r, 500));

    // Generate browser chrome frame (tab bar + URL bar)
    const browserFramePath = path.join(tmpDir, "browser_frame.png");
    console.log("[capture] Generating browser chrome frame...");
    await generateBrowserFrame(page, profileUrl, browserFramePath);

    // --- Static portion: capture a single frame, will be held for 12s ---
    console.log("[capture] Taking static screenshot (12s hold)");
    // Resize viewport to leave room for browser frame at top
    await page.setViewport({ width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT - BROWSER_CHROME_HEIGHT });
    await new Promise((r) => setTimeout(r, 300));
    const rawScreenshot = path.join(tmpDir, "raw_frame.png");
    await page.screenshot({ path: rawScreenshot, type: "png" });
    // Composite: browser frame on top + page screenshot below
    const { execSync: exec } = require("child_process");
    exec(`ffmpeg -y -i "${browserFramePath}" -i "${rawScreenshot}" -filter_complex "[0:v]pad=1920:1080:0:0:black[bg];[bg][1:v]overlay=0:${BROWSER_CHROME_HEIGHT}" "${screenshotPath(frameIndex)}"`, { stdio: "pipe" });
    frameIndex++;
    // Restore viewport for scroll
    await page.setViewport({ width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT - BROWSER_CHROME_HEIGHT });

    // --- Scroll sequence: ~3s total (scroll down, pause, scroll up) ---
    // Capture frames during scroll for smooth video
    console.log("[capture] Starting scroll sequence");

    // Helper: capture frame with browser chrome composited
    const captureWithChrome = async (idx: number) => {
      const raw = path.join(tmpDir, `raw_scroll_${idx}.png`);
      await page!.screenshot({ path: raw, type: "png" });
      execSync(`ffmpeg -y -i "${browserFramePath}" -i "${raw}" -filter_complex "[0:v]pad=1920:1080:0:0:black[bg];[bg][1:v]overlay=0:${BROWSER_CHROME_HEIGHT}" "${screenshotPath(idx)}"`, { stdio: "pipe" });
      try { fs.unlinkSync(raw); } catch {}
    };

    // Natural trackpad flick with elastic bounce
    // Physics: fast initial velocity, decelerate, overshoot slightly, bounce back
    const TOTAL_SCROLL = 500;
    const FRAME_INTERVAL = 25; // ms between captures (~40fps)

    // Easing curve: fast start, overshoot, bounce back
    // Generates scroll positions over ~1.5s
    const scrollPositions: number[] = [];
    const duration = 1.5; // seconds
    const fps = 40;
    const totalFrames = Math.round(duration * fps);

    for (let f = 0; f <= totalFrames; f++) {
      const t = f / totalFrames; // 0 to 1
      // Elastic ease-out: overshoots then settles
      let pos: number;
      if (t < 0.6) {
        // Fast deceleration phase (0 to 1.15x overshoot)
        const p = t / 0.6;
        pos = TOTAL_SCROLL * 1.15 * (1 - Math.pow(1 - p, 3));
      } else if (t < 0.8) {
        // Bounce back from overshoot
        const p = (t - 0.6) / 0.2;
        pos = TOTAL_SCROLL * (1.15 - 0.15 * p);
      } else {
        // Settle at final position
        pos = TOTAL_SCROLL;
      }
      scrollPositions.push(Math.round(pos));
    }

    console.log(`[capture] Flick scroll: ${scrollPositions.length} positions over ${duration}s (elastic bounce)`);

    // Capture frames during the flick down
    let lastScrollY = 0;
    for (let i = 0; i < scrollPositions.length; i++) {
      const targetY = scrollPositions[i];
      const delta = targetY - lastScrollY;
      if (Math.abs(delta) > 0) {
        await page.evaluate((d) => window.scrollBy(0, d), delta);
        lastScrollY = targetY;
      }
      // Capture every 3rd frame to keep file count manageable
      if (i % 3 === 0) {
        await captureWithChrome(frameIndex);
        frameIndex++;
      }
      await new Promise((r) => setTimeout(r, FRAME_INTERVAL));
    }

    // Brief hold at scroll position
    await new Promise((r) => setTimeout(r, 300));
    await captureWithChrome(frameIndex);
    frameIndex++;

    // Quick flick back up (faster than down)
    const upPositions: number[] = [];
    const upDuration = 0.8;
    const upFrames = Math.round(upDuration * fps);
    for (let f = 0; f <= upFrames; f++) {
      const t = f / upFrames;
      const pos = TOTAL_SCROLL * (1 - Math.pow(t, 2)); // quadratic ease-in
      upPositions.push(Math.round(pos));
    }

    for (let i = 0; i < upPositions.length; i++) {
      const targetY = upPositions[i];
      const delta = targetY - lastScrollY;
      if (Math.abs(delta) > 0) {
        await page.evaluate((d) => window.scrollBy(0, d), delta);
        lastScrollY = targetY;
      }
      if (i % 3 === 0) {
        await captureWithChrome(frameIndex);
        frameIndex++;
      }
      await new Promise((r) => setTimeout(r, FRAME_INTERVAL));
    }

    // Final frame at top
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise((r) => setTimeout(r, 100));
    await captureWithChrome(frameIndex);
    frameIndex++;

    console.log(
      `[capture] Done. ${frameIndex} frames saved to ${tmpDir}`
    );
    return { screenshotDir: tmpDir, frameCount: frameIndex };
  } catch (err) {
    // Clean up on error
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
    throw err;
  } finally {
    if (page) {
      try {
        await page.close();
      } catch {
        // page may already be closed
      }
    }
    // Don't disconnect — we connected to an existing Chrome instance
  }
}

// CLI entry point
if (require.main === module) {
  const profileUrl = process.argv[2];
  if (!profileUrl) {
    console.error("Usage: npx tsx scripts/loom-video/capture-profile.ts <profile_url>");
    process.exit(1);
  }

  captureProfile(profileUrl)
    .then((result) => {
      console.log(`Screenshots saved to: ${result.screenshotDir}`);
      console.log(`Frame count: ${result.frameCount}`);
    })
    .catch((err) => {
      console.error("[capture] FATAL:", err.message);
      process.exit(1);
    });
}
