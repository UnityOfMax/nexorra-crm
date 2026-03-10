-- Switch cold-email-replies and client-reply from cron polling to webhook-triggered
-- Run in Supabase SQL editor

UPDATE agent_configs SET schedule = 'webhook', updated_at = now()
WHERE id = 'cold-email-replies';

UPDATE agent_configs SET schedule = 'webhook', updated_at = now()
WHERE id = 'client-reply';
