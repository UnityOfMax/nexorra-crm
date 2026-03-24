CREATE TABLE IF NOT EXISTS email_copy_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, category TEXT DEFAULT 'proven', source TEXT,
  first_line_template TEXT NOT NULL, body_template TEXT NOT NULL, ps_template TEXT NOT NULL,
  times_sent INT DEFAULT 0, times_replied INT DEFAULT 0,
  times_booked INT DEFAULT 0, times_ghosted INT DEFAULT 0,
  booking_rate NUMERIC(5,4) DEFAULT 0, reply_rate NUMERIC(5,4) DEFAULT 0,
  is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_campaign_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id TEXT NOT NULL, date DATE NOT NULL,
  sent INT DEFAULT 0, opened INT DEFAULT 0, replied INT DEFAULT 0,
  bounced INT DEFAULT 0, open_rate NUMERIC(5,4) DEFAULT 0, reply_rate NUMERIC(5,4) DEFAULT 0,
  UNIQUE(campaign_id, date)
);

CREATE TABLE IF NOT EXISTS landing_page_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landing_page_id UUID,
  lead_id UUID, event_type TEXT NOT NULL,
  visitor_ip_hash TEXT, metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lpe_landing_page ON landing_page_events(landing_page_id);
CREATE INDEX IF NOT EXISTS idx_lpe_lead ON landing_page_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_lpe_type ON landing_page_events(event_type);

ALTER TABLE leads ADD COLUMN IF NOT EXISTS copy_variant_id UUID;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS landing_page_id UUID;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS instantly_status TEXT DEFAULT 'Lead';
ALTER TABLE lead_conversations ADD COLUMN IF NOT EXISTS copy_variant_id UUID;
ALTER TABLE lead_conversations ADD COLUMN IF NOT EXISTS instantly_status TEXT;
ALTER TABLE lead_conversations ADD COLUMN IF NOT EXISTS ooo_return_date DATE;
ALTER TABLE lead_conversations ADD COLUMN IF NOT EXISTS scheduled_followup_at TIMESTAMPTZ;

INSERT INTO email_copy_variants (name, category, source, first_line_template, body_template, ps_template) VALUES
('hobby_opener', 'proven', 'seed', 'I saw you''re into {detail} — always cool to meet a {city} agent with interests outside the grind.', '{city}''s market moves fast. We set up an AI system that books appointments for agents automatically — most of our clients pick up 8-30 extra appointments a month.', 'PS: Hope the {detail} is going well.'),
('brokerage_opener', 'proven', 'seed', 'Saw you''re with {brokerage} in {city} — you all have been putting up solid numbers.', 'We built an AI appointment-setting system for agents in markets like {city}. It runs 24/7 and books qualified appointments directly onto your calendar — on average 8-30 per month.', 'PS: {city} market is heating up — good time to add more appointments.'),
('bio_opener', 'proven', 'seed', 'Read a bit about you: "{detail}" — that stood out.', 'We help agents in {city} add 8-30 appointments per month using AI — no cold calling, no chasing leads. The system runs in the background while you focus on closings.', 'PS: {city} market is heating up.'),
('pet_opener', 'proven', 'seed', 'Noticed you''ve got {detail} — bet they keep things interesting between showings.', '{city}''s market moves fast. We set up an AI system that books appointments for agents automatically — most of our clients pick up 8-30 extra appointments a month.', 'PS: Give {detail} a treat for me.'),
('website_opener', 'proven', 'seed', 'Checked out your site and your {city} listings look solid.', 'We built an AI appointment-setting system for agents in markets like {city}. It runs 24/7 and books qualified appointments directly onto your calendar — on average 8-30 per month.', 'PS: Your online presence is sharp — imagine pairing that with a system that books appointments while you sleep.')
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION increment_variant_stat(p_id UUID, p_stat TEXT)
RETURNS VOID AS $$
BEGIN
  EXECUTE format('UPDATE email_copy_variants SET %I = %I + 1 WHERE id = $1', p_stat, p_stat) USING p_id;
  UPDATE email_copy_variants SET booking_rate = CASE WHEN times_sent > 0 THEN times_booked::numeric / times_sent ELSE 0 END,
    reply_rate = CASE WHEN times_sent > 0 THEN times_replied::numeric / times_sent ELSE 0 END WHERE id = p_id;
END; $$ LANGUAGE plpgsql;
