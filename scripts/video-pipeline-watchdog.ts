#!/usr/bin/env node
/**
 * Video Pipeline Watchdog
 *
 * Runs every 15 minutes via cron. Detects and auto-fixes:
 *   1. Dead pipeline      — clears stuck "processing:wN" leads, restarts
 *   2. Stalled pipeline   — no new videos in 15 min despite leads in queue → kill + restart
 *   3. Dead Chrome ports  — relaunches any video Chrome instance that's not responding
 *   4. Cloudflare blocks accumulating → Telegram alert
 *   5. RAM critical (>90%) → Telegram alert
 *
 * State: /tmp/video-watchdog-state.json (persists video count between runs)
 *
 * Usage: set -a && source .env.local && set +a && npx tsx scripts/video-pipeline-watchdog.ts
 */

import { createClient } from "@supabase/supabase-js";
import { execSync, spawn } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(__dirname, "../.env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_CHAT_ID = "5880638817";
const STATE_FILE = "/tmp/video-watchdog-state.json";
const CRM_DIR = resolve(__dirname, "..");

// All Chrome ports used by the video pipeline
const WORKER_PORTS = [9224, 9226, 9227, 9228, 9229, 9230, 9231];

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

interface WatchdogState {
  videoCount: number;
  checkedAt: string;
}

function telegram(msg: string): void {
  if (!TELEGRAM_BOT_TOKEN) return;
  try {
    execSync(
      `curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
        -H "Content-Type: application/json" \
        -d '{"chat_id":"${TELEGRAM_CHAT_ID}","text":${JSON.stringify(msg)}}'`,
      { stdio: "pipe", timeout: 10000 }
    );
  } catch {}
}

function isPipelineRunning(): boolean {
  try {
    const out = execSync(
      `ps aux | grep "daily-video-pipeline" | grep -v grep | grep -v watchdog`,
      { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] }
    ).trim();
    return out.length > 0;
  } catch {
    return false;
  }
}

function getRamPercent(): number {
  const total = os.totalmem();
  const free = os.freemem();
  return Math.round(((total - free) / total) * 100);
}

async function countVideos(): Promise<number> {
  const { count } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .not("video_url", "is", null);
  return count ?? 0;
}

async function countQueue(): Promise<number> {
  const { count } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .in("lead_category", ["email", "instagram"])
    .or("and(lead_category.eq.email,pushed_to_instantly.eq.false),lead_category.eq.instagram")
    .is("video_url", null)
    .is("video_error", null);
  return count ?? 0;
}

async function countStuck(): Promise<number> {
  const { count } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .like("video_error", "processing:%");
  return count ?? 0;
}

async function clearStuck(): Promise<number> {
  const { data } = await supabase
    .from("leads")
    .update({ video_error: null })
    .like("video_error", "processing:%")
    .is("video_url", null)
    .select("id");
  return data?.length ?? 0;
}

async function countCloudflareBlocks(): Promise<{ bhhs: number; exp: number }> {
  const [bhhsRes, expRes] = await Promise.all([
    supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("video_error", "bhhs-pending-realchr"),
    supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("video_error", "exp-cloudflare-skip"),
  ]);
  return { bhhs: bhhsRes.count ?? 0, exp: expRes.count ?? 0 };
}

/** Check which Chrome video ports are dead and relaunch them. Returns list of fixed ports. */
async function fixDeadChromePorts(): Promise<number[]> {
  const dead: number[] = [];

  for (const port of WORKER_PORTS) {
    try {
      execSync(`curl -s --connect-timeout 2 http://localhost:${port}/json/version`, { stdio: "pipe" });
    } catch {
      dead.push(port);
    }
  }

  if (dead.length === 0) return [];

  console.log(`[watchdog] Dead Chrome ports: ${dead.join(", ")} — relaunching`);
  const launchScript = resolve(CRM_DIR, "scripts/chrome-launch-video.sh");

  for (const port of dead) {
    try {
      const child = spawn("bash", [launchScript, String(port)], {
        cwd: CRM_DIR,
        detached: true,
        stdio: "ignore",
        env: { ...process.env, DISPLAY: ":99", WAYLAND_DISPLAY: "", DBUS_SESSION_BUS_ADDRESS: "" },
      });
      child.unref();
      console.log(`[watchdog] Relaunched Chrome port ${port} (PID ${child.pid})`);
    } catch (e) {
      console.error(`[watchdog] Failed to relaunch port ${port}: ${(e as Error).message}`);
    }
  }

  return dead;
}

function restartPipeline(): number {
  const child = spawn(
    "bash",
    ["-c", `set -a && source .env.local && set +a && nice -n 15 ionice -c 3 npx tsx scripts/daily-video-pipeline.ts >> logs/video-pipeline.log 2>&1`],
    {
      cwd: CRM_DIR,
      detached: true,
      stdio: "ignore",
    }
  );
  child.unref();
  return child.pid ?? 0;
}

function loadState(): WatchdogState | null {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
  } catch {
    return null;
  }
}

