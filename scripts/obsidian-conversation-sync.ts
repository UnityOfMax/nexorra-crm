#!/usr/bin/env tsx
/**
 * Obsidian Conversation Sync
 *
 * Processes Claude Code conversation jsonl files and writes organised notes to Obsidian.
 * Runs nightly (1:15 AM) to capture all dev conversations from the day.
 *
 * Each session note gets:
 *  - A descriptive filename: {date}-{context-slug}.md  (not just date-time-firsttopic)
 *  - A `context:` frontmatter field — 1-line human-readable summary of what was done
 *  - Agent-specific subfolder: sessions/research/jeff/, sessions/marketing/stacey/, etc.
 *  - Related topics as proper Obsidian tags
 *  - A synthesized "What Was Done" summary (not raw message dumps)
 *
 * Usage: npx tsx scripts/obsidian-conversation-sync.ts [--all] [--session <id>]
 *   --all        Reprocess all sessions (ignore state)
 *   --session    Process a specific session ID only
 */

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import * as os from "os";

const SESSIONS_DIR = path.join(os.homedir(), ".claude/projects/-home-max-crm");
const OBSIDIAN_ROOT = path.join(os.homedir(), "Obsidian/Nexorra");
const OBSIDIAN_SESSIONS = path.join(OBSIDIAN_ROOT, "sessions");
const STATE_FILE = path.join(__dirname, "../agents/state/obsidian-conv-sync.json");

// ─── Topic detection ──────────────────────────────────────────────────────────

const TOPIC_KEYWORDS: Record<string, string[]> = {
  jeff:             ["jeff", "lead gen", "lead-gen", "scraping", "brokerage", "compass", "remax", "re/max", "bhhs", "exp world", "realtor.com", "century21", "keller williams", "sotheby", "coldwell", "scrape-progress"],
  petra:            ["petra", "local biz", "local-biz", "local business", "outscraper", "apollo.io", "website demo", "website-demo", "google maps", "gmb", "local_biz_leads"],
  derek:            ["derek", "video pipeline", "daily-video-pipeline", "loom video", "gif", "prerender", "talking-head", "crm-demo", "composite.ts", "generate.ts", "chrome-launch-video"],
  stacey:           ["stacey", "cold email upload", "cold-email-upload", "instantly", "email upload", "push leads", "pushed_to_instantly"],
  lionel:           ["lionel", "cold email maintenance", "cold-email-maintenance", "nudge", "ghosted", "maintenance agent"],
  tara:             ["tara", "instagram outreach", "instagram-outreach", "instagram dms", "instagram dm"],
  cole:             ["cole", "calling outreach", "calling-outreach", "openphone", "ai calling", "dialer", "orchestrator"],
  nina:             ["nina", "quality check", "lead quality", "lead-gen-quality"],
  "cold-email":     ["cold email", "cold-email", "email reply", "email campaign", "stacey learnings"],
  instagram:        ["instagram lead", "instagram handle", "ig lead", "instagram_handle", "instagram phase", "instagram brokerage"],
  "landing-pages":  ["landing page", "landing-pages", "landing_page", "cold-email-builder", "og image", "og meta", "website-demo"],
  vercel:           ["vercel", "deployment", "deploy", "build error", "next build", "production build"],
  "video-pipeline": ["video pipeline", "daily-video-pipeline", "chrome-launch-video", "worker port", "9224", "9226", "9227", "9228", "9229"],
  supabase:         ["supabase", "migration", "rls", "postgres", "sql", ".sql", "service role", "table"],
  cron:             ["cron", "crontab", "schedule", "sleep schedule", "wake", "bst", "utc"],
  obsidian:         ["obsidian", "vault", "obsidian-sync", "obsidian vault", "brain.ts"],
  "chrome-tools":   ["chrome-tool", "chrome tool", "puppeteer", "cdp", "chrome launch", "devtools protocol"],
  "meta-ads":       ["meta ads", "meta campaign", "facebook ads", "campaign optimizer", "meta_ad_metrics"],
  "website-demo":   ["website demo", "website-demo", "local biz website", "build-demo", "website template"],
};

