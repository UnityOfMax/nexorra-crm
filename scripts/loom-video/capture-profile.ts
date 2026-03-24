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
import puppeteer, { Browser, Page } from "puppeteer";

const CHROME_DEBUG_URL = "http://localhost:9222";
const VIEWPORT_WIDTH = 1920;
const VIEWPORT_HEIGHT = 1080;
const PAGE_LOAD_WAIT_MS = 3000;
const SCROLL_DISTANCE = 400;
const SCROLL_STEP = 20;
const SCROLL_INTERVAL_MS = 30;
const SCROLL_PAUSE_MS = 1000;

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

export async function captureProfile(
  profileUrl: string
): Promise<CaptureResult> {
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

    // Navigate to the profile page
    console.log(`[capture] Navigating to: ${profileUrl}`);
    const response = await page.goto(profileUrl, {
      waitUntil: "networkidle2",
      timeout: 15000,
    });

    if (!response || response.status() >= 400) {
      throw new Error(
        `Page returned status ${response?.status() ?? "unknown"} for ${profileUrl}`
      );
    }

    // Wait for content to settle
    await new Promise((r) => setTimeout(r, PAGE_LOAD_WAIT_MS));

    // Dismiss cookie banners / consent overlays
    console.log("[capture] Dismissing cookie banners...");
    await page.evaluate(() => {
      // Common cookie banner selectors
      const selectors = [
        '.osano-cm-accept-all', '.osano-cm-button--type_accept',
        '#onetrust-accept-btn-handler', '.onetrust-close-btn-handler',
        '[data-testid="cookie-accept"]', '[aria-label="Accept cookies"]',
        '.cookie-consent-accept', '.cc-accept', '.cc-btn.cc-dismiss',
        'button[id*="accept"]', 'button[class*="accept"]',
        '.gdpr-accept', '.consent-accept', '.js-accept-cookies',
        '[data-action="accept"]', '.cookie-banner__accept',
        // Generic patterns
        ...Array.from(document.querySelectorAll('button')).filter(b => {
          const t = (b.textContent || '').toLowerCase();
          return t.includes('accept') || t.includes('agree') || t.includes('got it') || t.includes('ok') || t.includes('allow');
        }).map(() => ''), // trigger the click below
      ];
      for (const sel of selectors) {
        if (!sel) continue;
        const el = document.querySelector(sel) as HTMLElement;
        if (el) { el.click(); return; }
      }
      // Also try clicking any visible "Accept" button
      document.querySelectorAll('button, a, div[role="button"]').forEach((el) => {
        const text = (el.textContent || '').toLowerCase().trim();
        if ((text === 'accept' || text === 'accept all' || text === 'i agree' || text === 'got it' || text === 'allow all') && (el as HTMLElement).offsetParent !== null) {
          (el as HTMLElement).click();
        }
      });
    });
    await new Promise((r) => setTimeout(r, 1000)); // wait for banner to dismiss

    // --- Static portion: capture a single frame, will be held for 12s ---
    console.log("[capture] Taking static screenshot (12s hold)");
    await page.screenshot({ path: screenshotPath(frameIndex), type: "png" });
    frameIndex++;

    // --- Scroll sequence: ~3s total (scroll down, pause, scroll up) ---
    // Capture frames during scroll for smooth video
    console.log("[capture] Starting scroll sequence");

    // Scroll down — capture frames
    const downSteps = Math.ceil(SCROLL_DISTANCE / SCROLL_STEP);
    for (let i = 0; i < downSteps; i++) {
      await page.evaluate((d) => window.scrollBy(0, d), SCROLL_STEP);
      await new Promise((r) => setTimeout(r, SCROLL_INTERVAL_MS));
      // Capture every other step to keep frame count reasonable
      if (i % 2 === 0) {
        await page.screenshot({
          path: screenshotPath(frameIndex),
          type: "png",
        });
        frameIndex++;
      }
    }

    // Pause at bottom
    await new Promise((r) => setTimeout(r, SCROLL_PAUSE_MS));
    await page.screenshot({ path: screenshotPath(frameIndex), type: "png" });
    frameIndex++;

    // Scroll back up — capture frames
    const upSteps = Math.ceil(SCROLL_DISTANCE / SCROLL_STEP);
    for (let i = 0; i < upSteps; i++) {
      await page.evaluate((d) => window.scrollBy(0, d), -SCROLL_STEP);
      await new Promise((r) => setTimeout(r, SCROLL_INTERVAL_MS));
      if (i % 2 === 0) {
        await page.screenshot({
          path: screenshotPath(frameIndex),
          type: "png",
        });
        frameIndex++;
      }
    }

    // Final frame at top
    await page.screenshot({ path: screenshotPath(frameIndex), type: "png" });
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
