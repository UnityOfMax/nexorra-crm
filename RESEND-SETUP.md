# 📧 RESEND EMAIL SETUP GUIDE

Complete guide to set up email sending with Resend and your custom domain.

---

## Why Resend?

- ✅ Modern, developer-friendly API
- ✅ Excellent deliverability
- ✅ Simple domain verification
- ✅ 100 emails/day free (3,000/month)
- ✅ No credit card required for free tier
- ✅ Much easier than SMTP

---

## Step 1: Create Resend Account

1. Go to https://resend.com
2. Click **"Sign Up"**
3. Sign up with GitHub or email
4. Verify your email

---

## Step 2: Get Your API Key

1. After logging in, go to **API Keys** (left sidebar)
2. Click **"Create API Key"**
3. Name it: `CRM Production` or `CRM Development`
4. Click **Create**
5. **Copy the API key** (starts with `re_`)
6. **Save it somewhere safe** - you can only see it once!

---

## Step 3: Add API Key to Your CRM

### Update .env.local

Add this line to your `.env.local` file:

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Your complete .env.local should look like:**

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Twilio
TWILIO_ACCOUNT_SID=ACxxx...
TWILIO_AUTH_TOKEN=xxx...

# Resend (NEW)
RESEND_API_KEY=re_xxx...
```

### Restart Your Dev Server

```bash
# Stop server (Ctrl+C)
npm install resend
npm run dev
```

---

## Step 4: Add and Verify Your Domain

### 4.1 Add Domain to Resend

1. In Resend dashboard, go to **Domains** (left sidebar)
2. Click **"Add Domain"**
3. Enter your domain: `yourdomain.com` (without www)
4. Click **Add**

### 4.2 Get DNS Records

Resend will show you DNS records to add. You'll see:

**SPF Record:**
```
Type: TXT
Name: @
Value: v=spf1 include:resend.com ~all
```

**DKIM Records (3 records):**
```
Type: CNAME
Name: resend._domainkey
Value: xxx.resend.com

Type: CNAME  
Name: resend2._domainkey
Value: xxx.resend.com

Type: CNAME
Name: resend3._domainkey
Value: xxx.resend.com
```

**DMARC Record:**
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; pct=100; rua=mailto:dmarc@yourdomain.com
```

### 4.3 Add Records to Your DNS

**Where to add these depends on your domain provider:**

#### **Namecheap:**
1. Login to Namecheap
2. Dashboard → Domain List → Manage
3. Advanced DNS tab
4. Add new records

#### **GoDaddy:**
1. Login to GoDaddy
2. My Products → DNS
3. Add records

#### **Cloudflare:**
1. Login to Cloudflare
2. Select your domain
3. DNS tab
4. Add records

#### **Google Domains:**
1. Login to Google Domains
2. My Domains → DNS
3. Custom records → Manage custom records
4. Add records

**Add ALL the records** that Resend shows you (SPF, DKIM, DMARC).

### 4.4 Verify Domain

1. After adding DNS records, wait 5-10 minutes
2. Go back to Resend → Domains
3. Click **"Verify"** next to your domain
4. If successful, status changes to ✅ **Verified**

**If verification fails:**
- Wait longer (DNS can take up to 48 hours)
- Double-check you copied records exactly
- Make sure there are no duplicate SPF records
- Use https://mxtoolbox.com to check DNS propagation

---

## Step 5: Configure in Your CRM

1. Go to **Settings** in your CRM
2. Scroll to **Email Configuration**
3. Fill in:
   - **From Name:** `Your Company` (what recipients see)
   - **From Email:** `noreply@yourdomain.com` (must be your verified domain)
4. Click **Save Settings**

---

## Step 6: Send Your First Email!

1. Make sure a contact has an email address
2. Go to **Conversations**
3. Select the contact
4. Click the **Mail icon** (blue) in header
5. Write subject and message
6. Click **Send Email**

**Check terminal logs** - you should see:
```
=== EMAIL SEND API CALLED ===
Email request: { ... }
Sending via Resend...
From: Your Company <noreply@yourdomain.com>
To: contact@example.com
Email sent via Resend: abc123...
=== EMAIL SENT SUCCESSFULLY ===
```

---

## Troubleshooting

### "Resend not configured" error
- Check `.env.local` has `RESEND_API_KEY`
- Make sure you restarted the dev server
- API key should start with `re_`

### "No 'from' email configured" error
- Go to Settings
- Add your verified domain email in "From Email"
- Click Save

### "Domain not verified" or email bounces
- Check Resend dashboard - domain should show ✅ Verified
- If not verified, check DNS records are correct
- Use https://dnschecker.org to verify DNS propagation
- Wait up to 48 hours for DNS to propagate

### Email sends but not received
- Check spam folder
- Check Resend dashboard → Emails → Logs
- Verify from_email domain matches verified domain
- Check domain reputation (new domains may be flagged)

### "Invalid API key" error
- API key might be wrong
- Regenerate in Resend dashboard
- Update .env.local
- Restart server

---

## Email Limits (Free Tier)

- **100 emails per day**
- **3,000 emails per month**
- Sufficient for testing and small operations

**Need more?**
- Upgrade to Pro: $20/month for 50,000 emails
- Pay as you go: $1 per 1,000 emails

---

## Best Practices

### Use a Subdomain
Instead of `contact@yourdomain.com`, use:
- `noreply@mail.yourdomain.com`
- `hello@send.yourdomain.com`

This protects your main domain reputation.

### Warm Up Your Domain
For new domains:
- Start with 10-20 emails/day
- Gradually increase over 2-4 weeks
- This builds sender reputation

### Monitor Deliverability
- Check Resend dashboard → Analytics
- Track open rates, bounces, spam reports
- Remove bounced emails from your list

---

## Testing Without a Domain

**For Development Only:**

Resend allows sending from `onboarding@resend.dev` without verification:

```
From Email: onboarding@resend.dev
From Name: Your Company (Testing)
```

⚠️ **Important:**
- Only works for emails sent to YOUR email
- Cannot send to customers
- For testing only
- Set up real domain for production

---

## Resend Dashboard Features

### Email Logs
- See all sent emails
- Delivery status
- Open/click tracking (optional)
- Bounce/spam reports

### API Usage
- Track API calls
- Monitor rate limits
- See error rates

### Webhooks (Advanced)
- Get notified of bounces
- Track delivery events
- Monitor engagement

---

## Next Steps

Once emails are working:

1. **Email Templates** - Pre-designed layouts
2. **Email Signatures** - Professional footers
3. **Automated Emails** - Trigger workflows
4. **Bulk Campaigns** - Send to contact lists
5. **A/B Testing** - Test subject lines

---

## Support

- Resend Docs: https://resend.com/docs
- Resend Discord: https://resend.com/discord
- DNS Help: https://resend.com/docs/dashboard/domains/dns-records

---

**Your emails will now be delivered with excellent reliability! 🎉**
