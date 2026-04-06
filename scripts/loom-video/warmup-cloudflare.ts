#!/usr/bin/env node
/**
 * Morning Cloudflare warmup for Derek's video Chrome profiles.
 *
 * Run this before starting the video pipeline. It opens BHHS and eXp on all
 * video Chrome ports, takes screenshots, and sends them to Telegram.
 *
 * If the pages show a Cloudflare challenge, you can open each Chrome window
 * and solve it manually — the clearance cookie persists in the Chrome profile
 * for ~24h, so Derek processes those leads all day without re-blocking.
 *
 * After warmup, it resets bhhs-pending-realchr and exp-cloudflare-skip leads
 * back to null so they enter the video queue.
 *
 * Usage: set -a && source .env.local && set +a && npx tsx scripts/loom-video/warmup-cloudflare.ts
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { createClient } from "@supabase/supabase-js";
import { resolve } from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: resolve(__dirname, "../../.env.local") });

const CHROME_TOOL = path.join(__dirname, "..", "chrome-tool.js");
const WORKER_PORTS = [9224, 9226, 9227, 9228, 9229];
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_CHAT_ID = "5880638817";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const BLOCKED_DOMAINS = [
  { name: "BHHS", url: "https://www.bhhs.com", errorMarker: "bhhs-pending-realchr" },
  { name: "eXp",  url: "https://www.exprealty.com", errorMarker: "exp-cloudflare-skip" },
];

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function sendTelegram(text: string, imagePath?: string): void {
  if (!TELEGRAM_BOT_TOKEN) return;
  try {
    if (imagePath && fs.existsSync(imagePath)) {
      execSync(
        `curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto" \
          -F chat_id=${TELEGRAM_CHAT_ID} \
          -F photo=@"${imagePath}" \
          -F caption="${text.replace(/"/g, "\\\"")}"`,
        { stdio: "pipe", timeout: 15000 }
      );
    } else {
      execSync(
        `curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
          -H "Content-Type: application/json" \
          -d '{"chat_id":"${TELEGRAM_CHAT_ID}","text":${JSON.stringify(text)}}'`,
        { stdio: "pipe", timeout: 10000 }
      );
    }
  } catch {}
}

function chrome(port: number, cmd: string, timeoutMs = 15000): string {
  try {
    return execSync(`node "${CHROME_TOOL}" --port ${port} ${cmd}`, {
      encoding: "utf-8",
      timeout: timeoutMs,
    }).trim();
  } catch (e) {
    return "";
  }
}

async function warmupPort(port: number, domain: { name: string; url: string }) {
  console.log(`[warmup] Port ${port} → ${domain.url}`);

  // Ensure Chrome is running
  try {
    execSync(`curl -s --connect-timeout 2 http://localhost:${port}/json/version`, { stdio: "pipe" });
  } catch {
    console.log(`[warmup] Launching Chrome on port ${port}...`);
    try {
      execSync(`bash "${resolve(__dirname, "../../scripts/chrome-launch-video.sh")}" ${port}`, {
        cwd: resolve(__dirname, "../.."),
        stdio: "inherit",
        timeout: 40000,
      });
    } catch {}
  }

  // Navigate to the domain
  chrome(port, `navigate "${domain.url}"`, 20000);
  execSync("sleep 5"); // Wait for JS challenge to potentially auto-solve

  // Take screenshot
  const shotPath = path.join(os.tmpdir(), `warmup-${domain.name}-${port}.png`);
  chrome(port, `screenshot "${shotPath}"`, 10000);

  // Check title
  const title = chrome(port, "title", 5000);
  const isBlocked = /just a moment|attention required|cloudflare|security check/i.test(title);

  console.log(`[warmup] Port ${port} ${domain.name}: "${title}" → ${isBlocked ? "BLOCKED" : "OK"}`);
  return { port, blocked: isBlocked, title, shotPath };
}

async function main() {
  console.log("=== Cloudflare Morning Warmup ===\n");

  sendTelegram("🌅 Derek morning warmup starting...");

  const results: Array<{ port: number; domain: string; blocked: boolean; title: string; shotPath: string }> = [];

  for (const domain of BLOCKED_DOMAINS) {
    console.log(`\n--- ${domain.name} ---`);
    for (const port of WORKER_PORTS) {
      const result = await warmupPort(port, domain);
      results.push({ ...result, domain: domain.name });
      await new Promise(r => setTimeout(r, 500));
    }
  }

  // Send screenshots for blocked ports
  const blocked = results.filter(r => r.blocked);
  const unblocked = results.filter(r => !r.blocked);

  console.log(`\nUnblocked: ${unblocked.length} | Blocked: ${blocked.length}`);

  if (blocked.length === 0) {
    sendTelegram("✅ All Chrome profiles unblocked on BHHS + eXp. Resetting leads and starting pipeline...");
  } else {
    // Send one screenshot per domain showing the challenge
    for (const domain of BLOCKED_DOMAINS) {
      const blockedForDomain = blocked.filter(r => r.domain === domain.name);
      if (blockedForDomain.length > 0 && fs.existsSync(blockedForDomain[0].shotPath)) {
        sendTelegram(
          `⚠️ ${domain.name} blocked on ${blockedForDomain.length}/5 ports.\n` +
          `Open each Chrome window (ports ${blockedForDomain.map(r => r.port).join(", ")}), ` +
          `navigate to ${domain.url} and solve the challenge if shown.\n` +
          `Or reply 'skip ${domain.name}' to leave those leads for later.`,
          blockedForDomain[0].shotPath
        );
      }
    }

    console.log("\nWaiting 90s for manual challenge solving...");
    sendTelegram("⏳ Waiting 90 seconds. Solve any challenges shown, then the pipeline starts automatically.");
    await new Promise(r => setTimeout(r, 90000));

    // Re-check after waiting
    console.log("Re-checking after wait...");
    for (let i = 0; i < results.length; i++) {
      if (results[i].blocked) {
        const title = chrome(results[i].port, "title", 5000);
        results[i].blocked = /just a moment|attention required|cloudflare|security check/i.test(title);
        results[i].title = title;
        console.log(`Port ${results[i].port} ${results[i].domain}: "${title}" → ${results[i].blocked ? "STILL BLOCKED" : "CLEARED"}`);
      }
    }
  }

  // Reset leads for unblocked domains
  for (const domain of BLOCKED_DOMAINS) {
    const domainResults = results.filter(r => r.domain === domain.name);
    const anyUnblocked = domainResults.some(r => !r.blocked);

    if (anyUnblocked) {
      console.log(`\nResetting ${domain.errorMarker} leads...`);
      const { data, error } = await supabase
        .from("leads")
        .update({ video_error: null })
        .eq("video_error", domain.errorMarker)
        .is("video_url", null)
        .select("id");
      console.log(`  Reset ${data?.length || 0} ${domain.name} leads`);
      if (error) console.error("  Error:", error.message);
    } else {
      console.log(`\nAll ports blocked for ${domain.name} — keeping ${domain.errorMarker} leads in queue`);
    }
  }

  // Count queue
  const { count } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .in("lead_category", ["email", "instagram"])
    .or("and(lead_category.eq.email,pushed_to_instantly.eq.false),lead_category.eq.instagram")
    .or("profile_url.not.is.null,instagram_handle.not.is.null")
    .is("video_url", null)
    .is("video_error", null);

  sendTelegram(`✅ Warmup complete. ${count} leads in queue. Starting pipeline...`);
  console.log(`\nQueue: ${count} leads. Run: npx tsx scripts/daily-video-pipeline.ts`);
}

main().catch(err => {
  console.error("[warmup] FATAL:", err.message);
  sendTelegram(`❌ Warmup failed: ${err.message}`);
  process.exit(1);
});
