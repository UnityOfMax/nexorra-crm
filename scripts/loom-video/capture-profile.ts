#!/usr/bin/env node
/**
 * Capture Profile Screenshots using chrome-tool.js (NOT Puppeteer)
 * Uses the REAL Chrome session with all cookies/logins already active.
 *
 * Usage: npx tsx scripts/loom-video/capture-profile.ts <profile_url> [website_url]
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const CHROME_TOOL = path.join(__dirname, "..", "chrome-tool.js");

export interface CaptureResult {
  screenshotDir: string;
  frameCount: number;
}

export interface CaptureOptions {
  profileUrl: string;
  fallbackUrls?: string[];
}

function chrome(cmd: string): string {
  try {
    return execSync(`node "${CHROME_TOOL}" ${cmd}`, { encoding: "utf-8", timeout: 30000 }).trim();
  } catch (e) {
    const msg = (e as any).stderr?.toString() || (e as Error).message;
    console.log(`[chrome] Warning: ${msg.slice(0, 100)}`);
    return "";
  }
}

function sleep(ms: number) {
  execSync(`sleep ${ms / 1000}`);
}

export function captureProfile(urlOrOpts: string | CaptureOptions): CaptureResult {
  const opts = typeof urlOrOpts === "string"
    ? { profileUrl: urlOrOpts, fallbackUrls: [] }
    : urlOrOpts;

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "loom-profile-"));
  let frameIndex = 0;

  const framePath = (idx: number) =>
    path.join(tmpDir, `frame_${String(idx).padStart(5, "0")}.png`);

  // 1. Check Chrome connection
  console.log("[capture] Checking Chrome...");
  const status = chrome("status");
  if (!status.includes("connected") && !status.includes("true") && !status.includes("tabs")) {
    throw new Error("Chrome not connected on port 9222. Run: bash scripts/chrome-launch.sh");
  }

  // 2. Navigate to homepage first to accept cookies
  const siteUrl = new URL(opts.profileUrl);
  const homepage = `${siteUrl.protocol}//${siteUrl.hostname}`;
  console.log(`[capture] Visiting homepage for cookies: ${homepage}`);
  chrome(`navigate "${homepage}"`);
  sleep(3000);
  chrome("dismiss-cookies");
  sleep(1500);

  // 3. Navigate to profile (try URLs in order until one has content)
  const urlsToTry = [opts.profileUrl, ...(opts.fallbackUrls || [])].filter(Boolean);
  let loadedUrl = "";

  for (const url of urlsToTry) {
    console.log(`[capture] Navigating to: ${url}`);
    const result = chrome(`navigate "${url}"`);
    sleep(3000);

    // Dismiss cookies again on this page
    chrome("dismiss-cookies");
    sleep(1000);

    // Check for content
    const text = chrome('text "body"');
    if (text.length > 200 && !text.includes("404") && !text.includes("Page Not Found")) {
      loadedUrl = url;
      console.log(`[capture] Loaded with content (${text.length} chars)`);
      break;
    }
    console.log(`[capture] Page empty or 404, trying next...`);
  }

  if (!loadedUrl) {
    console.log("[capture] All URLs failed, using whatever loaded");
  }

  // 4. Take static screenshot (held for 12s in video)
  console.log("[capture] Taking static screenshot");
  chrome(`screenshot "${framePath(frameIndex)}"`);
  frameIndex++;

  // 5. Elastic flick scroll down + capture frames
  console.log("[capture] Scrolling (elastic flick)...");

  const TOTAL_SCROLL = 500;
  // Fast flick: 5 big steps down
  const downSteps = [150, 120, 100, 80, 50]; // decreasing = deceleration
  for (const step of downSteps) {
    chrome(`scroll ${step}`);
    sleep(50);
    chrome(`screenshot "${framePath(frameIndex)}"`);
    frameIndex++;
  }

  // Overshoot: one more small step
  chrome("scroll 30");
  sleep(80);
  chrome(`screenshot "${framePath(frameIndex)}"`);
  frameIndex++;

  // Bounce back slightly
  chrome("scroll -30");
  sleep(100);
  chrome(`screenshot "${framePath(frameIndex)}"`);
  frameIndex++;

  // Hold at bottom briefly
  sleep(300);
  chrome(`screenshot "${framePath(frameIndex)}"`);
  frameIndex++;

  // Quick flick back up
  const upSteps = [180, 150, 120, 80];
  for (const step of upSteps) {
    chrome(`scroll -${step}`);
    sleep(40);
    chrome(`screenshot "${framePath(frameIndex)}"`);
    frameIndex++;
  }

  // Final frame at top
  sleep(100);
  chrome(`screenshot "${framePath(frameIndex)}"`);
  frameIndex++;

  console.log(`[capture] Done. ${frameIndex} frames saved to ${tmpDir}`);
  return { screenshotDir: tmpDir, frameCount: frameIndex };
}

// CLI entry point
if (require.main === module) {
  const profileUrl = process.argv[2];
  const websiteUrl = process.argv[3];

  if (!profileUrl) {
    console.error("Usage: npx tsx scripts/loom-video/capture-profile.ts <profile_url> [website_url]");
    process.exit(1);
  }

  try {
    const opts: CaptureOptions = {
      profileUrl,
      fallbackUrls: websiteUrl ? [websiteUrl] : [],
    };
    const result = captureProfile(opts);
    console.log(`Screenshots: ${result.screenshotDir} (${result.frameCount} frames)`);
  } catch (err) {
    console.error("[capture] FATAL:", (err as Error).message);
    process.exit(1);
  }
}
