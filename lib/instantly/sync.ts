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

  // 1. Pull leads from Instantly (paginated, max 100 per request)
  console.log('[instantly-sync] Fetching leads from Instantly...');
  const allLeads = [];
  let hasMore = true;
  let startingAfter: string | undefined;

  while (hasMore) {
    const response = await client.listLeads(campaignId, { limit: 100 });
    const leads = Array.isArray(response) ? response : (response?.data || response?.items || []);

    if (!leads || leads.length === 0) {
      hasMore = false;
      break;
    }

    allLeads.push(...leads);
    startingAfter = response?.next_starting_after;
    hasMore = !!startingAfter && leads.length === 100;
  }

  if (allLeads.length === 0) {
    console.log('[instantly-sync] No leads found');
    return { synced: 0 };
  }

  console.log(`[instantly-sync] Found ${allLeads.length} leads, updating Supabase...`);
  let total = 0;

  try {
    // Update leads table with batched writes
    const { error } = await supabase.from('leads')
      .upsert(
        allLeads.map(lead => ({
          email: lead.email,
          instantly_status: lead.status,
        })),
        { onConflict: 'email' }
      );

    if (error) console.error('[instantly-sync] Leads update error:', error);

    total = allLeads.length;
  } catch (e) {
    console.error('[instantly-sync] Failed to update leads:', e);
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
