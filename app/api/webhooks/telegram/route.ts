import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendMessage } from '@/lib/telegram/client';
import { DEPARTMENTS, AGENT_DEFINITIONS, type DepartmentKey } from '@/lib/agents/definitions';
import { fastGenerate } from '@/lib/ai/fast-generate';

export const dynamic = 'force-dynamic';
export const maxDuration = 55;

const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;
const LENA_BRIDGE_URL = process.env.DAEMON_URL;
const CRON_SECRET = process.env.CRON_SECRET || '';
const SONNET_MODEL = 'claude-sonnet-4-5-20241022';

// ─── Gather full system context for Lena ────────────────────────────────────

async function gatherContext(): Promise<string> {
  const parts: string[] = [];

  // 1. Live daemon status (what's actually running RIGHT NOW)
  if (LENA_BRIDGE_URL) {
    try {
      const res = await fetch(`${LENA_BRIDGE_URL}/status`, {
        headers: { 'x-cron-secret': CRON_SECRET },
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const daemon = await res.json();
        if (daemon.agents && daemon.agents.length > 0) {
          parts.push('CURRENTLY RUNNING RIGHT NOW:');
          for (const a of daemon.agents) {
            const def = AGENT_DEFINITIONS[a.agentId];
            parts.push(`  ${def?.displayName || a.agentId}: running for ${a.uptime}s (pid ${a.pid})`);
          }
        } else {
          parts.push('CURRENTLY RUNNING: Nothing. All agents idle.');
        }
      }
    } catch {
      parts.push('DAEMON STATUS: Could not reach daemon (may be offline)');
    }
  }

  // 2. Recent agent runs (last 24h)
  const { data: runs, error: runsErr } = await supabaseAdmin
    .from('agent_runs')
    .select('agent_id, status, started_at, finished_at, duration_seconds, error_message, summary')
    .gte('started_at', new Date(Date.now() - 86400000).toISOString())
    .order('started_at', { ascending: false })
    .limit(15);

  if (runsErr) {
    parts.push('\nRECENT RUNS: [Error fetching agent runs]');
  } else if (!runs || runs.length === 0) {
    parts.push('\nRECENT RUNS: No agent activity in the last 24 hours.');
  } else {
    parts.push(`\nRECENT RUNS (last 24h, ${runs.length} total):`);
    for (const r of runs) {
      const def = AGENT_DEFINITIONS[r.agent_id];
      const name = def?.displayName || r.agent_id;
      const when = new Date(r.started_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      const dur = r.duration_seconds ? `took ${r.duration_seconds}s` : '';
      const err = r.error_message ? ` ERROR: ${r.error_message.slice(0, 80)}` : '';
      const sum = r.summary ? ` Result: ${r.summary.slice(0, 100)}` : '';
      parts.push(`  ${name}: ${r.status} at ${when} ${dur}${err}${sum}`);
    }
  }

  // 3. Pending/in-progress tasks
  const { data: pending, error: pendErr } = await supabaseAdmin
    .from('agent_messages')
    .select('from_agent, to_agent, message_type, payload, status, created_at')
    .in('status', ['pending', 'acknowledged'])
    .order('created_at', { ascending: false })
    .limit(10);

  if (pendErr) {
    parts.push('\nTASK QUEUE: [Error fetching tasks]');
  } else if (!pending || pending.length === 0) {
    parts.push('\nTASK QUEUE: Empty. No pending or in-progress tasks.');
  } else {
    parts.push(`\nTASK QUEUE (${pending.length} pending):`);
    for (const m of pending) {
      const toName = AGENT_DEFINITIONS[m.to_agent]?.displayName || m.to_agent;
      const taskText = (m.payload as any)?.text?.slice(0, 80) || 'no description';
      parts.push(`  → ${toName}: "${taskText}" (${m.status})`);
    }
  }

  // 4. Recently completed tasks (last 6h) with results
  const { data: completed } = await supabaseAdmin
    .from('agent_messages')
    .select('to_agent, payload, result, completed_at')
    .eq('status', 'completed')
    .eq('message_type', 'task')
    .gte('completed_at', new Date(Date.now() - 6 * 3600000).toISOString())
    .order('completed_at', { ascending: false })
    .limit(5);

  if (completed && completed.length > 0) {
    parts.push(`\nRECENTLY COMPLETED TASKS (last 6h):`);
    for (const c of completed) {
      const name = AGENT_DEFINITIONS[c.to_agent]?.displayName || c.to_agent;
      const task = (c.payload as any)?.text?.slice(0, 60) || '?';
      const res = (c.result as any)?.summary?.slice(0, 100) || (c.result as any)?.status || 'done';
      parts.push(`  ${name}: "${task}" → ${res}`);
    }
  }

  // 5. Lead counts
  const { count: totalLeads, error: leadsErr } = await supabaseAdmin
    .from('leads').select('id', { count: 'exact', head: true });
  const { count: recentLeads } = await supabaseAdmin
    .from('leads').select('id', { count: 'exact', head: true })
    .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString());
  const { count: todayLeads } = await supabaseAdmin
    .from('leads').select('id', { count: 'exact', head: true })
    .gte('created_at', new Date(Date.now() - 86400000).toISOString());

  // 6. Client counts
  const { count: clientCount } = await supabaseAdmin
    .from('accounts').select('id', { count: 'exact', head: true })
    .neq('id', 'da99b768-79dd-48f8-af86-abf95e61a69f');

  // 7. Cold email stats
  const { count: activeConvos } = await supabaseAdmin
    .from('lead_conversations').select('id', { count: 'exact', head: true })
    .eq('status', 'active');
  const { count: repliedConvos } = await supabaseAdmin
    .from('lead_conversations').select('id', { count: 'exact', head: true })
    .eq('status', 'replied');
  const { count: bookedConvos } = await supabaseAdmin
    .from('lead_conversations').select('id', { count: 'exact', head: true })
    .eq('status', 'booked');

  // 8. Instagram messages
  const { count: igToday } = await supabaseAdmin
    .from('instagram_unibox_messages').select('id', { count: 'exact', head: true })
    .gte('created_at', new Date(Date.now() - 86400000).toISOString());

  // 9. Contacts
  const { count: totalContacts } = await supabaseAdmin
    .from('contacts').select('id', { count: 'exact', head: true });

  if (leadsErr) {
    parts.push('\nNUMBERS: [Error fetching stats]');
  } else {
    parts.push(`\nNUMBERS (exact from database):`);
    parts.push(`  Leads: ${totalLeads ?? 0} total, ${recentLeads ?? 0} this week, ${todayLeads ?? 0} today`);
    parts.push(`  Clients: ${clientCount ?? 0} sub-accounts`);
    parts.push(`  Contacts: ${totalContacts ?? 0} total across all clients`);
    parts.push(`  Cold email: ${activeConvos ?? 0} active, ${repliedConvos ?? 0} replied, ${bookedConvos ?? 0} booked`);
    parts.push(`  Instagram: ${igToday ?? 0} messages today`);
  }

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

CRITICAL RULE: ONLY state facts from the CURRENT SYSTEM STATE section below. The numbers and statuses there are LIVE and ACCURATE. Report them EXACTLY as shown. If a section says "no data", "error", or "empty", say that honestly. NEVER invent numbers, agent statuses, or activity. If you don't have data on something, say "I don't have that info right now" or "let me check on that."

YOUR PERSONALITY:
You're sharp, casual, and direct. You text like a real person. Short messages. Contractions. Don't over-explain. If something's broken you say it straight. If things are going well you keep it brief.

NEVER DO:
- Em dashes. Use commas or periods.
- Bullet points or lists (unless Max asks for a breakdown).
- "Great question!", "I'd be happy to", "Absolutely!", "Certainly!".
- Starting with "Hey!" every time. Mix it up.
- "It's worth noting", "In terms of", "When it comes to".
- Markdown headers, bold, or code blocks.
- More than 1-2 emoji, and only when natural.
- Sign-offs or closings.
- MAKING UP DATA. This is the worst thing you can do. If you don't know, say so.

HOW YOU RESPOND:
- Status questions: Read the CURRENT SYSTEM STATE and report EXACTLY what it says. "Jeff ran at 10am, took 45s, completed." Not "Jeff's been busy today doing great work."
- Number questions: Give the EXACT number from the data. "We have 4,232 leads, 89 this week." Not "several thousand."
- Action requests (build, fix, deploy, create, change, update, remove, etc.): Respond with ONLY the JSON routing format below.
- Casual chat: Be human. Brief. But still don't make stuff up.

DEPARTMENTS & HEADS:
- Research & Intel: Jeff (lead gen, scraping)
- Marketing & Outreach: Stacey (cold email, Instagram, copy)
- Client Success: Ava (sub-accounts, onboarding)
- Service Delivery: Marcus (campaign optimization, reporting)
- Engineering: Barny (code, UI, API, bugs, deploy)
- Experiments: Hugo (A/B tests, research experiments)

ROUTING FORMAT (for action requests ONLY):
{"route":true,"department":"engineering","head":"barny","urgency":"normal","task":"description of what needs to be done"}

For everything else, respond as text. No JSON.`;

// ─── Generate via bridge or direct SDK ──────────────────────────────────────

async function generateLenaResponse(
  system: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> {
  // Try the Lena bridge first (fast, uses Sonnet via local OAuth)
  if (LENA_BRIDGE_URL) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(`${LENA_BRIDGE_URL}/lena`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system, messages, maxTokens: 500, model: SONNET_MODEL }),
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

  // Fallback: direct Anthropic SDK with Sonnet
  try {
    const result = await fastGenerate({
      system,
      messages,
      model: SONNET_MODEL,
      maxTokens: 500,
      temperature: 0.5,
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

  if (!ADMIN_CHAT_ID) {
    await sendMessage(chatId, `Chat ID: ${chatId}. Add it as TELEGRAM_ADMIN_CHAT_ID in .env.local.`);
    return NextResponse.json({ ok: true });
  }

  if (chatId !== ADMIN_CHAT_ID) {
    return NextResponse.json({ ok: true });
  }

  if (text === '/start') {
    await sendMessage(chatId, "I'm here. What do you need?");
    return NextResponse.json({ ok: true });
  }

  try {
    await saveMessage('user', 'lena', text);

    const [context, history] = await Promise.all([
      gatherContext(),
      getConversationHistory(8),
    ]);

    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...history.slice(0, -1),
      { role: 'user', content: text },
    ];

    const systemWithContext = `${LENA_SYSTEM}\n\n--- CURRENT SYSTEM STATE (live data, report exactly) ---\n${context}\n--- END STATE ---`;

    const response = await generateLenaResponse(systemWithContext, messages);

    // Check if Lena wants to route this to a department
    const routeMatch = response.match(/\{"route"\s*:\s*true[^}]+\}/);
    if (routeMatch) {
      try {
        const route = JSON.parse(routeMatch[0]);
        const headDef = AGENT_DEFINITIONS[route.head];
        const headName = headDef?.displayName || route.head;

        const naturalText = response.replace(routeMatch[0], '').trim();
        const ackText = naturalText || `Sending this to ${headName}.`;

        await sendMessage(chatId, ackText);
        await saveMessage('lena', 'user', ackText);

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
        await sendMessage(chatId, response);
        await saveMessage('lena', 'user', response);
      }
    } else {
      await sendMessage(chatId, response);
      await saveMessage('lena', 'user', response);
    }
  } catch (err: any) {
    console.error('[telegram] Lena error:', err.message);
    if (err.message?.includes('Both bridge and direct SDK failed') || err.message?.includes('fetch failed')) {
      await sendMessage(chatId, "Workforce is offline right now. I'll be back when the system's up.");
    } else {
      await sendMessage(chatId, "Something went wrong on my end. Try again in a sec.");
    }
  }

  return NextResponse.json({ ok: true });
}
