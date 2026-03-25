#!/usr/bin/env node

/**
 * Video Generator — Orchestrator
 * Takes a lead ID, captures their profile, composites the video,
 * uploads to Supabase Storage, and updates the lead record.
 *
 * Usage: set -a && source .env.local && set +a && npx tsx scripts/loom-video/generate.ts <lead_id>
 */

import { createClient } from "@supabase/supabase-js";
import { execSync } from "child_process";
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
    if (error) {
      throw new Error(`Failed to create storage bucket: ${error.message}`);
    }
    console.log(`[generate] Created storage bucket: ${STORAGE_BUCKET}`);
  }
}

async function uploadToStorage(
  filePath: string,
  leadId: string
): Promise<string> {
  const fileName = `${leadId}-${Date.now()}.mp4`;
  const fileBuffer = fs.readFileSync(filePath);

  const { error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .upload(fileName, fileBuffer, {
      contentType: "video/mp4",
      upsert: true,
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  const { data: publicUrl } = supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(fileName);

  return publicUrl.publicUrl;
}

export async function generateVideo(leadId: string): Promise<GenerateResult> {
  console.log(`[generate] Starting video generation for lead: ${leadId}`);

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

  // Fetch lead from Supabase (including personal_research for website URL)
  const { data: lead, error: leadError } = await supabaseAdmin
    .from("leads")
    .select("id, full_name, profile_url, video_url, personal_research")
    .eq("id", leadId)
    .single();

  if (leadError || !lead) {
    throw new Error(
      `Lead not found: ${leadId}. ${leadError?.message ?? ""}`
    );
  }

  if (!lead.profile_url) {
    throw new Error(`Lead ${leadId} has no profile_url`);
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
    // Step 0: Ensure video Chrome is running on port 9224
    try {
      execSync('curl -s --connect-timeout 2 http://localhost:9224/json/version', { stdio: 'pipe' });
    } catch {
      console.log("[generate] Launching video Chrome on port 9224...");
      execSync(`bash "${resolve(__dirname, "../chrome-launch-video.sh")}"`, {
        cwd: resolve(__dirname, "../.."),
        stdio: 'inherit',
        timeout: 40000,
      });
    }

    // Step 1: Capture website screenshots (prefer personal website over brokerage profile)
    const personalWebsite = lead.personal_research?.website || null;
    console.log(`[generate] Capturing website: ${personalWebsite || lead.profile_url}`);
    const captureResult = await captureProfile({
      websiteUrl: personalWebsite || undefined,
      profileUrl: lead.profile_url,
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

    composite({
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

    // Step 4: Update lead record
    const { error: updateError } = await supabaseAdmin
      .from("leads")
      .update({ video_url: videoUrl })
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
