import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('\n=== Client Reply Agent Status Check ===\n');

  // Get enabled accounts
  const { data: accounts, error: accError } = await supabase
    .from('ai_agent_configs')
    .select('account_id, enabled')
    .eq('enabled', true);

  if (accError) {
    console.error('❌ Error fetching accounts:', accError.message);
    process.exit(1);
  }

  const enabledCount = accounts?.length || 0;
  console.log(`✓ AI-enabled sub-accounts: ${enabledCount}`);

  if (enabledCount === 0) {
    console.log('→ No enabled accounts. Exiting.\n');
    process.exit(0);
  }

  // Check pending messages per account
  let totalPending = 0;
  console.log('\nPending messages per account:');
  
  for (const acc of accounts!) {
    const { data: msgs } = await supabase
      .from('messages')
      .select('id')
      .eq('account_id', acc.account_id)
      .eq('direction', 'inbound')
      .is('is_ai_generated', null);

    const count = msgs?.length || 0;
    const aid = acc.account_id.substring(0, 8);
    console.log(`  ${aid}...: ${count} pending`);
    totalPending += count;
  }

  console.log(`\nTotal pending inbound messages: ${totalPending}`);
  
  if (totalPending === 0) {
    console.log('✓ No work to do. Agent idle.\n');
  } else {
    console.log(`⚠️  ${totalPending} message(s) need replies\n`);
  }
}

check().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
