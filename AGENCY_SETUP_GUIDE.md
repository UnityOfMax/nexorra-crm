# Agency Platform Setup Guide

## Complete Setup Process

Follow these steps in order to set up the Nexorra agency account correctly.

---

## Step 1: Clean Up Old Schema

Run this SQL in Supabase SQL Editor to remove the old `owner_id` column:

```sql
-- File: migrations/cleanup-old-schema.sql
ALTER TABLE public.accounts DROP COLUMN IF EXISTS owner_id;
ALTER TABLE public.accounts DROP COLUMN IF EXISTS created_by;
```

**Why:** The old schema used `owner_id` in the accounts table. The new agency platform uses the `account_members` table with roles instead.

---

## Step 2: Verify Migration Was Run

Check if the restructure migration was applied:

```sql
-- Check if account_type column exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'accounts'
AND column_name IN ('account_type', 'parent_account_id');

-- Should return 2 rows: account_type and parent_account_id
```

If you see 0 rows, **run the restructure migration first:**
- Go to Supabase → SQL Editor
- Open `migrations/restructure-agency-platform.sql`
- Run it

**Note:** The migration is safe to re-run (uses `IF NOT EXISTS`)

---

## Step 3: Set Up Initial Agency Owner

**Option A: Automatic Setup (Recommended)**

1. Open `migrations/setup-initial-agency-owner.sql`
2. Replace these values:
   - `YOUR_EMAIL_HERE` → Your actual email (e.g., `admin@nexorra.com`)
   - `YOUR_PASSWORD_HERE` → Your password (minimum 6 characters)
   - `YOUR_NAME_HERE` → Your full name (e.g., `John Doe`)
3. Run the entire script in Supabase SQL Editor
4. Look for the success message in the output

**Option B: Manual Setup**

If Option A doesn't work, create manually:

1. **Create User** (Supabase Dashboard → Authentication → Users)
   - Click "Add user" → "Create new user"
   - Email: `your-email@example.com`
   - Password: `your-password`
   - Check "Auto Confirm User"
   - Click "Create user"
   - **Copy the User ID** (long UUID)

2. **Create Account** (Supabase Dashboard → Table Editor → accounts)
   - Click "Insert" → "Insert row"
   - `name`: `Nexorra`
   - `slug`: `nexorra`
   - `account_type`: `agency`
   - `parent_account_id`: leave null
   - `settings`: `{}`
   - **Copy the Account ID** (auto-generated UUID)

3. **Link User to Account** (Table Editor → account_members)
   - Click "Insert" → "Insert row"
   - `account_id`: [paste Account ID from step 2]
   - `user_id`: [paste User ID from step 1]
   - `role`: `agency_owner`
   - `status`: `active`
   - `permissions`: `{}`
   - Click "Save"

---

## Step 4: Verify Setup

Run the verification script to check everything is correct:

```sql
-- File: migrations/verify-agency-setup.sql
-- Replace YOUR_EMAIL_HERE with your actual email
```

Look for output showing:
- ✅ User exists in auth.users
- ✅ Nexorra account exists with type='agency'
- ✅ account_members row exists linking you to Nexorra
- ✅ Role is 'agency_owner'
- ✅ Status is 'active'

---

## Step 5: Test Login

