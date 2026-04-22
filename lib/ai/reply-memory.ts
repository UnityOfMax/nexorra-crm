/**
 * Memory loader for the client reply agent.
 *
 * Copy rules are hardcoded as compact constants (not file-loaded) to minimize
 * prompt token usage. Full skill files in agents/skills/ are the source of truth
 * for humans; runtime uses condensed versions here.
 *
 * Per-contact Obsidian notes still loaded dynamically when they exist.
 */

import fs from 'fs';
import path from 'path';

const OBSIDIAN_CLIENTS = path.join(process.env.HOME || '/home/max', 'Obsidian/Nexorra/Clients');


// Compact runtime copy rules (~400 chars vs ~3,300 chars from full files)
const STOP_SLOP_COMPACT = `BANNED: the characters — and – (em-dash and en-dash) are FORBIDDEN in every message, no exceptions. Also banned: crucial, vital, essential, transformative, seamless, leverage, facilitate, foster, empower. No filler openers (Certainly!, Absolutely!, Great question!). No hedging. No conclusion recaps.`;

const HUMANIZER_COMPACT = `Write like a real person sent this. Match their register. Short texts get short replies. Use contractions. Jump straight in, no filler openers. One idea per SMS. For email: first name greeting only, one-line sign-off, no padding.`;

function readFile(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf-8').trim();
  } catch {
    return '';
  }
}

/**
 * Try to find an Obsidian client note for a contact.
 * Looks for "{FirstName} {LastName}.md" in the Clients directory.
 */
function findObsidianNote(firstName: string | null, lastName: string | null): string {
  if (!firstName && !lastName) return '';
  const name = [firstName, lastName].filter(Boolean).join(' ');
  const filePath = path.join(OBSIDIAN_CLIENTS, `${name}.md`);
  const content = readFile(filePath);
  if (!content) return '';
  // Strip frontmatter if present
  return content.replace(/^---[\s\S]*?---\n?/, '').trim();
}

export interface ReplyMemoryContext {
  agentMemory: string;       // engagement patterns from agents/memory
  contactNote: string;       // Obsidian per-contact note
  humanizerSkill: string;    // humanizer rules
  stopSlopSkill: string;     // stop-slop rules
}

export function loadReplyMemory(
  contactFirstName: string | null,
  contactLastName: string | null
): ReplyMemoryContext {
  const contactNote = findObsidianNote(contactFirstName, contactLastName);

  return {
    agentMemory: '',  // populated once there are real engagement patterns to learn from
    contactNote,
    humanizerSkill: HUMANIZER_COMPACT,
    stopSlopSkill: STOP_SLOP_COMPACT,
  };
}

/**
 * Build the memory block injected into the system prompt.
 * Keeps it compact — only includes non-empty sections.
 * Accepts optional accountKnowledge for local testing (in production
 * this comes from ai_agent_configs.knowledge_base via generate-and-send).
 */
export function buildMemoryBlock(ctx: ReplyMemoryContext, accountKnowledge?: string): string {
  const parts: string[] = [];

  if (accountKnowledge) {
    parts.push(`## Account Knowledge Base\n${accountKnowledge}`);
  }

  if (ctx.agentMemory) {
    parts.push(`## Reply Patterns\n${ctx.agentMemory}`);
  }

  if (ctx.contactNote) {
    parts.push(`## Notes on this contact\n${ctx.contactNote}`);
  }

  return parts.join('\n\n') || '(No prior memory for this contact)';
}

/**
 * Load the account-level knowledge base from Obsidian (local testing only).
 * In production, this comes from ai_agent_configs.knowledge_base in Supabase.
 */
export function loadAccountKnowledge(accountName: string): string {
  const filePath = path.join(OBSIDIAN_CLIENTS, `${accountName}.md`);
  const content = readFile(filePath);
  if (!content) return '';
  // Strip frontmatter
  return content.replace(/^---[\s\S]*?---\n?/, '').trim();
}
