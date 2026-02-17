# 📱 TWILIO SMS SETUP GUIDE

Follow these steps to set up SMS functionality in your CRM.

---

## Step 1: Get Twilio Account Credentials

### 1.1 Sign in to Twilio
1. Go to https://www.twilio.com/console
2. Sign in with your Twilio account

### 1.2 Get Account SID and Auth Token
1. On the Twilio Console dashboard, you'll see:
   - **Account SID** - Copy this (starts with `AC`)
   - **Auth Token** - Click "Show" then copy it
2. Keep these somewhere safe temporarily

### 1.3 Get Your Twilio Phone Number
1. In the Twilio Console, go to **Phone Numbers** → **Manage** → **Active numbers**
2. Click on your phone number
3. Copy the phone number (format: `+1234567890`)
4. If you don't have one, click **Buy a number** to get one

---

## Step 2: Configure Twilio in Your CRM

### 2.1 Access Settings
1. In your CRM, click **Settings** in the sidebar
2. Scroll to the **Twilio SMS Configuration** section

### 2.2 Enter Credentials
1. **Twilio Account SID:** Paste the SID from Step 1.2
2. **Twilio Auth Token:** Paste the auth token from Step 1.2
3. **Twilio Phone Number:** Paste the phone number from Step 1.3
   - Important: Include the `+` and country code (e.g., `+12125551234`)

### 2.3 Save Settings
1. Click **Save Settings** at the bottom
2. Wait for success message

---

## Step 3: Send Your First SMS

### 3.1 Add a Contact with Phone Number
1. Go to **Contacts** in the sidebar
2. Click **+ Add Contact**
3. Fill in details and **make sure to add a phone number**
4. Phone format: `+12125551234` or just `2125551234`
5. Click **Create Contact**

### 3.2 Send SMS
1. Click **SMS** in the sidebar
2. Select the contact from the dropdown
3. Type your message
4. Click **Send SMS**
5. Check for success message!

---

## Step 4: View SMS History

All sent SMS messages are automatically logged and appear in:
- The **Recent SMS** panel on the SMS page
- The contact's activity history

---

## 📊 SMS Pricing

Twilio charges per SMS:
- **US/Canada:** ~$0.0079 per SMS
- **International:** Varies by country
- **Segments:** Messages over 160 characters use multiple segments

Check your usage: https://www.twilio.com/console/usage

---

## ❌ Troubleshooting

### "Twilio not configured" error
- Make sure you saved the settings
- Verify the Account SID starts with `AC`
- Verify the phone number includes `+` and country code

### "Authentication Error" / "Invalid credentials"
- Double-check your Account SID and Auth Token
- Make sure there are no extra spaces when copying
- Try revealing and re-copying the Auth Token from Twilio Console

### "Invalid 'To' phone number"
- Phone numbers must include country code
- Format: `+12125551234` (not `2125551234`)
- Contact must have a valid phone number

### SMS not received
- Check the contact's phone number is correct
- Verify your Twilio number is SMS-enabled
- Check Twilio Console → Logs for delivery status
- Some carriers may block messages from new numbers

### "Unverified number" error (Trial accounts)
- Twilio trial accounts can only send to verified numbers
- Add recipient's number in Twilio Console → Phone Numbers → Verified Caller IDs
- OR upgrade to a paid Twilio account (no credit card required for pay-as-you-go)

---

## 🔐 Security Notes

- Your Twilio credentials are stored encrypted in the database
- Each account (agency/client) can use their own Twilio credentials
- Never share your Auth Token publicly
- Regenerate your Auth Token if compromised (Twilio Console → Settings)

---

## 🎉 Next Steps

Now that SMS is working, you can:
1. Set up **AI Voice Calls** (uses same Twilio account)
2. Create **SMS Automation** workflows
3. Send **bulk SMS campaigns**
4. Track SMS conversations with contacts

---

## 💡 Pro Tips

- **Save message templates** for common responses
- **Use variables** like `{firstName}` in messages (coming soon)
- **Schedule messages** for optimal send times (coming soon)
- **Two-way SMS** - respond to incoming messages (coming soon)

---

For more help, see:
- Twilio Documentation: https://www.twilio.com/docs
- Twilio Support: https://support.twilio.com
