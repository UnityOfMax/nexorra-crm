# Cold Email Maintenance Agent

**EXECUTE IMMEDIATELY. Do NOT ask questions. Do NOT wait for confirmation. Start the maintenance workflow now by following the steps below from Step 1. You are autonomous — run nudge checks, detect ghosted leads, update learnings, and report when done.**

Run nudge checks, ghosted detection, and learning cycle for cold email conversations.

## API Shorthands

**SB** = `apikey: $SUPABASE_SERVICE_ROLE_KEY` + `Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY`
**SB+W** = SB + `Content-Type: application/json` + `Prefer: return=minimal`
**INST** = `Authorization: Bearer $INSTANTLY_API_KEY`

---

## Step 1: Nudge Check
```
GET $NEXT_PUBLIC_SUPABASE_URL/rest/v1/lead_conversations?status=eq.replied&nudge_sent_at=is.null&last_outbound_at=lt.{2-3 days ago}&select=id,lead_email,instantly_email_acct,campaign_id&limit=10
Headers: SB
```
For each: generate nudge using template from `agents/prompts/cold-email-system.md`, schedule as outbound message (1-5 min delay). Update: `{ "status": "nudge_sent", "nudge_sent_at": "{now}" }`. One nudge per conversation only.

## Step 2: Ghosted Detection
```
GET $NEXT_PUBLIC_SUPABASE_URL/rest/v1/lead_conversations?status=eq.replied&last_outbound_at=lt.{7 days ago}&select=id
Headers: SB
```
```
GET $NEXT_PUBLIC_SUPABASE_URL/rest/v1/lead_conversations?status=eq.nudge_sent&nudge_sent_at=lt.{4 days ago}&select=id
Headers: SB
```
Bulk update both: `{ "status": "ghosted", "updated_at": "{now}" }`

## Step 3: Send Scheduled Messages
Same as cold-email-replies Step 5 — send any pending outbound messages via Instantly.

---

## Learning Cycle

### Step 4: Fetch unlearned outcomes
```
GET $NEXT_PUBLIC_SUPABASE_URL/rest/v1/lead_conversations?status=in.(booked,ghosted,rejected,no_show,closed_deal)&outcome_learned=eq.false&limit=10
Headers: SB
```

### Step 5: Analyze each
Fetch full thread. Write 2-3 sentence note: what happened, why, what to do differently. Include the classification of the lead's initial reply type.

### Step 6: Save learning
```
POST $NEXT_PUBLIC_SUPABASE_URL/rest/v1/stacey_learnings
Headers: SB+W
Body: { "conversation_id": "{id}", "outcome": "{outcome}", "learning_note": "{note}" }
```
Then: `PATCH .../lead_conversations?id=eq.{id}` → `{ "outcome_learned": true }`

### Step 7: Update learnings file
Append to `agents/memory/cold-email.md`. If > 4KB: condense — keep patterns, drop individual incidents.

### Step 8: Report
"Maintenance: Nudged N, Ghosted M. Learning cycle: X new outcomes (A booked, B ghosted, C rejected). Booking rate: {rate}%."

---

## Error Handling

| Error | Action |
|-------|--------|
| Instantly 429 | Wait 60s, retry once. Second 429: stop, report |
| Supabase 5xx | Skip, continue, report |
| Send fails | Don't mark sent, retries next poll |

## Security Rules
- NEVER log or echo API keys
- NEVER reply to rejected or unsubscribed leads
- NEVER activate, pause, or delete Instantly campaigns
