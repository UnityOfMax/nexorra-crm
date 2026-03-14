-- Instagram DM Outreach System
-- Run in Supabase SQL Editor

-- Add Instagram columns to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS instagram_handle TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS instagram_user_id TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS instagram_dm_sent BOOLEAN DEFAULT false;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS instagram_dm_sent_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS instagram_conversation_id TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS instagram_status TEXT DEFAULT 'not_started';
-- statuses: not_started | dm_sent | replied | engaged | booked | ignored

CREATE INDEX IF NOT EXISTS idx_leads_instagram_handle ON leads(instagram_handle) WHERE instagram_handle IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_instagram_status ON leads(instagram_status) WHERE instagram_status != 'not_started';

-- Instagram conversation threads (linked to leads, not contacts)
CREATE TABLE IF NOT EXISTS instagram_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  instagram_thread_id TEXT,
  status TEXT DEFAULT 'active', -- active | booked | closed
  last_message_at TIMESTAMPTZ,
  message_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ig_conversations_lead ON instagram_conversations(lead_id);
CREATE INDEX IF NOT EXISTS idx_ig_conversations_status ON instagram_conversations(status) WHERE status = 'active';

-- Instagram messages within conversations
CREATE TABLE IF NOT EXISTS instagram_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES instagram_conversations(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  direction TEXT NOT NULL, -- inbound | outbound
  content TEXT,
  sent_via TEXT, -- 'chrome' | 'api'
  instagram_message_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ig_messages_conversation ON instagram_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ig_messages_lead ON instagram_messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_ig_messages_direction ON instagram_messages(direction, created_at DESC);

-- No RLS on these tables (same pattern as leads — agency-only, accessed via supabaseAdmin)
