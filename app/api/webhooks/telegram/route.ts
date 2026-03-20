import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendMessage } from '@/lib/telegram/client';
import { DEPARTMENTS, AGENT_DEFINITIONS, type DepartmentKey } from '@/lib/agents/definitions';
import { fastGenerate } from '@/lib/ai/fast-generate';

export const dynamic = 'force-dynamic';
export const maxDuration = 55;

const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;
const LENA_BRIDGE_URL = process.env.LENA_BRIDGE_URL || process.env.DAEMON_URL;

// ─── Gather full system context for Lena ────────────────────────────────────

async function gatherContext(): Promise<string> {
  const parts: string[] = [];

  // Recent agent runs (last 24h)
  const { data: runs } = await supabaseAdmin
    .from('agent_runs')
    .select('agent_id, status, started_at, finished_at, duration_seconds, error_message, cost_usd, summary')
    .gte('started_at', new Date(Date.now() - 86400000).toISOString())
    .order('started_at', { ascending: false })
    .limit(15);

  if (runs && runs.length > 0) {
    parts.push('Recent agent activity (last 24h):');
    for (const r of runs) {
      const def = AGENT_DEFINITIONS[r.agent_id];
      const name = def?.displayName || r.agent_id;
      const dur = r.duration_seconds ? `${r.duration_seconds}s` : 'running';
      const err = r.error_message ? ` ERROR: ${r.error_message.slice(0, 80)}` : '';
      const sum = r.summary ? ` — ${r.summary.slice(0, 100)}` : '';
      parts.push(`  ${name}: ${r.status} (${dur})${err}${sum}`);
    }
  }

  // Pending tasks
  const { data: pending } = await supabaseAdmin
    .from('agent_messages')
    .select('from_agent, to_agent, message_type, payload, status, created_at')
    .in('status', ['pending', 'acknowledged'])
    .order('created_at', { ascending: false })
    .limit(10);

  if (pending && pending.length > 0) {
    parts.push(`\nPending tasks (${pending.length}):`);
    for (const m of pending) {
      const toName = AGENT_DEFINITIONS[m.to_agent]?.displayName || m.to_agent;
      const taskText = (m.payload as any)?.text?.slice(0, 80) || 'no description';
      parts.push(`  → ${toName}: "${taskText}" (${m.status})`);
    }
  }

  // Lead counts
  const { count: totalLeads } = await supabaseAdmin
    .from('leads').select('id', { count: 'exact', head: true });
  const { count: recentLeads } = await supabaseAdmin
    .from('leads').select('id', { count: 'exact', head: true })
    .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString());

  // Client counts
  const { count: clientCount } = await supabaseAdmin
    .from('accounts').select('id', { count: 'exact', head: true })
    .neq('id', 'da99b768-79dd-48f8-af86-abf95e61a69f');

  // Cold email stats
  const { count: activeConvos } = await supabaseAdmin
    .from('lead_conversations').select('id', { count: 'exact', head: true })
    .eq('status', 'active');

  // Instagram messages
  const { count: igMessages } = await supabaseAdmin
    .from('instagram_unibox_messages').select('id', { count: 'exact', head: true })
    .gte('created_at', new Date(Date.now() - 86400000).toISOString());

  parts.push(`\nStats: ${totalLeads || 0} total leads (${recentLeads || 0} this week), ${clientCount || 0} client accounts, ${activeConvos || 0} active cold email convos, ${igMessages || 0} IG messages today`);

  return parts.join('\n');
}

// ─── Get conversation history with Max ──────────────────────────────────────

