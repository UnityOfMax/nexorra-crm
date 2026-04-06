#!/usr/bin/env node
/**
 * Pre-renders per-brokerage Chrome header PNGs (1920x88px).
 * Run once — output reused for every lead from that brokerage.
 * Uses Python PIL for realistic Chrome dark-mode UI (rounded tabs, lock icon, etc.)
 *
 * Output: assets/chrome-frames/{brokerage}.png
 *
 * Usage: set -a && source .env.local && set +a && npx tsx scripts/loom-video/prerender-brokerage-frames.ts
 */

import { execSync } from "child_process";
import * as path from "path";

const PY_SCRIPT = path.join(__dirname, "prerender-brokerage-frames.py");

console.log("[prerender-frames] Running PIL-based Chrome frame generator...\n");
execSync(`python3 "${PY_SCRIPT}"`, { stdio: "inherit" });
