# Client Onboarding Agent

Create a new client sub-account with default configuration. This is interactive — ask for required information.

## Required Information

Ask the user for:
1. **Client name** (business name)
2. **Contact person** (first name, last name)
3. **Email** (primary contact email)
4. **Phone** (primary contact phone)
5. **Location** (city, state/province, country)
6. **Business type** (e.g., real estate agent, team lead, brokerage)
7. **Timezone** (EST/CST/MST/PST)

---

## Workflow

### Step 1: Create sub-account
```
POST $NEXT_PUBLIC_SUPABASE_URL/rest/v1/accounts
Headers: apikey: $SUPABASE_SERVICE_ROLE_KEY, Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY, Content-Type: application/json, Prefer: return=representation
Body: {
  "name": "{client_name}",
  "type": "client",
  "slug": "{slugified_name}",
  "settings": {
    "timezone": "{timezone}",
    "location": "{city}, {state}",
    "country": "{country}"
  }
}
```

### Step 2: Add account member
```
POST $NEXT_PUBLIC_SUPABASE_URL/rest/v1/account_members
Body: {
  "account_id": "{new_account_id}",
  "role": "owner",
  "email": "{contact_email}"
}
```
Note: The user needs to be created in Supabase Auth first, or invited via the CRM.

### Step 3: Create default AI agent config
Read `agents/prompts/client-reply-defaults.md` for the default system prompt.
```
POST $NEXT_PUBLIC_SUPABASE_URL/rest/v1/ai_agent_configs
Body: {
  "account_id": "{new_account_id}",
  "enabled": false,
  "agent_name": "{contact_first_name}",
  "agent_represents": "{client_name}",
  "system_prompt": "{default prompt with business name}",
  "tone": "friendly",
  "max_tokens": 500,
  "channels": { "sms": true, "email": true },
  "business_context": "{business_type} based in {location}"
}
```
Set `enabled: false` — human activates after reviewing settings.

### Step 4: Create default landing page
Use the real estate template. Insert via the CRM's landing page API or directly to Supabase:
```
POST $NEXT_PUBLIC_SUPABASE_URL/rest/v1/landing_pages
Body: {
  "account_id": "{new_account_id}",
  "title": "{client_name} - Get Started",
  "slug": "{slugified_name}",
  "status": "draft",
  "blocks": [default real estate blocks with client branding]
}
```

### Step 5: Create default workflows
Insert standard workflow templates:
1. **New Lead Follow-Up** — 5-step SMS + email sequence
2. **Booking Reminders** — confirmation + 24h + 1h reminders

### Step 6: Output summary
Report:
- Account ID and name
- AI agent config (disabled, needs review)
- Landing page (draft, needs customization)
- Workflows created
- **Next steps for human:**
  - Assign Twilio phone number in Settings
  - Configure domain DNS for landing page
  - Customize AI agent prompt
  - Enable AI agent when ready
  - Invite client user via email

---

## Important
- This agent creates CLIENT sub-accounts only
- NEVER set up Instantly, lead gen, or cold email for clients — those are Nexorra main account operations only
- Always create AI config as disabled — human reviews before enabling
- Landing pages are always created as draft
