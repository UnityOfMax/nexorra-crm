#!/usr/bin/env npx tsx
/**
 * Setup ai_agent_configs for Charlie Kiers and Test accounts.
 *
 * Reads knowledge base content from Obsidian files, then upserts
 * configs into Supabase ai_agent_configs table.
 *
 * Phase 1 (always): Insert base config (enabled, mode, channels, agent_name, system_prompt, etc.)
 * Phase 2 (requires migration): Set knowledge_base column
 *
 * Run AFTER migration: migrations/add-account-knowledge-base.sql in Supabase dashboard
 *
 * Usage:
 *   set -a && source .env.local && set +a && npx tsx scripts/setup-account-configs.ts
 */

import 'dotenv/config';
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('dotenv').config({ path: '.env.local' });

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const OBSIDIAN_CLIENTS = path.join(process.env.HOME || '/home/max', 'Obsidian/Nexorra/Clients');

function readObsidianFile(name: string): string {
  const filePath = path.join(OBSIDIAN_CLIENTS, `${name}.md`);
  try {
    const raw = fs.readFileSync(filePath, 'utf-8').trim();
    // Strip frontmatter
    return raw.replace(/^---[\s\S]*?---\n?/, '').trim();
  } catch {
    console.warn(`[setup] Could not read Obsidian file for: ${name}`);
    return '';
  }
}

/**
 * Extract the system prompt from the knowledge base content.
 * Looks for the ## System Prompt section and returns its content.
 */
function extractSystemPrompt(knowledgeBase: string): string {
  const match = knowledgeBase.match(/## System Prompt\n([\s\S]*?)(?=\n##|$)/);
  return match ? match[1].trim() : '';
}

interface BaseConfig {
  account_id: string;
  enabled: boolean;
  mode: string;
  channels: Record<string, boolean>;
  agent_name: string;
  agent_represents: string;
  system_prompt: string;
  tone: string;
  max_tokens: number;
  business_context: string;
}

interface FullConfig extends BaseConfig {
  knowledge_base: string;
}

async function upsertBaseConfig(config: BaseConfig): Promise<boolean> {
  const { data: existing } = await supabase
    .from('ai_agent_configs')
    .select('id')
    .eq('account_id', config.account_id)
    .maybeSingle();

  const ts = new Date().toISOString();

  if (existing?.id) {
    const { error } = await supabase
      .from('ai_agent_configs')
      .update({ ...config, updated_at: ts })
      .eq('account_id', config.account_id);

    if (error) {
      console.error(`[setup] Update (base) failed for ${config.account_id}:`, error.message);
      return false;
    }
    console.log(`[setup] Updated base config for: ${config.account_id}`);
  } else {
    const { error } = await supabase
      .from('ai_agent_configs')
      .insert({ ...config, created_at: ts, updated_at: ts });

    if (error) {
      console.error(`[setup] Insert (base) failed for ${config.account_id}:`, error.message);
      return false;
    }
    console.log(`[setup] Inserted base config for: ${config.account_id}`);
  }
  return true;
}

async function setKnowledgeBase(accountId: string, knowledgeBase: string): Promise<void> {
  const { error } = await supabase
    .from('ai_agent_configs')
    .update({ knowledge_base: knowledgeBase, updated_at: new Date().toISOString() })
    .eq('account_id', accountId);

  if (error) {
    if (error.message.includes('knowledge_base')) {
      console.warn(`[setup] knowledge_base column not found — run migration first:`);
      console.warn(`[setup]   migrations/add-account-knowledge-base.sql`);
      console.warn(`[setup]   Then re-run this script to apply the knowledge base.`);
    } else {
      console.error(`[setup] knowledge_base update failed for ${accountId}:`, error.message);
    }
  } else {
    console.log(`[setup] knowledge_base set for: ${accountId}`);
  }
}

async function main() {
  console.log('[setup] Reading Obsidian knowledge base files...\n');

  // ── Charlie Kiers ───────────────────────────────────────────────────────────
  const charlieKb = readObsidianFile('Charlie Kiers');
  const charlieSystemPrompt = extractSystemPrompt(charlieKb);

  if (!charlieKb) {
    console.warn('[setup] Charlie Kiers knowledge base is empty — skipping');
  } else {
    const baseOk = await upsertBaseConfig({
      account_id: '1b025168-ce2c-4baa-9aca-d77fc1d01f0e',
      enabled: true,
      mode: 'auto',
      channels: { sms: true, email: true },
      agent_name: 'Charlie',
      agent_represents: 'Charlie Kiers',
      system_prompt: charlieSystemPrompt || charlieKb,
      tone: 'friendly',
      max_tokens: 200,
      business_context: 'Charlie Kiers is a licensed real estate agent at Keller Williams in Vancouver, BC.',
    });

    if (baseOk) {
      await setKnowledgeBase('1b025168-ce2c-4baa-9aca-d77fc1d01f0e', charlieKb);
    }
    console.log('[setup] Charlie Kiers — complete\n');
  }

  // ── Test account (Omar) ─────────────────────────────────────────────────────
  const testKb = readObsidianFile('Test');
  const omarSystemPrompt = extractSystemPrompt(testKb);

  if (!testKb) {
    console.warn('[setup] Test knowledge base is empty — skipping');
  } else {
    const baseOk = await upsertBaseConfig({
      account_id: '6924dcc7-58ce-479b-a9d5-f88ef4ca3ebe',
      enabled: true,
      mode: 'auto',
      channels: { sms: true, email: true },
      agent_name: 'Omar',
      agent_represents: 'Omar',
      system_prompt: omarSystemPrompt || testKb,
      tone: 'casual',
      max_tokens: 200,
      business_context: 'Test environment for QA testing the reply agent via Telegram.',
    });

    if (baseOk) {
      await setKnowledgeBase('6924dcc7-58ce-479b-a9d5-f88ef4ca3ebe', testKb);
    }
    console.log('[setup] Test (Omar) — complete\n');
  }

  console.log('[setup] Done. Verify in Supabase:');
  console.log('  Table: ai_agent_configs');
  console.log('  Accounts: Charlie Kiers (1b025168) + Test (6924dcc7)');
  console.log('\n  If knowledge_base is missing, run migration first:');
  console.log('  migrations/add-account-knowledge-base.sql');
}

main().catch(err => {
  console.error('[setup] Fatal error:', err);
  process.exit(1);
});
