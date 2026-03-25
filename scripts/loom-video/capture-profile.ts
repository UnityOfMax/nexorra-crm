#!/usr/bin/env node
/**
 * Capture Website Screenshots using chrome-tool.js on port 9224 (video-dedicated Chrome).
 * Records the lead's PERSONAL WEBSITE (not brokerage profile) with Claude vision verification.
 *
 * Usage: npx tsx scripts/loom-video/capture-profile.ts <website_url> [profile_url]
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const CHROME_TOOL = path.join(__dirname, "..", "chrome-tool.js");
const VIDEO_PORT = 9224;

export interface CaptureResult {
  screenshotDir: string;
  frameCount: number;
}

export interface CaptureOptions {
  websiteUrl?: string;     // Lead's personal website (preferred)
  profileUrl: string;      // Brokerage profile (fallback)
  fallbackUrls?: string[];
}

function chrome(cmd: string): string {
  try {
    return execSync(`node "${CHROME_TOOL}" --port ${VIDEO_PORT} ${cmd}`, {
      encoding: "utf-8",
      timeout: 30000,
    }).trim();
  } catch (e) {
    const msg = (e as any).stderr?.toString() || (e as Error).message;
    console.log(`[chrome] Warning: ${msg.slice(0, 100)}`);
    return "";
  }
}

function sleep(ms: number) {
  execSync(`sleep ${ms / 1000}`);
}

/**
 * Use Claude Haiku 4.5 vision to verify the screenshot shows an actual website
 * (not a CAPTCHA, cookie wall, error page, or wrong site).
 */
async function verifyScreenshot(
  screenshotPath: string,
  expectedUrl: string
): Promise<{ valid: boolean; reason: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.log("[verify] No ANTHROPIC_API_KEY, skipping vision check");
    return { valid: true, reason: "skipped — no API key" };
  }

  try {
    const imageData = fs.readFileSync(screenshotPath).toString("base64");
    const domain = new URL(expectedUrl).hostname;

    const body = JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/png",
                data: imageData,
              },
            },
            {
              type: "text",
              text: `I'm trying to screenshot the website at ${domain}. Is this screenshot showing the actual website content? Reply with ONLY valid JSON: {"valid": true/false, "reason": "brief explanation"}. It is NOT valid if it shows: a CAPTCHA/challenge page, a cookie consent popup covering most of the page, a "page not found" or error page, a completely blank/empty page, a browser error, or an obviously unrelated website. Minor cookie banners at the bottom that don't block the main content are OK (valid).`,
            },
          ],
        },
      ],
    });

    const result = execSync(
      `curl -s -X POST https://api.anthropic.com/v1/messages \
       -H "content-type: application/json" \
       -H "x-api-key: ${apiKey}" \
       -H "anthropic-version: 2023-06-01" \
       -d '${body.replace(/'/g, "'\\''")}'`,
      { encoding: "utf-8", timeout: 30000 }
    );

    const response = JSON.parse(result);
    const text =
      response.content
        ?.filter((b: any) => b.type === "text")
        .map((b: any) => b.text)
        .join("") || "";

    try {
      return JSON.parse(text);
    } catch {
      const isValid =
        text.toLowerCase().includes('"valid": true') ||
        text.toLowerCase().includes('"valid":true');
      return { valid: isValid, reason: text.slice(0, 100) };
    }
  } catch (err) {
    console.log(`[verify] Vision check failed: ${(err as Error).message.slice(0, 80)}`);
    return { valid: true, reason: "verification error — proceeding" };
  }
}

/**
 * Aggressively dismiss cookie banners and popups.
 */
function dismissPopups(): void {
  // First pass
  chrome("dismiss-cookies");
  sleep(2000);

  // Second pass (some popups appear after delay)
  chrome("dismiss-cookies");
  sleep(500);

  // Try common close buttons
  chrome('click "[aria-label=Close]"');
  sleep(300);
  chrome('click "[aria-label=close]"');
  sleep(300);
  chrome('click "button.close"');
  sleep(300);

  // Scroll down slightly to trigger any lazy popups, then dismiss again
  chrome("scroll 50");
  sleep(500);
  chrome("dismiss-cookies");
  sleep(300);
  chrome("scroll -50");
  sleep(300);
}

