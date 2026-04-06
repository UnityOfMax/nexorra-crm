#!/usr/bin/env node

/**
 * Video Generator — Orchestrator
 * Takes a lead ID, captures their profile, composites the video,
 * uploads to Supabase Storage, and updates the lead record.
 *
 * Usage: set -a && source .env.local && set +a && npx tsx scripts/loom-video/generate.ts <lead_id>
 */

import { createClient } from "@supabase/supabase-js";
import { execSync, exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { resolve } from "path";

import { captureProfile } from "./capture-profile";
import { composite } from "./composite";

dotenv.config({ path: resolve(__dirname, "../../.env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("[FATAL] Missing SUPABASE_URL or SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Paths to shared assets — these must exist before running
const ASSETS_DIR = resolve(__dirname, "../../assets/video");
const TALKING_HEAD_PATH = path.join(ASSETS_DIR, "talking-head.mp4");
const CRM_RECORDING_PATH = path.join(ASSETS_DIR, "crm-demo.mp4");

const STORAGE_BUCKET = "lead-videos";

export interface GenerateResult {
  leadId: string;
  videoUrl: string;
  outputPath: string;
}

async function ensureStorageBucket(): Promise<void> {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === STORAGE_BUCKET);
  if (!exists) {
    const { error } = await supabaseAdmin.storage.createBucket(STORAGE_BUCKET, {
      public: true,
      fileSizeLimit: 50 * 1024 * 1024, // 50MB
      allowedMimeTypes: ["video/mp4"],
    });
    if (error && !error.message.includes('already exists')) {
      throw new Error(`Failed to create storage bucket: ${error.message}`);
    }
    if (!error) console.log(`[generate] Created storage bucket: ${STORAGE_BUCKET}`);
  }
}

async function uploadToStorage(
  filePath: string,
  leadId: string
): Promise<string> {
  const fileName = `${leadId}-${Date.now()}.mp4`;

  // Use execAsync (not execSync!) — execSync blocks the Node.js event loop for ~12s,
  // which serialises all parallel workers and kills throughput.
  const uploadUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${fileName}`;

  let lastError = "";
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await execAsync(
        `curl -sf -X POST "${uploadUrl}" \
          -H "apikey: ${process.env.SUPABASE_SERVICE_ROLE_KEY}" \
          -H "Authorization: Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}" \
          -H "Content-Type: video/mp4" \
          --data-binary @"${filePath}" \
          --max-time 60`,
        { timeout: 70000, maxBuffer: 1024 * 1024 }
      );
      // Upload succeeded
      const { data: publicUrl } = supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(fileName);
      return publicUrl.publicUrl;
    } catch (err) {
      lastError = (err as Error).message.slice(0, 200);
      if (attempt < 3) await new Promise(r => setTimeout(r, 2000));
    }
  }

  throw new Error(`Storage upload failed: ${lastError}`);
}

// Preferred domains for alternative URLs — good-looking public profile pages
const PREFERRED_DOMAINS = ["realtor.com", "linkedin.com", "zillow.com", "redfin.com", "homesnap.com"];
const SKIP_DOMAINS = ["google", "yelp", "yellowpages", "whitepages", "mapquest", "facebook", "twitter", "bhhs.com", "youtube", "instagram.com", "schema.org"];

// Mutex so only one worker at a time uses port 9222 for Google search
// (concurrent CDP commands on the same Chrome instance cause race conditions)
let googleSearchLock: Promise<void> = Promise.resolve();

/**
 * For leads whose brokerage profile URL is Cloudflare-blocked, use port 9222
 * (Max's real Chrome) to Google-search for the agent's personal/professional site.
 * Serialized via mutex — only one worker at a time to avoid CDP race conditions.
 * Returns the best alternative URL found, or null.
 */
async function findAlternativeUrl(lead: any): Promise<string | null> {
  const RESEARCH_PORT = 9222;
  try {
    execSync(`curl -s --connect-timeout 2 http://localhost:${RESEARCH_PORT}/json/version`, { stdio: "pipe" });
  } catch {
    console.log(`[generate] Port ${RESEARCH_PORT} not available for Google search — skipping`);
    return null;
  }

  const name = (lead.full_name || `${lead.first_name || ""} ${lead.last_name || ""}`).trim();
  const city = lead.city || "";
  const query = encodeURIComponent(`${name} realtor ${city} bhhs`);
  const searchUrl = `https://www.google.com/search?q=${query}`;

  const CHROME_TOOL = resolve(__dirname, "../chrome-tool.js");

  // Acquire the mutex — wait for any other worker's Google search to finish
  let releaseLock!: () => void;
  const prevLock = googleSearchLock;
  googleSearchLock = new Promise<void>(resolve => { releaseLock = resolve; });
  await prevLock;

  try {
    execSync(`node "${CHROME_TOOL}" --port ${RESEARCH_PORT} navigate "${searchUrl}"`, {
      encoding: "utf-8", stdio: "pipe", timeout: 30000
    });
    // Small delay for results to render
    await new Promise(r => setTimeout(r, 1500));

    // Use the links command which uses page.evaluate() to extract actual hrefs —
    // page.content() misses JS-rendered links (like Google search results)
    let linksJson = "";
    try {
      linksJson = execSync(
        `node "${CHROME_TOOL}" --port ${RESEARCH_PORT} links`,
        { encoding: "utf-8", stdio: "pipe", timeout: 10000 }
      );
    } catch (linkErr) {
      console.log(`[generate] links command failed for ${name}: ${(linkErr as Error).message.slice(0, 100)}`);
    }

    let rawLinks: string[] = [];
    try {
      rawLinks = JSON.parse(linksJson);
    } catch {
      if (linksJson.trim()) console.log(`[generate] links parse failed for ${name}, raw: ${linksJson.slice(0, 100)}`);
    }

    let links = rawLinks
      .filter(h => h.startsWith("https://") && !SKIP_DOMAINS.some(d => h.includes(d)) && !h.includes("google.com"))
      .slice(0, 20);

    // Prefer known good domains, then take whatever is first
    const preferred = links.find(l => PREFERRED_DOMAINS.some(d => l.includes(d)));
    const result = preferred || links[0] || null;
    if (!result) console.log(`[generate] No alternative URL found for ${name}`);
    return result;
  } catch (err) {
    console.log(`[generate] Google search failed for ${name}: ${(err as Error).message.slice(0, 80)}`);
    return null;
  } finally {
    releaseLock();
  }
}

export async function generateVideo(leadId: string, chromePort = 9224): Promise<GenerateResult> {
  console.log(`[generate] Starting video generation for lead: ${leadId} (port ${chromePort})`);

  // Validate shared assets exist
  if (!fs.existsSync(TALKING_HEAD_PATH)) {
    throw new Error(
      `Talking head video not found at ${TALKING_HEAD_PATH}. ` +
        `Record a short talking head clip and place it there.`
    );
  }
  if (!fs.existsSync(CRM_RECORDING_PATH)) {
    throw new Error(
      `CRM demo recording not found at ${CRM_RECORDING_PATH}. ` +
        `Record a 2-second CRM screen capture and place it there.`
    );
  }

  // Fetch lead from Supabase (including personal_research for website URL and instagram_handle as fallback)
  const { data: lead, error: leadError } = await supabaseAdmin
    .from("leads")
    .select("id, full_name, profile_url, video_url, personal_research, instagram_handle, lead_category")
    .eq("id", leadId)
    .single();

  if (leadError || !lead) {
    throw new Error(
      `Lead not found: ${leadId}. ${leadError?.message ?? ""}`
    );
  }

  // Resolve the URL to browse: personal website > brokerage profile > Instagram profile
  const instagramUrl = lead.instagram_handle
    ? `https://www.instagram.com/${lead.instagram_handle.replace(/^@/, "")}/`
    : null;
  let personalWebsite = lead.personal_research?.website || null;

  const browseUrl = personalWebsite || lead.profile_url || instagramUrl;

  if (!browseUrl) {
    throw new Error(`Lead ${leadId} has no profile_url or instagram_handle — nothing to record`);
  }

  if (lead.video_url) {
    console.log(`[generate] Lead ${leadId} already has a video. Skipping.`);
    return {
      leadId,
      videoUrl: lead.video_url,
      outputPath: "",
    };
  }

  let screenshotDir: string | null = null;
  let outputPath: string | null = null;

  try {
    // Step 0: Ensure video Chrome is running on the specified port
    try {
      await execAsync(`curl -s --connect-timeout 5 http://localhost:${chromePort}/json/version`);
    } catch {
      console.log(`[generate] Launching video Chrome on port ${chromePort}...`);
      await execAsync(`bash "${resolve(__dirname, "../chrome-launch-video.sh")}" ${chromePort}`, {
        cwd: resolve(__dirname, "../.."),
        timeout: 40000,
      });
    }

    // Step 1: Capture website screenshots
    // URL priority: personal website (or Google-found alt) > brokerage profile > Instagram profile
    console.log(`[generate] Capturing (${lead.lead_category}): ${browseUrl}`);
    const captureResult = await captureProfile({
      websiteUrl: personalWebsite || undefined,
      profileUrl: lead.profile_url || undefined,
      fallbackUrls: instagramUrl ? [instagramUrl] : [],
      port: chromePort,
    });
    screenshotDir = captureResult.screenshotDir;
    console.log(
      `[generate] Captured ${captureResult.frameCount} frames`
    );

    // Step 2: Composite the video
    const tmpOutput = path.join(
      os.tmpdir(),
      `loom-${leadId}-${Date.now()}.mp4`
    );
    outputPath = tmpOutput;

    await composite({
      screenshotsDir: screenshotDir,
      talkingHeadPath: TALKING_HEAD_PATH,
      crmRecordingPath: CRM_RECORDING_PATH,
      outputPath: tmpOutput,
    });
    console.log(`[generate] Video composited: ${tmpOutput}`);

    // Step 3: Upload to Supabase Storage
    await ensureStorageBucket();
    const videoUrl = await uploadToStorage(tmpOutput, leadId);
    console.log(`[generate] Uploaded: ${videoUrl}`);

    // Step 3b: Extract first frame as thumbnail (560px wide JPG)
    let thumbnailUrl: string | null = null;
    const thumbPath = path.join(os.tmpdir(), `thumb-${leadId}-${Date.now()}.jpg`);
    try {
      await execAsync(
        `ffmpeg -i "${tmpOutput}" -vframes 1 -q:v 2 -vf "scale=560:-1" -update 1 "${thumbPath}" -y`,
        { timeout: 15000 }
      );
      if (fs.existsSync(thumbPath) && fs.statSync(thumbPath).size > 1000) {
        const thumbData = fs.readFileSync(thumbPath);
        const thumbKey = `${leadId}-thumb.jpg`;
        const thumbUploadRes = await fetch(
          `${SUPABASE_URL}/storage/v1/object/lead-thumbnails/${thumbKey}`,
          {
            method: "POST",
            headers: {
              "apikey": SERVICE_ROLE_KEY,
              "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
              "Content-Type": "image/jpeg",
              "x-upsert": "true",
            },
            body: thumbData,
          }
        );
        if (thumbUploadRes.ok) {
          thumbnailUrl = `${SUPABASE_URL}/storage/v1/object/public/lead-thumbnails/${thumbKey}`;
          console.log(`[generate] Thumbnail: ${thumbnailUrl}`);
        }
      }
    } catch (e) {
      console.log(`[generate] Thumbnail extraction skipped: ${(e as Error).message.slice(0, 80)}`);
    } finally {
      try { fs.unlinkSync(thumbPath); } catch {}
    }

    // Step 4: Update lead record
    const { error: updateError } = await supabaseAdmin
      .from("leads")
      .update({ video_url: videoUrl, ...(thumbnailUrl ? { thumbnail_url: thumbnailUrl } : {}) })
      .eq("id", leadId);

    if (updateError) {
      console.error(
        `[generate] Warning: failed to update lead record: ${updateError.message}`
      );
    }

    console.log(`[generate] Complete for lead ${leadId} (${lead.full_name})`);
    return { leadId, videoUrl, outputPath: tmpOutput };
  } finally {
    // Clean up temp files
    if (screenshotDir && fs.existsSync(screenshotDir)) {
      fs.rmSync(screenshotDir, { recursive: true, force: true });
    }
    if (outputPath && fs.existsSync(outputPath)) {
      try {
        fs.unlinkSync(outputPath);
      } catch {
        // may already be cleaned up
      }
    }
  }
}

// CLI entry point
if (require.main === module) {
  const leadId = process.argv[2];
  if (!leadId) {
    console.error(
      "Usage: npx tsx scripts/loom-video/generate.ts <lead_id>"
    );
    process.exit(1);
  }

  generateVideo(leadId)
    .then((result) => {
      console.log(`Video URL: ${result.videoUrl}`);
    })
    .catch((err) => {
      console.error("[generate] FATAL:", err.message);
      process.exit(1);
    });
}
