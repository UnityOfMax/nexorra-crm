-- ⚠️ NUCLEAR OPTION: Delete everything and start fresh
-- WARNING: This will DELETE ALL DATA in your CRM
-- Only use this if you want to completely reset the database

-- STOP! READ THIS FIRST:
-- 1. This will delete ALL users, accounts, contacts, messages, everything
-- 2. Make sure you have backups if you need them
-- 3. You will need to re-run all migrations after this
-- 4. You will need to create your agency owner account again

-- If you're sure, uncomment the lines below and run this script

-- =============================================================================
-- Step 1: Drop all tables in reverse dependency order
-- =============================================================================

-- DROP TABLE IF EXISTS public.google_calendar_sync CASCADE;
-- DROP TABLE IF EXISTS public.workflow_delayed_jobs CASCADE;
-- DROP TABLE IF EXISTS public.workflow_step_executions CASCADE;
-- DROP TABLE IF EXISTS public.workflow_executions CASCADE;
-- DROP TABLE IF EXISTS public.workflows CASCADE;
-- DROP TABLE IF EXISTS public.pipeline_stages CASCADE;
-- DROP TABLE IF EXISTS public.pipelines CASCADE;
-- DROP TABLE IF EXISTS public.facebook_page_messages CASCADE;
-- DROP TABLE IF EXISTS public.facebook_ad_campaigns CASCADE;
-- DROP TABLE IF EXISTS public.facebook_ad_leads CASCADE;
-- DROP TABLE IF EXISTS public.facebook_integrations CASCADE;
-- DROP TABLE IF EXISTS public.user_invitations CASCADE;
-- DROP TABLE IF EXISTS public.permission_templates CASCADE;
-- DROP TABLE IF EXISTS public.activities CASCADE;
-- DROP TABLE IF EXISTS public.messages CASCADE;
-- DROP TABLE IF EXISTS public.deals CASCADE;
-- DROP TABLE IF EXISTS public.contacts CASCADE;
-- DROP TABLE IF EXISTS public.account_members CASCADE;
-- DROP TABLE IF EXISTS public.accounts CASCADE;

-- =============================================================================
-- Step 2: Delete all auth users (except service role)
-- =============================================================================

-- DELETE FROM auth.users
-- WHERE email NOT LIKE '%@supabase%'
-- AND email NOT LIKE '%service_role%';

-- =============================================================================
-- Step 3: Drop all custom functions
-- =============================================================================

-- DROP FUNCTION IF EXISTS public.is_agency_owner(UUID) CASCADE;
-- DROP FUNCTION IF EXISTS public.get_accessible_accounts(UUID) CASCADE;

-- =============================================================================
-- DONE! Now re-run migrations in this order:
-- =============================================================================

-- 1. First, manually re-create the basic tables using Supabase Table Editor
--    OR re-run your original schema creation SQL (supabase-schema.sql if you have it)
--
-- 2. Then run: migrations/restructure-agency-platform.sql
-- 3. Then run: migrations/add-google-calendar.sql (if you need Google Calendar)
-- 4. Then run: migrations/add-facebook-integration.sql (if you need Facebook)
-- 5. Finally run: migrations/setup-initial-agency-owner.sql (to create your account)

RAISE NOTICE '⚠️  SCRIPT IS COMMENTED OUT FOR SAFETY';
RAISE NOTICE 'If you want to reset everything, uncomment the DROP and DELETE statements above';
