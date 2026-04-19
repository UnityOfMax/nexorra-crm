import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function main() {
  const slugs = ['charliekiersrealestate', 'charliekiersrealestate-questions'];
  const files: Record<string, string> = {
    'charliekiersrealestate':           '/tmp/charlie-preview/index.html',
    'charliekiersrealestate-questions': '/tmp/charlie-preview/questions.html',
  };

  for (const slug of slugs) {
    const { data } = await sb.from('landing_pages').select('id, slug, page_type').eq('slug', slug).maybeSingle();
    console.log(`${slug}: page_type=${data?.page_type ?? 'NOT FOUND'} id=${data?.id}`);

    if (data?.id) {
      const html = fs.readFileSync(files[slug], 'utf8');
      const { error } = await sb.from('landing_pages').update({
        page_type:  'cold-email',
        content:    html,
        published:  true,
        updated_at: new Date().toISOString(),
      }).eq('id', data.id);
      if (error) console.error(`Failed: ${error.message}`);
      else console.log(`  -> fixed to cold-email + refreshed content`);
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
