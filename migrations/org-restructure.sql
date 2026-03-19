-- ============================================================================
-- Nexorra CRM Org Restructure Migration
-- Run in Supabase SQL Editor
-- ============================================================================

-- 1. Agent configs: add org structure columns
ALTER TABLE agent_configs ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE agent_configs ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'agent';
ALTER TABLE agent_configs ADD COLUMN IF NOT EXISTS reports_to TEXT;
ALTER TABLE agent_configs ADD COLUMN IF NOT EXISTS display_name TEXT;

-- 2. Agent messages: inter-agent communication
CREATE TABLE IF NOT EXISTS agent_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_agent TEXT NOT NULL,
  to_agent TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'task',
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT DEFAULT 'pending',
  parent_id UUID REFERENCES agent_messages(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  result JSONB
);
CREATE INDEX IF NOT EXISTS idx_agent_messages_to ON agent_messages(to_agent, status);
CREATE INDEX IF NOT EXISTS idx_agent_messages_created ON agent_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_messages_parent ON agent_messages(parent_id);

-- 3. Client avatars: per-client buyer/seller persona
CREATE TABLE IF NOT EXISTS client_avatars (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id),
  avatar_type TEXT DEFAULT 'both',
  location JSONB,
  price_range JSONB,
  demographics TEXT,
  pain_points JSONB,
  motivations JSONB,
  objections JSONB,
  messaging_hooks JSONB,
  brokerage TEXT,
  agent_website TEXT,
  raw_research JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_client_avatars_account ON client_avatars(account_id);

-- 4. Task board: drag-and-drop task management
CREATE TABLE IF NOT EXISTS task_board (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'normal',
  status TEXT DEFAULT 'todo',
  assigned_agent TEXT,
  assigned_department TEXT,
  created_by TEXT DEFAULT 'user',
  agent_message_id UUID REFERENCES agent_messages(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_task_board_status ON task_board(status);
CREATE INDEX IF NOT EXISTS idx_task_board_agent ON task_board(assigned_agent);

-- 5. Usage tracking
CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  agent_id TEXT NOT NULL,
  input_tokens BIGINT DEFAULT 0,
  output_tokens BIGINT DEFAULT 0,
  total_tokens BIGINT DEFAULT 0,
  cost_usd DECIMAL(10,4) DEFAULT 0,
  run_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_date ON usage_tracking(date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_usage_tracking_date_agent ON usage_tracking(date, agent_id);
