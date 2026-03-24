#!/usr/bin/env node

/**
 * Video Compositor
 * Combines profile screenshots, CRM demo, and talking head overlay
 * into a final ~14.2s personalized video using ffmpeg.
 *
 * Timing:
 *   Profile screenshots: 15.5s (13s static + 2.5s scroll flick at 13s mark)
 *   CRM recording: fills the REST of the talking head duration (~130s)
 *   Talking head: circular 160px overlay in bottom-left, FULL LENGTH (~145.5s)
 *   Final: speed up 1.3x → ~112s
 *
 * Usage: npx tsx scripts/loom-video/composite.ts <screenshots_dir> [talking_head] [crm_demo] [output_path]
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "../..");
const DEFAULT_TALKING_HEAD = path.join(PROJECT_ROOT, "assets/video/talking-head.mp4");
const DEFAULT_CRM_DEMO = path.join(PROJECT_ROOT, "assets/video/crm-demo.mp4");

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
    throw new Error(`No PNG frames found in ${opts.screenshotsDir}`);
  }
}

function ffmpeg(args: string, timeoutMs = 60000): void {
  execSync(`ffmpeg -y ${args}`, { stdio: "pipe", timeout: timeoutMs });
}

export function composite(opts: CompositeOptions): string {
  checkFfmpeg();
  validateInputs(opts);

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "loom-composite-"));
  const profileVideo = path.join(tmpDir, "profile.mp4");
  const concatList = path.join(tmpDir, "concat.txt");
  const baseVideo = path.join(tmpDir, "base.mp4");
  const overlayVideo = path.join(tmpDir, "overlay.mp4");

  // Ensure output directory exists
  const outputDir = path.dirname(opts.outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  try {
    const frames = fs
      .readdirSync(opts.screenshotsDir)
      .filter((f) => f.endsWith(".png"))
      .sort();

    const staticFrame = path.join(opts.screenshotsDir, frames[0]);
    const scrollFrames = frames.slice(1);
    const staticVideo = path.join(tmpDir, "static.mp4");
    const scrollVideo = path.join(tmpDir, "scroll.mp4");

    // ---------------------------------------------------------------
    // Step 1: Convert static first frame to 12s video at 30fps
    // ---------------------------------------------------------------
    console.log("[composite] Creating 12s static portion...");
    ffmpeg(
      `-loop 1 -i "${staticFrame}" -c:v libx264 -t 12 ` +
        `-pix_fmt yuv420p -vf "scale=1920:1080" -preset fast -crf 18 -r 30 "${staticVideo}"`
    );

    // ---------------------------------------------------------------
    // Step 2: Convert scroll frames to 2.5s video
    //   Scroll animation: 1.2s scroll down ~400px, 0.3s pause, 1.0s scroll back up
    //   Total: 2.5s at 30fps = 75 frames
    // ---------------------------------------------------------------
    if (scrollFrames.length > 0) {
      // Target 2s for scroll animation. More frames = higher fps for same duration.
      const scrollDuration = 2.0;
      const scrollFps = Math.max(5, Math.round(scrollFrames.length / scrollDuration));
      console.log(
        `[composite] Creating ${scrollDuration}s scroll portion (${scrollFrames.length} frames @ ${scrollFps}fps)...`
      );
      ffmpeg(
        `-framerate ${scrollFps} -start_number 1 -i "${opts.screenshotsDir}/frame_%05d.png" ` +
          `-c:v libx264 -pix_fmt yuv420p -vf "scale=1920:1080" -preset fast -crf 18 "${scrollVideo}"`
      );

      // Concatenate static (12s) + scroll (~2s) = ~14s profile video
      const profileConcat = path.join(tmpDir, "profile_concat.txt");
      fs.writeFileSync(
        profileConcat,
        `file '${staticVideo}'\nfile '${scrollVideo}'\n`
      );
      ffmpeg(
        `-f concat -safe 0 -i "${profileConcat}" -c copy "${profileVideo}"`
      );
    } else {
      // No scroll frames — extend static to 14s
      console.log("[composite] No scroll frames, extending static to 14s...");
      ffmpeg(
        `-loop 1 -i "${staticFrame}" -c:v libx264 -t 14 ` +
          `-pix_fmt yuv420p -vf "scale=1920:1080" -preset fast -crf 18 -r 30 "${profileVideo}"`
      );
    }

    // ---------------------------------------------------------------
    // Step 3: Get talking head duration to determine CRM clip length
    // ---------------------------------------------------------------
    const talkingHeadDuration = parseFloat(
      execSync(`ffprobe -v quiet -show_format "${opts.talkingHeadPath}" | grep duration | cut -d= -f2`, { encoding: 'utf-8' }).trim()
    );
    const profileDuration = 14; // ~12s static + ~2s scroll flick
    const crmDuration = Math.max(1, talkingHeadDuration - profileDuration);
    console.log(`[composite] Talking head: ${talkingHeadDuration.toFixed(1)}s, Profile: ${profileDuration}s, CRM fill: ${crmDuration.toFixed(1)}s`);

    // ---------------------------------------------------------------
    // Step 4: Normalize CRM recording to fill remaining time, scale to 1280x720
    //   Loop the CRM recording if it's shorter than needed
    // ---------------------------------------------------------------
    const crmNormalized = path.join(tmpDir, "crm_normalized.mp4");
    console.log(`[composite] Extracting ${crmDuration.toFixed(1)}s of CRM demo...`);
    ffmpeg(
      `-stream_loop -1 -i "${opts.crmRecordingPath}" -t ${crmDuration} -c:v libx264 ` +
        `-pix_fmt yuv420p -vf "scale=1920:1080" -preset fast -crf 18 -r 30 "${crmNormalized}"`,
      300000
    );

    // ---------------------------------------------------------------
    // Step 5: Concatenate profile (15.5s) + CRM (130s) = ~145.5s base
    // ---------------------------------------------------------------
    console.log(`[composite] Concatenating profile + CRM → ${talkingHeadDuration.toFixed(1)}s base...`);
    fs.writeFileSync(
      concatList,
      `file '${profileVideo}'\nfile '${crmNormalized}'\n`
    );
    ffmpeg(
      `-f concat -safe 0 -i "${concatList}" -c copy "${baseVideo}"`,
      300000
    );

    // ---------------------------------------------------------------
    // Step 6: Overlay pre-processed circular talking head + keep audio
    //   Uses talking-head-circle.webm (pre-processed: cropped, flipped, circular)
    //   Falls back to raw talking head with inline crop if pre-processed doesn't exist
    // ---------------------------------------------------------------
    const preProcessedHead = path.join(PROJECT_ROOT, "assets/video/talking-head-circle.webm");
    const usePreProcessed = fs.existsSync(preProcessedHead);

    console.log(`[composite] Overlaying circular talking head (${usePreProcessed ? 'pre-processed' : 'inline crop'})...`);

    if (usePreProcessed) {
      // Fast path: pre-processed WebM with alpha — just overlay + mix audio
      ffmpeg(
        `-i "${baseVideo}" -i "${preProcessedHead}" -i "${opts.talkingHeadPath}" ` +
          `-filter_complex "[0:v][1:v]overlay=20:H-h-20:shortest=1[v]" ` +
          `-map "[v]" -map 2:a -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p ` +
          `-c:a aac -b:a 128k "${overlayVideo}"`,
        600000
      );
    } else {
      // Slow path: inline crop + circle mask
      const filterComplex = [
        "[1:v]crop=720:720:280:0,hflip,scale=200:200,format=yuva420p,",
        "geq=lum='p(X,Y)':a='if(gt(pow(X-100,2)+pow(Y-100,2),pow(100,2)),0,255)'",
        "[head];",
        "[0:v][head]overlay=20:H-h-20:shortest=1[v]",
      ].join("");

      ffmpeg(
        `-i "${baseVideo}" -i "${opts.talkingHeadPath}" ` +
          `-filter_complex "${filterComplex}" ` +
          `-map "[v]" -map 1:a -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p ` +
          `-c:a aac -b:a 128k "${overlayVideo}"`,
        600000
      );
    }

    // ---------------------------------------------------------------
    // Step 7: Speed up video + audio to 1.3x, HD quality
    // ---------------------------------------------------------------
    const finalDuration = (talkingHeadDuration / 1.3).toFixed(1);
    console.log(`[composite] Speeding up 1.3x → ~${finalDuration}s final (HD)...`);
    ffmpeg(
      `-i "${overlayVideo}" ` +
        `-filter_complex "[0:v]setpts=PTS/1.3[v];[0:a]atempo=1.3[a]" ` +
        `-map "[v]" -map "[a]" ` +
        `-c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p ` +
        `-c:a aac -b:a 128k ` +
        `-movflags +faststart "${opts.outputPath}"`,
      600000
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
  const args = process.argv.slice(2);
  const screenshotsDir = args[0];
  const talkingHeadPath = args[1] || DEFAULT_TALKING_HEAD;
  const crmRecordingPath = args[2] || DEFAULT_CRM_DEMO;
  const outputPath = args[3] || path.join(screenshotsDir || ".", "output.mp4");

  if (!screenshotsDir) {
    console.error(
      "Usage: npx tsx scripts/loom-video/composite.ts <screenshots_dir> [talking_head] [crm_demo] [output_path]"
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
