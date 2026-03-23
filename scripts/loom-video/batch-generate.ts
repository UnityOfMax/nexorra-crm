#!/usr/bin/env node

/**
 * Batch Video Generator
 * Queries leads with completed research and no video,
 * then generates personalized videos for each (max 20 per batch).
 *
 * Usage: set -a && source .env.local && set +a && npx tsx scripts/loom-video/batch-generate.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { resolve } from "path";

import { generateVideo } from "./generate";

dotenv.config({ path: resolve(__dirname, "../../.env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("[FATAL] Missing SUPABASE_URL or SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const BATCH_SIZE = 20;
const DELAY_BETWEEN_LEADS_MS = 10000;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main(): Promise<void> {
  const startTime = Date.now();
  console.log(
    `[batch] Starting video generation batch at ${new Date().toISOString()}`
  );

  // Query leads that are research-complete but have no video
  const { data: leads, error } = await supabaseAdmin
    .from("leads")
    .select("id, name, profile_url")
    .eq("research_status", "completed")
    .is("video_url", null)
    .not("profile_url", "is", null)
    .limit(BATCH_SIZE)
    .order("created_at", { ascending: true });

  if (error) {
    console.error(`[batch] Failed to query leads: ${error.message}`);
    process.exit(1);
  }

  if (!leads || leads.length === 0) {
    console.log("[batch] No leads need video generation. Done.");
    return;
  }

  console.log(`[batch] Found ${leads.length} leads to process`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    const progress = `[${i + 1}/${leads.length}]`;

    try {
      console.log(
        `\n${progress} Generating video for: ${lead.name} (${lead.id})`
      );
      const result = await generateVideo(lead.id);
      console.log(`${progress} Success: ${result.videoUrl}`);
      successCount++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`${progress} FAILED for ${lead.name}: ${msg}`);
      failCount++;

      // Mark lead so we don't retry endlessly
      void supabaseAdmin
        .from("leads")
        .update({ video_error: msg })
        .eq("id", lead.id);
    }

    // Delay between leads to avoid overwhelming Chrome/system
    if (i < leads.length - 1) {
      console.log(
        `${progress} Waiting ${DELAY_BETWEEN_LEADS_MS / 1000}s before next lead...`
      );
      await sleep(DELAY_BETWEEN_LEADS_MS);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
  console.log(
    `\n[batch] Complete. ${successCount} success, ${failCount} failed. Took ${elapsed}s.`
  );
}

main().catch((err) => {
  console.error("[batch] FATAL:", err.message);
  process.exit(1);
});
