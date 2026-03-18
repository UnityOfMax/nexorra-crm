-- Instagram Account Configs (our 5 accounts)
CREATE TABLE IF NOT EXISTS instagram_account_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ig_account_id TEXT NOT NULL UNIQUE,   -- Meta numeric account ID (fill after first webhook hit)
  username TEXT NOT NULL,               -- @username (without @)
  display_name TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Placeholder rows — ig_account_id will be auto-updated when first message arrives
INSERT INTO instagram_account_configs (ig_account_id, username, display_name) VALUES
  ('pending_1', 'maximillian_fawcett', 'Maximillian Fawcett'),
  ('pending_2', '_mmmmmmmax', 'mmmmmmmax'),
  ('pending_3', 'maximefawcett', 'Maxime Fawcett'),
  ('pending_4', 'fawcettmaximilian', 'Fawcett Maximilian'),
  ('pending_5', 'maxwellfawctt', 'Maxwell Fawctt')
ON CONFLICT DO NOTHING;

-- Unified inbox messages table
CREATE TABLE IF NOT EXISTS instagram_unibox_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  our_account_id TEXT NOT NULL,         -- Our Instagram account ID (from Meta entry.id)
  our_username TEXT,                    -- Our @username (resolved from account_configs)
  sender_id TEXT NOT NULL,             -- Sender PSID
  sender_username TEXT,                -- Sender username if available
  direction TEXT NOT NULL DEFAULT 'inbound',
  content TEXT,
  attachments JSONB,
  meta_message_id TEXT UNIQUE,         -- Deduplicate
  meta_raw JSONB,                      -- Full raw payload for debugging
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_unibox_account ON instagram_unibox_messages(our_account_id);
CREATE INDEX IF NOT EXISTS idx_unibox_sender ON instagram_unibox_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_unibox_created ON instagram_unibox_messages(created_at DESC);
