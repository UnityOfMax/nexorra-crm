import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendMessage } from '@/lib/telegram/client';
import { classifyMessage } from '@/lib/telegram/classifier';
import { DEPARTMENTS, AGENT_DEFINITIONS, type DepartmentKey } from '@/lib/agents/definitions';
import { generateText } from '@/lib/ai/daemon-client';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;

// Words that signal "do something" vs "tell me something"
const ACTION_SIGNALS = [
  'build', 'create', 'make', 'add', 'fix', 'deploy', 'change', 'update', 'remove',
  'delete', 'set up', 'configure', 'install', 'run', 'launch', 'start', 'stop',
  'scrape', 'upload', 'send', 'write', 'redesign', 'implement', 'refactor',
  'onboard', 'optimize', 'test', 'review', 'push', 'ship',
];

function isActionRequest(text: string): boolean {
  const lower = text.toLowerCase();
  return ACTION_SIGNALS.some(s => lower.includes(s));
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
    await sendMessage(chatId, `Hey! I'm Lena. Your chat ID is \`${chatId}\`. Add it as TELEGRAM_ADMIN_CHAT_ID and I'm good to go.`);
    return NextResponse.json({ ok: true });
  }

  if (chatId !== ADMIN_CHAT_ID) {
    return NextResponse.json({ ok: true });
  }

  // ── If it's an ACTION request, classify and delegate to a department ──
  if (isActionRequest(text)) {
    const classification = classifyMessage(text);
    const dept = DEPARTMENTS[classification.department];
    const headDef = AGENT_DEFINITIONS[classification.headAgent];

    // Lena acknowledges naturally
    const acks = [
      `On it. Sending this to ${headDef?.displayName || 'the team'}.`,
      `Got it, passing to ${headDef?.displayName || 'the right people'}.`,
      `Sure thing. ${headDef?.displayName || 'The team'}'s on it.`,
      `Routing to ${dept.label}. I'll let you know when it's done.`,
    ];
    const ack = acks[Math.floor(Math.random() * acks.length)];
    if (classification.urgency === 'urgent') {
      await sendMessage(chatId, `${ack} Marked urgent.`);
    } else {
      await sendMessage(chatId, ack);
    }

    await supabaseAdmin.from('agent_messages').insert({
      from_agent: 'lena',
      to_agent: classification.headAgent,
      message_type: 'task',
      payload: {
        source: 'telegram', chat_id: chatId,
        message_id: message.message_id,
        text: classification.taskSummary,
        urgency: classification.urgency,
        department: classification.department,
      },
      status: 'pending',
    });

    return NextResponse.json({ ok: true });
  }

  // ── Otherwise, Lena answers directly using Claude ──
  // She's the PA. She answers questions, gives status, has conversations.
  try {
    const systemPrompt = `You are Lena, Max's personal assistant at Nexorra (an AI appointment-setting agency for real estate agents).

You're texting Max on Telegram. Keep it casual, short, and helpful. Like a real PA.

Rules:
- Short messages. 1-3 sentences max unless he asks for detail.
- No bullet points, no markdown headers, no em dashes.
- Don't start with "Hey!" every time. Vary your openers.
- No corporate speak. No "I'd be happy to". No "Great question!".
- If you don't know something, say so. Don't make stuff up.
- You know the Nexorra CRM inside and out (Next.js, Supabase, 30 AI agents across 7 departments).
- You can check agent status, recent runs, and project info.

Departments: Research (Jeff), Marketing (Stacey), Client Success (Ava), Service Delivery (Marcus), Engineering (Barny), Experiments (Hugo).`;

    // Get recent context
    const { data: recentRuns } = await supabaseAdmin
      .from('agent_runs')
      .select('agent_id, status, started_at, duration_seconds')
      .order('started_at', { ascending: false })
      .limit(5);

    const { data: pendingMsgs } = await supabaseAdmin
      .from('agent_messages')
      .select('to_agent, status, created_at')
      .in('status', ['pending', 'acknowledged'])
      .limit(5);

    let context = '';
    if (recentRuns && recentRuns.length > 0) {
      context += '\nRecent agent activity:\n';
      for (const r of recentRuns) {
        const def = AGENT_DEFINITIONS[r.agent_id];
        context += `- ${def?.displayName || r.agent_id}: ${r.status} (${r.duration_seconds || '?'}s ago)\n`;
      }
    }
    if (pendingMsgs && pendingMsgs.length > 0) {
      context += `\n${pendingMsgs.length} pending task(s) in the queue.\n`;
    }

    const result = await generateText({
      model: 'claude-haiku-4-5-20251001',
      system: systemPrompt + context,
      messages: [{ role: 'user', content: text }],
      maxTokens: 300,
      temperature: 0.8,
    });

    await sendMessage(chatId, result.text);
  } catch (err: any) {
    console.error('[telegram] Lena generation error:', err.message);
    // Fallback if generation fails
    await sendMessage(chatId, "Sorry, brain glitch. Try again?");
  }

  return NextResponse.json({ ok: true });
}
