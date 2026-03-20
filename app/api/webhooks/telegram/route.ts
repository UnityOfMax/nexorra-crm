import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendMessage } from '@/lib/telegram/client';
import { DEPARTMENTS, AGENT_DEFINITIONS, type DepartmentKey } from '@/lib/agents/definitions';
import { fastGenerate } from '@/lib/ai/fast-generate';

export const dynamic = 'force-dynamic';
export const maxDuration = 55;

const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;
const DAEMON_URL = process.env.DAEMON_URL;
const CRON_SECRET = process.env.CRON_SECRET || '';
const SONNET_MODEL = 'claude-sonnet-4-5';

// ─── Build dynamic agent registry for Lena's context ────────────────────────

function buildAgentRegistry(): string {
  const lines: string[] = ['AGENT REGISTRY (all agents and their capabilities):'];
  const byDept: Record<string, Array<{ id: string; def: typeof AGENT_DEFINITIONS[string] }>> = {};

  for (const [id, def] of Object.entries(AGENT_DEFINITIONS)) {
    if (!byDept[def.department]) byDept[def.department] = [];
    byDept[def.department].push({ id, def });
  }

  for (const [dept, agents] of Object.entries(byDept)) {
    const deptInfo = DEPARTMENTS[dept as DepartmentKey];
    lines.push(`\n${deptInfo?.icon || ''} ${deptInfo?.label || dept}:`);
    for (const { id, def } of agents) {
      const role = def.role === 'head' ? ' [HEAD]' : '';
      const tools = def.mcps?.length ? ` tools:[${def.mcps.join(',')}]` : '';
      const sk = def.skills?.length ? ` skills:[${def.skills.join(',')}]` : '';
      lines.push(`  ${def.displayName} (${id})${role}${tools}${sk} — ${def.schedule || 'manual'}`);
    }
  }

  return lines.join('\n');
}

// ─── Read all agent primers for Lena's overview ─────────────────────────────

async function readAllPrimers(): Promise<string> {
  const parts: string[] = [];
  try {
    const { readFileSync, readdirSync, existsSync } = await import('fs');
    const { join } = await import('path');
    const primerDir = join(process.cwd(), 'agents', 'primers');
    if (!existsSync(primerDir)) return 'No agent primers found.';

    const files = readdirSync(primerDir).filter(f => f.endsWith('.md'));
    if (files.length === 0) return 'No agent primers found.';

    for (const file of files) {
      const content = readFileSync(join(primerDir, file), 'utf-8').trim();
      if (content) parts.push(content);
    }
  } catch {
    return 'Could not read agent primers.';
  }

  return parts.length > 0 ? parts.join('\n\n') : 'No agent primers with content.';
}

// ─── Gather full system context for Lena ────────────────────────────────────

