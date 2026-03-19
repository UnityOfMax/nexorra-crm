/**
 * Intent classifier for Lena — routes ACTION requests to departments.
 * Only called when the message is clearly an action (build, fix, create, etc).
 */

import { type DepartmentKey } from '@/lib/agents/definitions';

interface ClassificationResult {
  department: DepartmentKey;
  headAgent: string;
  urgency: 'urgent' | 'high' | 'normal' | 'low';
  taskSummary: string;
}

const DEPARTMENT_KEYWORDS: Array<{ keywords: string[]; department: DepartmentKey; head: string }> = [
  // Research — lead gen, scraping, market research
  { keywords: ['lead', 'scrape', 'brokerage', 'research', 'market', 'jeff', 'nina', 'derek', 'city', 'agent list'], department: 'research', head: 'jeff' },

  // Marketing — outreach, email, instagram, ads, copy
  { keywords: ['email', 'instantly', 'instagram', 'dm', 'outreach', 'campaign', 'copy', 'ad', 'stacey', 'priya', 'tara', 'malik', 'jess', 'vera', 'lionel', 'subject line', 'template', 'cold email'], department: 'marketing', head: 'stacey' },

  // Client — sub-accounts, onboarding, client-specific
  { keywords: ['client', 'onboard', 'subaccount', 'sub-account', 'avatar', 'ava', 'omar', 'riya', 'nadia', 'iris', 'buyer', 'seller', 'landing page copy'], department: 'client', head: 'ava' },

  // Delivery — optimization, reporting, meta, funnel
  { keywords: ['optimize', 'meta', 'funnel', 'report', 'analytics', 'marcus', 'fiona', 'glen', 'ad set', 'budget', 'performance'], department: 'delivery', head: 'marcus' },

  // Experiments — testing, A/B, experiment, simulate
  { keywords: ['experiment', 'a/b', 'simulate', 'hugo', 'mira', 'quinn', 'variant', 'hypothesis'], department: 'experiments', head: 'hugo' },

  // Engineering — code, build, deploy, fix bugs, UI, API
  { keywords: ['bug', 'fix', 'build', 'deploy', 'code', 'feature', 'ui', 'api', 'frontend', 'backend', 'barny', 'archie', 'kai', 'liam', 'sophie', 'zara', 'component', 'route', 'database', 'mobile', 'pwa', 'responsive', 'css', 'dark mode', 'light mode', 'sidebar', 'dashboard', 'page', 'redesign', 'refactor'], department: 'engineering', head: 'barny' },
];

const URGENCY_KEYWORDS: Record<string, 'urgent' | 'high'> = {
  urgent: 'urgent', asap: 'urgent', emergency: 'urgent', broken: 'urgent',
  down: 'urgent', 'right now': 'urgent', immediately: 'urgent',
  important: 'high', priority: 'high',
};

export function classifyMessage(text: string): ClassificationResult {
  const lower = text.toLowerCase();

  // Detect urgency
  let urgency: 'urgent' | 'high' | 'normal' | 'low' = 'normal';
  for (const [keyword, level] of Object.entries(URGENCY_KEYWORDS)) {
    if (lower.includes(keyword)) { urgency = level; break; }
  }

  // Score each department
  const scores: Record<string, { score: number; dept: DepartmentKey; head: string }> = {};
  for (const { keywords, department, head } of DEPARTMENT_KEYWORDS) {
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) score++;
    }
    if (score > 0) {
      scores[department] = { score, dept: department, head };
    }
  }

  // Pick the best match
  let best: { dept: DepartmentKey; head: string } | null = null;
  let bestScore = 0;
  for (const entry of Object.values(scores)) {
    if (entry.score > bestScore) {
      bestScore = entry.score;
      best = { dept: entry.dept, head: entry.head };
    }
  }

  // If no match, default to engineering (most action requests are dev work)
  if (!best) {
    best = { dept: 'engineering', head: 'barny' };
  }

  return {
    department: best.dept,
    headAgent: best.head,
    urgency,
    taskSummary: text.slice(0, 200),
  };
}
