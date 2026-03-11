-- Rename agents to personas: Jeff, Stacey, Barny
-- Run in Supabase SQL editor

-- Jeff = Lead Gen
UPDATE agent_configs SET name = 'Jeff — Lead Gen', category = 'jeff' WHERE id = 'lead-gen';

-- Stacey = Cold Email operations
UPDATE agent_configs SET name = 'Stacey — Upload', category = 'stacey' WHERE id = 'cold-email-upload';
UPDATE agent_configs SET name = 'Stacey — Replies', category = 'stacey' WHERE id = 'cold-email-replies';
UPDATE agent_configs SET name = 'Stacey — Maintenance', category = 'stacey' WHERE id = 'cold-email-maintenance';
UPDATE agent_configs SET name = 'Stacey — Campaign Review', category = 'stacey' WHERE id = 'campaign-review';

-- Barny = Dev agents
UPDATE agent_configs SET name = 'Barny — Frontend', category = 'barny' WHERE id = 'dev-frontend';
UPDATE agent_configs SET name = 'Barny — Backend', category = 'barny' WHERE id = 'dev-backend';
UPDATE agent_configs SET name = 'Barny — Review', category = 'barny' WHERE id = 'dev-review';
UPDATE agent_configs SET name = 'Barny — Test', category = 'barny' WHERE id = 'dev-test';
UPDATE agent_configs SET name = 'Barny — Preview', category = 'barny' WHERE id = 'dev-preview';

-- Hide SMS/email reply services from Command Center
UPDATE agent_configs SET category = 'hidden' WHERE id IN ('sms-reply-service', 'email-reply-service');

-- Ops stays as-is (report, model-router, shannon)
-- Client stays as-is (client-reply, client-onboard)
