// 3-Tier Model Routing (adapted from Ruflo ADR-026)
// Tier 1: Simple transforms — no LLM needed
// Tier 2: Haiku — routine tasks (<30% complexity)
// Tier 3: Sonnet/Opus — complex reasoning (>30%)

export interface RoutingDecision {
  model: string;
  tier: 1 | 2 | 3;
  reason: string;
}

const TIER_2_MODEL = 'claude-haiku-4-5-20251001';
const TIER_3_MODEL = 'claude-sonnet-4-5';
const TIER_3_HEAVY = 'claude-opus-4-6';

// Keywords that indicate complexity level
const LOW_KEYWORDS = ['upload', 'check', 'report', 'list', 'count', 'status', 'sync', 'push', 'fetch', 'send', 'notify', 'log', 'schedule', 'maintenance', 'nudge', 'followup'];
const MED_KEYWORDS = ['fix', 'update', 'modify', 'analyze', 'respond', 'reply', 'personalize', 'research', 'optimize', 'review', 'test', 'build', 'create', 'implement'];
const HIGH_KEYWORDS = ['architect', 'redesign', 'plan', 'refactor', 'security', 'migrate', 'overhaul', 'strategy', 'deep-research', 'complex', 'multi-step'];

function scoreComplexity(task: string): number {
  const lower = task.toLowerCase();
  let score = 0;
  let matches = 0;

  for (const kw of HIGH_KEYWORDS) {
    if (lower.includes(kw)) { score += 80; matches++; }
  }
  for (const kw of MED_KEYWORDS) {
    if (lower.includes(kw)) { score += 45; matches++; }
  }
  for (const kw of LOW_KEYWORDS) {
    if (lower.includes(kw)) { score += 15; matches++; }
  }

  if (matches === 0) return 40; // default to medium if unclear
  return Math.min(100, Math.round(score / matches));
}

export function routeModel(
  agentId: string,
  taskDescription: string,
  definitions?: Record<string, any>
): RoutingDecision {
  const def = definitions?.[agentId];

  // If agent has explicit model override, respect it
  if (def?.model && typeof def.model === 'string') {
    const tier = def.model.includes('opus') ? 3 : def.model.includes('sonnet') ? 3 : 2;
    return { model: def.model, tier, reason: `Agent ${agentId} has fixed model: ${def.model}` };
  }

  const complexity = scoreComplexity(taskDescription);

  if (complexity < 30) {
    return { model: TIER_2_MODEL, tier: 2, reason: `Low complexity (${complexity}%) — routine task` };
  }

  if (complexity < 70) {
    return { model: TIER_3_MODEL, tier: 3, reason: `Medium complexity (${complexity}%) — needs reasoning` };
  }

  // High complexity — check if agent has opus access
  const useOpus = def?.role === 'head' || agentId === 'archie' || agentId === 'derek';
  return {
    model: useOpus ? TIER_3_HEAVY : TIER_3_MODEL,
    tier: 3,
    reason: `High complexity (${complexity}%)${useOpus ? ' — using Opus' : ' — Sonnet (no Opus access)'}`,
  };
}
