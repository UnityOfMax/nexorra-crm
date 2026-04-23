-- Migration: add-texting-analytics.sql
-- Texting script analytics: message log, variant proposals, stats views
-- Run in Supabase SQL editor: https://supabase.com/dashboard/project/nhflmisklsanfiiywrfo/sql

-- ── text_message_log ──────────────────────────────────────────────────────────
-- One row per outbound or inbound text message (referenced by send-texts.js)
CREATE TABLE IF NOT EXISTS text_message_log (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id          uuid REFERENCES leads(id) ON DELETE SET NULL,
  direction        text NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  sender_number    text NOT NULL,
  recipient_number text NOT NULL,
  body             text NOT NULL,
  message_type     text,          -- initial|followup_1|followup_2|auto_reply|reply|opt_out
  script_id        int,
  booking_intent   bool DEFAULT false,
  sent_at          timestamptz NOT NULL DEFAULT now(),
  created_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_text_msg_log_lead_id   ON text_message_log(lead_id);
CREATE INDEX IF NOT EXISTS idx_text_msg_log_script_id ON text_message_log(script_id);
CREATE INDEX IF NOT EXISTS idx_text_msg_log_sent_at   ON text_message_log(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_text_msg_log_direction ON text_message_log(direction, message_type);

-- ── text_script_variants ──────────────────────────────────────────────────────
-- AI-generated message improvements awaiting human approval
CREATE TABLE IF NOT EXISTS text_script_variants (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id    int  NOT NULL,
  message_type text NOT NULL DEFAULT 'initial',  -- initial|followup1|followup2|autoReply
  body         text NOT NULL,
  status       text NOT NULL DEFAULT 'pending'   -- pending|approved|rejected|active
                CHECK (status IN ('pending', 'approved', 'rejected', 'active')),
  performance  jsonb,          -- stats snapshot at generation time
  approved_at  timestamptz,
  applied_at   timestamptz,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_text_variants_status    ON text_script_variants(status);
CREATE INDEX IF NOT EXISTS idx_text_variants_script_id ON text_script_variants(script_id);

-- ── text_script_stats view ────────────────────────────────────────────────────
-- Aggregates from text_message_log + leads for the analytics API and script-improver
CREATE OR REPLACE VIEW text_script_stats AS
SELECT
  l.text_script_id                                               AS script_id,
  COUNT(*)  FILTER (WHERE tml.direction = 'outbound'
                      AND tml.message_type IN ('initial','followup_1','followup_2'))
                                                                 AS total_sent,
  COUNT(*)  FILTER (WHERE tml.direction = 'inbound'
                      AND tml.message_type = 'reply')            AS replies,
  COUNT(DISTINCT l.id) FILTER (WHERE l.text_opted_out = true)   AS opted_out,
  COUNT(*)  FILTER (WHERE tml.booking_intent = true)             AS booking_intent,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE tml.direction = 'inbound' AND tml.message_type = 'reply')
    / NULLIF(COUNT(*) FILTER (WHERE tml.direction = 'outbound'
               AND tml.message_type IN ('initial','followup_1','followup_2')), 0),
    1
  )                                                              AS reply_rate,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE tml.booking_intent = true)
    / NULLIF(COUNT(*) FILTER (WHERE tml.direction = 'inbound' AND tml.message_type = 'reply'), 0),
    1
  )                                                              AS booking_rate,
  ROUND(
    100.0 * COUNT(DISTINCT l.id) FILTER (WHERE l.text_opted_out = true)
    / NULLIF(COUNT(*) FILTER (WHERE tml.direction = 'outbound'
               AND tml.message_type IN ('initial','followup_1','followup_2')), 0),
    1
  )                                                              AS opt_out_rate
FROM text_message_log tml
JOIN leads l ON l.id = tml.lead_id
WHERE l.text_script_id IS NOT NULL
GROUP BY l.text_script_id;

-- ── text_script_daily view ────────────────────────────────────────────────────
-- Per-day, per-script breakdown for trend charts
CREATE OR REPLACE VIEW text_script_daily AS
SELECT
  tml.sent_at::date                                              AS day,
  l.text_script_id                                               AS script_id,
  COUNT(*) FILTER (WHERE tml.direction = 'outbound'
                     AND tml.message_type IN ('initial','followup_1','followup_2'))
                                                                 AS sent,
  COUNT(*) FILTER (WHERE tml.direction = 'inbound'
                     AND tml.message_type = 'reply')             AS replies,
  COUNT(*) FILTER (WHERE tml.booking_intent = true)              AS booking_intent
FROM text_message_log tml
JOIN leads l ON l.id = tml.lead_id
WHERE l.text_script_id IS NOT NULL
GROUP BY tml.sent_at::date, l.text_script_id
ORDER BY tml.sent_at::date DESC, l.text_script_id;

-- ── leads texting columns (idempotent adds) ───────────────────────────────────
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS text_status        text,
  ADD COLUMN IF NOT EXISTS text_sender_number text,
  ADD COLUMN IF NOT EXISTS text_script_id     int,
  ADD COLUMN IF NOT EXISTS text_opted_out     bool DEFAULT false,
  ADD COLUMN IF NOT EXISTS text_reply_received bool DEFAULT false,
  ADD COLUMN IF NOT EXISTS text_reply_at      timestamptz,
  ADD COLUMN IF NOT EXISTS last_texted_at     timestamptz;

CREATE INDEX IF NOT EXISTS idx_leads_text_status     ON leads(text_status) WHERE text_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_text_script_id  ON leads(text_script_id) WHERE text_script_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_text_opted_out  ON leads(text_opted_out) WHERE text_opted_out = true;
