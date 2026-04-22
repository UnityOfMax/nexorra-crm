-- Fix RLS: enable row-level security on all tables that were publicly accessible
-- Run this in Supabase SQL editor: https://supabase.com/dashboard/project/nhflmisklsanfiiywrfo/sql

-- automation_messages (contains SMS/email bodies + contact PII)
ALTER TABLE automation_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_only" ON automation_messages;
CREATE POLICY "service_role_only" ON automation_messages USING (auth.role() = 'service_role');

-- automation_enrollments
ALTER TABLE automation_enrollments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_only" ON automation_enrollments;
CREATE POLICY "service_role_only" ON automation_enrollments USING (auth.role() = 'service_role');

-- automation_configs
ALTER TABLE automation_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_only" ON automation_configs;
CREATE POLICY "service_role_only" ON automation_configs USING (auth.role() = 'service_role');

-- agent_configs (disabling these could kill Jeff, Stacey, etc.)
ALTER TABLE agent_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_only" ON agent_configs;
CREATE POLICY "service_role_only" ON agent_configs USING (auth.role() = 'service_role');

-- agent_runs
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_only" ON agent_runs;
CREATE POLICY "service_role_only" ON agent_runs USING (auth.role() = 'service_role');

-- agent_messages
ALTER TABLE agent_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_only" ON agent_messages;
CREATE POLICY "service_role_only" ON agent_messages USING (auth.role() = 'service_role');

-- instagram_account_configs (contains live Instagram access tokens)
ALTER TABLE instagram_account_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_only" ON instagram_account_configs;
CREATE POLICY "service_role_only" ON instagram_account_configs USING (auth.role() = 'service_role');

-- permission_templates
ALTER TABLE permission_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_only" ON permission_templates;
CREATE POLICY "service_role_only" ON permission_templates USING (auth.role() = 'service_role');

-- landing_page_events (allow inserts from anon for tracking, but no reads)
ALTER TABLE landing_page_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_only" ON landing_page_events;
DROP POLICY IF EXISTS "anon_insert" ON landing_page_events;
CREATE POLICY "service_role_only" ON landing_page_events USING (auth.role() = 'service_role');
CREATE POLICY "anon_insert" ON landing_page_events FOR INSERT WITH CHECK (true);

-- instagram_unibox_messages
ALTER TABLE instagram_unibox_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_only" ON instagram_unibox_messages;
CREATE POLICY "service_role_only" ON instagram_unibox_messages USING (auth.role() = 'service_role');

-- ai_sms_batches
ALTER TABLE ai_sms_batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_only" ON ai_sms_batches;
CREATE POLICY "service_role_only" ON ai_sms_batches USING (auth.role() = 'service_role');

-- email_copy_variants
ALTER TABLE email_copy_variants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_only" ON email_copy_variants;
CREATE POLICY "service_role_only" ON email_copy_variants USING (auth.role() = 'service_role');

-- mirofish tables
ALTER TABLE mirofish_chunks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_only" ON mirofish_chunks;
CREATE POLICY "service_role_only" ON mirofish_chunks USING (auth.role() = 'service_role');

ALTER TABLE mirofish_entities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_only" ON mirofish_entities;
CREATE POLICY "service_role_only" ON mirofish_entities USING (auth.role() = 'service_role');

ALTER TABLE mirofish_relationships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_only" ON mirofish_relationships;
CREATE POLICY "service_role_only" ON mirofish_relationships USING (auth.role() = 'service_role');
