#!/usr/bin/env node

/**
 * Daily Video + Landing Page Pipeline (Derek's job)
 *
 * Runs after Jeff's scraping. For each lead that needs a video:
 *   - Email leads NOT yet pushed to Instantly
 *   - ALL Instagram leads (regardless of push status)
 *   - NEVER calling/phone leads (those go to the dialer, not video+landing page)
 *
 * For each lead:
 *   1. Capture website screenshots (via dedicated Chrome instance)
 *   2. Composite video (fast path: 17s profile + pre-rendered CRM tail)
 *   3. Upload video to Supabase Storage
 *   4. Create personalized landing page with OG meta tags
 *   5. Update lead record with video_url
 *
 * Runs 3 Chrome workers in parallel (ports 9224, 9226, 9227) for 3x throughput.
 * Workers use a DYNAMIC QUEUE — they continuously poll the DB and claim leads
 * atomically, so Jeff's new leads are picked up in real-time as they arrive.
 * Screenshots are deleted automatically after each video is composited.
 *
 * One-time setup (run after new talking-head.mp4 or crm-demo.mp4):
 *   npx tsx scripts/loom-video/prerender-tail.ts
 *
 * Usage: set -a && source .env.local && set +a && npx tsx scripts/daily-video-pipeline.ts [--limit N]
 */

import { createClient } from "@supabase/supabase-js";
import { resolve } from "path";
import { execSync } from "child_process";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import * as dotenv from "dotenv";

