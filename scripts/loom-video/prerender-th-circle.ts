#!/usr/bin/env node
/**
 * Pre-renders the talking head as a 13.1s circular overlay WebM (VP9 with alpha).
 * Run once after recording a new talking-head.mp4 (same time as prerender-tail.ts).
 *
 * Output: assets/video/th-circle-sped.webm
 * Used by composite.ts SUPER FAST PATH — avoids running the expensive
 * geq (circular mask) filter on every single lead video.
 *
 * Usage: set -a && source .env.local && set +a && npx tsx scripts/loom-video/prerender-th-circle.ts
 */

import { execSync } from "child_process";
import * as path from "path";
import * as fs from "fs";

const PROJECT_ROOT = path.resolve(__dirname, "../..");
const TALKING_HEAD = path.join(PROJECT_ROOT, "assets/video/talking-head.mp4");
const OUTPUT = path.join(PROJECT_ROOT, "assets/video/th-circle-sped.webm");
const PROFILE_SEC = 17; // profile portion duration before speed-up

if (!fs.existsSync(TALKING_HEAD)) {
  console.error(`[prerender-circle] talking-head.mp4 not found: ${TALKING_HEAD}`);
  process.exit(1);
}

const duration = parseFloat(
  execSync(`ffprobe -v quiet -show_format "${TALKING_HEAD}" | grep duration | cut -d= -f2`, {
    encoding: "utf-8",
  }).trim()
);
const spedSec = (PROFILE_SEC / 1.3).toFixed(2);
console.log(`[prerender-circle] TH duration: ${duration.toFixed(1)}s`);
console.log(`[prerender-circle] Rendering ${spedSec}s circular TH overlay (VP9 + alpha)...`);

// Crop circular talking head + speed up 1.3x → VP9 webm with alpha channel
execSync(
  `ffmpeg -y -i "${TALKING_HEAD}" \
    -filter_complex \
    "[0:v]trim=0:${PROFILE_SEC},setpts=PTS/1.3,crop=720:720:280:0,hflip,scale=200:200,\
format=yuva420p,geq=lum='p(X,Y)':a='if(gt(pow(X-100,2)+pow(Y-100,2),pow(100,2)),0,255)'[v];\
[0:a]atrim=0:${PROFILE_SEC},atempo=1.3[a]" \
    -map "[v]" -map "[a]" \
    -c:v libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0 -b:v 600k \
    -c:a libopus -b:a 64k \
    "${OUTPUT}"`,
  { stdio: "inherit", timeout: 300000 }
);

const size = (fs.statSync(OUTPUT).size / 1024).toFixed(0);
console.log(`[prerender-circle] Done: ${OUTPUT} (${size}KB)`);
