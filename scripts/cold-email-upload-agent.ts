#!/usr/bin/env node

/**
 * Cold Email Upload Agent
 *
 * Uploads PREVIOUS DAY's leads to Instantly campaign.
 * Each lead must have a landing page URL (created by Derek's video pipeline).
 * Leads without landing pages are skipped (they'll be picked up tomorrow after Derek processes them).
 *
 * Pipeline: Jeff scrapes → Derek generates video + landing page → This script uploads to Instantly
 */

import { createClient } from "@supabase/supabase-js";
import { personalizeLead } from "../lib/email/personalize";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const INSTANTLY_API_KEY = process.env.INSTANTLY_API_KEY!;
const INSTANTLY_CAMPAIGN = process.env.INSTANTLY_CAMPAIGN!;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function fetchReadyLeads(): Promise<any[]> {
  const todayMidnight = new Date();
  todayMidnight.setUTCHours(0, 0, 0, 0);

  console.log(`[fetch] Getting unpushed email leads with landing pages (scraped before today)...`);

  // Only fetch leads that have:
  // 1. Not been pushed to Instantly yet
  // 2. Were scraped before today (previous day's leads)
  // 3. Have an email (email leads, not instagram-only)
  // 4. Have a video_url (Derek has processed them)
  const { data, error } = await supabaseAdmin
    .from("leads")
    .select("id,full_name,first_name,last_name,email,city,state_province,country,timezone,source_brokerage,video_url,lead_category,thumbnail_url,personal_research")
    .eq("pushed_to_instantly", false)
    .not("email", "is", null)
    .not("video_url", "is", null)
    .lt("scraped_at", todayMidnight.toISOString())
    .order("scraped_at", { ascending: true })
    .limit(1000);

  if (error) {
    console.error("[fetch] Error:", error.message);
    throw error;
  }

  console.log(`[fetch] Found ${data?.length || 0} leads ready for upload`);

  // Also check how many are NOT ready (no video yet)
  const { count: notReadyCount } = await supabaseAdmin
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("pushed_to_instantly", false)
    .not("email", "is", null)
    .is("video_url", null)
    .lt("scraped_at", todayMidnight.toISOString());

  if (notReadyCount && notReadyCount > 0) {
    console.log(`[fetch] ${notReadyCount} leads still waiting for video generation (will be picked up tomorrow)`);
  }

  return data || [];
}

async function getCampaignId(): Promise<string> {
  console.log(`[campaign] Looking up "${INSTANTLY_CAMPAIGN}"...`);

  const response = await fetch("https://api.instantly.ai/api/v2/campaigns", {
    headers: { Authorization: `Bearer ${INSTANTLY_API_KEY}` },
  });

  if (!response.ok) throw new Error(`Failed to fetch campaigns: ${response.statusText}`);

  const data = await response.json();
  const campaign = data.items?.find((c: any) => c.name === INSTANTLY_CAMPAIGN);

  if (!campaign) throw new Error(`Campaign "${INSTANTLY_CAMPAIGN}" not found`);

  console.log(`[campaign] Found: ${campaign.id} (status: ${campaign.status})`);
  return campaign.id;
}

async function getLandingPageUrl(leadId: string): Promise<string> {
  // Check if a landing page already exists for this lead
  const { data } = await supabaseAdmin
    .from("landing_pages")
    .select("id")
    .eq("lead_id", leadId)
    .eq("page_type", "cold-email")
    .limit(1)
    .single();

  if (data) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.nexorra.io";
    return `${baseUrl}/video/${data.id}`;
  }

  return "";
}

async function createLandingPage(lead: any): Promise<string> {
  // Create landing page via the API endpoint
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.nexorra.io";

  try {
    const { buildColdEmailPage } = await import("../lib/landing-pages/cold-email-builder");

    const html = buildColdEmailPage({
      leadName: lead.full_name || lead.first_name || "there",
      firstName: lead.first_name || "there",
      videoUrl: lead.video_url,
      calendlyUrl: "https://calendly.com/nexorra/demo-call?embed_domain=nexorra.io&embed_type=Inline",
      city: lead.city,
      brokerage: lead.source_brokerage,
    });

    // Insert into landing_pages table
    const slug = `${(lead.first_name || "lead").toLowerCase()}-${lead.id.slice(0, 8)}`;
    const { data, error } = await supabaseAdmin
      .from("landing_pages")
      .insert({
        account_id: "da99b768-79dd-48f8-af86-abf95e61a69f", // Nexorra agency
        name: `Video for ${lead.first_name || lead.full_name}`,
        slug,
        content: html,
        published: true,
        page_type: "cold-email",
        lead_id: lead.id,
        meta_title: "How we Guarantee 3-5 Closed Deals in 90 Days",
      })
      .select("id")
      .single();

    if (error) {
      console.error(`[landing] Error creating page for ${lead.first_name}:`, error.message);
      return "";
    }

    return `${baseUrl}/video/${data.id}`;
  } catch (e) {
    console.error(`[landing] Failed for ${lead.first_name}:`, (e as Error).message);
    return "";
  }
}

