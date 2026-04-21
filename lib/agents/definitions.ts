/**
 * Nexorra Agent Org Structure — 30 agents across 7 departments.
 * Source of truth for prompt files, models, org hierarchy.
 */

export interface AgentDef {
  promptFile: string;
  model: string;
  maxTurns: number;
  department: string;
  role: 'head' | 'agent';
  reportsTo?: string;
  displayName: string;
  skills?: string[];
  mcps?: string[];
  schedule?: string;
  /** Legacy ID for backward-compatible cron scripts */
  legacyId?: string;
  /** Always show in ClockedIn as idle/waiting even when not actively running */
  alwaysOn?: boolean;
}

export const DEPARTMENTS = {
  executive:   { label: 'Executive',              color: '#8b5cf6', icon: '👑' },
  research:    { label: 'Research & Intelligence', color: '#3b82f6', icon: '🔬' },
  marketing:   { label: 'Marketing & Outreach',   color: '#ec4899', icon: '📣' },
  client:      { label: 'Client Success',         color: '#10b981', icon: '🤝' },
  delivery:    { label: 'Service Delivery',        color: '#f59e0b', icon: '📊' },
  engineering: { label: 'Engineering',             color: '#6366f1', icon: '⚙️' },
  experiments: { label: 'Experiments & Innovation', color: '#ef4444', icon: '🧪' },
  council:     { label: 'The Council',             color: '#d97706', icon: '⚖️' },
} as const;

export type DepartmentKey = keyof typeof DEPARTMENTS;

