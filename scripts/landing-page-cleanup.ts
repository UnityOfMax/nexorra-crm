import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log(`[cleanup] Starting at ${new Date().toISOString()}`);
  let deleted = 0;

  // Rule 1: Rejected/unsubscribed leads — delete immediately
  // Step 1: Get rejected lead emails
  const { data: rejectedConvos } = await supabase
    .from('lead_conversations')
    .select('lead_email')
    .eq('status', 'rejected');

  const rejectedEmails = new Set((rejectedConvos || []).map(c => c.lead_email));

  if (rejectedEmails.size > 0) {
    // Step 2: Find leads with landing pages that match
    const { data: leadsToClean } = await supabase
      .from('leads')
      .select('id, email, landing_page_id, video_url, gif_url')
      .not('landing_page_id', 'is', null);

    for (const lead of (leadsToClean || [])) {
      if (!rejectedEmails.has(lead.email)) continue;
      await cleanupLead(lead);
      deleted++;
    }
  }
  console.log(`[cleanup] Rule 1 (rejected): ${deleted} cleaned`);

  // Rule 2: Booked leads — delete 1 day after booking
  let bookedCleaned = 0;
  const { data: bookedConvos } = await supabase
    .from('lead_conversations')
    .select('lead_email')
    .eq('status', 'booked');

  const bookedEmails = new Set((bookedConvos || []).map(c => c.lead_email));

  if (bookedEmails.size > 0) {
    const { data: bookedLeads } = await supabase
      .from('leads')
      .select('id, email, landing_page_id, video_url, gif_url')
      .not('landing_page_id', 'is', null);

    for (const lead of (bookedLeads || [])) {
      if (!bookedEmails.has(lead.email)) continue;
      // Check if booking was >1 day ago
      const { data: events } = await supabase
        .from('landing_page_events')
        .select('created_at')
        .eq('lead_id', lead.id)
        .eq('event_type', 'booking_confirmed')
        .order('created_at', { ascending: false })
        .limit(1);

      if (events && events.length > 0) {
        const bookingDate = new Date(events[0].created_at);
        if (Date.now() - bookingDate.getTime() > 24 * 60 * 60 * 1000) {
          await cleanupLead(lead);
          bookedCleaned++;
        }
      }
    }
  }
  console.log(`[cleanup] Rule 2 (booked >1d): ${bookedCleaned} cleaned`);

  // Rule 3: No response — delete 15 days after outreach
  let noResponseCleaned = 0;
  const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();

  const { data: oldLeads } = await supabase
    .from('leads')
    .select('id, email, landing_page_id, video_url, gif_url, scraped_at')
    .not('landing_page_id', 'is', null)
    .eq('pushed_to_instantly', true)
    .lt('scraped_at', fifteenDaysAgo);

  // Get all emails that DO have conversations (any response)
  const { data: allConvos } = await supabase
    .from('lead_conversations')
    .select('lead_email');
  const respondedEmails = new Set((allConvos || []).map(c => c.lead_email));

  for (const lead of (oldLeads || [])) {
    if (respondedEmails.has(lead.email)) continue; // has a conversation, skip
    await cleanupLead(lead);
    noResponseCleaned++;
  }
  console.log(`[cleanup] Rule 3 (no response >15d): ${noResponseCleaned} cleaned`);

  console.log(`[cleanup] Done. Total cleaned: ${deleted + bookedCleaned + noResponseCleaned}`);
}

async function cleanupLead(lead: any) {
  // Delete video from Storage
  if (lead.video_url) {
    const videoPath = lead.video_url.split('/lead-videos/')[1];
    if (videoPath) {
      await supabase.storage.from('lead-videos').remove([videoPath]);
    }
  }

  // Delete GIF from Storage
  if (lead.gif_url) {
    const gifPath = lead.gif_url.split('/lead-gifs/')[1];
    if (gifPath) {
      await supabase.storage.from('lead-gifs').remove([gifPath]);
    }
  }

  // Delete landing page
  if (lead.landing_page_id) {
    await supabase.from('landing_pages').delete().eq('id', lead.landing_page_id);
  }

  // Clear lead references
  await supabase.from('leads').update({
    video_url: null,
    gif_url: null,
    landing_page_id: null,
  }).eq('id', lead.id);
}

main().catch(e => { console.error(e); process.exit(1); });
