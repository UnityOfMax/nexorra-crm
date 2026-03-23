import { promises as fs } from 'fs';
import { open, FileHandle } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import type { MulchEntry, MulchConfig, MulchQueryResult } from './types';

const ROOT = path.resolve(process.cwd());
const CONFIG_PATH = path.join(ROOT, '.mulch', 'config.json');

let _config: MulchConfig | null = null;

async function getConfig(): Promise<MulchConfig> {
  if (_config) return _config;
  const raw = await fs.readFile(CONFIG_PATH, 'utf-8');
  _config = JSON.parse(raw) as MulchConfig;
  return _config;
}

function dataPath(config: MulchConfig): string {
  return path.join(ROOT, config.dataFile);
}

function lockPath(config: MulchConfig): string {
  return path.join(ROOT, config.lockFile);
}

// --- File locking ---

async function acquireLock(config: MulchConfig, retries = 3, timeoutMs = 5000): Promise<FileHandle> {
  const lp = lockPath(config);
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const handle = await open(lp, 'wx');
      return handle;
    } catch (err: unknown) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === 'EEXIST') {
        // Check if lock is stale (older than timeout)
        try {
          const stat = await fs.stat(lp);
          const age = Date.now() - stat.mtimeMs;
          if (age > timeoutMs) {
            await fs.unlink(lp);
            continue; // Retry immediately after removing stale lock
          }
        } catch {
          // stat failed, lock might have been released
          continue;
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, Math.min(1000 * (attempt + 1), timeoutMs / retries)));
      } else {
        throw err;
      }
    }
  }
  throw new Error(`Failed to acquire lock after ${retries} retries`);
}

async function releaseLock(handle: FileHandle, config: MulchConfig): Promise<void> {
  try {
    await handle.close();
  } catch {
    // ignore close errors
  }
  try {
    await fs.unlink(lockPath(config));
  } catch {
    // ignore unlink errors
  }
}

// --- BM25 Implementation ---

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1);
}

// Stopwords to exclude from scoring
const STOPWORDS = new Set([
  'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but',
  'in', 'with', 'to', 'for', 'of', 'not', 'no', 'it', 'be', 'was',
  'are', 'were', 'been', 'has', 'have', 'had', 'do', 'does', 'did',
  'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this',
  'that', 'these', 'those', 'from', 'by', 'as', 'if', 'so', 'than',
]);

function tokenizeForBM25(text: string): string[] {
  return tokenize(text).filter(t => !STOPWORDS.has(t));
}

interface BM25Params {
  k1: number;
  b: number;
}

