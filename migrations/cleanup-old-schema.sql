-- Cleanup old schema columns that are no longer needed
-- Run this AFTER restructure-agency-platform.sql

-- First, drop all old RLS policies that depend on owner_id
DROP POLICY IF EXISTS "Account owners can update their accounts" ON public.accounts;
DROP POLICY IF EXISTS "Account owners can delete their accounts" ON public.accounts;
DROP POLICY IF EXISTS "Account owners can view their accounts" ON public.accounts;
DROP POLICY IF EXISTS "Users can view their accounts" ON public.accounts;
DROP POLICY IF EXISTS "Users can insert accounts" ON public.accounts;
DROP POLICY IF EXISTS "Users can update their accounts" ON public.accounts;
DROP POLICY IF EXISTS "Users can delete their accounts" ON public.accounts;

-- Now we can safely remove owner_id from accounts table
ALTER TABLE public.accounts DROP COLUMN IF EXISTS owner_id;

-- Remove any other legacy columns if they exist
ALTER TABLE public.accounts DROP COLUMN IF EXISTS created_by;

-- Verify the accounts table structure is correct
COMMENT ON TABLE public.accounts IS 'Multi-tenant accounts table with agency/client hierarchy';

-- Make sure the new RLS policies from restructure-agency-platform.sql are in place
-- If you see "no accounts" after this, re-run restructure-agency-platform.sql
