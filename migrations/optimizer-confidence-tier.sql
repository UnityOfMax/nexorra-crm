-- Optimizer confidence tier: adds confidence score, impact estimate, and execution tier
-- tier values: 'auto' (execute without approval) | 'review' (require approval) | 'hold' (informational only)

ALTER TABLE optimizer_actions ADD COLUMN IF NOT EXISTS confidence INT DEFAULT 50;
ALTER TABLE optimizer_actions ADD COLUMN IF NOT EXISTS impact_estimate INT DEFAULT 0;
ALTER TABLE optimizer_actions ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'review';

-- Index for auto-execution cron to efficiently find pending auto-tier actions
CREATE INDEX IF NOT EXISTS idx_optimizer_actions_auto_tier
  ON optimizer_actions (tier, applied, rejected, created_at)
  WHERE tier = 'auto' AND applied = false AND rejected = false;
