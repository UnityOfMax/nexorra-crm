-- Instagram + Calling Lead Categories
-- Run in Supabase SQL Editor

-- Lead category: separates the 3 pipelines
-- 'email' = existing cold email leads (default)
-- 'instagram' = leads with Instagram handles for DM outreach
-- 'calling' = leads with phone numbers for CSV export / calling
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_category TEXT DEFAULT 'email';

-- Mobile phone (Century21 provides mobile specifically)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS mobile_phone TEXT;

-- CSV export tracking (calling leads)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS csv_batch_id TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS csv_downloaded_at TIMESTAMPTZ;

-- Instagram DM account that sent the first message
ALTER TABLE leads ADD COLUMN IF NOT EXISTS instagram_dm_account TEXT;

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_leads_category ON leads(lead_category);
CREATE INDEX IF NOT EXISTS idx_leads_csv_batch ON leads(csv_batch_id) WHERE csv_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_ig_category ON leads(lead_category, instagram_dm_sent) WHERE lead_category = 'instagram';

-- Instagram DM accounts table (7 rotating accounts for outreach)
CREATE TABLE IF NOT EXISTS instagram_dm_accounts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  display_name TEXT,
  status TEXT DEFAULT 'active',  -- active | cooldown | disabled
  dms_sent_today INT DEFAULT 0,
  daily_limit INT DEFAULT 50,
  last_dm_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  cooldown_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
