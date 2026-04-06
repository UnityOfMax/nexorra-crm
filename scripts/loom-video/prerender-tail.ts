#!/usr/bin/env node

/**
 * Pre-render the static CRM tail portion (shared across ALL lead videos).
 *
 * Video structure per lead:
 *   [17s profile clip + talking head overlay] + [CRM tail + talking head overlay]
 *
 * The CRM tail is IDENTICAL for every lead. Pre-rendering it once means the
 * per-lead composite step only needs to process 17s of footage instead of ~145s.
 * That's ~8x faster.
 *
 * Run ONCE after recording a new talking-head.mp4 or crm-demo.mp4:
 *   set -a && source .env.local && set +a && npx tsx scripts/loom-video/prerender-tail.ts
 *
 * Output: assets/video/crm-tail-prerendered.mp4
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "../..");
const TALKING_HEAD = path.join(PROJECT_ROOT, "assets/video/talking-head.mp4");
const CRM_DEMO = path.join(PROJECT_ROOT, "assets/video/crm-demo.mp4");
const OUTPUT = path.join(PROJECT_ROOT, "assets/video/crm-tail-prerendered.mp4");
const PROFILE_DURATION = 17; // Must match profileDuration in composite.ts

function ffmpeg(args: string, timeoutMs = 900000): void {
  console.log(`[ffmpeg] ${args.slice(0, 120)}...`);
  execSync(`ffmpeg -y ${args}`, { stdio: "inherit", timeout: timeoutMs });
}

function main() {
  if (!fs.existsSync(TALKING_HEAD)) {
    throw new Error(`Missing talking head: ${TALKING_HEAD}`);
  }
  if (!fs.existsSync(CRM_DEMO)) {
    throw new Error(`Missing CRM demo: ${CRM_DEMO}`);
  }

  // 1. Get talking head duration
  const thDuration = parseFloat(
    execSync(
      `ffprobe -v quiet -show_format "${TALKING_HEAD}" | grep duration | cut -d= -f2`,
      { encoding: "utf-8" }
    ).trim()
  );
  const crmFillDuration = thDuration - PROFILE_DURATION;
  if (crmFillDuration <= 0) {
    throw new Error(`Talking head (${thDuration.toFixed(1)}s) must be longer than ${PROFILE_DURATION}s`);
  }

  console.log(`\n=== Pre-render CRM Tail ===`);
  console.log(`Talking head: ${thDuration.toFixed(1)}s`);
  console.log(`Profile portion: ${PROFILE_DURATION}s`);
  console.log(`CRM fill duration: ${crmFillDuration.toFixed(1)}s`);
  console.log(`Output: ${OUTPUT}\n`);

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "prerender-tail-"));

  try {
    // 2. Normalize CRM demo to fill the tail duration (loop if shorter)
    const crmNormalized = path.join(tmpDir, "crm_normalized.mp4");
    console.log("[prerender] Step 1/3: Normalizing CRM demo...");
    ffmpeg(
      `-stream_loop -1 -i "${CRM_DEMO}" -t ${crmFillDuration} ` +
        `-c:v libx264 -pix_fmt yuv420p -vf "scale=1920:1080" -preset fast -crf 18 -r 30 "${crmNormalized}"`
    );

    // 3. Overlay talking head (from PROFILE_DURATION onwards) on CRM fill
    //    Audio comes from the talking head (from the 17s mark onwards).
    const filterComplex = [
      "[1:v]crop=720:720:280:0,hflip,scale=200:200,format=yuva420p,",
      "geq=lum='p(X,Y)':a='if(gt(pow(X-100,2)+pow(Y-100,2),pow(100,2)),0,255)'",
      "[head];",
      "[0:v][head]overlay=20:H-h-20[v]",
    ].join("");

    const crmWithHead = path.join(tmpDir, "crm_with_head.mp4");
    console.log("[prerender] Step 2/3: Overlaying talking head on CRM tail...");
    ffmpeg(
      `-i "${crmNormalized}" -ss ${PROFILE_DURATION} -i "${TALKING_HEAD}" ` +
        `-filter_complex "${filterComplex}" ` +
        `-map "[v]" -map 1:a -t ${crmFillDuration} ` +
        `-c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p ` +
        `-c:a aac -b:a 128k "${crmWithHead}"`
    );

    // 4. Speed up 1.3x — matches per-lead speedup
    const finalDuration = (crmFillDuration / 1.3).toFixed(1);
    console.log(`[prerender] Step 3/3: Speeding up 1.3x → ~${finalDuration}s...`);
    ffmpeg(
      `-i "${crmWithHead}" ` +
        `-filter_complex "[0:v]setpts=PTS/1.3[v];[0:a]atempo=1.3[a]" ` +
        `-map "[v]" -map "[a]" ` +
        `-c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p ` +
        `-c:a aac -b:a 128k ` +
        `-movflags +faststart "${OUTPUT}"`
    );

    const stats = fs.statSync(OUTPUT);
    console.log(`\n✓ Pre-rendered tail: ${OUTPUT} (${(stats.size / 1024 / 1024).toFixed(1)} MB, ~${finalDuration}s)`);
    console.log(`  Re-run this script any time talking-head.mp4 or crm-demo.mp4 changes.`);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

main();
