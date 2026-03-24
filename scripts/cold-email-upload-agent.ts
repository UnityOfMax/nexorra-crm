#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const INSTANTLY_API_KEY = process.env.INSTANTLY_API_KEY!;
const INSTANTLY_CAMPAIGN = process.env.INSTANTLY_CAMPAIGN!;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Step 0: Check Stacey's mode
interface StaceyState {
  mode: "email" | "instagram" | "both";
}

// Step 1: Fetch unpushed leads
async function fetchUnpushedLeads(): Promise<any[]> {
  const todayMidnight = new Date();
  todayMidnight.setUTCHours(0, 0, 0, 0);
  const todayMidnightISO = todayMidnight.toISOString();

  console.log(`[Step 1] Fetching unpushed leads scraped before ${todayMidnightISO}...`);

  const { data, error } = await supabaseAdmin
    .from("leads")
    .select(
      "id,full_name,first_name,last_name,email,city,state_province,country,timezone,source_brokerage"
    )
    .eq("pushed_to_instantly", false)
    .lt("scraped_at", todayMidnightISO)
    .order("scraped_at", { ascending: true })
    .limit(1000);

  if (error) {
    console.error("[ERROR] Failed to fetch leads:", error);
    throw error;
  }

  console.log(`[Step 1] Found ${data?.length || 0} unpushed leads.`);
  return data || [];
}

