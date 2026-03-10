-- Add cost/token tracking columns to agent_runs
-- Run in Supabase SQL editor (safe to run multiple times)

ALTER TABLE agent_runs ADD COLUMN IF NOT EXISTS cost_usd NUMERIC;
ALTER TABLE agent_runs ADD COLUMN IF NOT EXISTS input_tokens INTEGER;
ALTER TABLE agent_runs ADD COLUMN IF NOT EXISTS output_tokens INTEGER;
ALTER TABLE agent_runs ADD COLUMN IF NOT EXISTS num_turns INTEGER;
ALTER TABLE agent_runs ADD COLUMN IF NOT EXISTS log_file TEXT;
