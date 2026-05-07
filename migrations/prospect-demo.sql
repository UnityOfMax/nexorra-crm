-- Migration: Prospect Demo fields on leads table
-- Run once in Supabase SQL editor.

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS demo_slug        text,
  ADD COLUMN IF NOT EXISTS demo_built_at    timestamptz;

-- Index for fast demo lookup
CREATE INDEX IF NOT EXISTS leads_demo_slug_idx ON leads (demo_slug) WHERE demo_slug IS NOT NULL;

-- Comment
COMMENT ON COLUMN leads.demo_slug     IS 'Slug of the personalised website demo built for this prospect';
COMMENT ON COLUMN leads.demo_built_at IS 'When the demo was last built/rebuilt';
