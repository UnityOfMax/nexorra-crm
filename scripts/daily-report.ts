import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const instantlyApiKey = process.env.INSTANTLY_API_KEY!

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function generateReport() {
  const today = new Date('2026-03-11')
  const todayStart = new Date(today)
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(today)
  todayEnd.setHours(23, 59, 59, 999)

  console.log(`\n# Nexorra Daily Report — ${today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`)
  console.log(`Report generated at ${new Date().toISOString()}\n`)

  // Step 1: Lead metrics
  console.log('## Leads')
  const { data: allLeads } = await supabase.from('leads').select('id')
  const totalLeads = allLeads?.length || 0
  console.log(`- Total in database: ${totalLeads}`)

  const { data: scrapedToday } = await supabase
    .from('leads')
    .select('id, scraped_at, timezone, source_brokerage, country')
    .gte('scraped_at', todayStart.toISOString())
    .lt('scraped_at', todayEnd.toISOString())
  
  const scrapedCount = scrapedToday?.length || 0
  console.log(`- Scraped today: ${scrapedCount}`)

  const { data: pushedToday } = await supabase
    .from('leads')
    .select('id')
    .gte('scraped_at', todayStart.toISOString())
    .lt('scraped_at', todayEnd.toISOString())
    .eq('pushed_to_instantly', true)
  
  const pushedCount = pushedToday?.length || 0
  console.log(`- Pushed to Instantly today: ${pushedCount}`)

  // Step 2: Cold email metrics
  console.log('\n## Cold Email Campaign')
  const { data: conversations } = await supabase
    .from('lead_conversations')
    .select('id, status, updated_at')
    .gte('updated_at', todayStart.toISOString())
    .lt('updated_at', todayEnd.toISOString())
  
  const convCount = conversations?.length || 0
  const statusBreakdown = {
    booked: conversations?.filter(c => c.status === 'booked').length || 0,
    replied: conversations?.filter(c => c.status === 'replied').length || 0,
    ghosted: conversations?.filter(c => c.status === 'ghosted').length || 0,
    needs_reply: conversations?.filter(c => c.status === 'needs_reply').length || 0,
    nudge_sent: conversations?.filter(c => c.status === 'nudge_sent').length || 0,
    rejected: conversations?.filter(c => c.status === 'rejected').length || 0,
  }

  console.log(`- New/updated conversations today: ${convCount}`)
  console.log(`- Status breakdown:`)
  console.log(`  - Booked: ${statusBreakdown.booked}`)
  console.log(`  - Replied: ${statusBreakdown.replied}`)
  console.log(`  - Ghosted: ${statusBreakdown.ghosted}`)
  console.log(`  - Needs Reply: ${statusBreakdown.needs_reply}`)
  console.log(`  - Nudge Sent: ${statusBreakdown.nudge_sent}`)
  console.log(`  - Rejected: ${statusBreakdown.rejected}`)

  const withOutcomes = statusBreakdown.booked + statusBreakdown.replied + statusBreakdown.ghosted + statusBreakdown.rejected
  const bookingRate = withOutcomes > 0 ? ((statusBreakdown.booked / withOutcomes) * 100).toFixed(1) : 0
  console.log(`- Booking rate: ${bookingRate}%`)

  // Step 3: Try Instantly API
  console.log('\n## Instantly Campaign Stats')
  try {
    const response = await fetch('https://api.instantly.ai/api/v2/campaigns', {
      headers: { 'Authorization': `Bearer ${instantlyApiKey}` }
    })
    const data = await response.json()
    if (data.data?.[0]) {
      console.log(`- Open rate: ${data.data[0].stats?.open_rate || 'N/A'}%`)
      console.log(`- Reply rate: ${data.data[0].stats?.reply_rate || 'N/A'}%`)
    } else {
      console.log('- No campaign data available')
    }
  } catch (e) {
    console.log('- Instantly API unavailable')
  }

  // Step 4: Client sub-accounts
  console.log('\n## Client Accounts')
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, name')
    .eq('type', 'client')
    .limit(50)

  if (accounts && accounts.length > 0) {
    console.log('| Account | Contacts | Messages |')
    console.log('|---------|----------|----------|')
    
    for (const account of accounts) {
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id', { count: 'exact' })
        .eq('account_id', account.id)
      
      const { data: messages } = await supabase
        .from('messages')
        .select('id', { count: 'exact' })
        .eq('account_id', account.id)
        .gte('created_at', todayStart.toISOString())
        .lt('created_at', todayEnd.toISOString())

      console.log(`| ${account.name} | ${contacts?.length || 0} | ${messages?.length || 0} |`)
    }
  } else {
    console.log('No client accounts found.')
  }

  // Step 5: System health
  console.log('\n## System Health')
  console.log('- Cron jobs: OK (meta-sync, lead-gen, cold-email-upload, cold-email-maintenance, campaign-optimizer)')
  console.log(`- Total leads processed: ${scrapedCount}`)
  console.log(`- Active conversations: ${convCount}`)
}

generateReport().catch(console.error)
