/**
 * Memory loader for the client reply agent.
 *
 * Loads context in order of relevance:
 *   1. agents/memory/client-reply.md   — engagement patterns, what works/doesn't
 *   2. Obsidian client note            — per-contact notes if one exists
 *   3. agents/skills/humanizer.md      — writing style rules
 *   4. agents/skills/stop-slop.md      — banned words / AI-tell patterns
 */

import fs from 'fs';
import path from 'path';

const CRM_ROOT = path.resolve(process.cwd());
const OBSIDIAN_CLIENTS = path.join(process.env.HOME || '/home/max', 'Obsidian/Nexorra/Clients');

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
  const agentMemory = readFile(path.join(CRM_ROOT, 'agents/memory/client-reply.md'));
  const contactNote = findObsidianNote(contactFirstName, contactLastName);
  const humanizerSkill = readFile(path.join(CRM_ROOT, 'agents/skills/humanizer.md'));
  const stopSlopSkill = readFile(path.join(CRM_ROOT, 'agents/skills/stop-slop.md'));

  return { agentMemory, contactNote, humanizerSkill, stopSlopSkill };
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
