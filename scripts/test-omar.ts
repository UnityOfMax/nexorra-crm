#!/usr/bin/env npx tsx
/**
 * Omar Reply Agent — Interactive Telegram Test
 *
 * Simulates a fake lead texting a sub-account. You talk in Telegram,
 * Omar replies. Full pipeline: DB storage, memory, Ollama, isolation.
 *
 * Usage:
 *   npx tsx scripts/test-omar.ts                  # start/continue test session
 *   npx tsx scripts/test-omar.ts --reset          # wipe test contact + history
 *   npx tsx scripts/test-omar.ts --account <slug> # target a specific sub-account
 *
 * Then just send messages to the Telegram bot — Omar replies inline.
 * Session persists until --reset so you can build up a real conversation.
 */

import 'dotenv/config';
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('dotenv').config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { generateAIResponse } from '@/lib/ai/generate-and-send';
import { warmModel } from '@/lib/ai/ollama-client';

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BOT_TOKEN     = process.env.TELEGRAM_BOT_TOKEN!;
const CHAT_ID       = process.env.TELEGRAM_ADMIN_CHAT_ID!;

if (!SUPABASE_URL || !SERVICE_KEY || !BOT_TOKEN || !CHAT_ID) {
  console.error('Missing env vars — check .env.local');
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Telegram helpers ───────────────────────────────────────────────────────

async function tgSend(text: string, parseMode?: 'Markdown'): Promise<number> {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text,
      parse_mode: parseMode,
      disable_web_page_preview: true,
    }),
  });
  const data = await res.json() as any;
  return data.result?.message_id ?? 0;
}

async function tgEdit(messageId: number, text: string): Promise<void> {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, message_id: messageId, text }),
  });
}

async function getUpdates(offset: number): Promise<any[]> {
  const res = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${offset}&timeout=20&allowed_updates=["message"]`
  );
  const data = await res.json() as any;
  return data.result || [];
}

// ── Test session persistence ───────────────────────────────────────────────

interface Session {
  accountId: string;
  accountName: string;
  contactId: string;
  lastUpdateId: number;
}

const SESSION_KEY = 'omar-test-session';

async function loadSession(): Promise<Session | null> {
  const { data } = await db
    .from('ai_agent_configs')
    .select('account_id')
    .limit(1)
    .maybeSingle();
  // Session stored in a temp table row — just use a local file for simplicity
  try {
    const fs = await import('fs');
    const raw = fs.readFileSync('/tmp/omar-test-session.json', 'utf-8');
    return JSON.parse(raw);
  } catch { return null; }
}

async function saveSession(s: Session): Promise<void> {
  const fs = await import('fs');
  fs.writeFileSync('/tmp/omar-test-session.json', JSON.stringify(s, null, 2));
}

async function clearSession(): Promise<void> {
  try {
    const fs = await import('fs');
    fs.unlinkSync('/tmp/omar-test-session.json');
  } catch {}
}

// ── Account picker ─────────────────────────────────────────────────────────

async function pickAccount(slugHint?: string): Promise<{ id: string; name: string; slug: string } | null> {
  // Get AI-enabled account IDs first
  const { data: configs } = await db
    .from('ai_agent_configs')
    .select('account_id')
    .eq('enabled', true);

  const enabledIds = (configs || []).map((c: any) => c.account_id);

  // Get matching accounts — prefer AI-enabled ones
  const { data: allAccounts } = await db
    .from('accounts')
    .select('id, name, slug');

  const accounts = allAccounts || [];

  // Filter by slug hint if provided
  const pool = slugHint
    ? accounts.filter((a: any) =>
        a.slug?.includes(slugHint) || a.name?.toLowerCase().includes(slugHint.toLowerCase())
      )
    : accounts;

  // Sort: AI-enabled first
  pool.sort((a: any, b: any) => {
    const aOn = enabledIds.includes(a.id) ? 0 : 1;
    const bOn = enabledIds.includes(b.id) ? 0 : 1;
    return aOn - bOn;
  });

  return pool[0] ?? null;
}

async function ensureAiConfig(accountId: string, accountName: string): Promise<{ agentName: string; prompt: string }> {
  const { data } = await db
    .from('ai_agent_configs')
    .select('account_id, enabled, agent_name, system_prompt')
    .eq('account_id', accountId)
    .maybeSingle();

  if (data?.enabled) {
    return { agentName: data.agent_name || 'Omar', prompt: (data.system_prompt || '').slice(0, 80) + '...' };
  }

  if (data && !data.enabled) {
    await db.from('ai_agent_configs').update({ enabled: true }).eq('account_id', accountId);
  } else {
    // No config — create a clean neutral test one
    await db.from('ai_agent_configs').insert({
      account_id: accountId,
      enabled: true,
      agent_name: 'Omar',
      agent_represents: accountName,
      system_prompt: `You are Omar, an AI assistant for ${accountName}. You reply to inbound leads via SMS. Be warm, direct, and concise. Goal: qualify the lead and book a call. Never invent names, appointments, or details you weren't given.`,
      tone: 'friendly',
      max_tokens: 300,
      channels: { sms: true, email: true },
    });
  }

  return { agentName: 'Omar', prompt: `Fresh config for ${accountName}` };
}