dotenv.config({ path: resolve(__dirname, "../.env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.ainexorra.com";
const AGENCY_ID = "da99b768-79dd-48f8-af86-abf95e61a69f";

// 4 parallel Chrome workers — ~26s/lead = ~550/hr
// (9222 = Jeff, 9223 = Derek research, 9225 = Stacey Instagram)
const WORKER_PORTS = [9224, 9226, 9227, 9228];

// Dynamic queue config — workers poll the DB for new leads
const POLL_INTERVAL_MS = 10_000;   // 10s between empty polls
const MAX_EMPTY_POLLS   = 6;       // 6 × 10s = 60s of silence → worker exits
                                   // (Jeff adds batches; 60s gap means queue is truly drained)
const CHROME_RESTART_INTERVAL = 100; // restart Chrome every N leads to flush renderer accumulation

// Parse --limit flag (still respected as a per-process cap across all workers)
const limitArg = process.argv.find(a => a.startsWith("--limit"));
const BATCH_LIMIT = limitArg
  ? parseInt(limitArg.split("=")[1] || process.argv[process.argv.indexOf("--limit") + 1] || "2000")
  : 2000;

// Track total claimed across all workers to respect BATCH_LIMIT
let globalClaimed = 0;

/**
 * Atomically claim the next unclaimed lead for a worker.
 * Uses video_error = 'processing:wN' as the claim marker.
 * Because we filter on video_error IS NULL in both the SELECT and the UPDATE,
 * two workers racing for the same lead will only one succeed — the UPDATE
 * touches 0 rows for the loser.
 */
async function claimNextLead(workerId: number): Promise<any | null> {
  if (globalClaimed >= BATCH_LIMIT) return null;

  // Fetch a small batch of candidates to handle race-condition misses
  // Only email leads (not yet pushed) and instagram leads — never calling leads
  const { data: candidates, error } = await supabaseAdmin
    .from("leads")
    .select("id, full_name, first_name, last_name, email, profile_url, personal_research, city, state_province, source_brokerage, lead_category, instagram_handle")
    .in("lead_category", ["email", "instagram"])
    .or("and(lead_category.eq.email,pushed_to_instantly.eq.false),lead_category.eq.instagram")
    .or("profile_url.not.is.null,instagram_handle.not.is.null")
    .not("profile_url", "eq", "null")  // skip Jeff's string "null" placeholder
    .is("video_url", null)
    .is("video_error", null)
    .order("scraped_at", { ascending: true })   // oldest first — catch up yesterday before today
    .limit(5);

  if (error) {
    console.error(`[w${workerId}] DB error fetching candidates: ${error.message}`);
    return null;
  }
  if (!candidates || candidates.length === 0) return null;

  // Try each candidate until one is successfully claimed
  for (const candidate of candidates) {
    const { data: claimed } = await supabaseAdmin
      .from("leads")
      .update({ video_error: `processing:w${workerId}` })
      .eq("id", candidate.id)
      .is("video_error", null)   // only succeeds if still unclaimed
      .is("video_url", null)     // only if no video yet
      .select("id")
      .single();

    if (claimed) {
      globalClaimed++;
      return candidate;
    }
    // Another worker grabbed this candidate — try the next one
  }

  return null; // All 5 candidates were grabbed; caller will retry after delay
}

async function ensureChrome(port: number): Promise<void> {
  try {
    execSync(`curl -s --connect-timeout 2 http://localhost:${port}/json/version`, { stdio: "pipe" });
    return; // already running
  } catch (_e) {}
  console.log(`[pipeline] Launching Chrome on port ${port}...`);
  execSync(`bash "${resolve(__dirname, "chrome-launch-video.sh")}" ${port}`, {
    cwd: resolve(__dirname, ".."),
    stdio: "inherit",
    timeout: 45000,
    env: { ...process.env, DISPLAY: ":99", WAYLAND_DISPLAY: "", DBUS_SESSION_BUS_ADDRESS: "" },
  });
}

/**
 * Hard-restart Chrome — kills the process and relaunches fresh.
 * Chrome accumulates renderer processes over time (one per page visit,
 * never freed). After ~100 leads per worker, each instance balloons to 2-3GB.
 * Restarting every CHROME_RESTART_INTERVAL leads keeps RAM flat.
 */
async function restartChrome(port: number): Promise<void> {
  console.log(`[pipeline] Restarting Chrome on port ${port} (renderer GC)...`);
  const pids = execSync(`pgrep -f "chrome-video-${port}" || true`, { encoding: "utf-8", stdio: "pipe" }).trim();
  if (pids) {
    for (const pid of pids.split("\n").filter(Boolean)) {
      try { execSync(`kill -9 ${pid}`, { stdio: "pipe" }); } catch {}
    }
  }
  await new Promise(r => setTimeout(r, 2000));
  execSync(`bash "${resolve(__dirname, "chrome-launch-video.sh")}" ${port}`, {
    cwd: resolve(__dirname, ".."),
    stdio: "pipe",
    timeout: 45000,
    env: { ...process.env, DISPLAY: ":99", WAYLAND_DISPLAY: "", DBUS_SESSION_BUS_ADDRESS: "" },
  });
  console.log(`[pipeline] Chrome port ${port} restarted.`);
}

async function generateVideoForLead(lead: any, chromePort: number): Promise<string | null> {
  try {
    const { generateVideo } = await import("./loom-video/generate");
    const result = await generateVideo(lead.id, chromePort);
    return result.videoUrl;
  } catch (err) {
    const msg = (err as Error).message;
    console.error(`[pipeline] Video failed for ${lead.first_name} (${lead.id}): ${msg.slice(0, 100)}`);

    await supabaseAdmin
      .from("leads")
      .update({ video_error: msg.slice(0, 500) })
      .eq("id", lead.id);

    return null;
  }
}

async function createLandingPage(
  lead: any,
  videoUrl: string,
  gifUrl?: string
): Promise<{ url: string; id: string } | null> {
  try {
    const { buildColdEmailPage } = await import("../lib/landing-pages/cold-email-builder");

    const html = buildColdEmailPage({
      leadName: lead.full_name || lead.first_name || "there",
      firstName: lead.first_name || "there",
      videoUrl,
      gifUrl,
      calendlyUrl: "https://calendly.com/nexorra/demo-call?embed_domain=nexorra.io&embed_type=Inline",
      city: lead.city,
      brokerage: lead.source_brokerage,
      pageId: lead.id,
    });

    const slug = `${(lead.first_name || "lead").toLowerCase().replace(/[^a-z0-9]/g, "")}-${lead.id.slice(0, 8)}`;

    const { data, error } = await supabaseAdmin
      .from("landing_pages")
      .insert({
        account_id: AGENCY_ID,
        name: `Video for ${lead.first_name || lead.full_name}`,
        slug,
        content: html,
        published: true,
        page_type: "cold-email",
        lead_id: lead.id,
        meta_title: "How we Guarantee 3-5 Closed Deals in 90 Days",
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        const { data: existing } = await supabaseAdmin
          .from("landing_pages")
          .select("id")
          .eq("lead_id", lead.id)
          .single();
        if (existing) return { url: `${BASE_URL}/video/${existing.id}`, id: existing.id };
      }
      console.error(`[pipeline] Landing page error for ${lead.first_name}: ${error.message}`);
      return null;
    }

    return { url: `${BASE_URL}/video/${data.id}`, id: data.id };
  } catch (e) {
    console.error(`[pipeline] Landing page failed for ${lead.first_name}: ${(e as Error).message}`);
    return null;
  }
}

/**
 * Worker loop — continuously claims and processes leads until:
 * - No leads available for MAX_EMPTY_POLLS consecutive polls (queue drained)
 * - globalClaimed >= BATCH_LIMIT
 *
 * New leads added by Jeff show up automatically — no restart needed.
 */
async function runWorker(port: number, workerId: number): Promise<{ videos: number; errors: number }> {
  // Stagger startup so workers don't all hit the first URL simultaneously.
  // 5 workers warming up compass.com at once saturates CPU (load 13+) and crashes Chrome.
  // 5s gap between workers spreads the warmup burst over 25s.
  if (workerId > 1) {
    await new Promise(r => setTimeout(r, (workerId - 1) * 5000));
  }

  await ensureChrome(port);

  let videos = 0;
  let errors = 0;
  let emptyPolls = 0;

  console.log(`[w${workerId}] Started on port ${port}`);

  while (true) {
    const lead = await claimNextLead(workerId);

    if (!lead) {
      emptyPolls++;
      if (emptyPolls >= MAX_EMPTY_POLLS) {
        console.log(`[w${workerId}] Queue empty for ${MAX_EMPTY_POLLS * POLL_INTERVAL_MS / 1000}s — done.`);
        break;
      }
      console.log(`[w${workerId}] No leads, waiting ${POLL_INTERVAL_MS / 1000}s... (${emptyPolls}/${MAX_EMPTY_POLLS})`);
      await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
      continue;
    }

    emptyPolls = 0; // reset on successful claim
    console.log(`\n[w${workerId}] ${lead.first_name} ${lead.last_name} (${lead.source_brokerage}) — claimed #${globalClaimed}`);

    // Restart Chrome every CHROME_RESTART_INTERVAL leads to flush accumulated renderer processes
    if (videos > 0 && videos % CHROME_RESTART_INTERVAL === 0) {
      await restartChrome(port);
    }

    const videoUrl = await generateVideoForLead(lead, port);
    if (!videoUrl) {
      errors++;
      // video_error already updated by generateVideoForLead with the real error
      continue;
    }

    videos++;

    // GIF generation skipped — saves ~20s per lead
    // Create landing page
    const landingResult = await createLandingPage(lead, videoUrl);

    // Clear video_error and set landing_page_id
    await supabaseAdmin
      .from("leads")
      .update({
        video_error: null,
        ...(landingResult ? { landing_page_id: landingResult.id } : {}),
      })
      .eq("id", lead.id);

    if (landingResult) {
      console.log(`  [w${workerId}] Landing page: ${landingResult.url}`);
    }

    await new Promise(r => setTimeout(r, 500));
  }

  return { videos, errors };
}

async function main() {
  console.log("=== Daily Video + Landing Page Pipeline ===\n");
  console.log(`[pipeline] Dynamic queue mode — workers poll every ${POLL_INTERVAL_MS / 1000}s and pick up Jeff's leads in real-time`);
  console.log(`[pipeline] Workers exit after ${MAX_EMPTY_POLLS} consecutive empty polls (${MAX_EMPTY_POLLS * POLL_INTERVAL_MS / 1000}s silence)`);
  console.log(`[pipeline] Limit: ${BATCH_LIMIT} leads total\n`);

  // No zombie killer needed — capture-profile.ts now calls reset-tab after each lead,
  // which closes the tab and opens a fresh one. Renderers are properly released.

  // Start all workers concurrently — they compete for leads via atomic DB claims
  const results = await Promise.all(
    WORKER_PORTS.map((port, i) => runWorker(port, i + 1))
  );

  const total = results.reduce(
    (acc, r) => ({ videos: acc.videos + r.videos, errors: acc.errors + r.errors }),
    { videos: 0, errors: 0 }
  );

  console.log(`\n=== Pipeline Complete ===`);
  console.log(`Total: ${total.videos} videos, ${total.errors} errors`);
  results.forEach((r, i) => console.log(`  Worker ${i + 1} (port ${WORKER_PORTS[i]}): ${r.videos} videos, ${r.errors} errors`));
}

main().catch(err => {
  console.error("[FATAL]", err.message);
  process.exit(1);
});
