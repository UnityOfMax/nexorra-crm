/**
 * Intent classifier for Lena (PA).
 * Uses a lightweight inline classification — no LLM call needed for obvious routing.
 * Falls back to Haiku via daemon for ambiguous messages.
 */

import { DEPARTMENTS, type DepartmentKey } from '@/lib/agents/definitions';

interface ClassificationResult {
  department: DepartmentKey;
  headAgent: string;
  urgency: 'urgent' | 'high' | 'normal' | 'low';
  taskSummary: string;
}

const KEYWORD_MAP: Record<string, { department: DepartmentKey; head: string }> = {
  // Research
  lead: { department: 'research', head: 'jeff' },
  scrape: { department: 'research', head: 'jeff' },
  brokerage: { department: 'research', head: 'jeff' },
  research: { department: 'research', head: 'jeff' },
  market: { department: 'research', head: 'jeff' },

  // Marketing
  email: { department: 'marketing', head: 'stacey' },
  instantly: { department: 'marketing', head: 'stacey' },
  instagram: { department: 'marketing', head: 'stacey' },
  dm: { department: 'marketing', head: 'stacey' },
  outreach: { department: 'marketing', head: 'stacey' },
  campaign: { department: 'marketing', head: 'stacey' },
  copy: { department: 'marketing', head: 'stacey' },
  ad: { department: 'marketing', head: 'stacey' },

  // Client
  client: { department: 'client', head: 'ava' },
  onboard: { department: 'client', head: 'ava' },
  subaccount: { department: 'client', head: 'ava' },
  avatar: { department: 'client', head: 'ava' },
  'sub-account': { department: 'client', head: 'ava' },

  // Delivery
  optimize: { department: 'delivery', head: 'marcus' },
  meta: { department: 'delivery', head: 'marcus' },
  funnel: { department: 'delivery', head: 'marcus' },
  report: { department: 'delivery', head: 'marcus' },
  analytics: { department: 'delivery', head: 'marcus' },

  // Engineering
  bug: { department: 'engineering', head: 'barny' },
  fix: { department: 'engineering', head: 'barny' },
  build: { department: 'engineering', head: 'barny' },
  deploy: { department: 'engineering', head: 'barny' },
  code: { department: 'engineering', head: 'barny' },
  feature: { department: 'engineering', head: 'barny' },
  ui: { department: 'engineering', head: 'barny' },
  api: { department: 'engineering', head: 'barny' },
  frontend: { department: 'engineering', head: 'barny' },
  backend: { department: 'engineering', head: 'barny' },

  // Experiments
  experiment: { department: 'experiments', head: 'hugo' },
  test: { department: 'experiments', head: 'hugo' },
  'a/b': { department: 'experiments', head: 'hugo' },
  simulate: { department: 'experiments', head: 'hugo' },
};

const URGENCY_KEYWORDS: Record<string, 'urgent' | 'high'> = {
  urgent: 'urgent',
  asap: 'urgent',
  emergency: 'urgent',
  broken: 'urgent',
  down: 'urgent',
  important: 'high',
  priority: 'high',
  'right now': 'urgent',
  immediately: 'urgent',
};

export function classifyMessage(text: string): ClassificationResult {
  const lower = text.toLowerCase();
  const words = lower.split(/\s+/);

  // Detect urgency
  let urgency: 'urgent' | 'high' | 'normal' | 'low' = 'normal';
  for (const [keyword, level] of Object.entries(URGENCY_KEYWORDS)) {
    if (lower.includes(keyword)) { urgency = level; break; }
  }

  // Match department by keywords
  const scores: Record<string, number> = {};
  for (const word of words) {
    const match = KEYWORD_MAP[word];
    if (match) {
      scores[match.department] = (scores[match.department] || 0) + 1;
    }
  }

  // Find best match
  let bestDept: DepartmentKey = 'engineering'; // default
  let bestHead = 'barny';
  let bestScore = 0;

  for (const [dept, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestDept = dept as DepartmentKey;
      const match = Object.values(KEYWORD_MAP).find(m => m.department === dept);
      if (match) bestHead = match.head;
    }
  }

  return {
    department: bestDept,
    headAgent: bestHead,
    urgency,
    taskSummary: text.slice(0, 200),
  };
}
