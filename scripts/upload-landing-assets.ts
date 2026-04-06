#!/usr/bin/env node

/**
 * Upload landing page assets (Nexorra logo + review images) to Supabase Storage.
 * Run once: set -a && source .env.local && set +a && npx tsx scripts/upload-landing-assets.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as fs from "fs";
import { execSync } from "child_process";
import { resolve } from "path";

dotenv.config({ path: resolve(__dirname, "../.env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("[FATAL] Missing SUPABASE_URL or SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const BUCKET = "landing-page-assets";

const WEBSITE_DIR = "/home/max/website";
const LOGO_PATH = `${WEBSITE_DIR}/logo.png`;
const REVIEW_DIR = `${WEBSITE_DIR}/review-pictures`;

async function ensureBucket(): Promise<void> {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === BUCKET);
  if (!exists) {
    const { error } = await supabaseAdmin.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: 10 * 1024 * 1024,
      allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
    });
    if (error) throw new Error(`Failed to create bucket: ${error.message}`);
    console.log(`Created bucket: ${BUCKET}`);
  }
}

function compressImage(inputPath: string, maxWidth: number): Buffer {
  // Use ffmpeg to resize since sharp isn't available
  const tmpOut = `/tmp/compressed-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
  try {
    execSync(
      `ffmpeg -y -i "${inputPath}" -vf "scale='min(${maxWidth},iw)':-1" -q:v 4 "${tmpOut}"`,
      { stdio: "pipe", timeout: 15000 }
    );
    const buf = fs.readFileSync(tmpOut);
    fs.unlinkSync(tmpOut);
    return buf;
  } catch {
    // Fallback: use original
    return fs.readFileSync(inputPath);
  }
}

async function uploadFile(
  localPath: string,
  remotePath: string,
  contentType: string,
  compress = false,
  maxWidth = 600
): Promise<string> {
  const fileData = compress
    ? compressImage(localPath, maxWidth)
    : fs.readFileSync(localPath);

  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(remotePath, fileData, { contentType, upsert: true });

  if (error) throw new Error(`Upload failed for ${remotePath}: ${error.message}`);

  const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(remotePath);
  return data.publicUrl;
}

async function main() {
  await ensureBucket();

  // Upload logo (keep original quality, PNG)
  console.log("Uploading logo...");
  const logoUrl = await uploadFile(LOGO_PATH, "logo.png", "image/png");
  console.log(`  Logo: ${logoUrl}`);

  // Upload review images (compress to 600px width)
  for (let i = 1; i <= 9; i++) {
    const imgPath = `${REVIEW_DIR}/${i}.jpg`;
    if (!fs.existsSync(imgPath)) {
      console.log(`  Skipping ${i}.jpg (not found)`);
      continue;
    }
    console.log(`Uploading review ${i}/9...`);
    const url = await uploadFile(
      imgPath,
      `reviews/${i}.jpg`,
      "image/jpeg",
      true,
      600
    );
    console.log(`  Review ${i}: ${url}`);
  }

  console.log("\nDone! All assets uploaded to Supabase Storage.");
  console.log(`Base URL: ${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`);
}

main().catch((err) => {
  console.error("[FATAL]", err.message);
  process.exit(1);
});
