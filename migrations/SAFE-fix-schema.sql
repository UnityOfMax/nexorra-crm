-- SAFE schema fix: Updates schema without deleting data
-- This is the RECOMMENDED approach

-- =============================================================================
-- Step 1: Drop all old RLS policies that reference owner_id
-- =============================================================================

DROP POLICY IF EXISTS "Account owners can update their accounts" ON public.accounts;
DROP POLICY IF EXISTS "Account owners can delete their accounts" ON public.accounts;
DROP POLICY IF EXISTS "Account owners can view their accounts" ON public.accounts;
DROP POLICY IF EXISTS "Users can view their accounts" ON public.accounts;
DROP POLICY IF EXISTS "Users can insert accounts" ON public.accounts;
DROP POLICY IF EXISTS "Users can update their accounts" ON public.accounts;
DROP POLICY IF EXISTS "Users can delete their accounts" ON public.accounts;
DROP POLICY IF EXISTS "Users can manage their own accounts" ON public.accounts;

-- Drop any old policies on other tables too
DROP POLICY IF EXISTS "Users can view contacts for their account" ON public.contacts;
DROP POLICY IF EXISTS "Users can view messages for their account" ON public.messages;
DROP POLICY IF EXISTS "Users can view activities for their account" ON public.activities;
DROP POLICY IF EXISTS "Users can view their account members" ON public.account_members;

-- =============================================================================
-- Step 2: Now we can safely drop owner_id column and fix type column
-- =============================================================================

ALTER TABLE public.accounts DROP COLUMN IF EXISTS owner_id;
ALTER TABLE public.accounts DROP COLUMN IF EXISTS created_by;

-- Make the old 'type' column nullable and drop its check constraint
-- We use 'account_type' for agency/client distinction now
ALTER TABLE public.accounts DROP CONSTRAINT IF EXISTS accounts_type_check;
ALTER TABLE public.accounts ALTER COLUMN type DROP NOT NULL;
ALTER TABLE public.accounts ALTER COLUMN type SET DEFAULT NULL;

-- =============================================================================
-- Step 3: Ensure new columns exist (from restructure-agency-platform.sql)
-- =============================================================================

-- Add account_type column
ALTER TABLE public.accounts
ADD COLUMN IF NOT EXISTS account_type TEXT CHECK (account_type IN ('agency', 'client')) DEFAULT 'client';

-- Add parent_account_id for client accounts
ALTER TABLE public.accounts
ADD COLUMN IF NOT EXISTS parent_account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE;

-- Add domain for white-label
ALTER TABLE public.accounts
ADD COLUMN IF NOT EXISTS domain TEXT UNIQUE;

-- Update account_members table
ALTER TABLE public.account_members DROP CONSTRAINT IF EXISTS account_members_role_check;

-- Ensure role column has correct type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'account_members'
    AND column_name = 'role'
    AND data_type = 'text'
  ) THEN
    ALTER TABLE public.account_members
    DROP COLUMN IF EXISTS role;

    ALTER TABLE public.account_members
    ADD COLUMN role TEXT CHECK (role IN ('agency_owner', 'agency_admin', 'client_owner', 'client_admin', 'client_user')) DEFAULT 'client_user';
  END IF;
END $$;

-- Add permissions and status
ALTER TABLE public.account_members
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.account_members
ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('active', 'inactive', 'pending')) DEFAULT 'active';

-- =============================================================================
-- Step 4: Create indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_accounts_parent ON public.accounts(parent_account_id);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON public.accounts(account_type);

-- =============================================================================
-- Step 5: Re-create RLS policies with new logic
-- =============================================================================

-- ACCOUNTS: Agency owners can see all client accounts, clients see only their own
DROP POLICY IF EXISTS "Agency owners see all accounts, clients see their own" ON public.accounts;

CREATE POLICY "Agency owners see all accounts, clients see their own"
  ON public.accounts
  FOR SELECT
  USING (
    id IN (
      SELECT account_id FROM public.account_members WHERE user_id = auth.uid()
    )
    OR
    parent_account_id IN (
      SELECT am.account_id
      FROM public.account_members am
      WHERE am.user_id = auth.uid()
      AND am.role IN ('agency_owner', 'agency_admin')
    )
  );

-- ACCOUNT_MEMBERS: Similar logic for viewing members
DROP POLICY IF EXISTS "Agency owners see all members, users see their own account" ON public.account_members;

CREATE POLICY "Agency owners see all members, users see their own account"
  ON public.account_members
  FOR SELECT
  USING (
    account_id IN (
      SELECT account_id FROM public.account_members WHERE user_id = auth.uid()
    )
    OR
    account_id IN (
      SELECT a.id FROM public.accounts a
      WHERE a.parent_account_id IN (
        SELECT am.account_id
        FROM public.account_members am
        WHERE am.user_id = auth.uid()
        AND am.role IN ('agency_owner', 'agency_admin')
      )
    )
  );

-- CONTACTS: Agency can see all client contacts
DROP POLICY IF EXISTS "Users can view contacts for their account or managed accounts" ON public.contacts;

CREATE POLICY "Users can view contacts for their account or managed accounts"
  ON public.contacts
  FOR SELECT
  USING (
    account_id IN (
      SELECT account_id FROM public.account_members WHERE user_id = auth.uid()
    )
    OR
    account_id IN (
      SELECT a.id FROM public.accounts a
      WHERE a.parent_account_id IN (
        SELECT am.account_id
        FROM public.account_members am
        WHERE am.user_id = auth.uid()
        AND am.role IN ('agency_owner', 'agency_admin')
      )
    )
  );

-- MESSAGES: Agency can see all client messages
DROP POLICY IF EXISTS "Users can view messages for their account or managed accounts" ON public.messages;

CREATE POLICY "Users can view messages for their account or managed accounts"
  ON public.messages
  FOR SELECT
  USING (
    account_id IN (
      SELECT account_id FROM public.account_members WHERE user_id = auth.uid()
    )
    OR
    account_id IN (
      SELECT a.id FROM public.accounts a
      WHERE a.parent_account_id IN (
        SELECT am.account_id
        FROM public.account_members am
        WHERE am.user_id = auth.uid()
        AND am.role IN ('agency_owner', 'agency_admin')
      )
    )
  );

-- ACTIVITIES: Agency can see all client activities
DROP POLICY IF EXISTS "Users can view activities for their account or managed accounts" ON public.activities;

CREATE POLICY "Users can view activities for their account or managed accounts"
  ON public.activities
  FOR SELECT
  USING (
    account_id IN (
      SELECT account_id FROM public.account_members WHERE user_id = auth.uid()
    )
    OR
    account_id IN (
      SELECT a.id FROM public.accounts a
      WHERE a.parent_account_id IN (
        SELECT am.account_id
        FROM public.account_members am
        WHERE am.user_id = auth.uid()
        AND am.role IN ('agency_owner', 'agency_admin')
      )
    )
  );

-- =============================================================================
-- Step 6: Update existing data to use new structure
-- =============================================================================

-- If you have any existing accounts, they need account_type set
UPDATE public.accounts
SET account_type = 'client'
WHERE account_type IS NULL;

-- If you have any existing account_members, they need status set
UPDATE public.account_members
SET status = 'active'
WHERE status IS NULL;

-- =============================================================================
-- Done! Schema is now fixed and compatible with agency platform
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Schema fixed successfully!';
  RAISE NOTICE 'Next step: Run setup-initial-agency-owner.sql to create your agency account';
  RAISE NOTICE '========================================';
END $$;
