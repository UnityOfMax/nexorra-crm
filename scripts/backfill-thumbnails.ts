#!/usr/bin/env tsx
/**
 * Backfill thumbnails for leads that have a video but no thumbnail.
 * Skips the 1000 leads pushed to Instantly today (pushed_to_instantly=true
 * AND updated in the last 24h) since those will be reuploaded later.
 *
 * Usage: set -a && source .env.local && set +a && npx tsx scripts/backfill-thumbnails.ts
 */

import { createClient } from "@supabase/supabase-js";
import { execSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as https from "https";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const STORAGE_BUCKET = "lead-videos";
const BATCH = 50;
const CONCURRENCY = 4;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlinkSync(dest);
        return downloadFile(res.headers.location!, dest).then(resolve).catch(reject);
      }
      res.pipe(file);
      file.on("finish", () => { file.close(); resolve(); });
    }).on("error", e => { fs.unlinkSync(dest); reject(e); });
  });
}

async function procesLead(lead: { id: string; video_url: string }): Promise<boolean> {
  const tmpVideo = path.join(os.tmpdir(), `backfill-vid-${lead.id}.mp4`);
  const tmpThumb = path.join(os.tmpdir(), `backfill-thumb-${lead.id}.jpg`);
  try {
    // Download video
    await downloadFile(lead.video_url, tmpVideo);
    if (!fs.existsSync(tmpVideo) || fs.statSync(tmpVideo).size < 1000) return false;

    // Extract first frame
    execSync(
      `ffmpeg -i "${tmpVideo}" -vframes 1 -q:v 2 -vf "scale=560:-1" -update 1 "${tmpThumb}" -y`,
      { timeout: 20000, stdio: "pipe" }
    );
    if (!fs.existsSync(tmpThumb) || fs.statSync(tmpThumb).size < 1000) return false;

    // Upload thumbnail
    const thumbData = fs.readFileSync(tmpThumb);
    const thumbKey = `${lead.id}-thumb.jpg`;
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(thumbKey, thumbData, { contentType: "image/jpeg", upsert: true });
    if (uploadError) { console.log(`  [${lead.id}] Upload error: ${uploadError.message}`); return false; }

    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(thumbKey);
    const thumbnailUrl = data.publicUrl;

    // Update lead
    const { error: updateError } = await supabase
      .from("leads")
      .update({ thumbnail_url: thumbnailUrl })
      .eq("id", lead.id);
    if (updateError) { console.log(`  [${lead.id}] DB error: ${updateError.message}`); return false; }

    return true;
  } catch (e) {
    console.log(`  [${lead.id}] Error: ${(e as Error).message.slice(0, 80)}`);
    return false;
  } finally {
    try { fs.unlinkSync(tmpVideo); } catch {}
    try { fs.unlinkSync(tmpThumb); } catch {}
  }
}

async function main() {
  console.log("=== Thumbnail Backfill ===\n");

  // Count total needing backfill — exclude today's 1000 pushed leads
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  // Get leads: have video, no thumbnail, not pushed today
  // "pushed today" = pushed_to_instantly=true AND updated_at >= today (those 985 from Stacey)
  let processed = 0;
  let succeeded = 0;
  let offset = 0;

  while (true) {
    const { data: leads, error } = await supabase
      .from("leads")
      .select("id, video_url")
      .not("video_url", "is", null)
      .is("thumbnail_url", null)
      .in("lead_category", ["email", "instagram"])
      // Only process unpushed leads — the 985 pushed today will get thumbnails on next upload
      .eq("pushed_to_instantly", false)
      .order("scraped_at", { ascending: true })
      .range(offset, offset + BATCH - 1);

    if (error) { console.error("Fetch error:", error.message); break; }
    if (!leads || leads.length === 0) break;

    console.log(`Processing batch ${offset}–${offset + leads.length - 1}...`);

    // Process CONCURRENCY at a time
    for (let i = 0; i < leads.length; i += CONCURRENCY) {
      const chunk = leads.slice(i, i + CONCURRENCY);
      const results = await Promise.all(chunk.map(l => procesLead(l as { id: string; video_url: string })));
      const ok = results.filter(Boolean).length;
      succeeded += ok;
      processed += chunk.length;
      process.stdout.write(`  ${processed} done (${succeeded} ok)\r`);
    }

    offset += leads.length;
    if (leads.length < BATCH) break;

    // Brief pause between batches
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`\n\nDone. ${succeeded}/${processed} thumbnails generated.`);
}

main().catch(console.error);
