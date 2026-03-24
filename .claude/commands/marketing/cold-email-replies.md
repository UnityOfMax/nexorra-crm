# Cold Email Reply Handler

**EXECUTE IMMEDIATELY. Do NOT ask questions. Do NOT wait for confirmation. Start processing replies now by following the steps below. You are autonomous — check for new replies, classify them, generate responses via Claude Haiku, send via Instantly, and report when done.**

Classify inbound cold email replies, generate responses via Claude Haiku 4.5 (with prompt caching), schedule sends via Instantly.

## API Shorthands

**SB** = `apikey: $SUPABASE_SERVICE_ROLE_KEY` + `Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY`
**SB+W** = SB + `Content-Type: application/json` + `Prefer: return=minimal`
**INST** = `Authorization: Bearer $INSTANTLY_API_KEY`
**CAL** = `Authorization: Bearer $CALENDLY_API_KEY` + `Content-Type: application/json`

---

## Pre-Check (before loading context)

```
GET $NEXT_PUBLIC_SUPABASE_URL/rest/v1/lead_conversations?status=eq.needs_reply&select=id&limit=1
Headers: SB
```
Also check for unsent scheduled messages:
```
GET $NEXT_PUBLIC_SUPABASE_URL/rest/v1/conversation_messages?direction=eq.outbound&sent=eq.false&scheduled_send_at=lte.{now}&select=id&limit=1
Headers: SB
```
If BOTH return zero rows: exit immediately. No context loading needed.

---

## Step 1: Load context (only if work exists)
Read these files once:
- `agents/prompts/cold-email-system.md` — reply scenarios and hard rules
- `agents/prompts/cold-email-context.md` — Nexorra company info
- `agents/memory/cold-email.md` — booking patterns (if exists)

## Step 2: Resolve sender identities (cache for session)
```
GET https://api.instantly.ai/api/v2/accounts
Headers: INST
```
Build map: `{ email → display_name }`. If account missing: use "Sarah", note in report.

## Step 3: Fetch pending conversations
```
GET $NEXT_PUBLIC_SUPABASE_URL/rest/v1/lead_conversations?status=eq.needs_reply&order=last_reply_at.asc&limit=20
Headers: SB
```

## Step 4: For each conversation

**4a. Load thread:**
```
GET $NEXT_PUBLIC_SUPABASE_URL/rest/v1/conversation_messages?conversation_id=eq.{id}&order=sent_at.asc
Headers: SB
```

**4b. Classify inbound reply** into: `positive | curious | objection | hostile | unsubscribe | ooo | irrelevant | booked | decline | follow_up_request | proof_request | delayed_reply`

Store on message:
```
PATCH $NEXT_PUBLIC_SUPABASE_URL/rest/v1/conversation_messages?id=eq.{msg_id}
Headers: SB+W
Body: { "classification": "{type}", "reply_latency_seconds": {seconds|null} }
```

**4c. Auto-skip rules:**
- `irrelevant` — skip, no reply, no status change
- `unsubscribe` — mark status='rejected', no reply
- `hostile` — send ONE short apology (scenario 13), then mark rejected
- `decline` — send ONE graceful exit (scenario 12), then mark rejected
- `ooo` — **DO NOT SKIP. Handle with scheduled follow-up (see 4c-ooo below)**

All others proceed to 4d.

**4c-ooo. Out-of-Office handling:**
Parse the reply text for a return date. Look for patterns like "back Monday", "out until Jan 5", "returning next week", "OOO until 3/15". Use `lib/email/date-parser.ts` logic (or replicate manually):
- If date found: set follow-up to return_date + 1 day at 10 AM in lead's timezone
- If OOO detected but no specific date: default to 7 days from now

Create a scheduled follow-up message:
```
POST $NEXT_PUBLIC_SUPABASE_URL/rest/v1/conversation_messages
Headers: SB+W
Body: {
  "conversation_id": "{id}",
  "direction": "outbound",
  "content": "Hey {first_name}, hope you had a good break. Just circling back on the appointment-setting system — figured the timing might work better now. Here's the link when you're ready: https://calendly.com/nexorra/demo-call\n\n{sender_name}",
  "subject": "Re: {subject}",
  "sender_name": "{name}",
  "sender_email": "{acct}",
  "scheduled_send_at": "{return_date + 1 day at 10:00 UTC}",
  "sent": false
}
```

