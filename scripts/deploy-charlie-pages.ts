/**
 * Deploy Charlie Kiers landing pages to Supabase.
 * Upserts two cold-email pages:
 *   charliekiersrealestate        → / (main page)
 *   charliekiersrealestate-questions → /questions (questionnaire)
 *
 * Run: set -a && source .env.local && set +a && npx tsx scripts/deploy-charlie-pages.ts
 */
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const ACCOUNT_ID  = 'da99b768-79dd-48f8-af86-abf95e61a69f'; // Nexorra agency account
const PAGES_DIR   = '/tmp/charlie-preview';

const pages = [
  {
    slug:      'charliekiersrealestate',
    name:      'Charlie Kiers — Free Homes List',
    file:      'index.html',
    meta_title: 'Charlie Kiers — Free Custom Homes List · Vancouver',
    meta_desc: 'Get access to exclusive Vancouver properties as soon as they hit the market.',
  },
  {
    slug:      'charliekiersrealestate-questions',
    name:      'Charlie Kiers — Questions Form',
    file:      'questions.html',
    meta_title: 'Find Your Home · Charlie Kiers',
    meta_desc: 'Tell us what you\'re looking for and we\'ll send you a custom homes list.',
  },
];

async function upsertPage(p: typeof pages[0]) {
  const html = fs.readFileSync(path.join(PAGES_DIR, p.file), 'utf8');

  // Check if the page already exists
  const { data: existing } = await supabase
    .from('landing_pages')
    .select('id')
    .eq('slug', p.slug)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from('landing_pages')
      .update({
        content:          html,
        name:             p.name,
        published:        true,
        meta_title:       p.meta_title,
        meta_description: p.meta_desc,
        updated_at:       new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (error) throw new Error(`Update failed for ${p.slug}: ${error.message}`);
    console.log(`[UPDATED] ${p.slug} (id: ${existing.id})`);
  } else {
    const { data, error } = await supabase
      .from('landing_pages')
      .insert({
        account_id:       ACCOUNT_ID,
        slug:             p.slug,
        name:             p.name,
        content:          html,
        page_type:        'cold-email',
        published:        true,
        meta_title:       p.meta_title,
        meta_description: p.meta_desc,
      })
      .select('id')
      .single();

    if (error) throw new Error(`Insert failed for ${p.slug}: ${error.message}`);
    console.log(`[CREATED] ${p.slug} (id: ${data.id})`);
  }
}

async function main() {
  console.log('Deploying Charlie Kiers pages...\n');
  for (const p of pages) {
    await upsertPage(p);
  }
  console.log('\nDone. Pages live at:');
  console.log('  https://charliekiersrealestate.ourlimitedoffer.com');
  console.log('  https://charliekiersrealestate.ourlimitedoffer.com/questions');
}

main().catch(e => { console.error(e); process.exit(1); });
