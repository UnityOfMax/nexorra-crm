-- Add Gmail direct-send tracking columns to local_biz_leads
ALTER TABLE local_biz_leads
  ADD COLUMN IF NOT EXISTS gmail_account TEXT,
  ADD COLUMN IF NOT EXISTS gmail_message_id TEXT;
