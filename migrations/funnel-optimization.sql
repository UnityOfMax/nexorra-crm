-- Funnel Optimization System
-- Run in Supabase SQL editor

-- ─── Contacts: lead scoring + Meta attribution ───────────────────────────────

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS lead_score INT DEFAULT 0;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS lead_score_updated_at TIMESTAMPTZ;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS fbc TEXT;       -- ?fbclid= from URL, formatted as fb.1.{ts}.{id}
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS fbp TEXT;       -- _fbp browser cookie
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS funnel_stage TEXT DEFAULT 'lead';
-- funnel_stage values: lead | engaged | booking_page_viewed | call_booked | showed | no_show | client

-- ─── meta_events: CAPI event log ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS meta_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,       -- Lead, Schedule, Contact
  event_id UUID NOT NULL UNIQUE,  -- deduplication key (must match browser fbq eventID for Lead)
  event_time TIMESTAMPTZ DEFAULT NOW(),
  fbc TEXT,
  fbp TEXT,
  value DECIMAL(10,2),
  sent_to_meta BOOLEAN DEFAULT false,
  meta_response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meta_events_account  ON meta_events(account_id);
CREATE INDEX IF NOT EXISTS idx_meta_events_contact  ON meta_events(contact_id);
CREATE INDEX IF NOT EXISTS idx_meta_events_name     ON meta_events(event_name);
CREATE INDEX IF NOT EXISTS idx_meta_events_created  ON meta_events(created_at DESC);

-- ─── meta_ad_metrics: daily campaign stats ────────────────────────────────────

CREATE TABLE IF NOT EXISTS meta_ad_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID,                -- NULL = Nexorra global; otherwise per-client account
  date DATE NOT NULL,
  campaign_id TEXT NOT NULL,
  campaign_name TEXT,
  adset_id TEXT NOT NULL,
  adset_name TEXT,
  impressions INT DEFAULT 0,
  clicks INT DEFAULT 0,
  spend DECIMAL(10,2) DEFAULT 0,
  leads INT DEFAULT 0,
  appointments INT DEFAULT 0,     -- populated by CAPI Schedule events cross-referenced
  cpl DECIMAL(10,2),              -- spend / leads
  cpa DECIMAL(10,2),              -- spend / appointments
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, adset_id)
);

CREATE INDEX IF NOT EXISTS idx_meta_ad_metrics_account ON meta_ad_metrics(account_id);
CREATE INDEX IF NOT EXISTS idx_meta_ad_metrics_date    ON meta_ad_metrics(date DESC);
CREATE INDEX IF NOT EXISTS idx_meta_ad_metrics_adset   ON meta_ad_metrics(adset_id);

-- ─── funnel_events: per-contact stage tracking ────────────────────────────────

CREATE TABLE IF NOT EXISTS funnel_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  -- values: page_view | form_submit | replied | booking_page_viewed | booking_confirmed | showed | no_show
  channel TEXT,                   -- web | sms | email
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_funnel_events_account  ON funnel_events(account_id);
CREATE INDEX IF NOT EXISTS idx_funnel_events_contact  ON funnel_events(contact_id);
CREATE INDEX IF NOT EXISTS idx_funnel_events_type     ON funnel_events(event_type);
CREATE INDEX IF NOT EXISTS idx_funnel_events_created  ON funnel_events(created_at DESC);

-- ─── optimizer_actions: AI campaign change proposals ──────────────────────────

CREATE TABLE IF NOT EXISTS optimizer_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  -- pause_adset | activate_adset | increase_budget | decrease_budget
  -- new_creative | new_ad | pause_ad | update_ai_tone
  target_id TEXT,                 -- adset_id, ad_id, or creative_id
  target_name TEXT,
  reason TEXT NOT NULL,           -- human-readable explanation shown in dashboard
  before_state JSONB,             -- snapshot before change
  after_state JSONB,              -- proposed state after change
  approved BOOLEAN DEFAULT false,
  applied BOOLEAN DEFAULT false,
  rejected BOOLEAN DEFAULT false,
  applied_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejected_by UUID,               -- user who rejected
  meta_response JSONB,            -- Meta API response after applying
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_optimizer_actions_account  ON optimizer_actions(account_id);
CREATE INDEX IF NOT EXISTS idx_optimizer_actions_applied  ON optimizer_actions(applied);
CREATE INDEX IF NOT EXISTS idx_optimizer_actions_created  ON optimizer_actions(created_at DESC);

-- ─── RLS policies (same pattern as existing tables) ──────────────────────────

ALTER TABLE meta_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_ad_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnel_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE optimizer_actions ENABLE ROW LEVEL SECURITY;

-- meta_events: account members can access their own account's events
CREATE POLICY "Account members manage meta_events"
  ON meta_events FOR ALL
  USING (account_id IN (
    SELECT account_id FROM account_members WHERE user_id = auth.uid()
  ));

-- meta_ad_metrics: account members can read their own; nulls = agency only
CREATE POLICY "Account members read meta_ad_metrics"
  ON meta_ad_metrics FOR SELECT
  USING (account_id IS NULL OR account_id IN (
    SELECT account_id FROM account_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Agency admin upsert meta_ad_metrics"
  ON meta_ad_metrics FOR INSERT
  WITH CHECK (true); -- service role only in practice (admin client bypasses RLS)

-- funnel_events: account members can access their account's events
CREATE POLICY "Account members manage funnel_events"
  ON funnel_events FOR ALL
  USING (account_id IN (
    SELECT account_id FROM account_members WHERE user_id = auth.uid()
  ));

-- optimizer_actions: account members can read; agency admins write
CREATE POLICY "Account members manage optimizer_actions"
  ON optimizer_actions FOR ALL
  USING (account_id IN (
    SELECT account_id FROM account_members WHERE user_id = auth.uid()
  ));
