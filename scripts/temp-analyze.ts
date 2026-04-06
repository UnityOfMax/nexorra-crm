import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const { data: conversations } = await supabase
    .from("lead_conversations")
    .select("id,lead_email,status")
    .in("status", ["booked", "ghosted", "rejected", "no_show", "closed_deal"])
    .eq("outcome_learned", false)
    .limit(3)
    .order("updated_at", { ascending: false });

  if (!conversations || conversations.length === 0) {
    console.log("No conversations to learn from");
    return;
  }

  for (const conv of conversations) {
    const { data: messages } = await supabase
      .from("conversation_messages")
      .select("direction,sender_name,content")
      .eq("conversation_id", conv.id)
      .order("sent_at", { ascending: true });

    if (messages) {
      console.log(`\n=== CONVERSATION: ${conv.lead_email} (${conv.status}) ===`);
      for (const msg of messages) {
        const preview = msg.content.substring(0, 150).replace(/\n/g, " ");
        console.log(`[${msg.direction.toUpperCase()}] ${msg.sender_name || "System"}: ${preview}`);
      }
    }
  }
}

main().catch(console.error);
