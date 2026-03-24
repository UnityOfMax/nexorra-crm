import { InstantlyClient } from './client';
import { createClient } from '@supabase/supabase-js';

const STATUS_MAP: Record<string, string> = {
  'Interested': 'needs_reply',
  'Meeting Booked': 'booked',
  'Meeting Completed': 'booked',
  'Closed': 'closed_deal',
  'Not Interested': 'rejected',
  'Wrong Person': 'rejected',
  'Out of Office': 'ooo_scheduled',
  'Do Not Contact': 'rejected',
};

export async function syncInstantlyStatuses(client: InstantlyClient, campaignId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Pull leads from Instantly (paginated, up to 1000)
  let offset = 0;
  let total = 0;
  while (true) {
    const leads = await client.listLeads(campaignId, { limit: 100, offset });
    if (!leads || leads.length === 0) break;

    for (const lead of leads) {
      // Update leads table
      await supabase.from('leads')
        .update({ instantly_status: lead.status })
        .eq('email', lead.email);

      // Update lead_conversations if status maps to a conversation status
      const mappedStatus = STATUS_MAP[lead.status];
      if (mappedStatus) {
        await supabase.from('lead_conversations')
          .update({ instantly_status: lead.status })
          .eq('lead_email', lead.email);
      }
    }

    total += leads.length;
    offset += leads.length;
    if (leads.length < 100) break;
  }

  // 2. Pull campaign analytics
  try {
    const analytics = await client.getCampaignAnalytics(campaignId);
    const today = new Date().toISOString().slice(0, 10);

    await supabase.from('email_campaign_metrics').upsert({
      campaign_id: campaignId,
      date: today,
      sent: analytics.sent || 0,
      opened: analytics.opened || 0,
      replied: analytics.replied || 0,
      bounced: analytics.bounced || 0,
      open_rate: analytics.sent > 0 ? analytics.opened / analytics.sent : 0,
      reply_rate: analytics.sent > 0 ? analytics.replied / analytics.sent : 0,
    }, { onConflict: 'campaign_id,date' });
  } catch (e) {
    console.error('[instantly-sync] Failed to sync analytics:', e);
  }

  return { synced: total };
}
