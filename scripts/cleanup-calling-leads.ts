// Deletes calling leads that were exported more than 1 hour ago
import { supabaseAdmin } from '../lib/supabase';

async function cleanup() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data, error } = await supabaseAdmin
    .from('leads')
    .delete()
    .eq('lead_category', 'calling')
    .not('csv_downloaded_at', 'is', null)
    .lt('csv_downloaded_at', oneHourAgo)
    .select('id');

  if (error) {
    console.error('[cleanup-calling-leads] Error:', error.message);
    process.exit(1);
  }

  const count = data?.length ?? 0;
  if (count > 0) {
    console.log(`[cleanup-calling-leads] Deleted ${count} exported calling leads`);
  }
}

cleanup();
