#!/usr/bin/env npx tsx
/**
 * CLI wrapper for GIF generation from video files.
 * Usage: npx tsx scripts/generate-gif.ts <video-path> [duration]
 *
 * If SUPABASE env vars are present, uploads the GIF to Supabase Storage.
 */

require('dotenv').config({ path: '.env.local' });

import * as path from 'path';
import * as fs from 'fs';
import { generateGif } from '../lib/gif/generator';

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: npx tsx scripts/generate-gif.ts <video-path> [duration]');
    console.error('  video-path  Path to input video file');
    console.error('  duration    Seconds to extract (default: 3, max: 10)');
    process.exit(1);
  }

  const videoPath = path.resolve(args[0]);
  const duration = args[1] ? parseInt(args[1], 10) : 3;

  // Output GIF in same directory with .gif extension
  const parsed = path.parse(videoPath);
  const outputPath = path.join(parsed.dir, `${parsed.name}.gif`);

  console.log(`[GIF] Input:    ${videoPath}`);
  console.log(`[GIF] Output:   ${outputPath}`);
  console.log(`[GIF] Duration: ${duration}s`);

  try {
    const result = await generateGif(videoPath, outputPath, duration);
    const stats = fs.statSync(result);
    console.log(`[GIF] Created: ${result} (${(stats.size / 1024).toFixed(1)} KB)`);
  } catch (err) {
    console.error(`[GIF] Error: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }

  // Upload to Supabase Storage if env vars present
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && supabaseServiceKey) {
    console.log('[GIF] Uploading to Supabase Storage...');

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const fileBuffer = fs.readFileSync(outputPath);
    const storagePath = `gifs/${parsed.name}.gif`;

    const { error } = await supabase.storage
      .from('landing-pages')
      .upload(storagePath, fileBuffer, {
        contentType: 'image/gif',
        upsert: true,
      });

    if (error) {
      console.error(`[GIF] Upload failed: ${error.message}`);
    } else {
      const { data: urlData } = supabase.storage
        .from('landing-pages')
        .getPublicUrl(storagePath);
      console.log(`[GIF] Uploaded: ${urlData.publicUrl}`);
    }
  } else {
    console.log('[GIF] Skipping upload (no Supabase env vars)');
  }
}

main();
