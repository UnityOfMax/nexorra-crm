-- Instagram follow-up tracking columns
-- Run in Supabase SQL editor

-- Follow-up tracking on leads table
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS instagram_messages_sent INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS instagram_follow_up_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS instagram_last_follow_up_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS instagram_reply_channel TEXT,
  ADD COLUMN IF NOT EXISTS instagram_follow_up_case TEXT;

-- Reply channel + follow-up tracking on instagram_conversations
ALTER TABLE instagram_conversations
  ADD COLUMN IF NOT EXISTS reply_channel TEXT,
  ADD COLUMN IF NOT EXISTS follow_up_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_follow_up_at TIMESTAMPTZ;

-- Indexes for follow-up queries
CREATE INDEX IF NOT EXISTS idx_leads_ig_followup
  ON leads (instagram_dm_sent, instagram_status, instagram_follow_up_count)
  WHERE lead_category = 'instagram';

CREATE INDEX IF NOT EXISTS idx_leads_ig_reply_channel
  ON leads (instagram_reply_channel)
  WHERE lead_category = 'instagram';