// Step 2: Look up campaign ID
async function getCampaignId(): Promise<string> {
  console.log(`[Step 2] Looking up campaign ID for "${INSTANTLY_CAMPAIGN}"...`);

  const response = await fetch("https://api.instantly.ai/api/v2/campaigns", {
    headers: {
      Authorization: `Bearer ${INSTANTLY_API_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch campaigns: ${response.statusText}`);
  }

  const data = await response.json();
  const campaign = data.items?.find((c: any) => c.name === INSTANTLY_CAMPAIGN);

  if (!campaign) {
    throw new Error(`Campaign "${INSTANTLY_CAMPAIGN}" not found`);
  }

  console.log(`[Step 2] Found campaign ID: ${campaign.id}`);
  return campaign.id;
}

// Step 3: Load loom config
function loadLoomConfig(): { [key: string]: string } {
  try {
    const fs = require("fs");
    const config = JSON.parse(fs.readFileSync("agents/state/sender-loom-config.json", "utf-8"));
    console.log("[Step 3] Loaded Loom config");
    return config;
  } catch (e) {
    console.error("[Step 3] Failed to load Loom config, using empty:", e);
    return { Ben: "", Carl: "", Olivia: "", Stacey: "", Stan: "" };
  }
}

// Step 4: Distribute leads across sender names
function distributeLeedsAcrossSenders(leads: any[], loomConfig: { [key: string]: string }) {
  const senderNames = ["Ben", "Carl", "Olivia", "Stacey", "Stan"];
  const senderLeadMap: { [key: string]: any[] } = {};

  senderNames.forEach((sender) => {
    senderLeadMap[sender] = [];
  });

  // Round-robin distribution
  leads.forEach((lead, index) => {
    const senderIndex = index % senderNames.length;
    const sender = senderNames[senderIndex];
    senderLeadMap[sender].push(lead);
  });

  console.log(`[Step 4] Distributed ${leads.length} leads across senders:`);
  senderNames.forEach((sender) => {
    console.log(`  ${sender}: ${senderLeadMap[sender].length} leads`);
  });

  return { senderLeadMap, senderNames };
}

// Step 5: Bulk upload to Instantly
async function uploadLeadsToInstantly(
  leads: any[],
  campaignId: string,
  senderLeadMap: { [key: string]: any[] },
  senderNames: string[],
  loomConfig: { [key: string]: string }
): Promise<{ uploaded: number; duplicated: number; invalid: number }> {
  console.log("[Step 5] Uploading leads to Instantly...");

  let totalUploaded = 0;
  let totalDuplicated = 0;
  let totalInvalid = 0;

  // Upload all senders' leads in one batch
  const leadsPayload = leads.map((lead) => {
    // Find which sender this lead belongs to
    const senderIndex = leads.indexOf(lead) % senderNames.length;
    const sender = senderNames[senderIndex];
    const loomUrl = loomConfig[sender] || "";

    return {
      email: lead.email,
      first_name: lead.first_name || "",
      last_name: lead.last_name || "",
      custom_variables: {
        city: lead.city || "",
        state: lead.state_province || "",
        brokerage: lead.source_brokerage || "",
        timezone: lead.timezone || "",
        loom_link: loomUrl,
      },
    };
  });

  const payload = {
    campaign_id: campaignId,
    skip_if_in_workspace: false,
    skip_if_in_campaign: false,
    leads: leadsPayload,
  };

  let retries = 0;
  let success = false;
  let response;

  while (retries < 2 && !success) {
    try {
      response = await fetch("https://api.instantly.ai/api/v2/leads/add", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${INSTANTLY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 429) {
        console.log("[Step 5] Got 429, waiting 60s before retry...");
        await new Promise((r) => setTimeout(r, 60000));
        retries++;
        continue;
      }

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      success = true;
    } catch (e) {
      if (retries === 1) throw e;
      retries++;
    }
  }

  if (!success) {
    throw new Error("Upload failed after retries");
  }

  const result = await response!.json();
  totalUploaded = result.leads_uploaded || 0;
  totalDuplicated = result.duplicated_leads || 0;
  totalInvalid = result.invalid_email_count || 0;

  console.log(`[Step 5] Upload complete:`);
  console.log(`  Uploaded: ${totalUploaded}`);
  console.log(`  Duplicated: ${totalDuplicated}`);
  console.log(`  Invalid: ${totalInvalid}`);

  return { uploaded: totalUploaded, duplicated: totalDuplicated, invalid: totalInvalid };
}

// Step 6: Mark leads as pushed
async function markLeadsAsPushed(leads: any[], campaignId: string): Promise<void> {
  console.log("[Step 6] Marking leads as pushed in Supabase...");

  const leadIds = leads.map((l) => l.id);

  // Use RPC or batch update with proper error handling
  for (let i = 0; i < leadIds.length; i += 100) {
    const batch = leadIds.slice(i, i + 100);
    const { error } = await supabaseAdmin
      .from("leads")
      .update({ pushed_to_instantly: true, instantly_campaign_id: campaignId })
      .in("id", batch);

    if (error) {
      console.error(`[Step 6] Error marking batch ${i / 100}:`, error);
      throw error;
    }
  }

  console.log(`[Step 6] Marked ${leadIds.length} leads as pushed`);
}

// Main workflow
async function main() {
  try {
    console.log("=== Cold Email Upload Agent ===\n");

    // Step 0: Check mode
    try {
      const fs = require("fs");
      const staceyState: StaceyState = JSON.parse(
        fs.readFileSync("agents/state/stacey-state.json", "utf-8")
      );
      console.log(`[Step 0] Mode: ${staceyState.mode}`);

      if (staceyState.mode === "instagram") {
        console.log("[Step 0] Mode is 'instagram', skipping email upload");
        console.log("\n=== All steps complete ===\n");
        return;
      }
    } catch (e) {
      console.log("[Step 0] No stacey-state.json, assuming mode='both'");
    }

    // Email upload workflow
    const leads = await fetchUnpushedLeads();

    if (leads.length === 0) {
      console.log("\n✓ No unpushed leads from previous days. Exiting.\n");
      console.log("=== All steps complete ===\n");
      return;
    }

    const campaignId = await getCampaignId();
    const loomConfig = loadLoomConfig();
    const { senderLeadMap, senderNames } = distributeLeedsAcrossSenders(leads, loomConfig);

    const uploadResult = await uploadLeadsToInstantly(
      leads,
      campaignId,
      senderLeadMap,
      senderNames,
      loomConfig
    );

    await markLeadsAsPushed(leads, campaignId);

    // Report
    console.log("\n=== Report ===");
    console.log(
      `Email: Uploaded ${uploadResult.uploaded} leads to campaign '${INSTANTLY_CAMPAIGN}'.`
    );
    console.log(`Loom distribution:`);
    senderNames.forEach((sender) => {
      console.log(`  ${sender}: ${senderLeadMap[sender].length}`);
    });
    console.log("Instagram DMs: Skipped (no active accounts configured).");
    console.log("\n=== All steps complete ===\n");
  } catch (error) {
    console.error("\n[FATAL ERROR]", error);
    process.exit(1);
  }
}

main();