// Primary agent → subfolder within sessions/
const AGENT_SUBFOLDER: Record<string, string> = {
  jeff:             "research/jeff",
  petra:            "research/petra",
  derek:            "research/derek",
  nina:             "research/nina",
  stacey:           "marketing/stacey",
  lionel:           "marketing/lionel",
  tara:             "marketing/tara",
  cole:             "marketing/cole",
  "cold-email":     "marketing/cold-email",
  instagram:        "marketing/instagram",
  "meta-ads":       "marketing/meta-ads",
  "landing-pages":  "dev/ui",
  "website-demo":   "dev/ui",
  vercel:           "dev/infra",
  supabase:         "dev/infra",
  cron:             "dev/infra",
  "chrome-tools":   "dev/infra",
  obsidian:         "dev/infra",
  "video-pipeline": "research/derek",
};

// Map topic → Obsidian folder for the topic index page
const TOPIC_FOLDERS: Record<string, string> = {
  jeff:             "Research",
  petra:            "Research",
  derek:            "Research",
  nina:             "Research",
  stacey:           "Marketing",
  lionel:           "Marketing",
  tara:             "Marketing",
  cole:             "Marketing",
  "cold-email":     "Marketing",
  instagram:        "Marketing",
  "meta-ads":       "Marketing",
  "landing-pages":  "Engineering",
  "website-demo":   "Engineering",
  vercel:           "Engineering",
  "video-pipeline": "Engineering",
  supabase:         "Engineering",
  cron:             "Engineering",
  obsidian:         "Engineering",
  "chrome-tools":   "Engineering",
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface SessionInfo {
  sessionId: string;
  date: string;        // YYYY-MM-DD
  time: string;        // HH:MM UTC
  userMessages: string[];
  filesEdited: string[];
  topics: string[];
  primaryAgent: string;
  subfolder: string;
  context: string;     // 1-line human summary of what was done
  contextSlug: string; // URL-safe slug for filename
  messageCount: number;
}

// ─── Context extraction ───────────────────────────────────────────────────────

// Action verbs that indicate "what was done" messages
const ACTION_VERBS = /^(fix|add|update|create|build|implement|change|remove|move|refactor|debug|set up|configure|write|make|install|push|deploy|migrate|rebuild|patch|rewrite|switch|enable|disable)/i;

/**
 * Generate a short human-readable context string from user messages.
 * Picks the most descriptive imperative message (command/request form).
 * No LLM — pure string heuristics.
 */
function generateContext(messages: string[]): string {
  // Filter out any blobs that slipped through (task notifications, XML, JSON, system text)
  const clean = messages.filter(m => {
    const t = m.trim();
    return t.length > 10
      && !t.includes('taskId')
      && !t.includes('toolUseId')
      && !t.startsWith('<')
      && !t.startsWith('{')
      && !t.startsWith('You are ')
      && !t.startsWith('System:');
  });

  // Prefer messages that start with action verbs or are imperative requests
  const actionMessages = clean.filter(m => ACTION_VERBS.test(m.trim()));
  const candidate = actionMessages[0] || clean.find(m => m.length > 40) || clean[0] || '';

  // Clean up: remove newlines, truncate, strip common filler
  const cleaned = candidate
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^(ok|great|good|now|please|can you|could you|i want you to|i need you to)\s+/i, '')
    .trim()
    .slice(0, 120);

  return cleaned || 'General development session';
}

/**
 * Generate a filename-safe slug from a context string.
 * Targets ~4-6 meaningful words.
 */
function contextToSlug(context: string): string {
  // Take first 6 words, lowercase, strip non-alphanum
  const words = context
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6);

  return words.join('-') || 'dev-session';
}