// ── Test contact ───────────────────────────────────────────────────────────

const TEST_PHONE = '+15550000001';
const TEST_NAME_FIRST = 'Test';
const TEST_NAME_LAST = 'Lead';

async function ensureTestContact(accountId: string): Promise<string> {
  // Reuse existing test contact for this account
  const { data: existing } = await db
    .from('contacts')
    .select('id')
    .eq('account_id', accountId)
    .eq('phone', TEST_PHONE)
    .maybeSingle();

  if (existing) return existing.id;

  // Create fresh test contact
  const { data: created } = await db
    .from('contacts')
    .insert({
      account_id: accountId,
      first_name: TEST_NAME_FIRST,
      last_name: TEST_NAME_LAST,
      phone: TEST_PHONE,
      status: 'lead',
      ai_enabled: true,
      source: 'test',
    })
    .select('id')
    .single();

  return created!.id;
}

async function resetTestContact(accountId: string, contactId: string): Promise<void> {
  // Delete messages, summaries, then the contact
  await db.from('messages').delete().eq('account_id', accountId).eq('contact_id', contactId);
  await db.from('ai_conversation_summaries').delete()
    .eq('account_id', accountId).eq('contact_id', contactId);
  await db.from('contacts').delete().eq('id', contactId);
}

// ── Save message to DB ─────────────────────────────────────────────────────