function saveState(state: WatchdogState): void {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

async function main() {
  console.log(`[watchdog] ${new Date().toISOString()} — checking pipeline health`);

  const [videoCount, queueCount, stuckCount, cfBlocks, ramPct] = await Promise.all([
    countVideos(),
    countQueue(),
    countStuck(),
    countCloudflareBlocks(),
    Promise.resolve(getRamPercent()),
  ]);

  const pipelineRunning = isPipelineRunning();
  const prevState = loadState();
  const issues: string[] = [];

  // --- Fix 0: Dead Chrome ports (check first, before pipeline logic) ---
  const deadPorts = await fixDeadChromePorts();
  if (deadPorts.length > 0) {
    console.log(`[watchdog] Relaunched ${deadPorts.length} dead Chrome port(s): ${deadPorts.join(", ")}`);
    issues.push(`🔧 Relaunched dead Chrome port(s): ${deadPorts.join(", ")}`);
  }

  console.log(`[watchdog] pipeline running: ${pipelineRunning}`);
  console.log(`[watchdog] videos: ${videoCount} | queue: ${queueCount} | stuck: ${stuckCount} | ram: ${ramPct}%`);
  console.log(`[watchdog] cloudflare — bhhs: ${cfBlocks.bhhs} | exp: ${cfBlocks.exp}`);

  // --- Fix 1: Dead pipeline with work remaining ---
  if (!pipelineRunning && queueCount > 0) {
    console.log(`[watchdog] Pipeline is dead with ${queueCount} leads in queue — restarting`);

    let cleared = 0;
    if (stuckCount > 0) {
      cleared = await clearStuck();
      console.log(`[watchdog] Cleared ${cleared} stuck processing leads`);
    }

    const pid = restartPipeline();
    console.log(`[watchdog] Pipeline restarted (PID ${pid})`);

    issues.push(
      `🔄 Pipeline was dead — restarted (PID ${pid})\n` +
      (cleared > 0 ? `  • Cleared ${cleared} stuck leads\n` : "") +
      `  • Queue: ${queueCount} leads remaining`
    );
  }

  // --- Fix 2: Pipeline running but stalled (no new videos since last check) ---
  else if (pipelineRunning && prevState && queueCount > 0) {
    const videosSinceLast = videoCount - prevState.videoCount;
    console.log(`[watchdog] Videos since last check: ${videosSinceLast}`);

    if (videosSinceLast === 0) {
      console.log(`[watchdog] Pipeline stalled — no new videos in last check period`);

      // Kill the stalled pipeline
      try {
        execSync(`pkill -f "daily-video-pipeline"`, { stdio: "ignore" });
        await new Promise(r => setTimeout(r, 3000));
      } catch {}

      const cleared = stuckCount > 0 ? await clearStuck() : 0;
      const pid = restartPipeline();
      console.log(`[watchdog] Pipeline killed and restarted (PID ${pid})`);

      issues.push(
        `⚠️ Pipeline stalled (0 videos in 15 min) — killed and restarted (PID ${pid})\n` +
        (cleared > 0 ? `  • Cleared ${cleared} stuck leads\n` : "") +
        `  • Queue: ${queueCount} leads remaining`
      );
    }
  }

  // --- Fix 3: Stuck processing leads with pipeline dead ---
  else if (!pipelineRunning && stuckCount > 0) {
    const cleared = await clearStuck();
    console.log(`[watchdog] Cleared ${cleared} orphaned processing leads (pipeline not running)`);
    issues.push(`🧹 Cleared ${cleared} orphaned stuck leads (pipeline not running, queue empty)`);
  }

  // --- Alert 4: Cloudflare blocks accumulating ---
  if (cfBlocks.bhhs > 50) {
    issues.push(`⚠️ BHHS Cloudflare blocks: ${cfBlocks.bhhs} leads stuck — run warmup-cloudflare.ts`);
  }
  if (cfBlocks.exp > 50) {
    issues.push(`⚠️ eXp Cloudflare blocks: ${cfBlocks.exp} leads stuck — run warmup-cloudflare.ts`);
  }

  // --- Alert 5: RAM critical ---
  if (ramPct >= 90) {
    issues.push(`🔴 RAM critical: ${ramPct}% used — zombie killer should handle this`);
  } else if (ramPct >= 80) {
    issues.push(`🟡 RAM high: ${ramPct}% used`);
  }

  // Send Telegram alert if anything was fixed/detected
  if (issues.length > 0) {
    const msg =
      `🎬 Video Pipeline Watchdog\n\n` +
      issues.join("\n\n") +
      `\n\n📊 Status: ${videoCount} videos done | ${queueCount} in queue | RAM ${ramPct}%`;
    telegram(msg);
  }

  // Save state for next run
  saveState({ videoCount, checkedAt: new Date().toISOString() });

  console.log(`[watchdog] Done — ${issues.length === 0 ? "all healthy" : `${issues.length} issue(s) fixed`}`);
}

main().catch(err => {
  console.error("[watchdog] FATAL:", err.message);
  telegram(`❌ Video watchdog crashed: ${err.message}`);
  process.exit(1);
});
