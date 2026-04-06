/**
 * Copy humanizer — applies stop-slop + humanizer skills to generated copy.
 * Runs as a post-processing step via claude -p (OAuth) with skill content injected.
 * Eliminates em dashes, AI writing patterns, and banned phrases.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

const STOP_SLOP_PATH = path.join(process.env.HOME!, '.claude/skills/stop-slop/SKILL.md');
const HUMANIZER_PATH = path.join(process.env.HOME!, '.claude/skills/humanizer/SKILL.md');

function loadSkill(filePath: string): string {
  try {
    return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : '';
  } catch {
    return '';
  }
}

// Lazy-load skills once
let _skillContext: string | null = null;

function getSkillContext(): string {
  if (_skillContext !== null) return _skillContext;
  const stopSlop = loadSkill(STOP_SLOP_PATH);
  const humanizer = loadSkill(HUMANIZER_PATH);
  const blocks: string[] = [];
  if (stopSlop) blocks.push(`--- SKILL: stop-slop ---\n${stopSlop}\n--- END SKILL ---`);
  if (humanizer) blocks.push(`--- SKILL: humanizer ---\n${humanizer}\n--- END SKILL ---`);
  _skillContext = blocks.join('\n\n');
  return _skillContext;
}

/**
 * Rewrites copy through claude -p with stop-slop + humanizer skills applied.
 * Falls back to original text on timeout or failure.
 */
export async function humanizeCopy(rawCopy: string, context: string): Promise<string> {
  const skillContext = getSkillContext();
  if (!skillContext) {
    console.warn('[humanizer] No skills loaded — returning raw copy');
    return rawCopy;
  }

  const prompt = `${skillContext}

You are rewriting copy for a local business. Apply the stop-slop and humanizer skills strictly before returning anything.

Context: ${context}

Hard rules:
- NO em dashes (—) anywhere. Replace with a comma, period, or restructure the sentence.
- No banned phrases from the stop-slop list.
- Score must reach 35/50 before returning.
- Keep all factual details verbatim — names, prices, locations, specific observations.
- For email copy: keep the 5-phrase structure intact. Tone = friend who noticed something useful, casual, no sales language.
- For website copy: punchy, specific to this business, no filler phrases.
- For headlines: short and direct, no generic phrases like "Elevating", "Transforming", "Discover".

Return ONLY the rewritten copy. No explanation, no preamble, no score breakdown.

Copy to rewrite:
${rawCopy}`;

  const tmpFile = `/tmp/humanize-${Date.now()}.txt`;
  fs.writeFileSync(tmpFile, prompt, 'utf-8');

  try {
    const { stdout } = await execAsync(
      `claude -p --output-format text < ${tmpFile}`,
      { timeout: 75000, maxBuffer: 2 * 1024 * 1024 },
    );
    const result = stdout.trim();
    return result || rawCopy;
  } catch (err) {
    console.warn('[humanizer] claude -p failed:', (err as Error).message);
    return rawCopy;
  } finally {
    fs.unlink(tmpFile, () => {});
  }
}

/**
 * Humanize multiple copy fields at once — more efficient than calling humanizeCopy
 * per field since it batches them into a single claude -p call.
 */
export async function humanizeCopyFields(
  fields: Record<string, string>,
  contextPrefix: string,
): Promise<Record<string, string>> {
  const skillContext = getSkillContext();
  if (!skillContext) return fields;

  const fieldList = Object.entries(fields)
    .map(([k, v]) => `### ${k}\n${v}`)
    .join('\n\n');

  const prompt = `${skillContext}

You are rewriting copy fields for a local business outreach campaign. Apply stop-slop and humanizer strictly to EVERY field.

Context: ${contextPrefix}

Hard rules:
- NO em dashes (—) anywhere. Replace with comma, period, or restructure.
- No banned phrases. Score each field ≥35/50 before returning.
- Keep all factual content (names, prices, locations, specific observations) verbatim.
- Email body: keep 5-phrase structure, casual friend tone, no sales jargon.
- Headlines: short, direct, specific to this business.

Return a JSON object with the same keys as the input. Values are the rewritten copy.
No markdown, no explanation — just the JSON object.

Fields to rewrite:
${fieldList}`;

  const tmpFile = `/tmp/humanize-batch-${Date.now()}.txt`;
  fs.writeFileSync(tmpFile, prompt, 'utf-8');

  try {
    const { stdout } = await execAsync(
      `claude -p --output-format text < ${tmpFile}`,
      { timeout: 90000, maxBuffer: 4 * 1024 * 1024 },
    );
    const jsonMatch = stdout.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return fields;
    const parsed = JSON.parse(jsonMatch[0]) as Record<string, string>;
    // Merge — only replace fields that are actually present in the response
    const result = { ...fields };
    for (const [k, v] of Object.entries(parsed)) {
      if (k in result && typeof v === 'string' && v.trim()) {
        result[k] = v.trim();
      }
    }
    return result;
  } catch {
    return fields;
  } finally {
    fs.unlink(tmpFile, () => {});
  }
}
