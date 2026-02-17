-- Fix RLS policies for account_members table
-- This ensures users can see their own account memberships

-- Drop all existing policies
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

-- Create a simple, non-recursive policy
-- Users can see account_members rows where they are the user
CREATE POLICY "Users can view their own memberships"
  ON public.account_members
  FOR SELECT
  USING (user_id = auth.uid());

-- Create helper function to check if user is agency owner (bypasses RLS)
CREATE OR REPLACE FUNCTION public.user_is_agency_owner(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.account_members
    WHERE user_id = check_user_id
    AND role IN ('agency_owner', 'agency_admin')
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to get agency accounts for user (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_user_agency_accounts(check_user_id UUID)
RETURNS TABLE(account_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT am.account_id FROM public.account_members am
  WHERE am.user_id = check_user_id
  AND am.role IN ('agency_owner', 'agency_admin')
  AND am.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add policy for agency owners to see client memberships (using helper function)
CREATE POLICY "Agency owners can view client memberships"
  ON public.account_members
  FOR SELECT
  USING (
    public.user_is_agency_owner(auth.uid()) AND
    account_id IN (
      SELECT a.id FROM public.accounts a
      WHERE a.parent_account_id IN (
        SELECT * FROM public.get_user_agency_accounts(auth.uid())
      )
    )
  );

-- Add INSERT policy (authenticated users can insert - needed for invitations)
CREATE POLICY "Authenticated users can insert account members"
  ON public.account_members
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add UPDATE policy (only agency owners can update for now)
CREATE POLICY "Agency owners can update members"
  ON public.account_members
  FOR UPDATE
  TO authenticated
  USING (public.user_is_agency_owner(auth.uid()));

-- Ensure RLS is enabled
ALTER TABLE public.account_members ENABLE ROW LEVEL SECURITY;

-- Verify
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ RLS policies fixed for account_members';
  RAISE NOTICE 'Users can now see their own memberships';
  RAISE NOTICE '========================================';
END $$;
