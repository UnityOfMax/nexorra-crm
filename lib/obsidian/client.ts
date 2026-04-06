import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import matter from 'gray-matter';

const VAULT_ROOT = path.join(os.homedir(), 'Obsidian', 'Nexorra');

const DIRS = {
  clients: path.join(VAULT_ROOT, 'Clients'),
  research: path.join(VAULT_ROOT, 'Research'),
  engineering: path.join(VAULT_ROOT, 'Engineering'),
  daily: path.join(VAULT_ROOT, 'Daily'),
};

/** Ensure vault directories exist */
async function ensureVault(): Promise<void> {
  for (const dir of Object.values(DIRS)) {
    await fs.mkdir(dir, { recursive: true });
  }
}

/** Slugify a name for filenames */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Write a client account note to the vault */
export async function writeClientNote(account: any): Promise<void> {
  await ensureVault();

  const name = account.name || 'Unnamed Account';
  const filename = `${slugify(name)}.md`;
  const filepath = path.join(DIRS.clients, filename);

  const frontmatter: Record<string, any> = {
    name,
    account_id: account.id || '',
    type: account.type || 'client',
    status: account.status || 'active',
    created_at: account.created_at || '',
    synced_at: new Date().toISOString(),
  };

  let body = '';

  if (account.description) {
    body += `## Description\n\n${account.description}\n\n`;
  }

  if (account.settings) {
    body += `## Settings\n\n\`\`\`json\n${JSON.stringify(account.settings, null, 2)}\n\`\`\`\n\n`;
  }

  const content = matter.stringify(body.trim() || '*(No details yet)*', frontmatter);
  await fs.writeFile(filepath, content, 'utf-8');
}

/** Write a daily note to the vault */
export async function writeDailyNote(date: string, content: string): Promise<void> {
  await ensureVault();

  const filename = `${date}.md`;
  const filepath = path.join(DIRS.daily, filename);

  const frontmatter = {
    date,
    created_at: new Date().toISOString(),
  };

  const fileContent = matter.stringify(content, frontmatter);
  await fs.writeFile(filepath, fileContent, 'utf-8');
}

/** Read and parse a note from the vault */
export async function readNote(notePath: string): Promise<{ frontmatter: any; content: string }> {
  // Resolve relative paths against vault root
  const fullPath = path.isAbsolute(notePath)
    ? notePath
    : path.join(VAULT_ROOT, notePath);

  const raw = await fs.readFile(fullPath, 'utf-8');
  const parsed = matter(raw);

  return {
    frontmatter: parsed.data,
    content: parsed.content.trim(),
  };
}

export { VAULT_ROOT, DIRS, ensureVault };
