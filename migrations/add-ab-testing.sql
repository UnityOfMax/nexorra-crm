-- A/B Testing System
-- Run in Supabase SQL Editor

-- A/B test definitions
CREATE TABLE IF NOT EXISTS ab_tests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,  -- 'landing_page' | 'email_template' | 'sms_template' | 'dm_template'
  entity_id TEXT NOT NULL,     -- landing page ID, template name, etc.
  name TEXT NOT NULL,
  status TEXT DEFAULT 'active', -- active | paused | completed
  variants JSONB NOT NULL DEFAULT '[]',
  traffic_split JSONB DEFAULT '{"A": 50, "B": 50}',
  winner TEXT,                  -- variant ID of winner (set when completed)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Per-variant conversion tracking (incremented atomically)
CREATE TABLE IF NOT EXISTS ab_results (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  test_id UUID REFERENCES ab_tests(id) ON DELETE CASCADE,
  variant TEXT NOT NULL,
  impressions INT DEFAULT 0,
  form_submits INT DEFAULT 0,
  bookings INT DEFAULT 0,
  replies INT DEFAULT 0,         -- for email/DM variants
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(test_id, variant)
);

-- Track which variant each contact was assigned
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS ab_variant TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS ab_test_id UUID;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ab_tests_account ON ab_tests(account_id);
CREATE INDEX IF NOT EXISTS idx_ab_tests_entity ON ab_tests(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ab_results_test ON ab_results(test_id);

-- RLS: ab_tests and ab_results are per-account
ALTER TABLE ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ab_tests_account_access" ON ab_tests
  FOR ALL USING (account_id IN (
    SELECT account_id FROM account_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "ab_results_via_test" ON ab_results
  FOR ALL USING (test_id IN (
    SELECT id FROM ab_tests WHERE account_id IN (
      SELECT account_id FROM account_members WHERE user_id = auth.uid()
    )
  ));
