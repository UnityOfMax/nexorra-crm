-- SIMPLE RLS fix - no fancy logic, just basic access
-- This avoids all recursion issues

-- =============================================================================
-- 1. Fix account_members policies (simple, no recursion)
-- =============================================================================

-- Drop all existing policies on account_members
DROP POLICY IF EXISTS "Users can view their account members" ON public.account_members;
DROP POLICY IF EXISTS "Agency owners see all members, users see their own account" ON public.account_members;
DROP POLICY IF EXISTS "Users can view account members" ON public.account_members;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.account_members;
DROP POLICY IF EXISTS "Users can view their own account memberships" ON public.account_members;
DROP POLICY IF EXISTS "Agency owners can view client account memberships" ON public.account_members;
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.account_members;
DROP POLICY IF EXISTS "Agency owners can view client memberships" ON public.account_members;
DROP POLICY IF EXISTS "Authenticated users can insert account members" ON public.account_members;
DROP POLICY IF EXISTS "Agency owners can update members" ON public.account_members;

-- Simple policy: Users can see rows where they are the user
CREATE POLICY "users_can_view_own_memberships"
  ON public.account_members
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Allow authenticated users to insert (needed for invitations API)
CREATE POLICY "authenticated_users_can_insert"
  ON public.account_members
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =============================================================================
-- 2. Fix accounts policies (simple, no recursion)
-- =============================================================================

-- Drop all existing policies on accounts
DROP POLICY IF EXISTS "Account owners can update their accounts" ON public.accounts;
DROP POLICY IF EXISTS "Account owners can delete their accounts" ON public.accounts;
DROP POLICY IF EXISTS "Account owners can view their accounts" ON public.accounts;
DROP POLICY IF EXISTS "Users can view their accounts" ON public.accounts;
DROP POLICY IF EXISTS "Users can insert accounts" ON public.accounts;
DROP POLICY IF EXISTS "Users can update their accounts" ON public.accounts;
DROP POLICY IF EXISTS "Users can delete their accounts" ON public.accounts;
DROP POLICY IF EXISTS "Agency owners see all accounts, clients see their own" ON public.accounts;

-- Simple policy: Users can see accounts they are members of
-- This works by checking if a membership exists (via service role, no RLS)
CREATE POLICY "users_can_view_member_accounts"
  ON public.accounts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.account_members
      WHERE account_members.account_id = accounts.id
      AND account_members.user_id = auth.uid()
      AND account_members.status = 'active'
    )
  );

-- =============================================================================
-- 3. Drop the helper functions (not needed with simple approach)
-- =============================================================================

DROP FUNCTION IF EXISTS public.user_is_agency_owner(UUID);
DROP FUNCTION IF EXISTS public.get_user_agency_accounts(UUID);

-- =============================================================================
-- 4. Ensure RLS is enabled
-- =============================================================================

ALTER TABLE public.account_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- Done!
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ SIMPLE RLS policies applied';
  RAISE NOTICE 'Users can view:';
  RAISE NOTICE '  - Their own account_members rows';
  RAISE NOTICE '  - Accounts they are members of';
  RAISE NOTICE 'No recursion issues!';
  RAISE NOTICE '========================================';
END $$;