const ROLE_PREFIXES = ['noreply','no-reply','support','info','hello','contact','admin','sales','team','office','mail','marketing','newsletter','donotreply','do-not-reply'];

async function uploadToInstantly(
  leads: any[],
  campaignId: string
): Promise<{ uploaded: number; duplicated: number; invalid: number; roleSkipped: number }> {
  console.log(`[upload] Preparing ${leads.length} leads for Instantly...`);

  const leadsPayload = [];
  let roleSkipped = 0;

  for (const lead of leads) {
    // Skip role-based / non-personal email addresses
    const emailPrefix = (lead.email || '').split('@')[0].toLowerCase();
    if (ROLE_PREFIXES.some(p => emailPrefix === p || emailPrefix.startsWith(p + '.'))) {
      console.log(`[upload] Skipping role email: ${lead.email}`);
      roleSkipped++;
      continue;
    }
    // Get or create landing page URL
    let landingUrl = await getLandingPageUrl(lead.id);
    if (!landingUrl && lead.video_url) {
      landingUrl = await createLandingPage(lead);
    }

    const copy = personalizeLead(lead);

    leadsPayload.push({
      email: lead.email,
      first_name: lead.first_name || "",
      last_name: lead.last_name || "",
      custom_variables: {
        city: lead.city || "",
        state: lead.state_province || "",
        brokerage: lead.source_brokerage || "",
        timezone: lead.timezone || "",
        loom_link: landingUrl, // Landing page URL (shown as "Watch Video" in email)
        thumbnail_url: lead.thumbnail_url || "", // First frame of video — shown as clickable preview in email
        first_line: copy.first_line,   // Personalized opening line
        email_body: copy.email_body,   // City-based pitch variant
        ps_line: copy.ps_line,         // Personalized PS
      },
    });
  }

  // Filter out leads with no landing page URL
  const withUrls = leadsPayload.filter(l => l.custom_variables.loom_link);
  const withoutUrls = leadsPayload.filter(l => !l.custom_variables.loom_link);

  if (withoutUrls.length > 0) {
    console.log(`[upload] ${withoutUrls.length} leads have no landing page URL — uploading anyway with empty link`);
  }

  console.log(`[upload] Uploading ${leadsPayload.length} leads...`);

  let retries = 0;
  let response;

  while (retries < 2) {
    response = await fetch("https://api.instantly.ai/api/v2/leads/add", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${INSTANTLY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        campaign_id: campaignId,
        skip_if_in_workspace: false,
        skip_if_in_campaign: false,
        leads: leadsPayload,
      }),
    });

    if (response.status === 429) {
      console.log("[upload] Rate limited, waiting 60s...");
      await new Promise(r => setTimeout(r, 60000));
      retries++;
      continue;
    }

    if (!response.ok) throw new Error(`Upload failed: ${response.status} ${await response.text()}`);
    break;
  }

  const result = await response!.json();
  console.log(`[upload] Uploaded: ${result.leads_uploaded || 0}, Duplicated: ${result.duplicated_leads || 0}, Invalid: ${result.invalid_email_count || 0}, Role-skipped: ${roleSkipped}`);

  return {
    uploaded: result.leads_uploaded || 0,
    duplicated: result.duplicated_leads || 0,
    invalid: result.invalid_email_count || 0,
    roleSkipped,
  };
}

async function markLeadsAsPushed(leads: any[], campaignId: string): Promise<void> {
  const leadIds = leads.map(l => l.id);
  for (let i = 0; i < leadIds.length; i += 100) {
    const batch = leadIds.slice(i, i + 100);
    const { error } = await supabaseAdmin
      .from("leads")
      .update({ pushed_to_instantly: true, instantly_campaign_id: campaignId })
      .in("id", batch);
    if (error) console.error(`[mark] Batch error:`, error.message);
  }
  console.log(`[mark] Marked ${leadIds.length} leads as pushed`);
}

async function main() {
  console.log("=== Cold Email Upload Agent ===\n");

  const leads = await fetchReadyLeads();

  if (leads.length === 0) {
    console.log("No leads ready for upload. Exiting.");
    return;
  }

  const campaignId = await getCampaignId();
  const result = await uploadToInstantly(leads, campaignId);
  await markLeadsAsPushed(leads, campaignId);

  console.log(`\n=== Done === Uploaded: ${result.uploaded}, Skipped: ${result.duplicated + result.invalid}, Role-filtered: ${result.roleSkipped}`);
}

main().catch(err => {
  console.error("[FATAL]", err.message);
  process.exit(1);
});