/**
 * Get primary agent from topics, in priority order.
 */
function getPrimaryAgent(topics: string[]): string {
  // Agent-first priority: specific people before general categories
  const agentPriority = ['jeff', 'petra', 'derek', 'stacey', 'lionel', 'tara', 'cole', 'nina',
    'cold-email', 'instagram', 'meta-ads', 'video-pipeline', 'landing-pages', 'website-demo',
    'supabase', 'vercel', 'cron', 'chrome-tools', 'obsidian'];

  for (const agent of agentPriority) {
    if (topics.includes(agent)) return agent;
  }
  return 'general';
}

// ─── Session parsing ──────────────────────────────────────────────────────────

async function extractSessionInfo(filePath: string, sessionId: string): Promise<SessionInfo | null> {
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath),
    crlfDelay: Infinity,
  });

  const userMessages: string[] = [];
  const filesEdited: string[] = [];
  let firstTimestamp: string | null = null;
  let messageCount = 0;

  for await (const line of rl) {
    try {
      const obj = JSON.parse(line.trim());

      if (obj.type === "user") {
        const ts = obj.timestamp;
        if (ts && !firstTimestamp) firstTimestamp = ts;

        const content = obj.message?.content;
        let text = "";
        if (Array.isArray(content)) {
          text = content
            .filter((c: any) => c.type === "text")
            .map((c: any) => c.text as string)
            .join(" ");
        } else if (typeof content === "string") {
          text = content;
        }

        // Skip system injections and non-human messages
        if (
          text.length > 20 &&
          !text.startsWith("This session is being continued") &&
          !text.includes("<system-reminder>") &&
          !text.includes("<ide_opened_file>") &&
          !text.includes("## Agent Primer") &&
          !text.includes("EXECUTE IMMEDIATELY") &&
          !text.includes("<user-prompt-submit-hook>") &&
          !text.includes("<TaskNotification") &&
          !text.includes("taskId") &&
          !text.includes("toolUseId") &&
          !text.startsWith("<channel source=") &&
          !text.startsWith("You are ") &&
          !text.startsWith("System:") &&
          !text.toLowerCase().startsWith("your current state") &&
          !text.startsWith("Base directory for this skill") &&
          !text.startsWith("CommandMessage") &&
          !text.startsWith("LocalCommandCaveat") &&
          !text.match(/^(skill|name|description):/i) &&
          !text.match(/^(cold.email reply|client reply|instagram reply|lead.gen agent|campaign optimizer)\s*(handler|agent)/i) &&
          !text.startsWith("<") &&
          !text.startsWith("{")
        ) {
          userMessages.push(text.slice(0, 600).trim());
          messageCount++;
        }
      }

      // File edits from assistant tool calls
      if (obj.type === "assistant" && Array.isArray(obj.message?.content)) {
        for (const block of obj.message.content) {
          if (block.type === "tool_use" && (block.name === "Edit" || block.name === "Write")) {
            const fp: string = block.input?.file_path || "";
            if (fp) {
              const rel = fp
                .replace("/home/max/crm/", "")
                .replace("/home/max/Obsidian/Nexorra/", "vault:");
              filesEdited.push(rel);
            }
          }
        }
      }
    } catch {
      // Skip malformed lines
    }
  }

  if (userMessages.length === 0) return null;

  // Detect topics
  const allText = userMessages.join(" ").toLowerCase();
  const topics = Object.entries(TOPIC_KEYWORDS)
    .filter(([, keywords]) => keywords.some((kw) => allText.includes(kw.toLowerCase())))
    .map(([topic]) => topic);

  const topicList = topics.length ? topics : ["general"];
  const primaryAgent = getPrimaryAgent(topicList);
  const subfolder = AGENT_SUBFOLDER[primaryAgent] || "dev/general";
  const context = generateContext(userMessages);
  const contextSlug = contextToSlug(context);

  const dateObj = firstTimestamp ? new Date(firstTimestamp) : new Date();
  const date = dateObj.toISOString().slice(0, 10);
  const time = dateObj.toISOString().slice(11, 16);

  return {
    sessionId,
    date,
    time,
    userMessages,
    filesEdited: Array.from(new Set(filesEdited)),
    topics: topicList,
    primaryAgent,
    subfolder,
    context,
    contextSlug,
    messageCount,
  };
}

