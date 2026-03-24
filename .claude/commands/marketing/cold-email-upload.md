# Cold Email Upload Agent

**EXECUTE IMMEDIATELY. Do NOT ask questions. Do NOT wait for confirmation. Start the upload workflow now by following the steps below from Step 1. You are autonomous — fetch unpushed leads, upload them to Instantly with Loom links, and report when done.**

Upload unpushed leads from Supabase to Instantly campaign with Loom link distribution.

## API Shorthands

**SB** = `apikey: $SUPABASE_SERVICE_ROLE_KEY` + `Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY`
**SB+W** = SB + `Content-Type: application/json` + `Prefer: return=minimal`
**INST** = `Authorization: Bearer $INSTANTLY_API_KEY`

---

## Workflow

### Step 0: Check Stacey's mode
Read `agents/state/stacey-state.json`. If missing, use default `{"mode":"both"}`.

- `"mode": "email"` → run Steps 1–6 only. Skip Step 7 (Instagram DMs).
- `"mode": "instagram"` → skip Steps 1–6 (email upload). Jump directly to Step 7.
- `"mode": "both"` → run all steps (default).

---

### Step 1: Fetch unpushed leads (scraped before today)
Only push leads scraped **yesterday or earlier** — Jeff scrapes today's leads at 10 AM and they should be pushed the following day after the nightly quality check has run.

Calculate today's midnight UTC:
```bash
TODAY_MIDNIGHT=$(date -u +%Y-%m-%dT00:00:00Z)
```

```
GET $NEXT_PUBLIC_SUPABASE_URL/rest/v1/leads?pushed_to_instantly=eq.false&scraped_at=lt.{TODAY_MIDNIGHT}&select=id,full_name,first_name,last_name,email,city,state_province,country,timezone,source_brokerage,personal_research,research_status&limit=1000&order=scraped_at.asc
Headers: SB
```
If zero rows: exit immediately, report "No unpushed leads from previous days."

### Step 2: Look up campaign ID (cache for session)
```
GET https://api.instantly.ai/api/v2/campaigns
Headers: INST
```
Find campaign matching `$INSTANTLY_CAMPAIGN` name. Cache the `id`. If not found: stop, report error.

### Step 3: Load loom config
Read `agents/state/sender-loom-config.json`. Maps each sender name to a Loom video URL:
```json
{ "Ben": "https://...", "Carl": "https://...", "Olivia": "https://...", "Stacey": "https://...", "Stan": "https://..." }
```
If all values are empty strings, skip loom distribution (upload without `loom_link`).

### Step 4: Distribute leads across sender names
Split leads into 5 equal chunks (round-robin by index):
- Chunk 0 → Ben's loom URL
- Chunk 1 → Carl's loom URL
- Chunk 2 → Olivia's loom URL
- Chunk 3 → Stacey's loom URL
- Chunk 4 → Stan's loom URL

For 1000 leads: 200 per sender. For other counts: distribute as evenly as possible.

### Step 4b: Personalize each lead (80/20 copy optimization)

For each lead, use the **copy variant system** to generate personalized email copy:

1. Pick the best personal detail from `personal_research` (hobbies > pets > family > schools > bio > brokerage fallback). Use logic from `lib/email/personalize.ts` → `pickBestDetail(lead)`.

2. Select a copy variant using the 80/20 optimizer (`lib/email/copy-optimizer.ts`):
   - 80% chance: proven variant weighted by booking_rate
   - 20% chance: random experimental variant
   - Query `email_copy_variants` table for active variants

3. Interpolate the variant's templates with lead data (first_name, city, brokerage, detail):
   ```
   first_line = variant.first_line_template with {detail}, {city}, {brokerage} replaced
   email_body = variant.body_template with {city}, {first_name} replaced
   ps_line = variant.ps_template with {detail}, {city} replaced
   ```

4. Store `copy_variant_id` on the lead record for later learning:
   ```
   PATCH $NEXT_PUBLIC_SUPABASE_URL/rest/v1/leads?id=eq.{lead_id}
   Headers: SB+W
   Body: { "copy_variant_id": "{variant.id}" }
   ```

5. Record the send: increment `times_sent` on the variant:
   ```
   POST $NEXT_PUBLIC_SUPABASE_URL/rest/v1/rpc/increment_variant_stat
   Headers: SB+W
   Body: { "p_id": "{variant.id}", "p_stat": "times_sent" }
   ```

6. Store the custom_variables for Instantly upload: `first_line`, `email_body`, `ps_line`, `first_name`, `city`, `brokerage`, `state`

### Step 4c: Create per-lead landing page
For each lead, create a personalized landing page:
```
POST http://localhost:3000/api/landing-pages/cold-email
Headers: Content-Type: application/json, Authorization: Bearer $CRON_SECRET
Body: { "lead_id": "{lead.id}" }
```
Returns `{ slug, url, page_id }`. Store `landing_page_id` on the lead and include the URL in custom_variables as `landing_page_url`.

If the API is unreachable (dev server not running), skip landing page creation and proceed with upload.

### Step 5: Bulk upload (1000 leads per request)
The correct Instantly v2 bulk endpoint is `/api/v2/leads/add` (NOT `/api/v2/leads/bulk`, NOT `/api/v2/leads`):
```
POST https://api.instantly.ai/api/v2/leads/add
Headers: INST + Content-Type: application/json
Body: {
  "campaign_id": "{id}",
  "skip_if_in_workspace": false,
  "skip_if_in_campaign": false,
  "leads": [
    {
      "email": "{email}",
      "first_name": "{first_name}",
      "last_name": "{last_name}",
      "custom_variables": {
        "city": "{city}",
        "state": "{state_province}",
        "brokerage": "{source_brokerage}",
        "timezone": "{timezone}",
        "loom_link": "{loom_url_or_empty_string}"
      }
    },
    ...up to 1000 leads...
  ]
}
```
Send all leads in a single request (up to 1000). On 429: wait 60s, retry once. Response includes `leads_uploaded`, `duplicated_leads`, `invalid_email_count`. Mark leads pushed ONLY after a successful response (`status: "success"`).

