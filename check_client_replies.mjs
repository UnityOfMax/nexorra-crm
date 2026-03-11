#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkStatus() {
  // 1. Get enabled accounts
  const { data: enabledAccounts, error: configError } = await supabase
    .from("ai_agent_configs")
    .select("account_id, enabled")
    .eq("enabled", true);

  if (configError) {
    console.error("Config error:", configError);
    process.exit(1);
  }

  console.log(`Found ${enabledAccounts?.length || 0} AI-enabled accounts`);
  if (!enabledAccounts || enabledAccounts.length === 0) {
    console.log("No AI-enabled accounts. Exiting.");
    process.exit(0);
  }

  // 2. For each account, check for pending inbound messages
  let totalPending = 0;
  for (const config of enabledAccounts) {
    const { data: messages, error: msgError } = await supabase
      .from("messages")
      .select("id, contact_id, type, direction, is_ai_generated, created_at")
      .eq("account_id", config.account_id)
      .eq("direction", "inbound")
      .is("is_ai_generated", null)
      .order("created_at", { ascending: false })
      .limit(10);

    if (msgError) {
      console.error(`Error fetching messages for account ${config.account_id}:`, msgError);
      continue;
    }

    const pending = messages?.filter((m) => !m.is_ai_generated) || [];
    console.log(`Account ${config.account_id}: ${pending.length} pending inbound messages`);
    totalPending += pending.length;
  }

  console.log(`\nTotal pending messages across all accounts: ${totalPending}`);
  if (totalPending === 0) {
    console.log("No pending messages. Client Reply Agent: idle.");
  }
}

checkStatus().catch(console.error);