1. Go to your app (http://localhost:3000)
2. You should see a clean login page (no "Create Account" option)
3. Enter your email and password
4. Click "Sign In"

**Expected Result:**
- You should see the dashboard
- Sidebar should show "Client Accounts" as the first menu item
- Default view should be the Client Accounts page (empty for now)

**If you see "No Account Access":**
- Something went wrong with the setup
- Open browser console (F12) and look for `[DEBUG]` logs
- Check the verification script output
- Most common issues:
  - User ID doesn't match (copy-paste error)
  - Status is not 'active'
  - RLS policies are blocking (shouldn't happen with agency_owner)

---

## Troubleshooting

### Issue: "No accounts found for user"

**Check browser console:**
```
[DEBUG] Loading accounts for user: abc-123-...
[DEBUG] Account members query result: { data: [], error: null, rowCount: 0 }
```

This means the query returned 0 rows. Check:

1. **User ID is correct:**
   ```sql
   SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';
   ```

2. **account_members row exists:**
   ```sql
   SELECT * FROM public.account_members
   WHERE user_id = 'YOUR_USER_ID_HERE'; -- Replace with your user ID
   ```

3. **Status is 'active':**
   ```sql
   UPDATE public.account_members
   SET status = 'active'
   WHERE user_id = 'YOUR_USER_ID_HERE';
   ```

### Issue: RLS Policy Blocking

If you suspect RLS is blocking, temporarily disable it:

```sql
-- WARNING: Only for debugging, never in production
ALTER TABLE public.account_members DISABLE ROW LEVEL SECURITY;

-- Test if it works now, then re-enable:
ALTER TABLE public.account_members ENABLE ROW LEVEL SECURITY;
```

If disabling RLS fixes it, the issue is with the RLS policies. Re-run the restructure migration.

---

## Next Steps After Login

Once you successfully log in as agency owner:

1. **View Client Accounts**
   - Default view shows "Client Accounts" page
   - Currently empty

2. **Create Your First Client**
   - Click "Create Client Account" button
   - Enter company name, slug, and optional domain
   - Client account is created as a sub-account under Nexorra

3. **Invite Users to Client Account**
   - Click on a client account card
   - Go to "Users" tab
   - Click "Invite User"
   - Enter email and select role (client_owner, client_admin, or client_user)
   - User receives activation email with 48-hour expiration

4. **Switch to Client Account**
   - From client details modal, click "Open Account"
   - You'll see the client's limited UI (Calendar, Conversations, Opportunities, Dashboard, Settings)

---

## Database Schema Quick Reference

```
┌─────────────────┐
│  auth.users     │
│  (Supabase)     │
└────────┬────────┘
         │
         │ user_id
         │
┌────────▼────────────────────────────┐
│  public.account_members             │
│  ├─ user_id (FK → auth.users)       │
│  ├─ account_id (FK → accounts)      │
│  ├─ role (agency_owner, etc.)       │
│  ├─ status (active, inactive)       │
│  └─ permissions (JSONB)             │
└────────┬────────────────────────────┘
         │ account_id
         │
┌────────▼────────────────────────────┐
│  public.accounts                    │
│  ├─ name (Nexorra, Client Co.)      │
│  ├─ slug (nexorra, client-co)       │
│  ├─ account_type (agency, client)   │
│  ├─ parent_account_id (NULL or ID)  │
│  └─ settings (JSONB)                │
└─────────────────────────────────────┘
```

**Key Points:**
- NO `owner_id` field in accounts table
- Ownership is defined by role in account_members
- Agency accounts have `account_type='agency'` and `parent_account_id=NULL`
- Client accounts have `account_type='client'` and `parent_account_id=[agency_id]`
- Agency owners can access all client data (via RLS policies)

---

## Common Questions

**Q: Can I have multiple agency owners?**
A: Yes! Just create multiple account_members rows with role='agency_owner' for the same agency account.

**Q: How do I delete the old data and start fresh?**
A:
```sql
-- WARNING: This deletes ALL data
DELETE FROM public.account_members;
DELETE FROM public.accounts;
DELETE FROM auth.users WHERE email LIKE '%@%'; -- Or specific email

-- Then run setup-initial-agency-owner.sql again
```

**Q: Can I change an existing account to be the agency?**
A:
```sql
UPDATE public.accounts
SET account_type = 'agency', parent_account_id = NULL
WHERE slug = 'your-existing-account-slug';
```

**Q: What if I want to use a different company name instead of "Nexorra"?**
A: Just change the name in `setup-initial-agency-owner.sql` before running it.

---

## Support

If you're still having issues:

1. Copy the output from `verify-agency-setup.sql`
2. Copy the browser console logs (F12)
3. Check Supabase logs (Dashboard → Logs → Postgres)
4. Share the error messages

The most important debug output is:
```
[DEBUG] Account members query result: { ... }
```

This shows exactly what the query returned and helps identify the issue.