export async function captureProfile(
  urlOrOpts: string | CaptureOptions
): Promise<CaptureResult> {
  const opts =
    typeof urlOrOpts === "string"
      ? { profileUrl: urlOrOpts, fallbackUrls: [] }
      : urlOrOpts;

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "loom-profile-"));
  let frameIndex = 0;

  const framePath = (idx: number) =>
    path.join(tmpDir, `frame_${String(idx).padStart(5, "0")}.png`);

  // 1. Check Chrome connection on video port
  console.log(`[capture] Checking Chrome on port ${VIDEO_PORT}...`);
  const status = chrome("status");
  if (
    !status.includes("connected") &&
    !status.includes("true") &&
    !status.includes("tabs")
  ) {
    throw new Error(
      `Chrome not connected on port ${VIDEO_PORT}. Run: bash scripts/chrome-launch-video.sh`
    );
  }

  // 2. Build URL priority list: personal website first, then brokerage profile
  const urlsToTry = [
    opts.websiteUrl,
    opts.profileUrl,
    ...(opts.fallbackUrls || []),
  ].filter(Boolean) as string[];

  let loadedUrl = "";

  for (const url of urlsToTry) {
    // Visit homepage first to accept cookies
    try {
      const siteUrl = new URL(url);
      const homepage = `${siteUrl.protocol}//${siteUrl.hostname}`;
      console.log(`[capture] Visiting homepage for cookies: ${homepage}`);
      chrome(`navigate "${homepage}"`);
      sleep(3000);
      dismissPopups();
    } catch {
      // URL parse error — skip homepage visit
    }

    // Navigate to the actual page
    console.log(`[capture] Navigating to: ${url}`);
    chrome(`navigate "${url}"`);
    sleep(4000);
    dismissPopups();

    // Check for basic content
    const text = chrome('text "body"');
    if (
      text.length < 200 ||
      text.includes("404") ||
      text.includes("Page Not Found")
    ) {
      console.log(`[capture] Page empty or 404, trying next URL...`);
      continue;
    }

    // Take a verification screenshot
    const verifyPath = path.join(tmpDir, "verify.png");
    chrome(`screenshot "${verifyPath}"`);

    // Claude vision verification (retry up to 2x on this URL)
    let verified = false;
    for (let attempt = 0; attempt < 2; attempt++) {
      const check = await verifyScreenshot(verifyPath, url);
      console.log(
        `[capture] Vision check (attempt ${attempt + 1}): valid=${check.valid}, reason=${check.reason}`
      );

      if (check.valid) {
        verified = true;
        break;
      }

      // Not valid — try dismissing popups again and retake
      console.log("[capture] Retrying after additional popup dismissal...");
      dismissPopups();
      sleep(2000);
      chrome(`screenshot "${verifyPath}"`);
    }

    if (!verified) {
      console.log(`[capture] URL failed vision verification: ${url}`);
      continue;
    }

    loadedUrl = url;
    console.log(`[capture] Verified website loaded: ${url} (${text.length} chars)`);

    // Clean up verification screenshot
    try {
      fs.unlinkSync(verifyPath);
    } catch {}
    break;
  }

  if (!loadedUrl) {
    console.log("[capture] All URLs failed verification, using whatever loaded");
  }

  // 3. Take static screenshot (held for 13s in video)
  console.log("[capture] Taking static screenshot");
  chrome(`screenshot "${framePath(frameIndex)}"`);
  frameIndex++;

  // 4. Elastic flick scroll — single trackpad flick down + bounce back
  //    Smooth deceleration for natural feel. ~20 frames total for 3s in composite.
  console.log("[capture] Scrolling (trackpad flick)...");

  // Fast flick down: 10 steps with deceleration
  const downSteps = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10];
  for (const step of downSteps) {
    chrome(`scroll ${step}`);
    sleep(60);
    chrome(`screenshot "${framePath(frameIndex)}"`);
    frameIndex++;
  }

  // Hold at bottom briefly (2 frames)
  sleep(200);
  chrome(`screenshot "${framePath(frameIndex)}"`);
  frameIndex++;
  sleep(200);
  chrome(`screenshot "${framePath(frameIndex)}"`);
  frameIndex++;

  // Bounce back up: 6 steps
  const upSteps = [120, 100, 80, 60, 40, 20];
  for (const step of upSteps) {
    chrome(`scroll -${step}`);
    sleep(50);
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
  const websiteUrl = process.argv[2];
  const profileUrl = process.argv[3];

  if (!websiteUrl) {
    console.error(
      "Usage: npx tsx scripts/loom-video/capture-profile.ts <website_url> [profile_url]"
    );
    process.exit(1);
  }

  (async () => {
    try {
      const opts: CaptureOptions = {
        websiteUrl,
        profileUrl: profileUrl || websiteUrl,
        fallbackUrls: [],
      };
      const result = await captureProfile(opts);
      console.log(
        `Screenshots: ${result.screenshotDir} (${result.frameCount} frames)`
      );
    } catch (err) {
      console.error("[capture] FATAL:", (err as Error).message);
      process.exit(1);
    }
  })();
}
