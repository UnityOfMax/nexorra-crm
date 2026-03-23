-- Lead Deep Research columns
-- Adds personal research data storage and status tracking to leads table.
-- Run in Supabase SQL editor.

ALTER TABLE leads ADD COLUMN IF NOT EXISTS personal_research JSONB DEFAULT '{}'::jsonb;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS research_status TEXT DEFAULT 'pending';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS research_completed_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_leads_research_status ON leads(research_status);
