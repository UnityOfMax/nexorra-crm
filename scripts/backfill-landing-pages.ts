import { createClient } from '@supabase/supabase-js';
import { buildColdEmailPage } from '/home/max/crm/lib/landing-pages/cold-email-builder';
import { execSync } from 'child_process';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config({ path: '/home/max/crm/.env.local' });

const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const BASE = process.env.NEXT_PUBLIC_APP_URL || 'https://app.ainexorra.com';
const AGENCY = 'da99b768-79dd-48f8-af86-abf95e61a69f';
const SB = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function main() {
  // Backfill leads that have a video but no gif_url (landing page may already exist)
  const { data: leads } = await supa.from('leads')
    .select('id,first_name,full_name,email,city,source_brokerage,video_url,gif_url,landing_page_id')
    .not('video_url', 'is', null)
    .is('gif_url', null)
    .gte('scraped_at', '2026-03-30T00:00:00Z')
    .lt('scraped_at', '2026-03-31T00:00:00Z');

  console.log('Backfilling', leads!.length, 'leads...');

  for (const lead of leads!) {
    try {
      let gifUrl = lead.gif_url as string | undefined;

      if (!gifUrl) {
        try {
          const tmpVid = path.join(os.tmpdir(), `gif-src-${lead.id}.mp4`);
          const tmpGif = tmpVid.replace('.mp4', '.gif');
          execSync(`curl -sf -o "${tmpVid}" "${lead.video_url}"`, { timeout: 60000, stdio: 'pipe' });
          execSync(`ffmpeg -i "${tmpVid}" -t 4 -vf "fps=10,scale=480:-1:flags=lanczos" -gifflags +transdiff -y "${tmpGif}"`, { timeout: 60000, stdio: 'pipe' });
          const gifName = `${lead.id}-${Date.now()}.gif`;
          execSync(
            `curl -sf -X POST "${SB}/storage/v1/object/landing-assets/lead-gifs/${gifName}" \
              -H "apikey: ${KEY}" \
              -H "Authorization: Bearer ${KEY}" \
              -H "Content-Type: image/gif" \
              --data-binary @"${tmpGif}" --max-time 30`,
            { stdio: 'pipe', timeout: 35000 }
          );
          gifUrl = `${SB}/storage/v1/object/public/landing-assets/lead-gifs/${gifName}`;
          try { fs.unlinkSync(tmpVid); fs.unlinkSync(tmpGif); } catch {}
          console.log(`  GIF ok: ${lead.first_name}`);
        } catch (e: any) {
          console.warn(`  GIF skip ${lead.first_name}: ${e.message?.slice(0, 80)}`);
        }
      }

      const html = buildColdEmailPage({
        leadName: lead.full_name || lead.first_name || 'there',
        firstName: lead.first_name || 'there',
        videoUrl: lead.video_url,
        gifUrl,
        calendlyUrl: 'https://calendly.com/nexorra/demo-call',
        city: lead.city,
        brokerage: lead.source_brokerage,
        pageId: lead.id,
      });

      const slug = `${(lead.first_name || 'lead').toLowerCase().replace(/[^a-z0-9]/g, '')}-${lead.id.slice(0, 8)}`;

      const { data: existing } = await supa.from('landing_pages').select('id').eq('lead_id', lead.id).maybeSingle();
      let pageId: string;

      if (existing) {
        pageId = existing.id;
        await supa.from('landing_pages').update({ content: html }).eq('id', pageId);
      } else {
        const { data: pg, error } = await supa.from('landing_pages')
          .insert({ account_id: AGENCY, name: `Video for ${lead.first_name || lead.full_name}`, slug, content: html, published: true, page_type: 'cold-email', lead_id: lead.id, meta_title: 'How we Guarantee 3-5 Closed Deals in 90 Days' })
          .select('id').single();
        if (error) { console.error(`  LP error ${lead.first_name}: ${error.message}`); continue; }
        pageId = pg!.id;
      }

      const upd: any = { landing_page_id: pageId };
      if (gifUrl) upd.gif_url = gifUrl;
      await supa.from('leads').update(upd).eq('id', lead.id);
      console.log(`  Done: ${lead.first_name} → ${BASE}/video/${pageId}`);
    } catch (e: any) {
      console.error(`  Error ${lead.first_name}: ${e.message}`);
    }
  }

  console.log('\nBackfill complete.');
}

main().catch(console.error);
