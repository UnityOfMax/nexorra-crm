/**
 * Static agent definitions — source of truth for prompt files and defaults.
 * Shared between the API route and the daemon server.
 */
export const AGENT_DEFINITIONS: Record<string, { promptFile: string; model: string; maxTurns: number }> = {
  'lead-gen':                { promptFile: '.claude/commands/nexorra/lead-gen.md',                model: 'sonnet', maxTurns: 120 },
  'cold-email-upload':       { promptFile: '.claude/commands/nexorra/cold-email-upload.md',       model: 'haiku',  maxTurns: 60  },
  'cold-email-replies':      { promptFile: '.claude/commands/nexorra/cold-email-replies.md',      model: 'haiku',  maxTurns: 80  },
  'cold-email-maintenance':  { promptFile: '.claude/commands/nexorra/cold-email-maintenance.md',  model: 'haiku',  maxTurns: 60  },
  'campaign-review':         { promptFile: '.claude/commands/nexorra/campaign-review.md',         model: 'sonnet', maxTurns: 40  },
  'campaign-optimizer':      { promptFile: '.claude/commands/nexorra/campaign-optimizer.md',      model: 'sonnet', maxTurns: 60  },
  'client-reply':            { promptFile: '.claude/commands/client/reply.md',                    model: 'haiku',  maxTurns: 60  },
  'ops-report':              { promptFile: '.claude/commands/ops/report.md',                      model: 'haiku',  maxTurns: 40  },
  'instagram-outreach':      { promptFile: '.claude/commands/nexorra/instagram-outreach.md',      model: 'sonnet', maxTurns: 100 },
  'instagram-replies':       { promptFile: '.claude/commands/nexorra/instagram-replies.md',       model: 'haiku',  maxTurns: 80  },
};
