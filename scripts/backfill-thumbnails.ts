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
const STORAGE_BUCKET = "lead-thumbnails";
const BATCH = 50;
const CONCURRENCY = 2;

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

    // Upload thumbnail via REST API directly (bypasses JS SDK mime-type cache issue)
    const thumbData = fs.readFileSync(tmpThumb);
    const thumbKey = `${lead.id}-thumb.jpg`;
    // Upload with retry on rate limit
    let thumbnailUrl = "";
    for (let attempt = 1; attempt <= 3; attempt++) {
      const uploadRes = await fetch(
        `${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${thumbKey}`,
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
      if (uploadRes.ok) {
        thumbnailUrl = `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${thumbKey}`;
        break;
      }
      const errText = await uploadRes.text();
      if (attempt < 3 && (uploadRes.status === 429 || uploadRes.status >= 500)) {
        await new Promise(r => setTimeout(r, attempt * 2000));
        continue;
      }
      console.log(`  [${lead.id}] Upload error (${uploadRes.status}): ${errText.slice(0, 80)}`);
      return false;
    }
    if (!thumbnailUrl) return false;

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

    // Pause between batches to avoid storage rate limits
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log(`\n\nDone. ${succeeded}/${processed} thumbnails generated.`);
}

main().catch(console.error);
