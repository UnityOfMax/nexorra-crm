# API Setup Guide for Google Calendar & Facebook Integrations

## 1. Google Calendar Integration (2-Way Sync)

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Create Project"** or select existing project
3. Name it: `YourCRM-Integrations` (or similar)
4. Note your **Project ID**

### Step 2: Enable Google Calendar API

1. In Google Cloud Console, go to **APIs & Services → Library**
2. Search for **"Google Calendar API"**
3. Click **Enable**

### Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services → OAuth consent screen**
2. Choose **External** (or Internal if using Google Workspace)
3. Fill in required fields:
   - **App name**: Your CRM Name
   - **User support email**: your-email@example.com
   - **Developer contact**: your-email@example.com
4. Click **Save and Continue**

5. **Scopes** - Add these scopes:
   - `https://www.googleapis.com/auth/calendar` (Manage calendars)
   - `https://www.googleapis.com/auth/calendar.events` (Manage events)
   - Click **Save and Continue**

6. **Test users** (if in testing mode):
   - Add your email and test user emails
   - Click **Save and Continue**

### Step 4: Create OAuth 2.0 Credentials

1. Go to **APIs & Services → Credentials**
2. Click **Create Credentials → OAuth client ID**
3. Select **Application type**: Web application
4. Name: `CRM Web Client`
5. **Authorized redirect URIs** - Add:
   ```
   http://localhost:3000/api/auth/google/callback
   https://yourdomain.com/api/auth/google/callback
   ```
6. Click **Create**
7. **SAVE THESE** (you'll need them):
   - **Client ID**: `xxxxx.apps.googleusercontent.com`
   - **Client Secret**: `GOCSPX-xxxxx`

### Step 5: Add to Environment Variables

Add to your `.env.local`:
```env
# Google Calendar Integration
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

### Step 6: Required NPM Packages

```bash
npm install googleapis @googleapis/calendar
```

### API Endpoints You'll Need to Build

1. **`/api/integrations/google/auth`** - Initiate OAuth flow
2. **`/api/integrations/google/callback`** - Handle OAuth callback
3. **`/api/integrations/google/calendar/events`** - List/create/update events
4. **`/api/integrations/google/calendar/sync`** - 2-way sync logic
5. **`/api/webhooks/google/calendar`** - Receive calendar change notifications

### Calendar Sync Strategy

**Database Schema Addition:**
```sql
CREATE TABLE google_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMP,
  calendar_id TEXT, -- Primary calendar to sync
  sync_enabled BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE calendar_event_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
  google_event_id TEXT NOT NULL,
  last_synced_at TIMESTAMP DEFAULT NOW()
);
```

---

## 2. Facebook Integration (Ads + Pages)

### Step 1: Create Facebook App

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Click **My Apps → Create App**
3. Choose **Business** as app type
4. Fill in details:
   - **App Name**: YourCRM Integration
   - **Contact Email**: your-email@example.com
   - **Business Account**: Select or create one
5. Click **Create App**
6. Note your **App ID** and **App Secret** (in Settings → Basic)

### Step 2: Add Required Products

1. In your app dashboard, click **Add Product**
2. Add these products:
   - **Facebook Login** - Click Setup
   - **Marketing API** - Click Setup
   - **Instagram Basic Display** - Click Setup (if not available, use Instagram Graph API)

### Step 3: Configure Facebook Login

1. Go to **Facebook Login → Settings**
2. **Valid OAuth Redirect URIs** - Add:
   ```
   http://localhost:3000/api/auth/facebook/callback
   https://yourdomain.com/api/auth/facebook/callback
   ```
3. Save changes

### Step 4: Request Permissions

Go to **App Review → Permissions and Features** and request:

**Required Permissions:**
- `ads_read` - Read ad account data
- `ads_management` - Manage ads (if needed)
- `pages_show_list` - List pages
- `pages_read_engagement` - Read page engagement
- `pages_manage_metadata` - Manage page info
- `instagram_basic` - Basic Instagram access
- `instagram_manage_comments` - Manage Instagram comments
- `instagram_manage_insights` - Instagram insights

**Note**: Most permissions require **App Review** by Facebook. You'll need to:
1. Provide screencast showing how you use each permission
2. Explain business use case
3. Wait 3-7 days for approval

### Step 5: Get Access Tokens

**For Development/Testing (Short-lived):**
1. Go to **Tools → Graph API Explorer**
2. Select your app
3. Click **Generate Access Token**
4. Select all permissions you need
5. Copy the token (valid ~2 hours)

**For Production (Long-lived):**
You'll exchange short-lived tokens for long-lived ones via API after user authorizes.

### Step 6: Connect Ad Account

1. Go to [Facebook Business Manager](https://business.facebook.com/)
2. **Business Settings → Ad Accounts**
3. Click **Add → Add an Ad Account** or connect existing
4. Note your **Ad Account ID** (format: `act_123456789`)

### Step 7: Connect Facebook Pages & Instagram

1. In Business Manager: **Accounts → Pages**
2. Add your Facebook Page
3. Connect Instagram Business Account to the Page
4. Note **Page ID** and **Instagram Account ID**

### Step 8: Environment Variables

Add to `.env.local`:
```env
# Facebook Integration
FACEBOOK_APP_ID=your-app-id
FACEBOOK_APP_SECRET=your-app-secret
FACEBOOK_REDIRECT_URI=http://localhost:3000/api/auth/facebook/callback