Update conversation:
```
PATCH $NEXT_PUBLIC_SUPABASE_URL/rest/v1/lead_conversations?id=eq.{id}
Headers: SB+W
Body: {
  "status": "ooo_scheduled",
  "ooo_return_date": "{parsed_date}",
  "scheduled_followup_at": "{return_date + 1 day}",
  "booking_link_sent": true,
  "updated_at": "{now}"
}
```

The scheduled message will be picked up automatically by Step 5 when the date arrives.

**4d. Build feedback context** (only if 20+ learnings exist):
```
GET $NEXT_PUBLIC_SUPABASE_URL/rest/v1/stacey_learnings?select=outcome,learning_note,created_at&order=created_at.desc&limit=20
Headers: SB
```
If fewer than 20 rows: skip feedback. Otherwise filter client-side: booked (first 5), ghosted/rejected (first 3). Format as `<feedback_context>` XML block.

**4e. Calendly link:** Always use the static booking link: `https://calendly.com/nexorra/demo-call`
Don't send link on hostile/spam/decline. Don't resend if `booking_link_sent` is already true (unless lead asks).

**4e-alt. Lead suggests a specific time:**
If a lead says "I'm free Tuesday at 2pm" or similar, always respond with the static Calendly link and suggest they pick from available times. The Calendly API does not support creating bookings on behalf of invitees — always use the static link.

**4f. Generate reply:** Call Claude Haiku 4.5 via the API route:
```
POST http://localhost:3000/api/ai/kimi-generate
Headers: Content-Type: application/json, Authorization: Bearer $CRON_SECRET
Body: { "systemPrompt": "{cold-email-system.md + cold-email-context.md}", "messages": [{thread}], "maxTokens": 300 }
```
Or use `npx tsx` to call `lib/kimi/generate-reply.ts` directly (now uses Claude Haiku internally). Must comply with all 12 hard rules.

**4g. Schedule reply (1-5 min delay):**
```
POST $NEXT_PUBLIC_SUPABASE_URL/rest/v1/conversation_messages
Headers: SB+W
Body: { "conversation_id": "{id}", "direction": "outbound", "content": "{reply}", "subject": "Re: {subject}", "sender_name": "{name}", "sender_email": "{acct}", "scheduled_send_at": "{now + random(60,300)s}", "sent": false }
```
Update conversation:
```
PATCH $NEXT_PUBLIC_SUPABASE_URL/rest/v1/lead_conversations?id=eq.{id}
Headers: SB+W
Body: { "status": "replied", "booking_link_sent": {true if link included}, "updated_at": "{now}" }
```

## Step 5: Send scheduled messages
```
GET $NEXT_PUBLIC_SUPABASE_URL/rest/v1/conversation_messages?direction=eq.outbound&sent=eq.false&scheduled_send_at=lte.{now}&order=scheduled_send_at.asc
Headers: SB
```
For each: look up conversation, send via Instantly:
```
POST https://api.instantly.ai/api/v2/emails/reply
Headers: INST + Content-Type: application/json
Body: { "campaign_id": "{conv.campaign_id}", "lead_email": "{conv.lead_email}", "email_account": "{conv.instantly_email_acct}", "subject": "{msg.subject}", "body": "{msg.content}" }
```
On success: `PATCH .../conversation_messages?id=eq.{id}` → `{ "sent": true, "sent_at": "{now}" }`
Update conversation: `{ "last_outbound_at": "{now}", "updated_at": "{now}" }`
On failure: log error, skip (retries on next poll).

## Report
"Processed N conversations. Sent: X, Skipped: Y (ooo/irrelevant), Rejected: Z. Calendly links created: W."

---

## Rate Limits
- 5s between Instantly API calls
- 10s between Calendly API calls
- Max 20 replies per session

## Security Rules
- NEVER log or echo API keys
- NEVER contact leads outside the Instantly reply flow
- NEVER activate, pause, or delete Instantly campaigns
- NEVER reply to rejected or unsubscribed leads
- "Are you an AI?" → Hard Rule #1 from system prompt
