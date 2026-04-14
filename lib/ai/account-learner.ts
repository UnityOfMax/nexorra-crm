/**
 * Account Knowledge Base Learner
 *
 * After each booking or meaningful conversation, extracts what worked
 * and appends it to the account's knowledge_base in ai_agent_configs.
 *
 * Also syncs to ~/Obsidian/Nexorra/Clients/{AccountName}.md for human review.
 */

import fs from 'fs';
import path from 'path';
import { supabaseAdmin } from '@/lib/supabase';
import { callKimi } from '@/lib/kimi/client';

const OBSIDIAN_CLIENTS = path.join(process.env.HOME || '/home/max', 'Obsidian/Nexorra/Clients');
const MAX_KNOWLEDGE_BASE_CHARS = 5000; // condense when over this

/**
 * Called after a booking is created.
 * Reads the last 10 messages for the contact, extracts what led to the booking,
 * and appends a compact learning to the account's knowledge_base.
 */
export async function recordBookingLearning(
  accountId: string,
  contactId: string
): Promise<void> {
  try {
    // Get last 10 messages for context
    const { data: messages } = await supabaseAdmin
      .from('messages')
      .select('direction, content, created_at')
      .eq('account_id', accountId)
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!messages || messages.length === 0) return;

    // Get contact name
    const { data: contact } = await supabaseAdmin
      .from('contacts')
      .select('first_name, last_name')
      .eq('id', contactId)
      .maybeSingle();

    const contactName = [contact?.first_name, contact?.last_name].filter(Boolean).join(' ') || 'Lead';

    // Build transcript (oldest first)
    const transcript = messages
      .reverse()
      .map(m => `${m.direction === 'inbound' ? 'Lead' : 'Agent'}: ${m.content}`)
      .join('\n');

    // Ask Haiku to extract what worked
    const result = await callKimi({
      messages: [
        {
          role: 'system',
          content: 'You extract compact conversation learnings. Output 1-2 sentences max. Focus on: what the lead asked about, what the agent said that led to the booking, any notable pattern. Format: "[Topic]: [What worked]"'
        },
        {
          role: 'user',
          content: `This conversation ended in a booked appointment. Extract the key learning:\n\n${transcript}`
        }
      ],
      maxTokens: 80,
      temperature: 0.3,
    });

    const learning = result.reply.trim();
    if (!learning) return;

    const date = new Date().toISOString().split('T')[0];
    const entry = `[${date}] BOOKING — ${contactName}: ${learning}`;

    await appendAccountLearning(accountId, entry);
  } catch (err) {
    console.error('[account-learner] recordBookingLearning error:', err);
  }
}

/**
 * Appends a learning entry to the account's knowledge_base.
 * Condenses if it gets too long.
 */
export async function appendAccountLearning(
  accountId: string,
  entry: string
): Promise<void> {
  const { data: config } = await supabaseAdmin
    .from('ai_agent_configs')
    .select('knowledge_base')
    .eq('account_id', accountId)
    .maybeSingle();

  const current = config?.knowledge_base || '';

  // Find or create the Learnings section
  let updated: string;
  const learningSectionMarker = '## Conversation Learnings';
  if (current.includes(learningSectionMarker)) {
    updated = current.replace(
      learningSectionMarker,
      `${learningSectionMarker}\n${entry}`
    );
  } else {
    updated = `${current}\n\n${learningSectionMarker}\n${entry}`.trim();
  }

  // Condense if too long
  if (updated.length > MAX_KNOWLEDGE_BASE_CHARS) {
    updated = await condenseLearnings(accountId, updated);
  }

  await supabaseAdmin
    .from('ai_agent_configs')
    .update({ knowledge_base: updated, updated_at: new Date().toISOString() })
    .eq('account_id', accountId);

  // Sync to Obsidian (best-effort, local only)
  syncToObsidian(accountId, updated).catch(() => {});
}

/**
 * Uses Haiku to condense the knowledge_base when it gets too long.
 * Preserves structure but compresses verbose entries.
 */
export async function condenseLearnings(
  accountId: string,
  currentKnowledge: string
): Promise<string> {
  try {
    const result = await callKimi({
      messages: [
        {
          role: 'system',
          content: 'You condense an AI agent knowledge base. Keep all sections. Compress verbose entries into compact bullet points. Keep dates on learnings. Preserve all FAQ answers. Output the condensed knowledge base only, no commentary.'
        },
        {
          role: 'user',
          content: `Condense this knowledge base to under 3000 characters while preserving all key information:\n\n${currentKnowledge}`
        }
      ],
      maxTokens: 600,
      temperature: 0.2,
    });

    return result.reply.trim() || currentKnowledge;
  } catch {
    // If condensing fails, just trim old learnings
    return currentKnowledge.slice(-MAX_KNOWLEDGE_BASE_CHARS);
  }
}

/**
 * Syncs the knowledge_base content to the Obsidian file for human review/editing.
 * Only works locally — silently no-ops on Vercel.
 */
async function syncToObsidian(accountId: string, knowledgeBase: string): Promise<void> {
  try {
    const { data: account } = await supabaseAdmin
      .from('accounts')
      .select('name')
      .eq('id', accountId)
      .maybeSingle();

    if (!account?.name) return;

    const filePath = path.join(OBSIDIAN_CLIENTS, `${account.name}.md`);
    if (!fs.existsSync(filePath)) return; // only sync if file already exists

    const existing = fs.readFileSync(filePath, 'utf-8');

    // Preserve frontmatter, replace body
    const frontmatterMatch = existing.match(/^(---[\s\S]*?---\n?)/);
    const frontmatter = frontmatterMatch ? frontmatterMatch[1] : '';
    const date = new Date().toISOString().split('T')[0];

    // Update last_updated in frontmatter
    const updatedFrontmatter = frontmatter.replace(/last_updated:.*/, `last_updated: ${date}`);

    fs.writeFileSync(filePath, `${updatedFrontmatter}\n${knowledgeBase}`);
  } catch {
    // Non-fatal: local filesystem may not be available
  }
}
