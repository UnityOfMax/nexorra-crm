/**
 * Mulch Migration Script
 *
 * Reads all agents/memory/*.md files, parses them into structured entries,
 * and writes them to .mulch/learnings.jsonl.
 *
 * Usage: npx tsx scripts/mulch-migrate.ts
 *
 * The original .md files are kept as backup.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import type { MulchEntry, MulchConfig } from '../lib/mulch/types';

const ROOT = path.resolve(__dirname, '..');
const MEMORY_DIR = path.join(ROOT, 'agents', 'memory');
const CONFIG_PATH = path.join(ROOT, '.mulch', 'config.json');

// Map filename stems to domain + agent
const FILE_MAP: Record<string, { domain: string; agent: string }> = {
  'lead-gen': { domain: 'lead-gen', agent: 'lead-gen' },
  'cold-email': { domain: 'cold-email', agent: 'cold-email-replies' },
  'client-reply': { domain: 'client-reply', agent: 'client-reply' },
  'campaign-metrics': { domain: 'campaign-metrics', agent: 'campaign-reviewer' },
  'code-review': { domain: 'code-review', agent: 'dev' },
  'instagram-outreach': { domain: 'instagram-outreach', agent: 'instagram-outreach' },
  'funnel-insights': { domain: 'funnel-insights', agent: 'campaign-optimizer' },
};

interface Section {
  heading: string;
  content: string;
}

function parseSections(markdown: string): Section[] {
  const lines = markdown.split('\n');
  const sections: Section[] = [];
  let currentHeading = 'Preamble';
  let currentLines: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,3}\s+(.+)/);
    if (headingMatch) {
      // Save previous section if it has content
      const content = currentLines.join('\n').trim();
      if (content) {
        sections.push({ heading: currentHeading, content });
      }
      currentHeading = headingMatch[1].trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  // Don't forget the last section
  const content = currentLines.join('\n').trim();
  if (content) {
    sections.push({ heading: currentHeading, content });
  }

  return sections;
}

function classifySection(heading: string, content: string): MulchEntry['classification'] {
  const h = heading.toLowerCase();
  const c = content.toLowerCase();

  // Foundational: patterns, what works/doesn't, technical patterns
  if (h.includes('what works') || h.includes('what doesn\'t') || h.includes('technical') ||
      h.includes('reliable') || h.includes('common issues') || h.includes('patterns')) {
    return 'foundational';
  }

  // Tactical: stats, results, specific sessions, next steps
  if (h.includes('stats') || h.includes('results') || h.includes('session') ||
      h.includes('next steps') || h.includes('snapshot') || h.includes('summary')) {
    return 'tactical';
  }

  // Observational: everything else (status, experiments, log entries)
  if (h.includes('status') || h.includes('experiment') || h.includes('log') ||
      c.includes('no data yet') || c.includes('not yet')) {
    return 'observational';
  }

  return 'tactical';
}

function extractTags(heading: string, content: string): string[] {
  const tags: string[] = [];

  // Extract brokerage names
  const brokerages = ['bhhs', 'exp', 'coldwellbanker', 'remax', 'sothebys', 'compass', 'kw', 'century21'];
  const combined = (heading + ' ' + content).toLowerCase();
  for (const b of brokerages) {
    if (combined.includes(b)) tags.push(b);
  }

  // Extract city names if present
  const cityPattern = /(?:Nashville|Dallas|Atlanta|Miami|Phoenix|Denver|Los Angeles|Las Vegas|Seattle|Tampa|Chicago|San Diego|San Antonio|Columbus|Houston|Charlotte|Salt Lake City)/gi;
  const cities = combined.match(cityPattern);
  if (cities) {
    const unique = Array.from(new Set(cities.map(c => c.toLowerCase().replace(/\s+/g, '-'))));
    tags.push(...unique.slice(0, 5)); // Cap at 5 city tags
  }

  // Extract tech terms
  const techTerms = ['puppeteer', 'graphql', 'solr', 'chrome', 'supabase', 'twilio', 'instantly', 'calendly', 'anthropic', 'meta', 'instagram'];
  for (const t of techTerms) {
    if (combined.includes(t)) tags.push(t);
  }

  // Heading-based tags
  if (heading.toLowerCase().includes('what works')) tags.push('success');
  if (heading.toLowerCase().includes('what doesn\'t')) tags.push('failure');
  if (heading.toLowerCase().includes('stats')) tags.push('metrics');

  return Array.from(new Set(tags));
}

async function migrate() {
  console.log('Mulch Migration: Starting...\n');

  // Load config
  const configRaw = await fs.readFile(CONFIG_PATH, 'utf-8');
  const config = JSON.parse(configRaw) as MulchConfig;
  const outPath = path.join(ROOT, config.dataFile);

  // Ensure output directory exists
  await fs.mkdir(path.dirname(outPath), { recursive: true });

  // Read all memory files
  let files: string[];
  try {
    files = await fs.readdir(MEMORY_DIR);
    files = files.filter(f => f.endsWith('.md'));
  } catch {
    console.log('No agents/memory/ directory found. Nothing to migrate.');
    return;
  }

  if (files.length === 0) {
    console.log('No .md files found in agents/memory/. Nothing to migrate.');
    return;
  }

  const allEntries: MulchEntry[] = [];

  for (const file of files) {
    const stem = file.replace('.md', '');
    const mapping = FILE_MAP[stem];
    if (!mapping) {
      console.log(`  Skipping ${file} (no domain mapping)`);
      continue;
    }

    const filePath = path.join(MEMORY_DIR, file);
    const raw = await fs.readFile(filePath, 'utf-8');

    if (!raw.trim()) {
      console.log(`  Skipping ${file} (empty)`);
      continue;
    }

    const sections = parseSections(raw);
    console.log(`  ${file}: ${sections.length} sections`);

    for (const section of sections) {
      // Skip sections that are just "no data yet" or frontmatter
      if (section.content.length < 10) continue;
      if (section.heading === 'Preamble' && section.content.startsWith('---')) continue;

      const entry: MulchEntry = {
        id: randomUUID(),
        agent: mapping.agent,
        domain: mapping.domain,
        content: `## ${section.heading}\n${section.content}`,
        tags: extractTags(section.heading, section.content),
        classification: classifySection(section.heading, section.content),
        timestamp: new Date().toISOString(),
      };

      allEntries.push(entry);
    }
  }

  // Write JSONL
  const lines = allEntries.map(e => JSON.stringify(e)).join('\n') + '\n';
  await fs.writeFile(outPath, lines, 'utf-8');

  console.log(`\nMulch Migration Complete:`);
  console.log(`  Files processed: ${files.length}`);
  console.log(`  Entries created: ${allEntries.length}`);
  console.log(`  Output: ${outPath}`);
  console.log(`\n  Original .md files preserved as backup in agents/memory/`);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