### Step 6: Mark pushed
```
PATCH $NEXT_PUBLIC_SUPABASE_URL/rest/v1/leads?id=in.({UUIDs})
Headers: SB+W
Body: { "pushed_to_instantly": true, "instantly_campaign_id": "{campaign_id}" }
```

### Step 7: Instagram DM Outreach
After the email upload is complete, send the 3-part DM sequence to yesterday's Instagram leads via Chrome.

**7a. Fetch instagram leads to DM (scraped before today, not yet DMed)**
```bash
TODAY_MIDNIGHT=$(date -u +%Y-%m-%dT00:00:00Z)
```
```
GET $NEXT_PUBLIC_SUPABASE_URL/rest/v1/leads?lead_category=eq.instagram&instagram_dm_sent=eq.false&scraped_at=lt.{TODAY_MIDNIGHT}&select=id,first_name,last_name,instagram_handle,city,source_brokerage&limit=700&order=scraped_at.asc
Headers: SB
```
If zero rows: skip this step, report "No Instagram leads to DM today."

**7b. Load accounts and loom link**
- Read `agents/state/instagram-accounts.json` — load list of 7 accounts (skip any with empty username/password)
- Read `agents/state/sender-loom-config.json` — use `"Stacey"` loom URL as the video link for all DMs
- If loom URL is empty: send Message 2 as `"(Video link coming soon)"` and continue

**7c. DM sequence — Round 1 (25 per account)**
For each active account in order:

1. Log in:
   ```bash
   node scripts/chrome-tool.js instagram-login "{username}" "{password}"
   ```
   If login fails (2FA, wrong password): skip this account, log the error, continue to next.

2. Send 25 DMs from the lead queue (each account gets the next 25 unprocessed leads):
   For each lead:
   a. Navigate to profile:
      ```bash
      node scripts/chrome-tool.js navigate "https://www.instagram.com/{instagram_handle}/"
      node scripts/chrome-tool.js wait 3000
      ```
      If page returns 404 or shows "Sorry, this page isn't available": mark lead `instagram_status='ignored'`, skip.

   b. Send Message 1:
      ```bash
      node scripts/chrome-tool.js instagram-dm "Hey {first_name} I just came across your profile, I don't much like wasting time so I recorded a video just now for you:"
      ```
   c. Wait 8-15 seconds (human gap inside same thread):
      ```bash
      node scripts/chrome-tool.js wait 11000
      ```
   d. Send Message 2 (loom link):
      ```bash
      node scripts/chrome-tool.js instagram-dm "{loom_url}"
      ```
   e. Wait 8-15 seconds:
      ```bash
      node scripts/chrome-tool.js wait 12000
      ```
   f. Send Message 3:
      ```bash
      node scripts/chrome-tool.js instagram-dm "It basically goes over how we've helped over 100 other agents add another 8-30k/m in GCI on average using AI, if you're interested just shoot me a thumbs up or something and I'll shoot over me calendly link so we can chat over a 10-15min call"
      ```
   g. Mark in Supabase:
      ```
      PATCH $NEXT_PUBLIC_SUPABASE_URL/rest/v1/leads?id=eq.{lead_id}
      Headers: SB+W
      Body: { "instagram_dm_sent": true, "instagram_dm_sent_at": "{now_iso}", "instagram_messages_sent": 3, "instagram_status": "dm_sent", "instagram_dm_account": "{username}" }
      ```
   h. Wait 60-120 seconds before next DM:
      ```bash
      node scripts/chrome-tool.js wait 90000
      ```
      Vary: 60000 to 120000ms randomly.

3. After 25 DMs for this account:
   ```bash
   node scripts/chrome-tool.js instagram-logout
   ```
   Wait 3-5 minutes before next account: `node scripts/chrome-tool.js wait 240000`

**7d. DM sequence — Round 2 (25 more per account)**
After ALL 7 accounts have completed Round 1, loop through accounts again:
- Same process as Round 1 but takes the NEXT 25 leads from the queue (leads 176-350)
- Each account sends to its next 25, not the same 25 again
- Same 60-120s wait between DMs, 3-5 min between accounts

**7e. DM rate limits / safety**
- If Instagram shows a "Try again later" or rate limit warning: stop all DMs for that account, log error, move to next account
- If Chrome loses connection mid-session: log error, mark current lead as `instagram_messages_sent=1` or `2` (however many messages were sent), continue from next lead on next account
- Never send more than 50 DMs per account per day (25+25)

### Step 8: Report
"Email: Uploaded N leads to campaign '$INSTANTLY_CAMPAIGN'. Loom distribution: {count per sender}.
Instagram DMs: Sent {total} DMs across {accounts} accounts. Round 1: {r1}. Round 2: {r2}. Skipped (private/404): {skipped}."

---

## Error Handling

| Error | Action |
|-------|--------|
| Instantly 429 | Wait 60s, retry once. Second 429: stop, report |
| Campaign not found | Stop, report |
| Supabase 5xx | Skip batch, continue, report |

## Security Rules

- NEVER log or echo API keys
- NEVER activate, pause, or delete Instantly campaigns
