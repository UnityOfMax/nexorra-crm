# 🚀 COMPLETE SETUP GUIDE

Follow these steps exactly to get your CRM system running locally.

## ⏱️ Time Required: ~15 minutes

---

## STEP 1: Install Node.js (if not already installed)

1. Go to https://nodejs.org
2. Download the LTS (Long Term Support) version
3. Run the installer
4. Verify installation:
   ```bash
   node --version
   npm --version
   ```
   You should see version numbers like `v20.x.x` and `10.x.x`

---

## STEP 2: Create Supabase Project

### 2.1 Create Account
1. Go to https://supabase.com
2. Click "Start your project"
3. Sign up with GitHub, Google, or email

### 2.2 Create New Project
1. Click "+ New Project" (green button)
2. Fill in the form:
   - **Organization:** Create new or select existing
   - **Name:** `crm-system`
   - **Database Password:** Generate a strong password (SAVE THIS!)
   - **Region:** Choose closest to your location
   - **Pricing Plan:** Free
3. Click "Create new project"
4. **Wait 2-3 minutes** for project to initialize (grab a coffee ☕)

---

## STEP 3: Set Up Database

### 3.1 Run the Schema
1. In Supabase dashboard, click **SQL Editor** in left sidebar
2. Click **+ New query**
3. Open the file `supabase-schema.sql` from this project
4. **Copy EVERYTHING** from that file (Ctrl+A, Ctrl+C)
5. Paste into the Supabase SQL editor
6. Click **RUN** (bottom right corner)
7. Wait for success message: "Success. No rows returned"

### 3.2 Verify Tables Created
1. Click **Table Editor** in left sidebar
2. You should see these tables:
   - users
   - accounts
   - account_members
   - contacts
   - deals
   - activities
   - landing_pages
   - email_campaigns

---

## STEP 4: Get API Keys

1. In Supabase dashboard, click **Settings** (gear icon in sidebar)
2. Click **API** in the settings menu
3. You'll see:
   - **Project URL** - Copy this (looks like `https://xxxxx.supabase.co`)
   - **API Keys:**
     - Copy **anon public** key (under "Project API keys")
     - Click **Reveal** next to service_role, then copy that key too

**⚠️ IMPORTANT:** Keep these keys safe! Don't share them publicly.

---

## STEP 5: Configure Your Project

### 5.1 Create Environment File
1. Open the `crm-system` folder in your code editor (VS Code recommended)
2. Create a new file called `.env.local` in the ROOT directory
3. Copy this template:

```bash
NEXT_PUBLIC_SUPABASE_URL=paste_your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=paste_your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=paste_your_service_role_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. Replace each `paste_your_xxx_here` with your actual keys from Step 4
5. **Save the file**

### 5.2 Example (with fake keys):
```bash
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## STEP 6: Install Project Dependencies

1. Open Terminal/Command Prompt
2. Navigate to project folder:
   ```bash
   cd path/to/crm-system
   ```
3. Install all dependencies:
   ```bash
   npm install
   ```
4. Wait for installation to complete (~2-3 minutes)

---

## STEP 7: Start Development Server

1. In the same terminal, run:
   ```bash
   npm run dev
   ```
2. Wait for the message:
   ```
   ✓ Ready in 2.5s
   ○ Local:   http://localhost:3000
   ```
3. **Don't close this terminal!** Keep it running.

---

## STEP 8: Open in Browser

1. Open your web browser
2. Go to: **http://localhost:3000**
3. You should see the CRM login page! 🎉

---

## STEP 9: Create Your First User

### 9.1 Sign Up
1. Click **"Don't have an account? Sign up"**
2. Fill in:
   - **Full Name:** Your name
   - **Email:** Your email
   - **Password:** At least 6 characters
3. Click **"Sign Up"**
4. You'll see: "Check your email for the confirmation link!"

### 9.2 Confirm Email
1. Check your email inbox
2. Find email from Supabase
3. Click **"Confirm your email"** link
4. You'll be redirected to a confirmation page

---

## STEP 10: Create Your Account (Manual Setup)

Because this is the first user, you need to manually create an account in Supabase:

### 10.1 Get Your User ID
1. Go back to Supabase dashboard
2. Click **Table Editor** > **users** table
3. Find your email in the table
4. **Copy the ID** (long string like `123e4567-e89b-12d3-a456-426614174000`)

### 10.2 Create Account
1. In Table Editor, click **accounts** table
2. Click **Insert** > **Insert row**
3. Fill in:
   - **name:** "My Agency" (or any name you want)
   - **slug:** "my-agency" (lowercase, no spaces)
   - **type:** Select "agency" from dropdown
   - **owner_id:** Paste your user ID from 10.1
   - Leave other fields empty
4. Click **Save**
5. **Copy the account ID** that was just created

### 10.3 Create Account Member
1. In Table Editor, click **account_members** table
2. Click **Insert** > **Insert row**
3. Fill in:
   - **account_id:** Paste the account ID from 10.2
   - **user_id:** Paste your user ID from 10.1
   - **role:** Select "owner" from dropdown
4. Click **Save**

---

## STEP 11: Login and Use!

1. Go back to **http://localhost:3000**
2. Enter your email and password
3. Click **"Sign In"**
4. **You're in!** 🎊

You should now see:
- Dashboard with stats (all zeros initially)
- Sidebar navigation
- Your account name in the header

---

## 🎯 Quick Test: Add Your First Contact

1. Click **"Contacts"** in the sidebar
2. Click **"+ Add Contact"** button
3. Fill in the form:
   - First Name: John
   - Last Name: Doe
   - Email: john@example.com
   - Status: Lead
4. Click **"Create Contact"**
5. You'll see John Doe in your contacts list!

---

## 📊 What You Have Now

✅ Working CRM system running locally
✅ Supabase database with all tables
✅ User authentication working
✅ Multi-tenant architecture
✅ Contact management system
✅ Dashboard with stats

---

## 🚀 Next Steps

Now that it's working locally, you can:

1. **Add more features** (follow the roadmap in README.md)
2. **Customize the design** (edit Tailwind classes)
3. **Deploy to production** (when ready)

---

## ❌ Troubleshooting

### "Network error" when signing in
- Check that your `.env.local` file is correct
- Make sure Supabase keys are copied correctly
- Restart the dev server (`Ctrl+C`, then `npm run dev`)

### "No accounts" message after login
- Follow Step 10 to create account and account_member records
- Make sure owner_id matches your user ID exactly

### "Tables don't exist" errors
- Re-run the `supabase-schema.sql` in Supabase SQL Editor
- Make sure it ran without errors

### Can't access localhost:3000
- Make sure `npm run dev` is still running
- Try a different port: `npm run dev -- -p 3001`
- Check firewall settings

### Still stuck?
- Double-check you followed every step
- Make sure Node.js version is 18 or higher
- Try clearing browser cache and cookies

---

## 💡 Pro Tips

- **Keep the terminal open** - The dev server needs to stay running
- **Use VS Code** - Best editor for this project with TypeScript support
- **Install Extensions:**
  - Tailwind CSS IntelliSense
  - ES7+ React/Redux/React-Native snippets
  - Prettier - Code formatter

---

## 🎉 Congratulations!

You now have a working CRM system! Explore the features, add contacts, and start customizing it to your needs.

For the next phase (email, SMS, landing pages), follow the roadmap in README.md.
