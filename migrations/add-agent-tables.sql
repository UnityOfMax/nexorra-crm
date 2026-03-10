-- Command Center: agent_configs + agent_runs tables
-- Run in Supabase SQL editor

-- Agent configuration (one row per agent)
CREATE TABLE IF NOT EXISTS agent_configs (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  schedule TEXT,
  model TEXT NOT NULL DEFAULT 'haiku',
  max_turns INTEGER NOT NULL DEFAULT 60,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  prompt_file TEXT,
  cron_script TEXT,
  memory_file TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Agent run history
CREATE TABLE IF NOT EXISTS agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL REFERENCES agent_configs(id),
  status TEXT NOT NULL DEFAULT 'running',
  trigger TEXT NOT NULL DEFAULT 'cron',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  summary TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_agent_id ON agent_runs(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_started_at ON agent_runs(started_at DESC);

-- Seed all 12 agents
INSERT INTO agent_configs (id, category, name, description, schedule, model, max_turns, prompt_file, cron_script, memory_file) VALUES
  ('lead-gen', 'nexorra', 'Lead Gen', 'Scrape real estate agent leads from brokerage websites', '0 8 * * *', 'haiku', 100, '.claude/commands/nexorra/lead-gen.md', 'scripts/cron/lead-gen.sh', 'agents/memory/lead-gen.md'),
  ('cold-email-upload', 'nexorra', 'Cold Email Upload', 'Push leads to Instantly cold email campaigns', '0 9 * * *', 'haiku', 50, '.claude/commands/nexorra/cold-email-upload.md', 'scripts/cron/cold-email-upload.sh', 'agents/memory/cold-email.md'),
  ('cold-email-replies', 'nexorra', 'Cold Email Replies', 'Classify and respond to inbound cold email replies', '*/15 * * * *', 'haiku', 80, '.claude/commands/nexorra/cold-email-replies.md', 'scripts/cron/cold-email-replies.sh', 'agents/memory/cold-email.md'),
  ('cold-email-maintenance', 'nexorra', 'Cold Email Maintenance', 'Nudge, ghosted detection, and learning cycle', '0 20 * * *', 'haiku', 60, '.claude/commands/nexorra/cold-email-maintenance.md', 'scripts/cron/cold-email-maintenance.sh', 'agents/memory/cold-email.md'),
  ('campaign-review', 'nexorra', 'Campaign Review', 'Analyze cold email campaign performance metrics', NULL, 'sonnet', 40, '.claude/commands/nexorra/campaign-review.md', NULL, 'agents/memory/campaign-metrics.md'),
  ('client-reply', 'client', 'Client Reply', 'Handle inbound SMS and email for all client sub-accounts', '*/5 * * * *', 'haiku', 60, '.claude/commands/client/reply.md', 'scripts/cron/client-replies.sh', 'agents/memory/client-reply.md'),
  ('client-onboard', 'client', 'Client Onboard', 'Create new client sub-account with default configuration', NULL, 'sonnet', 30, '.claude/commands/client/onboard.md', NULL, NULL),
  ('dev-frontend', 'dev', 'Frontend Dev', 'React/Next.js component development', NULL, 'sonnet', 200, '.claude/commands/dev/frontend.md', NULL, 'agents/memory/code-review.md'),
  ('dev-backend', 'dev', 'Backend Dev', 'API routes, Supabase, and integrations', NULL, 'sonnet', 200, '.claude/commands/dev/backend.md', NULL, 'agents/memory/code-review.md'),
  ('dev-review', 'dev', 'Code Review', 'Review staged git changes', NULL, 'sonnet', 50, '.claude/commands/dev/review.md', NULL, 'agents/memory/code-review.md'),
  ('dev-test', 'dev', 'Test Runner', 'Run build and validate API routes', NULL, 'sonnet', 30, '.claude/commands/dev/test.md', NULL, NULL),
  ('dev-preview', 'dev', 'Preview Server', 'Start local dev server with cloudflared tunnel', NULL, 'sonnet', 20, '.claude/commands/dev/preview.md', NULL, NULL),
  ('ops-report', 'ops', 'Daily Report', 'Aggregate daily metrics across all systems', '0 21 * * *', 'haiku', 30, '.claude/commands/ops/report.md', 'scripts/cron/daily-report.sh', NULL),
  ('sms-reply-service', 'client', 'SMS Reply Service', 'Real-time AI replies to inbound SMS via Twilio + Kimi K2.5 (webhook-driven, 15s debounce)', 'webhook', 'kimi-k2.5', 0, NULL, NULL, 'agents/memory/client-reply.md'),
  ('email-reply-service', 'client', 'Email Reply Service', 'Real-time AI replies to inbound emails via Resend + Kimi K2.5 (webhook-driven, immediate)', 'webhook', 'kimi-k2.5', 0, NULL, NULL, 'agents/memory/client-reply.md'),
  ('model-router', 'ops', 'Model Router', 'Analyzes tasks and routes to the best model: Haiku (simple), Sonnet (coding), Opus (complex reasoning)', NULL, 'haiku', 10, '.claude/commands/ops/route.md', NULL, NULL),
  ('shannon', 'ops', 'Shannon', 'Receptionist & orchestrator — plans tasks, picks models, chains agents, executes from CRM', NULL, 'sonnet', 100, '.claude/commands/ops/shannon.md', NULL, NULL)
ON CONFLICT (id) DO NOTHING;
