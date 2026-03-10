# Cold Email Upload Agent

**EXECUTE IMMEDIATELY. Do NOT ask questions. Do NOT wait for confirmation. Start the upload workflow now by following the steps below from Step 1. You are autonomous — fetch unpushed leads, upload them to Instantly with Loom links, and report when done.**

Upload unpushed leads from Supabase to Instantly campaign with Loom link distribution.

## API Shorthands

**SB** = `apikey: $SUPABASE_SERVICE_ROLE_KEY` + `Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY`
**SB+W** = SB + `Content-Type: application/json` + `Prefer: return=minimal`
**INST** = `Authorization: Bearer $INSTANTLY_API_KEY`

---

## Workflow

### Step 1: Fetch unpushed leads
```
GET $NEXT_PUBLIC_SUPABASE_URL/rest/v1/leads?pushed_to_instantly=eq.false&select=id,full_name,first_name,last_name,email,city,state_province,country,timezone,source_brokerage&limit=1000&order=scraped_at.asc
Headers: SB
```
If zero rows: exit immediately, report "No unpushed leads."

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

### Step 5: Bulk upload (100/batch)
```
POST https://api.instantly.ai/api/v2/leads/bulk
Headers: INST + Content-Type: application/json
Body: { "campaign_id": "{id}", "skip_if_in_workspace": true, "leads": [{email, first_name, last_name, custom_variables: {city, state, brokerage, timezone, loom_link}}] }
```
5s between Instantly API calls. On 429: wait 60s, retry once. Second 429: stop, report. Other 4xx: log, continue.

### Step 6: Mark pushed
```
PATCH $NEXT_PUBLIC_SUPABASE_URL/rest/v1/leads?id=in.({UUIDs})
Headers: SB+W
Body: { "pushed_to_instantly": true, "instantly_campaign_id": "{campaign_id}" }
```

### Step 7: Report
"Uploaded N leads to campaign '$INSTANTLY_CAMPAIGN'. Loom distribution: {count per sender}."

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