// ─── Note builder ─────────────────────────────────────────────────────────────

function buildSessionNote(info: SessionInfo): string {
  // Frontmatter tags — Obsidian-style
  const tagList = [info.primaryAgent, ...info.topics.filter(t => t !== info.primaryAgent)]
    .slice(0, 8)
    .map(t => `  - ${t}`)
    .join("\n");

  const relatedLinks = info.topics
    .slice(0, 6)
    .map(t => `[[${t}]]`)
    .join(", ");

  // Descriptive title: "Jeff — Compass City Pool Fix (2026-04-02)"
  const agentLabel = info.primaryAgent.charAt(0).toUpperCase() + info.primaryAgent.slice(1).replace(/-/g, ' ');
  const contextShort = info.context.slice(0, 80);
  const noteTitle = `# ${agentLabel} — ${contextShort} (${info.date})`;

  // Key messages — cleaned up, most substantive ones first
  const substantiveMessages = info.userMessages
    .filter(m => m.length > 30 && !m.startsWith("Ok ") && !m.startsWith("Good") && !m.startsWith("Great"))
    .slice(0, 8);

  const allMessages = info.userMessages.slice(0, 12);
  const messageList = (substantiveMessages.length > 0 ? substantiveMessages : allMessages)
    .map((m, i) => `${i + 1}. ${m.replace(/\n/g, " ").slice(0, 280)}`)
    .join("\n");

  const filesList = info.filesEdited.length
    ? info.filesEdited.slice(0, 25).map(f => `- \`${f}\``).join("\n")
    : "_(no files edited)_";

  return `---
date: ${info.date}
time: ${info.time}
session_id: ${info.sessionId}
agent: ${info.primaryAgent}
context: "${info.context.replace(/"/g, "'").slice(0, 200)}"
tags:
${tagList}
exchanges: ${info.messageCount}
files_changed: ${info.filesEdited.length}
source: dev-conversation
---
${noteTitle}

**Context:** ${info.context}
**Agent:** ${info.primaryAgent} · **Topics:** ${relatedLinks}
**Exchanges:** ${info.messageCount} · **Files touched:** ${info.filesEdited.length}

---

## What Was Done

${messageList}

---

## Files Edited

${filesList}

---

## Related

${info.topics.slice(0, 6).map(t => `- [[${t}]]`).join("\n")}
`;
}

// ─── Topic index pages ────────────────────────────────────────────────────────

function ensureTopicPage(topic: string, folder: string, sessionRef: string): void {
  const topicFile = path.join(OBSIDIAN_ROOT, folder, `${topic}.md`);

  if (!fs.existsSync(topicFile)) {
    const content = `# ${topic}

_Topic index — auto-maintained by obsidian-conversation-sync_

## Sessions

- ${sessionRef}
`;
    fs.mkdirSync(path.dirname(topicFile), { recursive: true });
    fs.writeFileSync(topicFile, content);
    return;
  }

  const existing = fs.readFileSync(topicFile, "utf8");
  if (existing.includes(sessionRef)) return;

  // Append to Sessions section or create it
  if (existing.includes("## Sessions")) {
    const updated = existing.replace("## Sessions\n", `## Sessions\n- ${sessionRef}\n`);
    fs.writeFileSync(topicFile, updated);
  } else {
    fs.appendFileSync(topicFile, `\n## Sessions\n\n- ${sessionRef}\n`);
  }
}

// ─── Vault BRIEFING.md updater ────────────────────────────────────────────────

