-- Diagnostic script to check if RLS is blocking access
-- Replace YOUR_EMAIL with your actual email

-- Step 1: Check if the data exists (bypasses RLS)
SELECT
  'DATA EXISTS CHECK (NO RLS)' as check_name,
  u.email as user_email,
  a.name as account_name,
  am.role,
  am.status,
  a.account_type
FROM public.account_members am
JOIN auth.users u ON u.id = am.user_id
JOIN public.accounts a ON a.id = am.account_id
WHERE u.email = 'YOUR_EMAIL_HERE'; -- CHANGE THIS

-- Step 2: Check what the RLS policy would return (simulates what the user sees)
-- This simulates: SELECT * FROM account_members WHERE user_id = auth.uid()
DO $$
DECLARE
  v_user_id UUID;
  v_count INTEGER;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'YOUR_EMAIL_HERE'; -- CHANGE THIS

  RAISE NOTICE '========================================';
  RAISE NOTICE 'User ID: %', v_user_id;

  -- Check if RLS is enabled
  SELECT COUNT(*) INTO v_count
  FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename = 'account_members'
  AND rowsecurity = true;

  IF v_count > 0 THEN
    RAISE NOTICE 'RLS is ENABLED on account_members';
  ELSE
    RAISE NOTICE 'RLS is DISABLED on account_members';
  END IF;

  -- Check how many rows the user can see
  EXECUTE format('SET LOCAL "request.jwt.claims" = ''{"sub": "%s"}'';', v_user_id);

  SELECT COUNT(*) INTO v_count
  FROM public.account_members
  WHERE user_id = v_user_id;

  RAISE NOTICE 'Rows visible to user via RLS: %', v_count;
  RAISE NOTICE '========================================';
END $$;

-- Step 3: List all RLS policies on account_members
SELECT
  'RLS POLICIES' as check_name,
  policyname,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'account_members';

-- Step 4: Quick fix - Temporarily disable RLS to test (DO NOT USE IN PRODUCTION)
-- Uncomment the line below ONLY to test if RLS is the problem
-- ALTER TABLE public.account_members DISABLE ROW LEVEL SECURITY;

-- If disabling RLS fixes it, the problem is with the RLS policy
-- To re-enable RLS after testing:
-- ALTER TABLE public.account_members ENABLE ROW LEVEL SECURITY;