async function saveMessage(
  accountId: string,
  contactId: string,
  direction: 'inbound' | 'outbound',
  content: string
): Promise<void> {
  await db.from('messages').insert({
    account_id: accountId,
    contact_id: contactId,
    direction,
    type: 'sms',
    content,
    from_address: direction === 'inbound' ? TEST_PHONE : 'omar-ai',
    to_address:   direction === 'inbound' ? 'omar-ai' : TEST_PHONE,
    status: direction === 'inbound' ? 'received' : 'sent',
  });
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const isReset = args.includes('--reset');
  const accountSlug = args.find((a, i) => args[i - 1] === '--account');

  // Handle reset
  if (isReset) {
    const session = await loadSession();
    if (session) {
      await resetTestContact(session.accountId, session.contactId);
      await clearSession();
      await tgSend('🗑 Test session wiped. Test Lead + all messages deleted. Start fresh with a new message.');
    } else {
      await tgSend('No active session to reset.');
    }
    return;
  }

  // Load or create session
  let session = await loadSession();

  if (!session) {
    const account = await pickAccount(accountSlug);
    if (!account) {
      await tgSend('❌ No sub-accounts found. Add a sub-account first or pass --account <slug>.');
      return;
    }
    const { agentName, prompt: promptSnippet } = await ensureAiConfig(account.id, account.name);
    const contactId = await ensureTestContact(account.id);
    session = {
      accountId: account.id,
      accountName: account.name,
      contactId,
      lastUpdateId: 0,
    };
    await saveSession(session);

    const model = process.env.OLLAMA_REPLY_MODEL || 'llama3.2:1b';
    await tgSend(
      `🤖 Omar Test Session\n\n` +
      `Account: ${account.name}\n` +
      `Agent persona: ${agentName}\n` +
      `Prompt: "${promptSnippet}"\n` +
      `Model: ${model}\n\n` +
      `Send messages as a fake lead. Omar replies.\n` +
      `/reset — clear history  /history — last 5 messages`
    );
  } else {
    // Validate contact still exists — reset if stale
    const { data: check } = await db
      .from('contacts').select('id').eq('id', session.contactId).maybeSingle();
    if (!check) {
      console.log('Stale contact in session, recreating...');
      await ensureAiConfig(session.accountId, session.accountName);
      session.contactId = await ensureTestContact(session.accountId);
      await saveSession(session);
    }
    await tgSend(
      `🔁 Resuming session — ${session.accountName}\nSend a message to continue or /reset to start fresh.`
    );
  }

  // Warm model so first reply isn't slow
  process.stdout.write('Warming model... ');
  await warmModel();
  console.log('ready.');

  // Poll for messages
  console.log(`Polling Telegram for messages (account: ${session.accountName}, contact: ${session.contactId})...`);
  console.log('Press Ctrl+C to stop.\n');

  let offset = session.lastUpdateId + 1;

  while (true) {
    const updates = await getUpdates(offset);

    for (const update of updates) {
      offset = update.update_id + 1;
      session.lastUpdateId = update.update_id;
      await saveSession(session);

      const msg = update.message;
      if (!msg || String(msg.chat.id) !== String(CHAT_ID)) continue;

      const text: string = msg.text || '';
      if (!text) continue;

      // Built-in commands
      if (text === '/reset' || text === '/start') {
        await resetTestContact(session.accountId, session.contactId);
        await clearSession();
        session.contactId = await ensureTestContact(session.accountId);
        await saveSession(session);
        await tgSend('🗑 History cleared. Test Lead is fresh. Keep going.');
        continue;
      }

      if (text === '/history') {
        const { data: msgs } = await db
          .from('messages')
          .select('direction, content, created_at')
          .eq('account_id', session.accountId)
          .eq('contact_id', session.contactId)
          .order('created_at', { ascending: false })
          .limit(6);
        const lines = (msgs || []).reverse().map(m =>
          `${m.direction === 'inbound' ? '👤' : '🤖'} ${m.content}`
        );
        await tgSend(lines.length ? lines.join('\n\n') : 'No messages yet.');
        continue;
      }

      // Treat as inbound SMS from test lead
      console.log(`← Lead: ${text}`);

      // Save inbound message
      await saveMessage(session.accountId, session.contactId, 'inbound', text);

      // Show "thinking" indicator
      const thinkingId = await tgSend('⏳ Omar is thinking...');
      const start = Date.now();

      try {
        const result = await generateAIResponse({
          accountId: session.accountId,
          contactId: session.contactId,
          channel: 'sms',
        });

        const elapsed = ((Date.now() - start) / 1000).toFixed(1);
        const reply = result.response;

        // Save outbound message
        await saveMessage(session.accountId, session.contactId, 'outbound', reply);

        const replyText = `🤖 Omar (${result.model} · ${elapsed}s)\n\n${reply}`;
        await tgEdit(thinkingId, replyText).catch(() => tgSend(replyText));
        console.log(`→ Omar (${elapsed}s): ${reply}\n`);
      } catch (err: any) {
        const errText = `❌ Error: ${err.message}`;
        console.error('Reply error:', err.message);
        await tgEdit(thinkingId, errText).catch(() => tgSend(errText));
      }
    }

    // Small pause before next poll
    await new Promise(r => setTimeout(r, 1000));
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