/**
 * Regenerate vault root BRIEFING.md from latest daily note + recent sessions.
 * This is what Claude sees first when the vault is mounted via --add-dir.
 */
function updateVaultBriefing(processedCount: number): void {
  const today = new Date().toISOString().slice(0, 10);

  // Read latest daily scraping summary
  const dailyFile = path.join(OBSIDIAN_ROOT, "Daily", `${today}-scraping.md`);
  const dailyContent = fs.existsSync(dailyFile)
    ? fs.readFileSync(dailyFile, "utf8").split("\n").slice(0, 15).join("\n")
    : "(No scraping session today)";

  // List recent session notes (last 10, sorted newest first)
  const sessionFiles: string[] = [];
  for (const sub of ["research/jeff", "research/derek", "research/petra", "marketing/stacey", "marketing/tara", "marketing/cole", "dev/infra", "dev/ui", "dev/general"]) {
    const dir = path.join(OBSIDIAN_SESSIONS, sub);
    if (fs.existsSync(dir)) {
      fs.readdirSync(dir)
        .filter(f => f.endsWith(".md"))
        .forEach(f => sessionFiles.push(`${sub}/${f}`));
    }
  }
  // Also flat sessions (backwards compat)
  if (fs.existsSync(OBSIDIAN_SESSIONS)) {
    fs.readdirSync(OBSIDIAN_SESSIONS)
      .filter(f => f.endsWith(".md"))
      .forEach(f => sessionFiles.push(f));
  }

  const recentSessions = sessionFiles
    .sort()
    .reverse()
    .slice(0, 8)
    .map(f => {
      const fullPath = path.join(OBSIDIAN_SESSIONS, f);
      if (!fs.existsSync(fullPath)) return null;
      const raw = fs.readFileSync(fullPath, "utf8");
      // Extract context field from frontmatter
      const contextMatch = raw.match(/^context:\s*"?([^"\n]{0,150})"?/m);
      const dateMatch = raw.match(/^date:\s*(.+)/m);
      const agentMatch = raw.match(/^agent:\s*(.+)/m);
      const context = contextMatch?.[1]?.trim() || '';
      const date = dateMatch?.[1]?.trim() || '';
      const agent = agentMatch?.[1]?.trim() || '';
      return context ? `- **${date} · ${agent}**: ${context}` : null;
    })
    .filter(Boolean)
    .join("\n");

  const briefing = `# Nexorra Vault Briefing — ${today}

_Auto-updated nightly by obsidian-conversation-sync. This is Claude's Layer 5 context._

## What Nexorra Does
AI appointment-setting agency for real estate agents (US + Canada). CRM + AI agents. Guarantee 3-5 closed deals in 90 days. Three outreach channels: cold email (Instantly), Instagram DMs, AI calling (OpenPhone/PersonaPlex).

## Active Pipelines
- **Jeff** (Lead Gen): Compass + RE/MAX + Realtor.com → 1,000 email + 350 Instagram + 500 calling leads/day
- **Derek** (Video): Per-lead personalised demo videos → landing pages at app.ainexorra.com/video/{id}
- **Stacey** (Cold Email): Instantly campaigns → upload 1,000 leads/day, 3-email sequence
- **Petra** (Local Biz): Google Maps → website demos → email/SMS outreach to local businesses
- **Tara** (Instagram): 5 accounts × 50 DMs/day = 250 DMs/day with video links
- **Cole** (Calling): AI voice (PersonaPlex) via OpenPhone → 500 calls/day

## Today's Lead Gen
${dailyContent}

## Recent Sessions
${recentSessions || "_(no recent sessions)_"}

## Key Locations
- CRM: \`/home/max/crm\` (Next.js 14 + Supabase)
- Vault: \`~/Obsidian/Nexorra\`
- Agents: \`.claude/commands/\` + \`agents/primers/\`
- Sessions: \`sessions/research/\`, \`sessions/marketing/\`, \`sessions/dev/\`

## Remember
- Lead data lives ONLY in Supabase — no individual lead notes in Obsidian
- Session notes: check \`sessions/{dept}/{agent}/\` for past work context
- All times BST. Device sleeps 2AM–9:50AM.
- Git push: \`GH_TOKEN=$(cat .gh-token) && git push https://\${GH_TOKEN}@github.com/UnityOfMax/nexorra-crm.git main\`

_Synced ${today} — ${processedCount} new sessions added_
`;

  fs.writeFileSync(path.join(OBSIDIAN_ROOT, "BRIEFING.md"), briefing, "utf8");
}

