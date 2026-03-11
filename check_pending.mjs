import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function main() {
  console.log('Querying AI-enabled accounts...')
  const { data: configs, error: configError } = await supabase
    .from('ai_agent_configs')
    .select('account_id')
    .limit(100)

  if (configError) {
    console.error('Error fetching configs:', configError)
    process.exit(1)
  }

  console.log(`Found ${configs.length} AI-enabled accounts`)
  if (configs.length === 0) {
    console.log('No AI-enabled accounts. Exiting.')
    process.exit(0)
  }

  let totalPending = 0
  const pendingByAccount = {}

  for (const config of configs) {
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('id, contact_id, type, content, created_at, direction')
      .eq('account_id', config.account_id)
      .eq('direction', 'inbound')
      .is('is_ai_generated', null)
      .order('created_at', { ascending: false })
      .limit(20)

    if (msgError) {
      console.error(`Error fetching messages for ${config.account_id}:`, msgError)
      continue
    }

    if (messages.length > 0) {
      pendingByAccount[config.account_id] = messages
      totalPending += messages.length
      console.log(`  Account ${config.account_id}: ${messages.length} pending`)
    }
  }

  console.log(`\nTotal pending messages: ${totalPending}`)

  if (totalPending === 0) {
    console.log('No pending messages across all accounts. Exiting.')
    process.exit(0)
  }

  console.log(`✓ Found ${totalPending} messages to process`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