async function gatherContext(): Promise<string> {
  const parts: string[] = [];

  // 1. Live daemon status
  if (DAEMON_URL) {
    try {
      const res = await fetch(`${DAEMON_URL}/status`, {
        headers: { 'x-cron-secret': CRON_SECRET },
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const daemon = await res.json();
        if (daemon.agents && daemon.agents.length > 0) {
          parts.push('CURRENTLY RUNNING RIGHT NOW:');
          for (const a of daemon.agents) {
            const def = AGENT_DEFINITIONS[a.agentId];
            parts.push(`  ${def?.displayName || a.agentId}: running for ${a.uptime}s`);
          }
        } else {
          parts.push('CURRENTLY RUNNING: Nothing. All agents idle.');
        }
      }
    } catch {
      parts.push('DAEMON: Could not reach daemon (may be offline)');
    }
  }

  // 2. Agent primers (Layer 2 memory — each agent's current state)
  const primers = await readAllPrimers();
  parts.push(`\nAGENT PRIMERS (each agent's self-reported state):\n${primers}`);

  // 3. Recent agent runs (last 24h)
  const { data: runs, error: runsErr } = await supabaseAdmin
    .from('agent_runs')
    .select('agent_id, status, started_at, duration_seconds, error_message, summary')
    .gte('started_at', new Date(Date.now() - 86400000).toISOString())
    .order('started_at', { ascending: false })
    .limit(10);

  if (runsErr) {
    parts.push('\nRECENT RUNS: [Error fetching]');
  } else if (!runs || runs.length === 0) {
    parts.push('\nRECENT RUNS: None in the last 24h.');
  } else {
    parts.push(`\nRECENT RUNS (last 24h):`);
    for (const r of runs) {
      const name = AGENT_DEFINITIONS[r.agent_id]?.displayName || r.agent_id;
      const when = new Date(r.started_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      const dur = r.duration_seconds ? `${r.duration_seconds}s` : 'running';
      const err = r.error_message ? ` ERROR: ${r.error_message.slice(0, 60)}` : '';
      const sum = r.summary ? ` → ${r.summary.slice(0, 80)}` : '';
      parts.push(`  ${name}: ${r.status} at ${when} (${dur})${err}${sum}`);
    }
  }

  // 4. Pending tasks
  const { data: pending } = await supabaseAdmin
    .from('agent_messages')
    .select('to_agent, payload, status, created_at')
    .in('status', ['pending', 'acknowledged'])
    .order('created_at', { ascending: false })
    .limit(5);

  if (pending && pending.length > 0) {
    parts.push(`\nTASK QUEUE (${pending.length} pending):`);
    for (const m of pending) {
      const name = AGENT_DEFINITIONS[m.to_agent]?.displayName || m.to_agent;
      parts.push(`  → ${name}: "${(m.payload as any)?.text?.slice(0, 60) || '?'}" (${m.status})`);
    }
  } else {
    parts.push('\nTASK QUEUE: Empty.');
  }

  // 5. Key numbers
  const { count: totalLeads } = await supabaseAdmin.from('leads').select('id', { count: 'exact', head: true });
  const { count: todayLeads } = await supabaseAdmin.from('leads').select('id', { count: 'exact', head: true })
    .gte('created_at', new Date(Date.now() - 86400000).toISOString());
  const { count: clientCount } = await supabaseAdmin.from('accounts').select('id', { count: 'exact', head: true })
    .neq('id', 'da99b768-79dd-48f8-af86-abf95e61a69f');
  const { count: activeConvos } = await supabaseAdmin.from('lead_conversations').select('id', { count: 'exact', head: true })
    .eq('status', 'active');

  parts.push(`\nNUMBERS: ${totalLeads ?? 0} leads total, ${todayLeads ?? 0} today, ${clientCount ?? 0} clients, ${activeConvos ?? 0} active cold email convos`);

  return parts.join('\n');
}

// ─── Conversation history ───────────────────────────────────────────────────

async function getHistory(limit = 8): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
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

async function saveMsg(from: string, to: string, text: string) {
  await supabaseAdmin.from('agent_messages').insert({
    from_agent: from, to_agent: to, message_type: 'chat',
    payload: { text, source: 'telegram', timestamp: Date.now() },
    status: 'completed', completed_at: new Date().toISOString(),
    result: from === 'lena' ? { text } : null,
  });
}

// ─── Lena's system prompt ───────────────────────────────────────────────────

const LENA_SYSTEM = `You are Lena, Max's personal assistant at Nexorra. You're texting him on Telegram.

Nexorra is an AI appointment-setting agency for real estate agents. You oversee 30 AI agents across 7 departments. You are the SINGLE POINT OF CONTACT. All information flows through you.

CRITICAL: ONLY state facts from the CURRENT SYSTEM STATE below. The data is LIVE and ACCURATE. NEVER invent numbers, statuses, or activity. If you don't know, say so.

PERSONALITY: Sharp, casual, direct. Text like a real person. Short messages. Contractions.

NEVER: Em dashes. Bullet points (unless asked). "Great question!". "I'd be happy to". "Absolutely!". Starting with "Hey!" every time. Markdown. Emoji spam. Making up data. Code blocks around JSON.

THREE MODES OF OPERATION:

1. ANSWER DIRECTLY — When you have the data in your context (primers, numbers, recent runs).
   Just respond naturally with the facts.

2. QUERY AN AGENT — When you need info you don't have. Ask the right agent based on the AGENT REGISTRY.
   Respond with ONLY this raw JSON (NO code blocks, NO markdown):
   {"query":true,"agent":"agent_id","question":"specific question"}
   IMPORTANT: "agent" must be the agent's lowercase ID (e.g. "jeff", "liam", "barny"), NOT the display name.
   The agent will fire up, use their tools (Supabase, filesystem, etc.), and report back. You relay the answer.
   Pick the agent by their capabilities (MCPs/skills). If unsure, ask the HEAD of the relevant department.

3. DELEGATE A TASK — When actual WORK needs doing (build, fix, deploy, create, change).
   Respond with ONLY this raw JSON (NO code blocks):
   {"route":true,"department":"engineering","head":"barny","urgency":"normal","task":"description"}
   IMPORTANT: "department" must be the lowercase key (engineering, research, marketing, client, delivery, experiments), NOT the display label.

4. ESCALATE — When no agent has the capability needed.
   Respond with raw JSON: {"escalate":true,"need":"what's needed","reason":"why nobody can do it"}

CRITICAL: When outputting JSON, output it as PLAIN TEXT on a single line. NO \`\`\`json code blocks. NO markdown formatting. Just the raw JSON object.

For everything else, just respond as text.`;

// ─── Generate via bridge ────────────────────────────────────────────────────

async function generate(
  system: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  maxTokens = 500
): Promise<string> {
  if (DAEMON_URL) {
    try {
      const res = await fetch(`${DAEMON_URL}/lena`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system, messages, maxTokens, model: SONNET_MODEL }),
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.text) return data.text;
      }
    } catch {}
  }

  const result = await fastGenerate({ system, messages, model: SONNET_MODEL, maxTokens, temperature: 0.5 });
  return result.text;
}

