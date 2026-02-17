-- Restructure for Agency Platform with Client Sub-accounts
-- Run this migration to convert to agency/client hierarchy

-- ============================================================================
-- 1. UPDATE ACCOUNTS TABLE - Add agency/client types and hierarchy
-- ============================================================================

-- Add account_type column
ALTER TABLE public.accounts
ADD COLUMN IF NOT EXISTS account_type TEXT CHECK (account_type IN ('agency', 'client')) DEFAULT 'client';

-- Add parent_account_id for client accounts
ALTER TABLE public.accounts
ADD COLUMN IF NOT EXISTS parent_account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE;

-- Add branding settings for white-label
ALTER TABLE public.accounts
ADD COLUMN IF NOT EXISTS domain TEXT UNIQUE;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_accounts_parent ON public.accounts(parent_account_id);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON public.accounts(account_type);

-- Set Nexorra as the main agency account (update existing or create new)
-- You'll need to run this manually with your agency account ID
-- UPDATE public.accounts SET account_type = 'agency', parent_account_id = NULL WHERE name = 'Nexorra';

-- ============================================================================
-- 2. UPDATE ACCOUNT_MEMBERS - Enhanced roles and permissions
-- ============================================================================

-- Drop old role constraint
ALTER TABLE public.account_members DROP CONSTRAINT IF EXISTS account_members_role_check;

-- Add new role types
ALTER TABLE public.account_members
DROP COLUMN IF EXISTS role;

ALTER TABLE public.account_members
ADD COLUMN role TEXT CHECK (role IN ('agency_owner', 'agency_admin', 'client_owner', 'client_admin', 'client_user')) DEFAULT 'client_user';

-- Add permissions JSONB field
ALTER TABLE public.account_members
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;

-- Add status for active/inactive users
ALTER TABLE public.account_members
ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('active', 'inactive', 'pending')) DEFAULT 'active';

-- ============================================================================
-- 3. CREATE USER_INVITATIONS TABLE - Email activation system
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  role TEXT CHECK (role IN ('agency_owner', 'agency_admin', 'client_owner', 'client_admin', 'client_user')) NOT NULL,
  permissions JSONB DEFAULT '{}'::jsonb,

  -- Invitation details
  invited_by UUID REFERENCES public.users(id) NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')) DEFAULT 'pending',

  -- Metadata
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(account_id, email)
);

CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON public.user_invitations(token);
CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON public.user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_user_invitations_account ON public.user_invitations(account_id);

-- ============================================================================
-- 4. CREATE PERMISSIONS TEMPLATE TABLE - Reusable permission sets
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.permission_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  role TEXT NOT NULL,
  permissions JSONB NOT NULL,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default permission templates
INSERT INTO public.permission_templates (name, description, role, permissions, is_system) VALUES
(
  'Agency Owner',
  'Full access to all features across all client accounts',
  'agency_owner',
  '{
    "contacts": {"view": true, "create": true, "edit": true, "delete": true, "bulk_actions": true},
    "conversations": {"view": true, "send": true, "delete": true},
    "calendar": {"view": true, "create": true, "edit": true, "delete": true},
    "pipelines": {"view": true, "create": true, "edit": true, "delete": true, "move_deals": true},
    "workflows": {"view": true, "create": true, "edit": true, "delete": true, "activate": true},
    "pages": {"view": true, "create": true, "edit": true, "delete": true, "publish": true},
    "settings": {"view": true, "edit": true, "integrations": true, "billing": true},
    "clients": {"view": true, "create": true, "edit": true, "delete": true, "manage_users": true},
    "analytics": {"view": true},
    "impersonate": true
  }'::jsonb,
  true
),
(
  'Client Owner',
  'Full access to their own client account',
  'client_owner',
  '{
    "contacts": {"view": true, "create": true, "edit": true, "delete": true, "bulk_actions": true},
    "conversations": {"view": true, "send": true, "delete": true},
    "calendar": {"view": true, "create": true, "edit": true, "delete": true},
    "pipelines": {"view": true, "create": true, "edit": true, "delete": true, "move_deals": true},
    "settings": {"view": true, "edit": false, "integrations": true, "billing": false},
    "analytics": {"view": true}
  }'::jsonb,
  true
),
(
  'Client User',
  'Limited access for client team members',
  'client_user',
  '{
    "contacts": {"view": true, "create": true, "edit": true, "delete": false, "bulk_actions": false},
    "conversations": {"view": true, "send": true, "delete": false},
    "calendar": {"view": true, "create": true, "edit": true, "delete": false},
    "pipelines": {"view": true, "create": false, "edit": false, "delete": false, "move_deals": true},
    "settings": {"view": false, "edit": false, "integrations": false, "billing": false}
  }'::jsonb,
  true
);

-- ============================================================================
-- 5. UPDATE RLS POLICIES - Multi-tenant security with agency access
-- ============================================================================

-- Drop existing policies that conflict
DROP POLICY IF EXISTS "Users can view their accounts" ON public.accounts;
DROP POLICY IF EXISTS "Users can view their account members" ON public.account_members;

-- ACCOUNTS: Agency owners can see all client accounts, clients see only their own
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
DROP POLICY IF EXISTS "Users can view contacts for their account" ON public.contacts;

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
DROP POLICY IF EXISTS "Users can view messages for their account" ON public.messages;

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
DROP POLICY IF EXISTS "Users can view activities for their account" ON public.activities;

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

-- USER_INVITATIONS: RLS policies
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency owners can manage all invitations, clients their own"
  ON public.user_invitations
  FOR ALL
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

-- ============================================================================
-- 6. ADD HELPFUL FUNCTIONS
-- ============================================================================

-- Function to check if user is agency owner
CREATE OR REPLACE FUNCTION public.is_agency_owner(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.account_members
    WHERE account_members.user_id = user_id
    AND account_members.role IN ('agency_owner', 'agency_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's accessible account IDs
CREATE OR REPLACE FUNCTION public.get_accessible_accounts(user_id UUID)
RETURNS TABLE(account_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT am.account_id FROM public.account_members am WHERE am.user_id = user_id
  UNION
  SELECT a.id FROM public.accounts a
  WHERE a.parent_account_id IN (
    SELECT am2.account_id FROM public.account_members am2
    WHERE am2.user_id = user_id
    AND am2.role IN ('agency_owner', 'agency_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Add comments
COMMENT ON TABLE public.user_invitations IS 'Email-based user invitation system with activation tokens';
COMMENT ON TABLE public.permission_templates IS 'Reusable permission sets for different user roles';
COMMENT ON COLUMN public.accounts.account_type IS 'Distinguishes between agency and client accounts';
COMMENT ON COLUMN public.accounts.parent_account_id IS 'Links client accounts to their parent agency';