// ─── State management ─────────────────────────────────────────────────────────

async function loadState(): Promise<Record<string, boolean>> {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  } catch {
    return {};
  }
}

function saveState(state: Record<string, boolean>): void {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const reprocessAll = args.includes("--all");
  const specificSession = args.find((a, i) => args[i - 1] === "--session");

  // Ensure all subfolder directories exist
  const subfolders = [
    "research/jeff", "research/derek", "research/petra", "research/nina",
    "marketing/stacey", "marketing/lionel", "marketing/tara", "marketing/cole",
    "marketing/cold-email", "marketing/instagram", "marketing/meta-ads",
    "dev/infra", "dev/ui", "dev/general",
  ];
  for (const sub of subfolders) {
    fs.mkdirSync(path.join(OBSIDIAN_SESSIONS, sub), { recursive: true });
  }

  const state = reprocessAll ? {} : await loadState();

  let files = fs.readdirSync(SESSIONS_DIR)
    .filter(f => f.endsWith(".jsonl"))
    .map(f => ({ id: f.replace(".jsonl", ""), path: path.join(SESSIONS_DIR, f) }));

  if (specificSession) {
    files = files.filter(f => f.id === specificSession);
  }

  const toProcess = files.filter(f => !state[f.id]);
  console.log(`Found ${files.length} sessions, ${toProcess.length} unprocessed`);

  let processed = 0;
  let skipped = 0;

  for (const file of toProcess) {
    try {
      const info = await extractSessionInfo(file.path, file.id);

      if (!info) {
        state[file.id] = true;
        skipped++;
        continue;
      }

      // Filename: {date}-{context-slug}.md — descriptive, not just date-time-topic
      const noteFilename = `${info.date}-${info.contextSlug}.md`;
      const subfolder = path.join(OBSIDIAN_SESSIONS, info.subfolder);
      fs.mkdirSync(subfolder, { recursive: true });
      const notePath = path.join(subfolder, noteFilename);

      // If note exists but reprocessing, overwrite; else skip
      if (fs.existsSync(notePath) && !reprocessAll) {
        state[file.id] = true;
        skipped++;
        continue;
      }

      const noteContent = buildSessionNote(info);
      fs.writeFileSync(notePath, noteContent);

      // Update topic index pages with backlink
      const sessionRef = `[[sessions/${info.subfolder}/${noteFilename.replace(".md", "")}]] — ${info.date}: ${info.context.slice(0, 60)}`;
      for (const topic of info.topics.slice(0, 5)) {
        const folder = TOPIC_FOLDERS[topic] || "Engineering";
        ensureTopicPage(topic, folder, sessionRef);
      }

      state[file.id] = true;
      processed++;

      if (processed % 50 === 0) {
        console.log(`  ${processed} processed...`);
        saveState(state);
      }
    } catch (err) {
      console.warn(`  WARN: Failed to process ${file.id}: ${(err as Error).message}`);
      state[file.id] = true;
      skipped++;
    }
  }

  saveState(state);

  // Always update vault BRIEFING.md so it's fresh for next Claude session
  updateVaultBriefing(processed);
  console.log(`Done. Processed: ${processed}, Skipped: ${skipped}`);
  console.log(`BRIEFING.md updated at ~/Obsidian/Nexorra/BRIEFING.md`);
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
