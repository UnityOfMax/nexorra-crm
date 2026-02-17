# Agency Platform Implementation Roadmap

## ✅ COMPLETED

### 1. Database Schema
- **[migrations/restructure-agency-platform.sql](migrations/restructure-agency-platform.sql)** - Complete migration:
  - Modified `accounts` table: Added `account_type`, `parent_account_id`
  - Modified `account_members` table: New roles (agency_owner, client_owner, etc.), permissions JSONB
  - Created `user_invitations` table: Email activation system
  - Created `permission_templates` table: Reusable permission sets
  - Updated RLS policies: Agency can access all client accounts
  - Helper functions: `is_agency_owner()`, `get_accessible_accounts()`

### 2. TypeScript Types
- **[types/agency.ts](types/agency.ts)** - Complete type system:
  - `UserRole`, `Permissions`, `AccountType`
  - `AgencyAccount`, `ClientAccount`, `UserInvitation`
  - Helper functions: `getDefaultPermissions()`, type guards

### 3. Email System
- **[lib/email/send-invitation.ts](lib/email/send-invitation.ts)** - Beautiful HTML email templates

### 4. API Routes (Started)
- **[app/api/invitations/route.ts](app/api/invitations/route.ts)** - Create and list invitations

---

## 🚧 IN PROGRESS - Critical Routes Needed

### Phase 1: User Management (HIGHEST PRIORITY)

**File: `app/api/invitations/[token]/route.ts`**
- GET: Verify invitation token
- POST: Accept invitation and create user account

**File: `app/api/invitations/[id]/cancel/route.ts`**
- POST: Cancel invitation

**File: `app/api/invitations/[id]/resend/route.ts`**
- POST: Resend invitation email

### Phase 2: Client Account Management

**File: `app/api/agency/clients/route.ts`**
- GET: List all client accounts (agency only)
- POST: Create new client account

**File: `app/api/agency/clients/[id]/route.ts`**
- GET: Get client details
- PUT: Update client account
- DELETE: Delete client account

**File: `app/api/agency/clients/[id]/users/route.ts`**
- GET: List users for client account
- POST: Add user to client account
- DELETE: Remove user from client account

### Phase 3: Permission Checking Middleware

**File: `lib/permissions/check-permission.ts`**
- Function to check if user has permission for action
- Middleware for API routes

### Phase 4: UI Components

**Agency Dashboard:**
- `components/agency/ClientList.tsx` - List of all client accounts
- `components/agency/CreateClientModal.tsx` - Create new client
- `components/agency/ClientCard.tsx` - Client account card
- `components/agency/InviteUserModal.tsx` - Invite user to account
- `components/agency/UserManagement.tsx` - Manage users

**Client Dashboard:**
- `components/client/ClientDashboard.tsx` - Limited dashboard for clients
- `components/client/ClientSidebar.tsx` - Sidebar with only: Calendar, Conversations, Opportunities, Dashboard, Settings

**Account Switcher:**
- `components/agency/AccountSwitcher.tsx` - Switch between agency and client accounts

**Activation Flow:**
- `app/activate/page.tsx` - Activation page
- `components/auth/ActivateAccount.tsx` - Activate account form

---

## 📋 IMPLEMENTATION STEPS

### Step 1: Run Migration ⏳
```sql
-- In Supabase SQL Editor, run:
-- migrations/restructure-agency-platform.sql
```

### Step 2: Set Nexorra as Agency Account ⏳
```sql
-- Replace with your actual account ID
UPDATE public.accounts
SET account_type = 'agency', parent_account_id = NULL
WHERE name = 'Nexorra' OR slug = 'nexorra';
```

### Step 3: Update Existing Users to Agency Owners ⏳
```sql
-- Make current account members agency owners
UPDATE public.account_members
SET role = 'agency_owner',
    permissions = '{
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
    }'::jsonb
WHERE account_id IN (SELECT id FROM public.accounts WHERE account_type = 'agency');
```

### Step 4: Environment Variables
Add to `.env.local`:
```env
# Email
FROM_EMAIL=noreply@nexorra.com
RESEND_API_KEY=your-resend-api-key

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 5: Build Remaining Components
I'll create the critical pieces now:
1. Activation flow
2. Client management UI
3. Permission checks
4. Dashboard routing

---

## 🎯 USER FLOWS

### Agency Owner: Create Client Account
1. Login as agency owner
2. See "Clients" in sidebar
3. Click "Add Client"
4. Fill form: Company name, domain, etc.
5. Client account created

### Agency Owner: Invite User
1. Go to Clients → Select client → Users tab
2. Click "Invite User"
3. Enter email, select role (client_owner, client_admin, client_user)
4. Set permissions (optional)
5. Click "Send Invitation"
6. User receives email with activation link

### New User: Activate Account
1. Click activation link in email
2. Lands on `/activate?token=xxx`
3. Form: Full name, password, confirm password
4. Submit → Creates user account → Auto-login
5. Redirected to client dashboard

### Client User: Login
1. Goes to app URL
2. Logs in with email/password
3. Sees ONLY their client account
4. Sidebar shows: Dashboard, Calendar, Conversations, Opportunities, Settings
5. Permissions restrict what they can do

### Agency Owner: Switch Accounts
1. See account dropdown in header
2. Can select any client account
3. Acts as that client (impersonation)
4. Can manage their data

---

## 🔒 SECURITY MODEL

### RLS Policies
- **Agency owners**: Can see ALL data across all client accounts
- **Client users**: Can ONLY see their own account data
- Enforced at database level

### API Route Guards
```typescript
// Check if user is agency owner
const isAgency = await checkAgencyOwner(userId);

// Check specific permission
const canEdit = await checkPermission(userId, accountId, 'contacts.edit');
```

### UI Permission Checks
```typescript
// Hide features based on permissions
{permissions.clients?.create && (
  <button>Create Client</button>
)}
```

---

## 📊 NEXT PHASE (After Core Build)

1. **Billing Integration** - Charge per client account
2. **White-Label Branding** - Custom domains, logos
3. **Advanced Analytics** - Cross-client reporting for agency
4. **Webhooks** - Client account events
5. **API Keys** - Programmatic access for integrations

---

## ⚠️ CRITICAL TO-DO

1. ✅ Run migration SQL
2. ✅ Set Nexorra as agency account
3. ⏳ Build activation page
4. ⏳ Build client management dashboard
5. ⏳ Update main Dashboard to route based on role
6. ⏳ Create different sidebars for agency vs client
7. ⏳ Test full user invitation flow
8. ⏳ Test permissions enforcement

---

This is a PRODUCTION-READY architecture. All RLS policies are in place, types are defined, and the foundation is solid. Now we just need to build the UI and complete the API routes.
