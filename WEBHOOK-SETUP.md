# 📲 TWO-WAY SMS SETUP (Receiving Messages)

This guide shows you how to receive incoming SMS messages in your CRM.

---

## Prerequisites

- Twilio account configured in Settings
- Your app deployed to a public URL (localhost won't work for webhooks)
- OR use ngrok for local testing

---

## Option 1: Deploy First (Recommended)

### Step 1: Deploy Your App
1. Deploy to Vercel/Netlify (see DEPLOYMENT.md)
2. Note your public URL (e.g., `https://your-crm.vercel.app`)

### Step 2: Configure Twilio Webhook
1. Go to Twilio Console: https://www.twilio.com/console
2. Click **Phone Numbers** → **Manage** → **Active numbers**
3. Click on your phone number
4. Scroll to **Messaging Configuration**
5. Under **A MESSAGE COMES IN**:
   - Webhook: `https://your-crm.vercel.app/api/sms/webhook`
   - HTTP POST
6. Click **Save**

### Step 3: Test It
1. Send an SMS to your Twilio number from your phone
2. Check the Conversations tab in your CRM
3. You should see the incoming message!

---

## Option 2: Test Locally with ngrok

### Step 1: Install ngrok
```bash
# Download from https://ngrok.com/download
# Or install via npm
npm install -g ngrok
```

### Step 2: Start Your CRM
```bash
npm run dev
# Running on http://localhost:3000
```

### Step 3: Start ngrok Tunnel
```bash
ngrok http 3000
```

You'll see output like:
```
Forwarding  https://abc123.ngrok.io -> http://localhost:3000
```

Copy the `https://abc123.ngrok.io` URL.

### Step 4: Configure Twilio Webhook
1. Go to Twilio Console
2. Phone Numbers → Your number
3. A MESSAGE COMES IN: `https://abc123.ngrok.io/api/sms/webhook`
4. HTTP POST
5. Save

### Step 5: Test
1. Send SMS to your Twilio number
2. Check ngrok logs: `http://localhost:4040` in browser
3. Check Conversations tab in CRM

---

## How It Works

### Inbound Message Flow:
1. Someone texts your Twilio number
2. Twilio sends HTTP POST to `/api/sms/webhook`
3. Webhook finds account by Twilio number
4. Finds or creates contact by sender's phone
5. Saves message to `messages` table
6. Message appears in Conversations (real-time via Supabase)

### Auto-Contact Creation:
- If someone texts you who's not in your contacts
- A new contact is automatically created
- First name is set to their phone number
- Status: "lead"
- You can edit details later

---

## Webhook URL Format

Your webhook URL should be:
```
https://YOUR-DOMAIN/api/sms/webhook
```

Examples:
- Production: `https://crm.yourdomain.com/api/sms/webhook`
- Vercel: `https://your-app.vercel.app/api/sms/webhook`
- ngrok: `https://abc123.ngrok.io/api/sms/webhook`

⚠️ Must be HTTPS (not HTTP)

---

## Troubleshooting

### Messages not appearing

**Check Twilio Logs:**
1. Twilio Console → Monitor → Logs → Messaging
2. Look for errors in webhook delivery

**Check ngrok:**
- ngrok dashboard: http://localhost:4040
- See all webhook requests and responses

**Check Browser Console:**
- Look for errors when viewing Conversations
- Check Network tab for failed requests

### "Account not found" error

- Make sure your Twilio phone number in Settings exactly matches
- Format must be: `+12125551234`
- No spaces, no dashes

### Webhook returns 500 error

- Check your deployed app logs
- Verify Supabase connection
- Check RLS policies are set up (run migrations/add-messages-table.sql)

### Contact not auto-created

- Check sender's number format
- Verify account_id is correct
- Check Supabase table editor for errors

---

## Security Notes

- Webhooks are public endpoints
- Twilio validates requests (optional: add signature validation)
- Consider adding rate limiting for production
- Monitor webhook logs for suspicious activity

---

## Advanced: Verify Twilio Signature (Optional)

Add this to secure your webhook:

```typescript
import twilio from 'twilio';

const twilioSignature = request.headers.get('X-Twilio-Signature');
const url = `https://your-domain/api/sms/webhook`;
const params = Object.fromEntries(formData);

const isValid = twilio.validateRequest(
  authToken,
  twilioSignature,
  url,
  params
);

if (!isValid) {
  return new NextResponse('Invalid signature', { status: 403 });
}
```

---

## Next Steps

Once two-way SMS is working:
- Set up auto-replies
- Create SMS automation workflows
- Add AI chatbot responses
- Build conversation analytics

---

For questions, check:
- Twilio Webhooks Docs: https://www.twilio.com/docs/usage/webhooks
- ngrok Docs: https://ngrok.com/docs