function computeBM25(
  queryTokens: string[],
  documents: Array<{ tokens: string[]; entry: MulchEntry }>,
  params: BM25Params = { k1: 1.5, b: 0.75 }
): Array<{ entry: MulchEntry; score: number }> {
  const N = documents.length;
  if (N === 0 || queryTokens.length === 0) return [];

  // Average document length
  const avgDl = documents.reduce((sum, d) => sum + d.tokens.length, 0) / N;

  // Document frequency for each query term
  const df: Record<string, number> = {};
  for (const qt of queryTokens) {
    df[qt] = 0;
    for (const doc of documents) {
      if (doc.tokens.includes(qt)) {
        df[qt]++;
      }
    }
  }

  // Score each document
  const results: Array<{ entry: MulchEntry; score: number }> = [];

  for (const doc of documents) {
    let score = 0;
    const dl = doc.tokens.length;

    // Build term frequency map for this document
    const tf: Record<string, number> = {};
    for (const t of doc.tokens) {
      tf[t] = (tf[t] || 0) + 1;
    }

    for (const qt of queryTokens) {
      const termFreq = tf[qt] || 0;
      if (termFreq === 0) continue;

      const docFreq = df[qt] || 0;
      // IDF: log((N - df + 0.5) / (df + 0.5) + 1)
      const idf = Math.log((N - docFreq + 0.5) / (docFreq + 0.5) + 1);

      // TF component with length normalization
      const tfNorm = (termFreq * (params.k1 + 1)) /
        (termFreq + params.k1 * (1 - params.b + params.b * (dl / avgDl)));

      score += idf * tfNorm;
    }

    if (score > 0) {
      results.push({ entry: doc.entry, score });
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);
  return results;
}

// --- Core API ---

async function readAllEntries(config: MulchConfig): Promise<MulchEntry[]> {
  const dp = dataPath(config);
  try {
    const raw = await fs.readFile(dp, 'utf-8');
    const lines = raw.split('\n').filter(l => l.trim());
    const entries: MulchEntry[] = [];
    for (const line of lines) {
      try {
        entries.push(JSON.parse(line) as MulchEntry);
      } catch {
        // Skip malformed lines
      }
    }
    return entries;
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw err;
  }
}

/**
 * Append a new learning entry to the JSONL store.
 */
export async function record(
  entry: Omit<MulchEntry, 'id' | 'timestamp'>
): Promise<MulchEntry> {
  const config = await getConfig();
  const fullEntry: MulchEntry = {
    ...entry,
    id: randomUUID(),
    timestamp: new Date().toISOString(),
  };

  const lock = await acquireLock(config);
  try {
    const dp = dataPath(config);

    // Ensure directory exists
    await fs.mkdir(path.dirname(dp), { recursive: true });

    // Append entry
    const line = JSON.stringify(fullEntry) + '\n';
    await fs.appendFile(dp, line, 'utf-8');

    // Check if we need to trim (keep maxEntries most recent)
    const entries = await readAllEntries(config);
    if (entries.length > config.maxEntries) {
      // Keep last maxEntries entries
      const trimmed = entries.slice(entries.length - config.maxEntries);
      const content = trimmed.map(e => JSON.stringify(e)).join('\n') + '\n';
      await fs.writeFile(dp, content, 'utf-8');
    }

    return fullEntry;
  } finally {
    await releaseLock(lock, config);
  }
}

/**
 * BM25-ranked search across all entries.
 */
export async function query(
  text: string,
  options?: { domain?: string; agent?: string; limit?: number }
): Promise<MulchQueryResult> {
  const config = await getConfig();
  const limit = options?.limit ?? 20;

  if (!text || !text.trim()) {
    return { entries: [], total: 0, query: text || '' };
  }

  let entries = await readAllEntries(config);

  // Filter by domain/agent if specified
  if (options?.domain) {
    entries = entries.filter(e => e.domain === options.domain);
  }
  if (options?.agent) {
    entries = entries.filter(e => e.agent === options.agent);
  }

  const queryTokens = tokenizeForBM25(text);
  if (queryTokens.length === 0) {
    return { entries: [], total: 0, query: text };
  }

  // Build document token arrays (content + tags + domain)
  const documents = entries.map(entry => ({
    tokens: tokenizeForBM25(
      `${entry.content} ${entry.tags.join(' ')} ${entry.domain} ${entry.agent}`
    ),
    entry,
  }));

  const ranked = computeBM25(queryTokens, documents);

  const limited = ranked.slice(0, limit).map(r => ({
    ...r.entry,
    score: Math.round(r.score * 1000) / 1000,
  }));

  return {
    entries: limited,
    total: ranked.length,
    query: text,
  };
}

/**
 * Get all entries from a specific agent.
 */
export async function getByAgent(agent: string, limit = 50): Promise<MulchEntry[]> {
  const config = await getConfig();
  const entries = await readAllEntries(config);
  return entries
    .filter(e => e.agent === agent)
    .slice(-limit); // Most recent
}

/**
 * Get all entries in a specific domain.
 */
export async function getByDomain(domain: string, limit = 50): Promise<MulchEntry[]> {
  const config = await getConfig();
  const entries = await readAllEntries(config);
  return entries
    .filter(e => e.domain === domain)
    .slice(-limit); // Most recent
}

// --- Sync wrappers for daemon process-manager (runs in non-async context) ---

import { readFileSync, appendFileSync, mkdirSync, existsSync } from 'fs';

function getConfigSync(): MulchConfig {
  if (_config) return _config;
  const raw = readFileSync(CONFIG_PATH, 'utf-8');
  _config = JSON.parse(raw) as MulchConfig;
  return _config;
}

function readAllEntriesSync(config: MulchConfig): MulchEntry[] {
  const dp = dataPath(config);
  if (!existsSync(dp)) return [];
  const raw = readFileSync(dp, 'utf-8');
  return raw.split('\n').filter(l => l.trim()).map(line => {
    try { return JSON.parse(line) as MulchEntry; } catch { return null; }
  }).filter((e): e is MulchEntry => e !== null);
}

export function querySync(
  text: string,
  options?: { domain?: string; agent?: string; limit?: number }
): MulchQueryResult {
  try {
    const config = getConfigSync();
    const limit = options?.limit ?? 5;
    if (!text?.trim()) return { entries: [], total: 0, query: text || '' };

    let entries = readAllEntriesSync(config);
    if (options?.domain) entries = entries.filter(e => e.domain === options.domain);
    if (options?.agent) entries = entries.filter(e => e.agent === options.agent);

    const queryTokens = tokenizeForBM25(text);
    if (queryTokens.length === 0) return { entries: [], total: 0, query: text };

    const documents = entries.map(entry => ({
      tokens: tokenizeForBM25(`${entry.content} ${entry.tags.join(' ')} ${entry.domain} ${entry.agent}`),
      entry,
    }));
    const ranked = computeBM25(queryTokens, documents);
    return {
      entries: ranked.slice(0, limit).map(r => ({ ...r.entry, score: Math.round(r.score * 1000) / 1000 })),
      total: ranked.length,
      query: text,
    };
  } catch { return { entries: [], total: 0, query: text || '' }; }
}

export function recordSync(entry: Omit<MulchEntry, 'id' | 'timestamp'>): void {
  try {
    const config = getConfigSync();
    const dp = dataPath(config);
    mkdirSync(path.dirname(dp), { recursive: true });
    const fullEntry: MulchEntry = { ...entry, id: randomUUID(), timestamp: new Date().toISOString() };
    appendFileSync(dp, JSON.stringify(fullEntry) + '\n', 'utf-8');
  } catch { /* silent fail */ }
}

// Default export for convenient import
const mulch = { record, query, getByAgent, getByDomain, querySync, recordSync };
export default mulch;