export const AGENT_DEFINITIONS: Record<string, AgentDef> = {
  // ─── Executive ──────────────────────────────────────────────────────────────
  'lena': {
    promptFile: '.claude/commands/executive/pa.md',
    model: 'sonnet', maxTurns: 30,
    department: 'executive', role: 'head',
    displayName: 'Lena',
    mcps: ['memory', 'sequential-thinking'],
    schedule: 'Telegram webhook (always-on)',
  },

  // ─── Research & Intelligence ────────────────────────────────────────────────
  'jeff': {
    promptFile: '.claude/commands/research/lead-gen.md',
    model: 'haiku', maxTurns: 120,
    department: 'research', role: 'head',
    displayName: 'Jeff',
    skills: ['opencli'],
    mcps: ['filesystem', 'fetch', 'playwright'],
    schedule: '10:00 AM daily',
    legacyId: 'lead-gen',
  },
  'nina': {
    promptFile: '.claude/commands/research/quality-check.md',
    model: 'haiku', maxTurns: 40,
    department: 'research', role: 'agent', reportsTo: 'jeff',
    displayName: 'Nina',
    schedule: '11:00 PM daily',
    legacyId: 'lead-gen-quality-check',
  },
'derek': {
    promptFile: '.claude/commands/research/market-research.md',
    model: 'opus', maxTurns: 30,
    department: 'research', role: 'agent', reportsTo: 'jeff',
    displayName: 'Derek',
    skills: ['opencli', 'agentdb-memory-patterns'],
    mcps: ['fetch', 'sequential-thinking', 'memory', 'youtube-transcript'],
    schedule: 'Manual + collaborative',
  },

  // ─── Marketing & Outreach ──────────────────────────────────────────────────
  'stacey': {
    promptFile: '.claude/commands/marketing/cold-email-upload.md',
    model: 'haiku', maxTurns: 60,
    department: 'marketing', role: 'head',
    displayName: 'Stacey',
    mcps: ['filesystem', 'supabase'],
    schedule: '10:00 AM daily',
    legacyId: 'cold-email-upload',
  },
  'priya': {
    promptFile: '.claude/commands/marketing/cold-email-replies.md',
    model: 'haiku', maxTurns: 80,
    department: 'marketing', role: 'agent', reportsTo: 'stacey',
    displayName: 'Priya',
    skills: ['humanizer'],
    schedule: 'Webhook (Instantly)',
    legacyId: 'cold-email-replies',
  },
  'lionel': {
    promptFile: '.claude/commands/marketing/cold-email-maintenance.md',
    model: 'haiku', maxTurns: 60,
    department: 'marketing', role: 'agent', reportsTo: 'stacey',
    displayName: 'Lionel',
    skills: ['humanizer'],
    schedule: '8:00 PM daily',
    legacyId: 'cold-email-maintenance',
  },
  'tara': {
    promptFile: '.claude/commands/marketing/instagram-outreach.md',
    model: 'sonnet', maxTurns: 100,
    department: 'marketing', role: 'agent', reportsTo: 'stacey',
    displayName: 'Tara',
    skills: ['humanizer', 'opencli'],
    schedule: '10:30 AM daily',
    legacyId: 'instagram-outreach',
  },
  'malik': {
    promptFile: '.claude/commands/marketing/instagram-replies.md',
    model: 'haiku', maxTurns: 80,
    department: 'marketing', role: 'agent', reportsTo: 'stacey',
    displayName: 'Malik',
    skills: ['humanizer'],
    schedule: 'Webhook (IG)',
    legacyId: 'instagram-replies',
  },
  'jess': {
    promptFile: '.claude/commands/marketing/instagram-followup.md',
    model: 'haiku', maxTurns: 150,
    department: 'marketing', role: 'agent', reportsTo: 'stacey',
    displayName: 'Jess',
    skills: ['humanizer'],
    schedule: '6:00 PM daily',
    legacyId: 'instagram-followup',
  },
  'vera': {
    promptFile: '.claude/commands/marketing/copywriter.md',
    model: 'sonnet', maxTurns: 40,
    department: 'marketing', role: 'agent', reportsTo: 'stacey',
    displayName: 'Vera',
    skills: ['humanizer', 'opencli'],
    mcps: ['21st-magic', 'memory'],
    schedule: 'Manual',
  },
  'cole': {
    promptFile: '.claude/commands/marketing/calling-outreach.md',
    model: 'haiku', maxTurns: 30,
    department: 'marketing', role: 'agent', reportsTo: 'stacey',
    displayName: 'Cole',
    schedule: '3:00 AM BST daily (nightly review after calling window)',
    legacyId: 'calling-outreach',
  },

  // ─── Client Success & Delivery ─────────────────────────────────────────────
  'ava': {
    promptFile: '.claude/commands/client/head.md',
    model: 'sonnet', maxTurns: 60,
    department: 'client', role: 'head',
    displayName: 'Ava',
    schedule: 'Manual',
  },
  'omar': {
    promptFile: '.claude/commands/client/reply.md',
    model: 'claude-haiku-4-5', maxTurns: 60,
    department: 'client', role: 'agent', reportsTo: 'ava',
    displayName: 'Omar',
    skills: ['humanizer', 'stop-slop'],
    schedule: 'Webhook-triggered · 24/7',
    legacyId: 'client-reply',
    alwaysOn: true,
  },
  'riya': {
    promptFile: '.claude/commands/client/onboard.md',
    model: 'sonnet', maxTurns: 80,
    department: 'client', role: 'agent', reportsTo: 'ava',
    displayName: 'Riya',
    schedule: 'Auto-triggered on "Deal Closed"',
  },
  'nadia': {
    promptFile: '.claude/commands/client/copywriter.md',
    model: 'sonnet', maxTurns: 60,
    department: 'client', role: 'agent', reportsTo: 'ava',
    displayName: 'Nadia',
    skills: ['humanizer', 'opencli'],
    mcps: ['21st-magic', 'memory'],
    schedule: 'Manual',
  },
  'iris': {
    promptFile: '.claude/commands/client/avatar-builder.md',
    model: 'sonnet', maxTurns: 80,
    department: 'client', role: 'agent', reportsTo: 'ava',
    displayName: 'Iris',
    skills: ['opencli'],
    mcps: ['fetch', 'memory', 'supabase'],
    schedule: 'Manual + periodic',
  },
  'marcus': {
    promptFile: '.claude/commands/delivery/campaign-optimizer.md',
    model: 'sonnet', maxTurns: 60,
    department: 'delivery', role: 'head',
    displayName: 'Marcus',
    schedule: '10:00 PM daily',
    legacyId: 'campaign-optimizer',
  },
  'fiona': {
    promptFile: '.claude/commands/delivery/campaign-review.md',
    model: 'sonnet', maxTurns: 40,
    department: 'delivery', role: 'agent', reportsTo: 'marcus',
    displayName: 'Fiona',
    schedule: 'Manual',
    legacyId: 'campaign-review',
  },
  'glen': {
    promptFile: '.claude/commands/delivery/report.md',
    model: 'haiku', maxTurns: 40,
    department: 'delivery', role: 'agent', reportsTo: 'marcus',
    displayName: 'Glen',
    schedule: '9:00 PM daily',
    legacyId: 'ops-report',
  },

  // ─── Engineering ────────────────────────────────────────────────────────────
  'barny': {
    promptFile: '.claude/commands/engineering/head.md',
    model: 'sonnet', maxTurns: 60,
    department: 'engineering', role: 'head',
    displayName: 'Barny',
    skills: ['sparc-methodology', 'swarm-orchestration', 'verification-quality'],
    mcps: ['filesystem', 'supabase', 'context7'],
    schedule: 'Manual',
  },
  'archie': {
    promptFile: '.claude/commands/engineering/architect.md',
    model: 'opus', maxTurns: 80,
    department: 'engineering', role: 'agent', reportsTo: 'barny',
    displayName: 'Archie',
    skills: ['sparc-methodology', 'pair-programming'],
    mcps: ['filesystem', 'supabase', 'context7', 'sequential-thinking'],
    schedule: 'Manual',
  },
  'kai': {
    promptFile: '.claude/commands/engineering/frontend.md',
    model: 'sonnet', maxTurns: 80,
    department: 'engineering', role: 'agent', reportsTo: 'barny',
    displayName: 'Kai',
    skills: ['frontend-design', 'sparc-methodology', 'pair-programming'],
    mcps: ['21st-magic', 'context7', 'filesystem'],
    schedule: 'Manual',
  },
  'liam': {
    promptFile: '.claude/commands/engineering/backend.md',
    model: 'sonnet', maxTurns: 80,
    department: 'engineering', role: 'agent', reportsTo: 'barny',
    displayName: 'Liam',
    skills: ['sparc-methodology', 'pair-programming', 'agentdb-memory-patterns'],
    mcps: ['supabase', 'context7', 'filesystem'],
    schedule: 'Manual',
  },
  'sophie': {
    promptFile: '.claude/commands/engineering/review.md',
    model: 'sonnet', maxTurns: 40,
    department: 'engineering', role: 'agent', reportsTo: 'barny',
    displayName: 'Sophie',
    skills: ['verification-quality'],
    mcps: ['filesystem', 'context7'],
    schedule: 'Manual',
  },
  'zara': {
    promptFile: '.claude/commands/engineering/test.md',
    model: 'sonnet', maxTurns: 30,
    department: 'engineering', role: 'agent', reportsTo: 'barny',
    displayName: 'Zara',
    skills: ['verification-quality'],
    schedule: 'Manual',
  },

  // ─── The Council ────────────────────────────────────────────────────────────
  'chairman': {
    promptFile: '.claude/commands/council/deliberate.md',
    model: 'sonnet', maxTurns: 10,
    department: 'council', role: 'head',
    displayName: 'The Chairman',
    schedule: 'Manual · /council [question]',
  },
  'strategist': {
    promptFile: '.claude/commands/council/deliberate.md',
    model: 'sonnet', maxTurns: 5,
    department: 'council', role: 'agent', reportsTo: 'chairman',
    displayName: 'The Strategist',
    schedule: 'Manual',
  },
  'skeptic': {
    promptFile: '.claude/commands/council/deliberate.md',
    model: 'sonnet', maxTurns: 5,
    department: 'council', role: 'agent', reportsTo: 'chairman',
    displayName: 'The Skeptic',
    schedule: 'Manual',
  },
  'creative': {
    promptFile: '.claude/commands/council/deliberate.md',
    model: 'sonnet', maxTurns: 5,
    department: 'council', role: 'agent', reportsTo: 'chairman',
    displayName: 'The Creative',
    schedule: 'Manual',
  },
  'analyst': {
    promptFile: '.claude/commands/council/deliberate.md',
    model: 'sonnet', maxTurns: 5,
    department: 'council', role: 'agent', reportsTo: 'chairman',
    displayName: 'The Analyst',
    schedule: 'Manual',
  },
  'operator': {
    promptFile: '.claude/commands/council/deliberate.md',
    model: 'sonnet', maxTurns: 5,
    department: 'council', role: 'agent', reportsTo: 'chairman',
    displayName: 'The Operator',
    schedule: 'Manual',
  },
  'buyer': {
    promptFile: '.claude/commands/council/deliberate.md',
    model: 'sonnet', maxTurns: 5,
    department: 'council', role: 'agent', reportsTo: 'chairman',
    displayName: 'The Buyer',
    schedule: 'Manual',
  },

  // ─── Experiments & Innovation ───────────────────────────────────────────────
  'hugo': {
    promptFile: '.claude/commands/experiments/head.md',
    model: 'sonnet', maxTurns: 60,
    department: 'experiments', role: 'head',
    displayName: 'Hugo',
    skills: ['opencli', 'agentdb-learning', 'hooks-automation'],
    mcps: ['fetch', 'memory', 'sequential-thinking'],
    schedule: '10:00 PM daily (if usage <80%)',
  },
  'mira': {
    promptFile: '.claude/commands/experiments/simulator.md',
    model: 'sonnet', maxTurns: 80,
    department: 'experiments', role: 'agent', reportsTo: 'hugo',
    displayName: 'Mira',
    skills: ['opencli', 'agentdb-learning'],
    mcps: ['memory', 'fetch'],
    schedule: '10:30 PM (triggered by Hugo)',
  },
  'quinn': {
    promptFile: '.claude/commands/experiments/logger.md',
    model: 'haiku', maxTurns: 40,
    department: 'experiments', role: 'agent', reportsTo: 'hugo',
    displayName: 'Quinn',
    schedule: '11:00 PM (triggered by Hugo)',
  },
};

/**
 * Resolve agent by ID — checks both new IDs and legacy IDs.
 */
export function resolveAgent(id: string): { agentId: string; def: AgentDef } | null {
  if (AGENT_DEFINITIONS[id]) return { agentId: id, def: AGENT_DEFINITIONS[id] };
  // Check legacy IDs
  for (const [agentId, def] of Object.entries(AGENT_DEFINITIONS)) {
    if (def.legacyId === id) return { agentId, def };
  }
  return null;
}

/**
 * Get all agents in a department.
 */
export function getDepartmentAgents(department: DepartmentKey): Array<{ id: string; def: AgentDef }> {
  return Object.entries(AGENT_DEFINITIONS)
    .filter(([, def]) => def.department === department)
    .map(([id, def]) => ({ id, def }));
}

/**
 * Get the head of a department.
 */
export function getDepartmentHead(department: DepartmentKey): { id: string; def: AgentDef } | null {
  const entry = Object.entries(AGENT_DEFINITIONS)
    .find(([, def]) => def.department === department && def.role === 'head');
  return entry ? { id: entry[0], def: entry[1] } : null;
}
