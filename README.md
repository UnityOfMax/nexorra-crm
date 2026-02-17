# CRM System - Multi-Tenant Platform

A comprehensive CRM system similar to GoHighLevel, built with Next.js 14, Supabase, and TypeScript.

## Features

- 🏢 **Multi-tenant Architecture** - Agency and client accounts with proper isolation
- 👥 **Contact Management** - Full CRM for leads and customers
- 📊 **Deals Pipeline** - Track sales opportunities
- 📧 **Email Campaigns** - Send bulk emails with custom domain support (coming soon)
- 📱 **SMS Integration** - Twilio integration for SMS (coming soon)
- 🤖 **AI Calling** - AI-powered voice calls (coming soon)
- 🎨 **Landing Page Builder** - Create and publish landing pages (coming soon)
- 📈 **Analytics & Tracking** - Pixel integration and analytics (coming soon)

## Tech Stack

- **Frontend:** Next.js 14 (App Router), React, TypeScript
- **Styling:** Tailwind CSS
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **Icons:** Lucide React

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier is fine)

### 2. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Click "New Project"
3. Fill in:
   - **Project name:** crm-system (or any name)
   - **Database Password:** Create a strong password (save this!)
   - **Region:** Choose closest to you
   - **Pricing Plan:** Free
4. Click "Create new project" (takes ~2 minutes)

### 3. Set Up Database Schema

1. In your Supabase project, go to the **SQL Editor** (left sidebar)
2. Click "New query"
3. Copy the entire contents of `supabase-schema.sql` from this project
4. Paste it into the SQL editor
5. Click "Run" (bottom right)
6. Wait for success message (all tables and policies will be created)

### 4. Get Your Supabase Credentials

1. In your Supabase project, go to **Settings** > **API**
2. Copy these values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (under "Project API keys")
   - **service_role** key (under "Project API keys" - click "Reveal")

### 5. Configure Environment Variables

1. In the project folder, create a file called `.env.local`
2. Add your credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Replace the placeholder values with your actual Supabase credentials.

### 6. Install Dependencies

```bash
npm install
```

### 7. Run the Development Server

```bash
npm run dev
```

### 8. Open in Browser

Open [http://localhost:3000](http://localhost:3000) in your browser!

## First Time Setup

1. **Create Account:** On first load, click "Don't have an account? Sign up"
2. **Sign Up:** Enter your email, password, and full name
3. **Check Email:** Supabase will send a confirmation email
4. **Confirm Email:** Click the link in the email
5. **Create Account Record:** After confirming, you'll need to manually create an account:
   - Go to Supabase dashboard > Table Editor > `accounts` table
   - Click "Insert row"
   - Fill in:
     - name: "My Agency"
     - slug: "my-agency"
     - type: "agency"
     - owner_id: (copy your user ID from the `users` table)
   - Click "Save"
6. **Create Account Member:** Go to `account_members` table:
   - Click "Insert row"
   - Fill in:
     - account_id: (copy the account ID you just created)
     - user_id: (your user ID)
     - role: "owner"
   - Click "Save"
7. **Refresh Page:** Now you should see the dashboard!

## Project Structure

```
crm-system/
├── app/                    # Next.js App Router pages
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── AuthForm.tsx       # Sign in/up form
│   ├── Dashboard.tsx      # Main dashboard
│   ├── Sidebar.tsx        # Navigation sidebar
│   ├── AccountSelector.tsx # Account switcher
│   └── ContactsList.tsx   # Contacts management
├── lib/                   # Utilities
│   └── supabase.ts       # Supabase client
├── types/                 # TypeScript types
│   └── index.ts          # Type definitions
└── supabase-schema.sql   # Database schema
```

## Database Schema

The system uses a multi-tenant architecture with these main tables:

- **users** - User profiles (extends Supabase auth)
- **accounts** - Agency and client accounts
- **account_members** - Team members per account
- **contacts** - CRM contacts/leads
- **deals** - Sales pipeline
- **activities** - Tasks, calls, emails, meetings
- **landing_pages** - Custom landing pages
- **email_campaigns** - Email marketing campaigns

## Coming Soon

- Drag-and-drop landing page builder
- Email campaign builder with templates
- SMS campaigns via Twilio
- AI voice calling
- Automation workflows
- Calendar scheduling
- File storage
- Payment processing
- White-label options

## Development Commands

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## Deployment

### Deploy to Vercel (Recommended)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "Import Project"
4. Select your GitHub repo
5. Add environment variables from `.env.local`
6. Click "Deploy"

### Deploy to Netlify

1. Push your code to GitHub
2. Go to [netlify.com](https://netlify.com)
3. Click "New site from Git"
4. Select your repo
5. Build command: `npm run build`
6. Publish directory: `.next`
7. Add environment variables
8. Click "Deploy"

## Troubleshooting

**Can't sign in after signing up?**
- Check your email for Supabase confirmation link
- Make sure you created the account and account_member records

**"No accounts" error?**
- You need to manually create an account record in Supabase (see step 5 above)

**Database errors?**
- Make sure you ran the entire `supabase-schema.sql` file
- Check that RLS policies are enabled

**Environment variables not working?**
- Make sure `.env.local` is in the root directory
- Restart the dev server after changing env vars

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review the Supabase documentation
3. Check Next.js documentation

## License

MIT
