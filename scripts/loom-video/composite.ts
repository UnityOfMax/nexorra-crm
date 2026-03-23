#!/usr/bin/env node

/**
 * Video Compositor
 * Combines profile screenshots, CRM recording, and talking head overlay
 * into a final 17-second personalized video using ffmpeg.
 *
 * Usage: npx tsx scripts/loom-video/composite.ts <screenshots_dir> <talking_head> <crm_recording> <output_path>
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export interface CompositeOptions {
  screenshotsDir: string;
  talkingHeadPath: string;
  crmRecordingPath: string;
  outputPath: string;
}

function checkFfmpeg(): void {
  try {
    execSync("which ffmpeg", { stdio: "pipe" });
  } catch {
    throw new Error(
      "ffmpeg not found. Install it with: sudo apt install ffmpeg"
    );
  }
}

function validateInputs(opts: CompositeOptions): void {
  if (!fs.existsSync(opts.screenshotsDir)) {
    throw new Error(`Screenshots directory not found: ${opts.screenshotsDir}`);
  }
  if (!fs.existsSync(opts.talkingHeadPath)) {
    throw new Error(`Talking head video not found: ${opts.talkingHeadPath}`);
  }
  if (!fs.existsSync(opts.crmRecordingPath)) {
    throw new Error(`CRM recording not found: ${opts.crmRecordingPath}`);
  }

  const frames = fs
    .readdirSync(opts.screenshotsDir)
    .filter((f) => f.endsWith(".png"));
  if (frames.length === 0) {
    throw new Error(
      `No PNG frames found in ${opts.screenshotsDir}`
    );
  }
}

export function composite(opts: CompositeOptions): string {
  checkFfmpeg();
  validateInputs(opts);

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "loom-composite-"));
  const profileVideo = path.join(tmpDir, "profile.mp4");
  const concatList = path.join(tmpDir, "concat.txt");
  const baseVideo = path.join(tmpDir, "base.mp4");

  // Ensure output directory exists
  const outputDir = path.dirname(opts.outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  try {
    // --- Step 1: Convert profile screenshots to a 15s video ---
    // Frame 0 is the static screenshot (held for 12s)
    // Remaining frames are the scroll sequence (~3s)
    const frames = fs
      .readdirSync(opts.screenshotsDir)
      .filter((f) => f.endsWith(".png"))
      .sort();

    const staticFrame = path.join(opts.screenshotsDir, frames[0]);
    const scrollFrames = frames.slice(1);
    const staticVideo = path.join(tmpDir, "static.mp4");
    const scrollVideo = path.join(tmpDir, "scroll.mp4");

    // Create 12s static portion from the first frame
    console.log("[composite] Creating 12s static portion...");
    execSync(
      `ffmpeg -y -loop 1 -i "${staticFrame}" -c:v libx264 -t 12 ` +
        `-pix_fmt yuv420p -vf "scale=1280:720" -preset fast -crf 23 -r 30 "${staticVideo}"`,
      { stdio: "pipe", timeout: 30000 }
    );

    if (scrollFrames.length > 0) {
      // Create scroll portion from remaining frames (~3s)
      // Calculate framerate to make scroll frames fill exactly 3 seconds
      const scrollFps = Math.max(1, Math.round(scrollFrames.length / 3));
      console.log(
        `[composite] Creating 3s scroll portion (${scrollFrames.length} frames @ ${scrollFps}fps)...`
      );
      execSync(
        `ffmpeg -y -framerate ${scrollFps} -i "${opts.screenshotsDir}/frame_%05d.png" ` +
          `-start_number 1 -frames:v ${scrollFrames.length} ` +
          `-c:v libx264 -pix_fmt yuv420p -vf "scale=1280:720" -preset fast -crf 23 -r 30 "${scrollVideo}"`,
        { stdio: "pipe", timeout: 30000 }
      );

      // Concatenate static + scroll into 15s profile video
      const profileConcat = path.join(tmpDir, "profile_concat.txt");
      fs.writeFileSync(
        profileConcat,
        `file '${staticVideo}'\nfile '${scrollVideo}'\n`
      );
      execSync(
        `ffmpeg -y -f concat -safe 0 -i "${profileConcat}" -c copy "${profileVideo}"`,
        { stdio: "pipe", timeout: 30000 }
      );
    } else {
      // No scroll frames — extend static to 15s
      execSync(
        `ffmpeg -y -loop 1 -i "${staticFrame}" -c:v libx264 -t 15 ` +
          `-pix_fmt yuv420p -vf "scale=1280:720" -preset fast -crf 23 -r 30 "${profileVideo}"`,
        { stdio: "pipe", timeout: 30000 }
      );
    }

    // --- Step 2: Prepare CRM recording (ensure 2s, 720p, correct codec) ---
    const crmNormalized = path.join(tmpDir, "crm_normalized.mp4");
    console.log("[composite] Normalizing CRM recording to 2s...");
    execSync(
      `ffmpeg -y -i "${opts.crmRecordingPath}" -t 2 -c:v libx264 ` +
        `-pix_fmt yuv420p -vf "scale=1280:720" -preset fast -crf 23 -r 30 "${crmNormalized}"`,
      { stdio: "pipe", timeout: 30000 }
    );

    // --- Step 3: Concatenate profile (15s) + CRM (2s) = 17s base ---
    console.log("[composite] Concatenating profile + CRM...");
    fs.writeFileSync(
      concatList,
      `file '${profileVideo}'\nfile '${crmNormalized}'\n`
    );
    execSync(
      `ffmpeg -y -f concat -safe 0 -i "${concatList}" -c copy "${baseVideo}"`,
      { stdio: "pipe", timeout: 30000 }
    );

    // --- Step 4: Overlay circular talking head (bottom-left, full 17s) ---
    console.log("[composite] Overlaying talking head...");
    const filterComplex = [
      // Scale talking head to 160x160
      "[2:v]scale=160:160,format=yuva420p,",
      // Circular crop using geq
      "geq=lum='p(X,Y)':a='if(gt(pow(X-80,2)+pow(Y-80,2),pow(80,2)),0,255)'",
      "[head];",
      // Overlay on base video at bottom-left (20px padding from edges)
      "[0:v][head]overlay=20:H-h-20:shortest=1",
    ].join("");

    execSync(
      `ffmpeg -y -i "${baseVideo}" -stream_loop -1 -i "${opts.talkingHeadPath}" ` +
        `-i "${opts.talkingHeadPath}" ` +
        `-filter_complex "${filterComplex}" ` +
        `-t 17 -c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p ` +
        `-movflags +faststart "${opts.outputPath}"`,
      { stdio: "pipe", timeout: 120000 }
    );

    const stats = fs.statSync(opts.outputPath);
    console.log(
      `[composite] Done. Output: ${opts.outputPath} (${(stats.size / 1024 / 1024).toFixed(1)}MB)`
    );
    return opts.outputPath;
  } finally {
    // Clean up temp files
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }
}

// CLI entry point
if (require.main === module) {
  const [screenshotsDir, talkingHeadPath, crmRecordingPath, outputPath] =
    process.argv.slice(2);

  if (!screenshotsDir || !talkingHeadPath || !crmRecordingPath || !outputPath) {
    console.error(
      "Usage: npx tsx scripts/loom-video/composite.ts <screenshots_dir> <talking_head> <crm_recording> <output_path>"
    );
    process.exit(1);
  }

  try {
    composite({ screenshotsDir, talkingHeadPath, crmRecordingPath, outputPath });
  } catch (err) {
    console.error(
      "[composite] FATAL:",
      err instanceof Error ? err.message : String(err)
    );
    process.exit(1);
  }
}
