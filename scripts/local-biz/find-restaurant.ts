import { createClient } from '@supabase/supabase-js';
async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { count } = await sb.from('local_biz_leads').select('*', { count: 'exact', head: true });
  console.log('Total rows:', count);
  
  const { data } = await sb.from('local_biz_leads').select('business_type, business_name, city, gmb_rating, gmb_photos, demo_page_id').limit(20);
  data?.forEach(r => {
    const photos = Array.isArray(r.gmb_photos) ? r.gmb_photos.length : (r.gmb_photos ? 'yes' : 'none');
    console.log(`  [${r.business_type}] ${r.business_name} | ${r.city} | ★${r.gmb_rating} | photos:${photos} | demo:${r.demo_page_id ? 'yes' : 'no'}`);
  });
}
main().catch(e => { console.error(e); process.exit(1); });
