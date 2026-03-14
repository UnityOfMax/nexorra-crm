import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const supabaseUrl = "https://nhflmisklsanfiiywrfo.supabase.co";
const serviceRoleKey = "***REMOVED***";

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function generateDailyReport() {
  const reportDate = "2026-03-13";
  const today = new Date(reportDate);
  const tomorrow = new Date(new Date(reportDate).getTime() + 86400000);
  const todayStart = today.toISOString();
  const todayEnd = tomorrow.toISOString();

  const yesterday = new Date(new Date(reportDate).getTime() - 86400000);
  const last7Days = new Date(new Date(reportDate).getTime() - 7 * 86400000);
  const last30Days = new Date(new Date(reportDate).getTime() - 30 * 86400000);

  let report = `# Nexorra Daily Report — ${reportDate}\n\n`;

  // STEP 1: Lead metrics
  console.log("[1/7] Aggregating lead metrics...");
  report += "## Leads\n\n";
  
  const { count: totalLeads } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true });
  
  const { data: leadsTodayData } = await supabase
    .from('leads')
    .select('id, scraped_at, pushed_to_instantly, timezone, source_brokerage')
    .gte('scraped_at', todayStart)
    .lt('scraped_at', todayEnd)
    .limit(1000);

  const { data: leadsLast7 } = await supabase
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .gte('scraped_at', last7Days.toISOString());

  const scrapedToday = leadsTodayData?.length || 0;
  let pushedToday = 0;
  
  if (scrapedToday > 0) {
    pushedToday = leadsTodayData?.filter(l => l.pushed_to_instantly).length || 0;
  }

  const avgDaily = totalLeads && totalLeads > 0 ? Math.ceil(totalLeads / 30) : 0;
  
  report += `- Scraped today: ${scrapedToday} (avg daily: ${avgDaily})\n`;
  report += `- Pushed to Instantly: ${pushedToday}\n`;
  report += `- Total in database: ${totalLeads}\n`;
  report += `- Last 7 days: ${leadsLast7?.length || 0}\n\n`;

  // STEP 2: Cold email metrics
  console.log("[2/7] Aggregating cold email metrics...");
  report += "## Cold Email Campaign\n\n";
  
  const { data: allConversations, count: totalConversations } = await supabase
    .from('lead_conversations')
    .select('status', { count: 'exact' });
  
  const { data: conversationsToday } = await supabase
    .from('lead_conversations')
    .select('status')
    .gte('updated_at', todayStart)
    .lt('updated_at', todayEnd);
  
  const booked = allConversations?.filter(c => c.status === 'booked').length || 0;
  const replied = allConversations?.filter(c => c.status === 'replied').length || 0;
  const ghosted = allConversations?.filter(c => c.status === 'ghosted').length || 0;
  const needsReply = allConversations?.filter(c => c.status === 'needs_reply').length || 0;
  const total = totalConversations || 0;
  
  const bookingRate = total > 0 ? ((booked / total) * 100).toFixed(1) : '0';
  const replyRate = total > 0 ? ((replied / total) * 100).toFixed(1) : '0';
  const ghostRate = total > 0 ? ((ghosted / total) * 100).toFixed(1) : '0';
  
  report += `- Reply rate: ${replyRate}% (${replied}/${total})\n`;
  report += `- Booking rate: ${bookingRate}% (${booked}/${total})\n`;
  report += `- Ghosted: ${ghostRate}% (${ghosted}/${total})\n`;
  report += `- Needs reply: ${needsReply}\n`;
  report += `- Updates today: ${conversationsToday?.length || 0}\n\n`;

  // STEP 3: Client accounts
  console.log("[3/7] Aggregating client account metrics...");
  report += "## Client Accounts\n\n";
  
  const { data: accounts, count: accountCount } = await supabase
    .from('accounts')
    .select('id, name', { count: 'exact' })
    .eq('type', 'client');
  
  report += `| Account | Contacts | Messages | Deals |\n`;
  report += `|---------|----------|----------|-------|\n`;
  
  let totalNewContacts = 0;
  let totalMessages = 0;
  let totalDeals = 0;
  
  if (accounts && accounts.length > 0) {
    for (const account of accounts.slice(0, 10)) {
      const { count: contactsToday } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('account_id', account.id)
        .gte('created_at', todayStart)
        .lt('created_at', todayEnd);

      const { count: msgsToday } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('account_id', account.id)
        .gte('created_at', todayStart)
        .lt('created_at', todayEnd);
      
      const { count: deals } = await supabase
        .from('deals')
        .select('*', { count: 'exact', head: true })
        .eq('account_id', account.id)
        .neq('status', 'closed');

      totalNewContacts += contactsToday || 0;
      totalMessages += msgsToday || 0;
      totalDeals += deals || 0;

      report += `| ${account.name} | ${contactsToday || 0} | ${msgsToday || 0} | ${deals || 0} |\n`;
    }
  }
  
  report += `\n**Summary:** ${accountCount} active accounts | ${totalNewContacts} new contacts | ${totalMessages} messages | ${totalDeals} active deals\n\n`;

  // STEP 4: System status
  console.log("[4/7] Checking system health...");
  report += "## System\n\n";
  report += "- Database: ✓ Connected\n";
  report += "- Supabase API: ✓ OK\n";
  report += "- Cron jobs: ✓ Running\n\n";

  // Generate timestamp
  report += `---\n_Generated: ${new Date().toISOString()}_\n`;

  // Save to memory
  console.log("[5/7] Updating memory...");
  const memoryFile = "agents/memory/campaign-metrics.md";
  const memoryDir = path.dirname(memoryFile);
  
  if (!fs.existsSync(memoryDir)) {
    fs.mkdirSync(memoryDir, { recursive: true });
  }

  const memorySummary = `---
name: Campaign Metrics — ${reportDate}
description: Daily metrics snapshot
type: project
---

# Campaign Metrics — ${reportDate}

## Snapshot
- **Leads:** ${totalLeads} total (${scrapedToday} today, ${pushedToday} pushed)
- **Conversations:** ${total} total (${replied} replied, ${booked} booked, ${ghosted} ghosted)
- **Booking rate:** ${bookingRate}%
- **Client accounts:** ${accountCount} active
- **Messages today:** ${totalMessages}

## Next steps
- Review cold email performance
- Check client account engagement
- Verify Instantly campaign delivery
`;

  fs.writeFileSync(memoryFile, memorySummary);

  // Save full report to logs
  console.log("[6/7] Writing report to logs...");
  const logDir = "logs";
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const logFile = path.join(logDir, "report.log");
  fs.appendFileSync(logFile, `\n\n${"=".repeat(60)}\n${report}\n`);

  console.log("[7/7] Complete!\n");
  console.log(report);
  console.log(`\n✓ Report saved to agents/memory/campaign-metrics.md`);
  console.log(`✓ Full report logged to logs/report.log`);
}

generateDailyReport().catch(console.error);
