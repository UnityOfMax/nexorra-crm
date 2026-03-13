import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function main() {
  console.log('[PRE-CHECK] Fetching enabled sub-accounts...');
  const { data: configs, error: e1 } = await supabase
    .from('ai_agent_configs')
    .select('account_id')
    .eq('enabled', true);

  if (e1) console.error('[ERROR] ai_agent_configs:', e1);

  console.log(`[PRE-CHECK] Found ${configs?.length || 0} enabled sub-accounts`);

  if (!configs || configs.length === 0) {
    console.log('[EXIT] No enabled sub-accounts. Exiting.');
    process.exit(0);
  }

  let totalPending = 0;

  for (const config of configs) {
    const { data: messages, error: e2 } = await supabase
      .from('messages')
      .select('id,contact_id,type,content,created_at,metadata')
      .eq('account_id', config.account_id)
      .eq('direction', 'inbound')
      .is('is_ai_generated', null)
      .order('created_at', { ascending: false })
      .limit(10);

    if (e2) console.error(`[ERROR] messages for ${config.account_id}:`, e2);

    if (messages && messages.length > 0) {
      totalPending += messages.length;
      console.log(`[PRE-CHECK] Account ${config.account_id}: ${messages.length} pending messages`);
    }
  }

  if (totalPending === 0) {
    console.log('[EXIT] No pending messages. Exiting.');
    process.exit(0);
  }

  console.log(`\n[READY] ${totalPending} pending messages found.`);
}

main().catch(console.error);
