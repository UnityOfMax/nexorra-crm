-- Complete setup script for initial agency owner
-- This creates the Nexorra agency account and links you as the owner
-- Replace YOUR_EMAIL and YOUR_PASSWORD and YOUR_NAME with your actual values

DO $$
DECLARE
  v_user_id UUID;
  v_account_id UUID;
  v_user_exists BOOLEAN;
BEGIN
  -- Check if user already exists
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'YOUR_EMAIL_HERE'
  ) INTO v_user_exists;

  IF v_user_exists THEN
    -- Get existing user ID
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'YOUR_EMAIL_HERE';
    RAISE NOTICE 'User already exists with ID: %', v_user_id;
  ELSE
    -- Create new user
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'YOUR_EMAIL_HERE', -- CHANGE THIS
      crypt('YOUR_PASSWORD_HERE', gen_salt('bf')), -- CHANGE THIS
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"YOUR_NAME_HERE"}'::jsonb, -- CHANGE THIS
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    ) RETURNING id INTO v_user_id;

    RAISE NOTICE 'Created new user with ID: %', v_user_id;
  END IF;

  -- Check if Nexorra agency account exists
  SELECT id INTO v_account_id FROM public.accounts WHERE slug = 'nexorra';

  IF v_account_id IS NULL THEN
    -- Create Nexorra agency account
    -- Note: 'type' column may exist from old schema (set to NULL since we use account_type now)
    INSERT INTO public.accounts (name, slug, type, account_type, parent_account_id, settings)
    VALUES ('Nexorra', 'nexorra', NULL, 'agency', NULL, '{}'::jsonb)
    RETURNING id INTO v_account_id;

    RAISE NOTICE 'Created Nexorra agency account with ID: %', v_account_id;
  ELSE
    RAISE NOTICE 'Nexorra agency account already exists with ID: %', v_account_id;
  END IF;

  -- Check if user is already a member
  IF NOT EXISTS (
    SELECT 1 FROM public.account_members
    WHERE user_id = v_user_id AND account_id = v_account_id
  ) THEN
    -- Link user to agency as owner
    INSERT INTO public.account_members (account_id, user_id, role, status, permissions)
    VALUES (v_account_id, v_user_id, 'agency_owner', 'active', '{}'::jsonb);

    RAISE NOTICE 'Added user as agency owner';
  ELSE
    RAISE NOTICE 'User is already a member of this account';
  END IF;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'SETUP COMPLETE!';
  RAISE NOTICE 'User ID: %', v_user_id;
  RAISE NOTICE 'Account ID: %', v_account_id;
  RAISE NOTICE 'You can now log in with your email and password';
  RAISE NOTICE '========================================';
END $$;
