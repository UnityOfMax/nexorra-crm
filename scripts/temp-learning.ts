import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function analyzeConversation(conversationId: string, leadEmail: string, status: string) {
  const { data: messages } = await supabase
    .from("conversation_messages")
    .select("direction,sender_name,content")
    .eq("conversation_id", conversationId)
    .order("sent_at", { ascending: true });

  if (!messages || messages.length === 0) return null;

  const threadText = messages
    .map((m) => `[${m.direction.toUpperCase()}] ${m.sender_name || "System"}: ${m.content}`)
    .join("\n\n");

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 150,
    messages: [
      {
        role: "user",
        content: `Analyze this cold email thread. Lead outcome: ${status}.\n\nThread:\n${threadText}\n\nWhat was the lead's reaction type (verification request, unsubscribe, complaint, etc.)? Write a concise 2-3 sentence learning note.`,
      },
    ],
  });

  const learning = response.content[0].type === "text" ? response.content[0].text : "";
  return { conversationId, leadEmail, status, learning };
}

async function main() {
  const { data: conversations } = await supabase
    .from("lead_conversations")
    .select("id,lead_email,status")
    .in("status", ["booked", "ghosted", "rejected", "no_show", "closed_deal"])
    .eq("outcome_learned", false)
    .limit(3)
    .order("updated_at", { ascending: false });

  if (!conversations) {
    console.log("No conversations");
    return;
  }

  for (const conv of conversations) {
    const result = await analyzeConversation(conv.id, conv.lead_email, conv.status);
    if (result) {
      console.log(JSON.stringify(result));
    }
  }
}

main().catch(console.error);
