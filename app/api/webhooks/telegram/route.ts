import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendMessage } from '@/lib/telegram/client';
import { classifyMessage } from '@/lib/telegram/classifier';
import { DEPARTMENTS, AGENT_DEFINITIONS, type DepartmentKey } from '@/lib/agents/definitions';

export const dynamic = 'force-dynamic';

const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;

// Lena's personality — casual, warm, concise. Like a real PA texting you.
const ROUTING_RESPONSES: Record<string, string[]> = {
  engineering: [
    "On it — sending this over to Barny and the dev team now.",
    "Got it, passing this to engineering. Barny will take a look.",
    "Sure thing. Engineering's on it.",
  ],
  marketing: [
    "Sent to Stacey — she'll handle this with the marketing crew.",
    "Marketing's got it. Stacey will sort this out.",
    "Passing this to Stacey and the outreach team now.",
  ],
  research: [
    "Jeff's on it. I'll let you know what the research team finds.",
    "Sent over to research. Jeff will dig into this.",
    "Got it — handing this off to Jeff and the research team.",
  ],
  client: [
    "Ava's got this. She'll loop in whoever's needed on the client side.",
    "Passing to Ava and client success now.",
    "Client team's handling it. Ava will follow up.",
  ],
  delivery: [
    "Marcus is on it. He'll check the numbers and get back to you.",
    "Sent to Marcus — delivery team will take care of this.",
    "Got it, routing to service delivery now.",
  ],
  experiments: [
    "Hugo's on it. The experiments team will look into this.",
    "Interesting — sending this to Hugo for testing.",
    "Passing to the experiments team. Hugo will figure it out.",
  ],
};

const GREETINGS = [
  "Hey! What can I do for you?",
  "What's up? Send me a task and I'll get the right people on it.",
  "Hey Max — what do you need?",
];

function pick(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function POST(request: NextRequest) {
  let update: any;
  try {
    update = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const message = update.message;
  if (!message?.text || !message.chat?.id) {
    return NextResponse.json({ ok: true });
  }

  const chatId = String(message.chat.id);
  const text = message.text.trim();

  // First-time setup
  if (!ADMIN_CHAT_ID) {
    await sendMessage(chatId, `Hey there! I'm Lena, your PA at Nexorra. Your chat ID is \`${chatId}\` — add this as TELEGRAM_ADMIN_CHAT_ID in your env vars and I'll be all set.`);
    return NextResponse.json({ ok: true });
  }

  if (chatId !== ADMIN_CHAT_ID) {
    return NextResponse.json({ ok: true });
  }

  // Simple greetings
  const greetings = ['hi', 'hey', 'hello', 'yo', 'sup', '/start'];
  if (greetings.includes(text.toLowerCase())) {
    await sendMessage(chatId, pick(GREETINGS), { parse_mode: 'Markdown' });
    return NextResponse.json({ ok: true });
  }

  // Status check
  if (text.toLowerCase().includes('status') || text.toLowerCase().includes('what\'s running')) {
    const { data: running } = await supabaseAdmin
      .from('agent_runs')
      .select('agent_id, started_at')
      .eq('status', 'running');

    if (!running || running.length === 0) {
      await sendMessage(chatId, "All quiet right now — nobody's running.", { parse_mode: 'Markdown' });
    } else {
      const lines = running.map(r => {
        const def = AGENT_DEFINITIONS[r.agent_id];
        const name = def?.displayName || r.agent_id;
        const elapsed = Math.round((Date.now() - new Date(r.started_at).getTime()) / 1000);
        return `• *${name}* — running for ${elapsed}s`;
      });
      await sendMessage(chatId, `Currently active:\n${lines.join('\n')}`, { parse_mode: 'Markdown' });
    }
    return NextResponse.json({ ok: true });
  }

  // Classify and route
  const classification = classifyMessage(text);
  const dept = DEPARTMENTS[classification.department];
  const headDef = AGENT_DEFINITIONS[classification.headAgent];
  const responses = ROUTING_RESPONSES[classification.department] || ROUTING_RESPONSES.engineering;

  let reply = pick(responses);

  // Add urgency note for urgent tasks
  if (classification.urgency === 'urgent') {
    reply += " Marked as urgent — they'll prioritize this.";
  }

  await sendMessage(chatId, reply, { parse_mode: 'Markdown' });

  // Write to agent_messages
  const { error } = await supabaseAdmin
    .from('agent_messages')
    .insert({
      from_agent: 'lena',
      to_agent: classification.headAgent,
      message_type: 'task',
      payload: {
        source: 'telegram',
        chat_id: chatId,
        message_id: message.message_id,
        text: classification.taskSummary,
        urgency: classification.urgency,
        department: classification.department,
      },
      status: 'pending',
    });

  if (error) {
    console.error('[telegram] Failed to create agent_message:', error);
    await sendMessage(chatId, "Hmm, had trouble routing that. Mind trying again?");
  }

  return NextResponse.json({ ok: true });
}
