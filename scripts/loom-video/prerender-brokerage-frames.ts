#!/usr/bin/env node
/**
 * Pre-renders per-brokerage Chrome header PNGs (1920x88px).
 * Run once — output reused for every lead from that brokerage.
 * This eliminates the per-lead ffmpeg drawtext call in capture-profile.ts.
 *
 * Output: assets/chrome-frames/{brokerage}.png
 *
 * Usage: set -a && source .env.local && set +a && npx tsx scripts/loom-video/prerender-brokerage-frames.ts
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "../..");
const OUTPUT_DIR = path.join(PROJECT_ROOT, "assets/chrome-frames");
const FONT_PATH = "/usr/share/fonts/truetype/ubuntu/Ubuntu-R.ttf";

const FRAME_WIDTH = 1920;
const HEADER_HEIGHT = 88;

const BROKERAGES: Array<{ key: string; tabTitle: string; addressBar: string }> = [
  { key: "compass",       tabTitle: "Real Estate Agents · Compass",                  addressBar: "www.compass.com/agents" },
  { key: "bhhs",          tabTitle: "Find an Agent · Berkshire Hathaway HomeServices", addressBar: "www.bhhs.com/find-an-agent" },
  { key: "remax",         tabTitle: "Real Estate Agent Profile · RE/MAX",             addressBar: "www.remax.com/real-estate-agents" },
  { key: "realtor",       tabTitle: "Find Real Estate Agents · Realtor.com",          addressBar: "www.realtor.com/realestateagents" },
  { key: "sothebys",      tabTitle: "Real Estate Agent · Sotheby's International Realty", addressBar: "www.sothebysrealty.com/eng/associates" },
  { key: "exp",           tabTitle: "Real Estate Agent Profile · eXp Realty",         addressBar: "www.exprealty.com/agents" },
  { key: "kw",            tabTitle: "Real Estate Agent Profile · Keller Williams",    addressBar: "www.kw.com/agents" },
  { key: "coldwellbanker",tabTitle: "Real Estate Agent · Coldwell Banker",            addressBar: "www.coldwellbanker.com" },
  { key: "century21",     tabTitle: "Real Estate Agent · Century 21",                 addressBar: "www.century21.com/find-a-real-estate-agent" },
  { key: "instagram",     tabTitle: "Instagram · Real Estate Agent",                  addressBar: "www.instagram.com" },
  { key: "default",       tabTitle: "Real Estate Agent Profile",                      addressBar: "www.realtor.com/realestateagents" },
];

function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/:/g, "\\:");
}

function generateFrame(brokerage: typeof BROKERAGES[0]): void {
  const outputPath = path.join(OUTPUT_DIR, `${brokerage.key}.png`);
  const fontArg = fs.existsSync(FONT_PATH) ? `fontfile=${FONT_PATH}:` : "";

  const tabTitle = brokerage.tabTitle.length > 45
    ? brokerage.tabTitle.slice(0, 43) + "..."
    : brokerage.tabTitle;
  const addressBar = brokerage.addressBar.length > 85
    ? brokerage.addressBar.slice(0, 83) + "..."
    : brokerage.addressBar;

  execSync(
    `ffmpeg -y -f lavfi -i "color=c=#202124:size=${FRAME_WIDTH}x${HEADER_HEIGHT}:r=1" \
      -vf "drawbox=x=8:y=5:w=265:h=35:color=#35363a@1.0:t=fill,\
drawbox=x=0:y=40:w=${FRAME_WIDTH}:h=48:color=#35363a@1.0:t=fill,\
drawbox=x=48:y=46:w=1828:h=35:color=#202124@1.0:t=fill,\
drawtext=${fontArg}fontcolor=white:fontsize=11:x=28:y=15:text='${esc(tabTitle)}',\
drawtext=${fontArg}fontcolor=#9aa0a6:fontsize=13:x=74:y=54:text='${esc(addressBar)}'" \
      -frames:v 1 "${outputPath}"`,
    { stdio: "pipe", timeout: 5000 }
  );

  const size = fs.statSync(outputPath).size;
  console.log(`[prerender-frames] ${brokerage.key}.png (${(size / 1024).toFixed(0)}KB) — "${tabTitle}"`);
}

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
console.log(`[prerender-frames] Generating ${BROKERAGES.length} brokerage chrome frames → ${OUTPUT_DIR}\n`);

let ok = 0;
let failed = 0;
for (const b of BROKERAGES) {
  try {
    generateFrame(b);
    ok++;
  } catch (e) {
    console.error(`[prerender-frames] FAILED ${b.key}: ${(e as Error).message.slice(0, 100)}`);
    failed++;
  }
}

console.log(`\n[prerender-frames] Done: ${ok} OK, ${failed} failed.`);
