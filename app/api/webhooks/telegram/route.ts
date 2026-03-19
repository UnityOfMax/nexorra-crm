import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendMessage } from '@/lib/telegram/client';
import { classifyMessage } from '@/lib/telegram/classifier';
import { DEPARTMENTS, AGENT_DEFINITIONS, type DepartmentKey } from '@/lib/agents/definitions';

export const dynamic = 'force-dynamic';

const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;

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
  const text = message.text;

  // If no ADMIN_CHAT_ID set, accept the first message and store the ID
  if (!ADMIN_CHAT_ID) {
    console.log(`[telegram] First message from chat_id: ${chatId} — set TELEGRAM_ADMIN_CHAT_ID to this value`);
    await sendMessage(chatId, `Hi! I'm *Lena*, your PA at Nexorra. Your chat ID is \`${chatId}\` — please add this as TELEGRAM_ADMIN_CHAT_ID in your env vars, then I'll be fully operational.`);
    return NextResponse.json({ ok: true });
  }

  // Only respond to admin
  if (chatId !== ADMIN_CHAT_ID) {
    return NextResponse.json({ ok: true });
  }

  // Handle /start command
  if (text === '/start') {
    await sendMessage(chatId, `Hey Max! I'm *Lena*, your PA. Send me any task and I'll route it to the right department.\n\nDepartments:\n${
      Object.entries(DEPARTMENTS).map(([, d]) => `${d.icon} ${d.label}`).join('\n')
    }`);
    return NextResponse.json({ ok: true });
  }

  // Classify intent
  const classification = classifyMessage(text);
  const dept = DEPARTMENTS[classification.department];
  const headDef = AGENT_DEFINITIONS[classification.headAgent];

  // Acknowledge immediately
  await sendMessage(chatId, `${dept.icon} Routing to *${headDef?.displayName || classification.headAgent}* in ${dept.label}...\n\n_Priority: ${classification.urgency}_`);

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
    await sendMessage(chatId, `Failed to route task. Error: ${error.message}`);
  }

  return NextResponse.json({ ok: true });
}