// ─── Query an agent synchronously ───────────────────────────────────────────

async function queryAgentViaDeamon(agentId: string, question: string): Promise<{ text: string; agentName: string; duration: number } | null> {
  if (!DAEMON_URL) return null;
  try {
    const res = await fetch(`${DAEMON_URL}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId, question, maxTurns: 5, timeout: 40000 }),
      signal: AbortSignal.timeout(45000),
    });
    if (res.ok) return await res.json();
  } catch {}
  return null;
}

// ─── Main webhook handler ───────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  let update: any;
  try { update = await request.json(); } catch { return NextResponse.json({ ok: true }); }

  const message = update.message;
  if (!message?.text || !message.chat?.id) return NextResponse.json({ ok: true });

  const chatId = String(message.chat.id);
  const text = message.text.trim();

  if (!ADMIN_CHAT_ID) {
    await sendMessage(chatId, `Chat ID: ${chatId}. Set TELEGRAM_ADMIN_CHAT_ID.`);
    return NextResponse.json({ ok: true });
  }
  if (chatId !== ADMIN_CHAT_ID) return NextResponse.json({ ok: true });
  if (text === '/start') { await sendMessage(chatId, "I'm here. What do you need?"); return NextResponse.json({ ok: true }); }

  try {
    await saveMsg('user', 'lena', text);

    const [context, history, registry] = await Promise.all([
      gatherContext(),
      getHistory(8),
      Promise.resolve(buildAgentRegistry()),
    ]);

    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...history.slice(0, -1),
      { role: 'user', content: text },
    ];

    const fullSystem = `${LENA_SYSTEM}\n\n${registry}\n\n--- CURRENT SYSTEM STATE (live, report exactly) ---\n${context}\n--- END ---`;

    const rawResponse = await generate(fullSystem, messages);
    // Strip markdown code blocks — Sonnet sometimes wraps JSON in ```json ... ```
    const response = rawResponse.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

    // ── Mode 2: QUERY an agent ──
    const queryMatch = response.match(/\{"query"\s*:\s*true[\s\S]*?\}/);  // [\s\S] to match across newlines
    if (queryMatch) {
      try {
        const q = JSON.parse(queryMatch[0]);
        const naturalBefore = response.replace(queryMatch[0], '').trim();
        if (naturalBefore) await sendMessage(chatId, naturalBefore);
        else await sendMessage(chatId, `Checking with ${AGENT_DEFINITIONS[q.agent]?.displayName || q.agent}...`);

        const result = await queryAgentViaDeamon(q.agent, q.question);

        if (result && result.text) {
          // Feed agent's answer back to Lena for natural formatting
          const followUp = await generate(
            `${LENA_SYSTEM}\n\nYou just asked ${result.agentName} a question and got this answer:\n\n${result.text}\n\nRelay this to Max naturally in your voice. Be concise. Don't add info that isn't in the answer.`,
            [{ role: 'user', content: text }],
            400
          );
          await sendMessage(chatId, followUp);
          await saveMsg('lena', 'user', followUp);
        } else {
          const fallback = `${AGENT_DEFINITIONS[q.agent]?.displayName || q.agent} didn't get back to me in time. I'll follow up when they do.`;
          await sendMessage(chatId, fallback);
          await saveMsg('lena', 'user', fallback);
          // Fall back to async
          await supabaseAdmin.from('agent_messages').insert({
            from_agent: 'lena', to_agent: q.agent, message_type: 'task',
            payload: { source: 'telegram', chat_id: chatId, message_id: message.message_id, text: q.question, urgency: 'normal' },
            status: 'pending',
          });
        }
        return NextResponse.json({ ok: true });
      } catch {
        await sendMessage(chatId, response);
        await saveMsg('lena', 'user', response);
        return NextResponse.json({ ok: true });
      }
    }

    // ── Mode 3: DELEGATE a task ──
    const routeMatch = response.match(/\{"route"\s*:\s*true[\s\S]*?\}/);
    if (routeMatch) {
      try {
        const route = JSON.parse(routeMatch[0]);
        const headName = AGENT_DEFINITIONS[route.head]?.displayName || route.head;
        const naturalText = response.replace(routeMatch[0], '').trim();
        await sendMessage(chatId, naturalText || `Sending this to ${headName}.`);
        await saveMsg('lena', 'user', naturalText || `Sending to ${headName}.`);

        await supabaseAdmin.from('agent_messages').insert({
          from_agent: 'lena', to_agent: route.head, message_type: 'task',
          payload: { source: 'telegram', chat_id: chatId, message_id: message.message_id, text: route.task || text, urgency: route.urgency || 'normal', department: route.department },
          status: 'pending',
        });
      } catch {
        await sendMessage(chatId, response);
        await saveMsg('lena', 'user', response);
      }
      return NextResponse.json({ ok: true });
    }

    // ── Mode 4: ESCALATE ──
    const escalateMatch = response.match(/\{"escalate"\s*:\s*true[\s\S]*?\}/);
    if (escalateMatch) {
      try {
        const esc = JSON.parse(escalateMatch[0]);
        const msg = `Nobody on the team can handle this right now. We'd need: ${esc.need}. Reason: ${esc.reason}. Want me to have Hugo look into adding this?`;
        await sendMessage(chatId, msg);
        await saveMsg('lena', 'user', msg);
      } catch {
        await sendMessage(chatId, response);
        await saveMsg('lena', 'user', response);
      }
      return NextResponse.json({ ok: true });
    }

    // ── Mode 1: DIRECT ANSWER ──
    await sendMessage(chatId, response);
    await saveMsg('lena', 'user', response);

  } catch (err: any) {
    console.error('[telegram] Lena error:', err.message);
    if (err.message?.includes('failed')) {
      await sendMessage(chatId, "Workforce is offline right now. I'll be back when the system's up.");
    } else {
      await sendMessage(chatId, "Something went wrong on my end. Try again in a sec.");
    }
  }

  return NextResponse.json({ ok: true });
}