async function getConversationHistory(limit = 10): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
  const { data } = await supabaseAdmin
    .from('agent_messages')
    .select('from_agent, payload, result, created_at')
    .or('and(from_agent.eq.user,to_agent.eq.lena),and(from_agent.eq.lena,to_agent.eq.user)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!data || data.length === 0) return [];

  return data.reverse().map(m => ({
    role: (m.from_agent === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
    content: m.from_agent === 'user'
      ? (m.payload as any)?.text || ''
      : (m.result as any)?.text || (m.payload as any)?.text || '',
  })).filter(m => m.content);
}

// ─── Save message to conversation history ───────────────────────────────────

async function saveMessage(from: string, to: string, text: string) {
  await supabaseAdmin.from('agent_messages').insert({
    from_agent: from,
    to_agent: to,
    message_type: 'chat',
    payload: { text, source: 'telegram', timestamp: Date.now() },
    status: 'completed',
    completed_at: new Date().toISOString(),
    result: from === 'lena' ? { text } : null,
  });
}

// ─── Lena's brain ───────────────────────────────────────────────────────────

const LENA_SYSTEM = `You are Lena, Max's personal assistant at Nexorra. You're texting him on Telegram.

Nexorra is an AI appointment-setting agency for real estate agents in the US and Canada. You run the CRM (Next.js + Supabase) and oversee 30 AI agents across 7 departments.

YOUR PERSONALITY:
You're sharp, casual, and direct. You text like a real person, not a bot. Short messages. You use contractions. You don't over-explain. If something's broken you say it straight. If things are going well you keep it brief. You have a dry sense of humor when it fits.

NEVER DO THESE (AI writing tells):
- No em dashes (—). Use commas, periods, or just break the sentence.
- No bullet points or numbered lists unless Max specifically asks for a breakdown.
- No "Great question!", "I'd be happy to", "Let me", "Absolutely!", "Certainly!".
- No starting every message with "Hey!" or a greeting. Mix it up.
- No "It's worth noting that", "In terms of", "When it comes to".
- No three-part lists ending in "and [grand conclusion]".
- No markdown headers, bold, or code blocks in Telegram.
- No emoji spam. One or two max, only when natural.
- Don't sign off or use closings.

HOW YOU RESPOND:
- Questions about status, numbers, agents, the system: Answer directly from the data provided to you.
- Casual chat: Be human. Brief.
- Requests to do something (build, fix, deploy, create, etc.): You'll classify these and route them. Respond with JSON (see below).
- If you're unsure whether something needs action or is just a question: answer the question. Only route if it clearly needs someone to DO work.

DEPARTMENTS & HEADS:
- Research & Intel: Jeff (lead gen, scraping, market research)
- Marketing & Outreach: Stacey (cold email, Instagram DMs, copy, ads)
- Client Success: Ava (sub-accounts, onboarding, client-specific work)
- Service Delivery: Marcus (campaign optimization, meta ads, reporting)
- Engineering: Barny (code, UI, API, bugs, deployments, PWA)
- Experiments: Hugo (A/B tests, new strategies, research experiments)

ROUTING FORMAT:
When a message needs ACTION (someone has to build, fix, change, create something), respond with ONLY this JSON on its own line:
{"route":true,"department":"engineering","head":"barny","urgency":"normal","task":"the task description"}

For everything else, just respond naturally as text. No JSON.`;

// ─── Generate via bridge or direct SDK ──────────────────────────────────────

async function generateLenaResponse(
  system: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> {
  // Try the Lena bridge first (fast, local OAuth, no API key needed)
  if (LENA_BRIDGE_URL) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`${LENA_BRIDGE_URL}/lena`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system, messages, maxTokens: 400 }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        if (data.text) return data.text;
      }
    } catch {
      // Bridge offline, fall through to direct SDK
    }
  }

  // Fallback: direct Anthropic SDK (works with API key on Vercel or OAuth locally)
  try {
    const result = await fastGenerate({
      system,
      messages,
      maxTokens: 400,
      temperature: 0.7,
    });
    return result.text;
  } catch {
    throw new Error('Both bridge and direct SDK failed');
  }
}

// ─── Main webhook handler ───────────────────────────────────────────────────

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
    await sendMessage(chatId, `Chat ID: ${chatId}. Add it as TELEGRAM_ADMIN_CHAT_ID in .env.local.`);
    return NextResponse.json({ ok: true });
  }

  if (chatId !== ADMIN_CHAT_ID) {
    return NextResponse.json({ ok: true });
  }

  // Handle /start
  if (text === '/start') {
    await sendMessage(chatId, "I'm here. What do you need?");
    return NextResponse.json({ ok: true });
  }

  try {
    // Save user message to history
    await saveMessage('user', 'lena', text);

    // Gather context + conversation history in parallel
    const [context, history] = await Promise.all([
      gatherContext(),
      getConversationHistory(8),
    ]);

    // Build messages: history + current message
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...history.slice(0, -1), // exclude the last one since we'll add current
      { role: 'user', content: text },
    ];

    const systemWithContext = `${LENA_SYSTEM}\n\n--- CURRENT SYSTEM STATE ---\n${context}`;

    const response = await generateLenaResponse(systemWithContext, messages);

    // Check if Lena wants to route this to a department
    const routeMatch = response.match(/\{"route"\s*:\s*true[^}]+\}/);
    if (routeMatch) {
      try {
        const route = JSON.parse(routeMatch[0]);
        const dept = DEPARTMENTS[route.department as DepartmentKey];
        const headDef = AGENT_DEFINITIONS[route.head];
        const headName = headDef?.displayName || route.head;

        // Get the natural language part (if Lena wrote text before/after the JSON)
        const naturalText = response.replace(routeMatch[0], '').trim();
        const ackText = naturalText || `Sending this to ${headName}.`;

        await sendMessage(chatId, ackText);
        await saveMessage('lena', 'user', ackText);

        // Create the task
        await supabaseAdmin.from('agent_messages').insert({
          from_agent: 'lena',
          to_agent: route.head,
          message_type: 'task',
          payload: {
            source: 'telegram',
            chat_id: chatId,
            message_id: message.message_id,
            text: route.task || text,
            urgency: route.urgency || 'normal',
            department: route.department,
          },
          status: 'pending',
        });
      } catch {
        // JSON parse failed, treat as normal text response
        await sendMessage(chatId, response);
        await saveMessage('lena', 'user', response);
      }
    } else {
      // Normal conversational response
      await sendMessage(chatId, response);
      await saveMessage('lena', 'user', response);
    }
  } catch (err: any) {
    console.error('[telegram] Lena error:', err.message);

    // Check if it's an offline/unreachable error
    if (err.message?.includes('Both bridge and direct SDK failed') || err.message?.includes('fetch failed')) {
      await sendMessage(chatId, "Workforce is offline right now. I'll be back when the system's up.");
    } else {
      await sendMessage(chatId, "Something went wrong on my end. Try again in a sec.");
    }
  }

  return NextResponse.json({ ok: true });
}
