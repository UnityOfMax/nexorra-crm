-- Verification script to check if agency account is set up correctly
-- Run this to debug why you're seeing "no accounts"

-- 1. Check if user exists in auth.users
SELECT
  'AUTH USER CHECK' as check_name,
  id,
  email,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- 2. Check if accounts exist
SELECT
  'ACCOUNTS CHECK' as check_name,
  id,
  name,
  slug,
  account_type,
  parent_account_id,
  created_at
FROM public.accounts
ORDER BY created_at DESC;

-- 3. Check if account_members exist
SELECT
  'ACCOUNT MEMBERS CHECK' as check_name,
  am.id,
  am.account_id,
  am.user_id,
  am.role,
  am.status,
  u.email as user_email,
  a.name as account_name
FROM public.account_members am
LEFT JOIN auth.users u ON u.id = am.user_id
LEFT JOIN public.accounts a ON a.id = am.account_id
ORDER BY am.created_at DESC;

-- 4. Check RLS policies on account_members table
SELECT
  'RLS POLICIES CHECK' as check_name,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'account_members';

-- 5. Check if the specific user has access (replace YOUR_EMAIL with your actual email)
DO $$
DECLARE
  v_user_id UUID;
  v_account_count INTEGER;
  r RECORD;
BEGIN
  -- Get user ID by email
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'YOUR_EMAIL_HERE'; -- CHANGE THIS

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'ERROR: User not found with that email';
  ELSE
    -- Count how many account_members rows exist for this user
    SELECT COUNT(*) INTO v_account_count
    FROM public.account_members
    WHERE user_id = v_user_id;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'User ID: %', v_user_id;
    RAISE NOTICE 'Account memberships: %', v_account_count;

    -- Show the memberships
    IF v_account_count > 0 THEN
      RAISE NOTICE 'Memberships:';
      FOR r IN
        SELECT am.account_id, am.role, am.status, a.name
        FROM public.account_members am
        LEFT JOIN public.accounts a ON a.id = am.account_id
        WHERE am.user_id = v_user_id
      LOOP
        RAISE NOTICE '  Account: % | Role: % | Status: %', r.name, r.role, r.status;
      END LOOP;
    ELSE
      RAISE NOTICE 'No account memberships found. You need to create an account_members row.';
    END IF;
    RAISE NOTICE '========================================';
  END IF;
END $$;