# Ad Account (get from Business Manager)
FACEBOOK_AD_ACCOUNT_ID=act_123456789

# Page & Instagram (get after connecting)
FACEBOOK_PAGE_ID=your-page-id
INSTAGRAM_ACCOUNT_ID=your-instagram-id
```

### Step 9: Required NPM Packages

```bash
npm install facebook-nodejs-business-sdk
```

### API Endpoints You'll Need to Build

**Authentication:**
1. **`/api/integrations/facebook/auth`** - Initiate OAuth
2. **`/api/integrations/facebook/callback`** - Handle callback
3. **`/api/integrations/facebook/refresh-token`** - Refresh access tokens

**Ad Tracking:**
4. **`/api/integrations/facebook/ads/campaigns`** - List campaigns
5. **`/api/integrations/facebook/ads/insights`** - Get ad performance
6. **`/api/integrations/facebook/ads/leads`** - Fetch lead ads data

**Page Management:**
7. **`/api/integrations/facebook/pages/posts`** - Manage posts
8. **`/api/integrations/facebook/pages/messages`** - Page messages
9. **`/api/integrations/facebook/instagram/posts`** - Instagram posts
10. **`/api/integrations/facebook/instagram/comments`** - Manage comments

**Webhooks:**
11. **`/api/webhooks/facebook`** - Receive real-time updates

### Database Schema Addition

```sql
CREATE TABLE facebook_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Auth tokens
  access_token TEXT NOT NULL,
  token_expires_at TIMESTAMP,

  -- Connected accounts
  facebook_user_id TEXT,
  ad_account_id TEXT,
  page_id TEXT,
  instagram_account_id TEXT,

  -- Settings
  sync_ads BOOLEAN DEFAULT true,
  sync_page_messages BOOLEAN DEFAULT true,
  sync_instagram_comments BOOLEAN DEFAULT true,

  last_sync_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE facebook_ad_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,

  facebook_lead_id TEXT UNIQUE NOT NULL,
  ad_id TEXT,
  campaign_id TEXT,

  lead_data JSONB, -- Form responses
  created_time TIMESTAMP,

  synced_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE facebook_page_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,

  message_id TEXT UNIQUE NOT NULL,
  from_id TEXT,
  to_id TEXT,
  message TEXT,
  created_time TIMESTAMP,

  synced_at TIMESTAMP DEFAULT NOW()
);
```

---

## Testing Checklist

### Google Calendar
- [ ] OAuth flow works (user can authorize)
- [ ] Can create calendar event from CRM activity
- [ ] CRM activity syncs to Google Calendar
- [ ] Google Calendar changes sync back to CRM
- [ ] Token refresh works automatically
- [ ] Webhook notifications received

### Facebook
- [ ] OAuth flow works
- [ ] Can fetch ad campaigns
- [ ] Lead ads sync to CRM contacts
- [ ] Page messages create conversations
- [ ] Instagram comments tracked
- [ ] Token refresh works
- [ ] Webhooks receive real-time updates

---

## Security Best Practices

1. **Store tokens encrypted** in database
2. **Use HTTPS** for all OAuth redirects
3. **Validate webhook signatures** (both Google and Facebook send signatures)
4. **Implement token refresh** before expiration
5. **Rate limiting** on API endpoints
6. **Scoped permissions** - only request what you need
7. **Audit logs** for integration actions

---

## Common Issues & Solutions

### Google Calendar
**Issue**: "redirect_uri_mismatch"
- **Solution**: Ensure redirect URI in code exactly matches Google Console (including http/https, trailing slashes)

**Issue**: "invalid_grant" on token refresh
- **Solution**: User revoked access or refresh token expired, need to re-authenticate

### Facebook
**Issue**: "Permissions error"
- **Solution**: Some permissions require App Review. Use test users during development.

**Issue**: "Invalid OAuth access token"
- **Solution**: Token expired. Implement automatic refresh (long-lived tokens last ~60 days)

**Issue**: Ad Account not accessible
- **Solution**: Make sure your app is added to the Business Manager and has access to the ad account

---

## Rate Limits

### Google Calendar API
- **10,000 requests/day** (per project)
- **500 queries/100 seconds** per user
- Use batch requests for bulk operations

### Facebook Marketing API
- **200 calls/hour** per user (ad insights)
- **4,800 calls/hour** per app
- **Page API**: ~4,800 requests/hour
- Use batching to optimize

---

## Next Steps

1. **Set up credentials** for both services
2. **Create database migrations** for integration tables
3. **Build OAuth flows** first (authentication)
4. **Implement basic sync** (one-way)
5. **Add webhooks** for real-time updates
6. **Build 2-way sync** logic
7. **Add UI** in Settings page for users to connect/disconnect

Need help implementing any of these? Let me know which integration to start with!
