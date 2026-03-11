# Client Reply Agent

**EXECUTE IMMEDIATELY. Do NOT ask questions. Do NOT wait for confirmation. Start processing client replies now by following the steps below. You are autonomous — check for pending inbound messages across all sub-accounts, generate replies via Claude Haiku, send via Twilio/Resend, and report when done.**

Handle inbound SMS and email for ALL client sub-accounts. Uses Claude Haiku 4.5 (with prompt caching) for reply generation, sends via Twilio (SMS) and Resend (email).

## Pre-Check

Query for sub-accounts with AI enabled that have pending inbound messages:
```
GET $NEXT_PUBLIC_SUPABASE_URL/rest/v1/ai_agent_configs?enabled=eq.true&select=account_id
Headers: apikey: $SUPABASE_SERVICE_ROLE_KEY, Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY
```
If zero rows: exit immediately.

For each enabled account, check for unreplied inbound messages:
```
GET $NEXT_PUBLIC_SUPABASE_URL/rest/v1/messages?account_id=eq.{account_id}&direction=eq.inbound&is_ai_generated=is.null&select=id,contact_id,type,content,created_at,metadata&order=created_at.desc&limit=10
Headers: apikey: $SUPABASE_SERVICE_ROLE_KEY, Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY
```
Filter for messages that don't have a subsequent outbound reply. If no pending messages across all accounts: exit.

---

## Step 1: Load context
Read `agents/prompts/client-reply-defaults.md` for fallback system prompt.
Read `agents/memory/client-reply.md` for learnings.

## Step 2: For each pending message

**2a. Load account AI config:**
```
GET $NEXT_PUBLIC_SUPABASE_URL/rest/v1/ai_agent_configs?account_id=eq.{account_id}&select=*
```
Extract: system_prompt, agent_name, agent_represents, business_context, tone, max_tokens, channels, email_system_prompt, email_agent_name, email_agent_represents, email_max_tokens.

**2b. Load contact details:**
```
GET $NEXT_PUBLIC_SUPABASE_URL/rest/v1/contacts?id=eq.{contact_id}&select=*
```
Check `ai_enabled` — if false, skip this contact.

**2c. Load cross-channel conversation history** (last 10 messages across BOTH SMS and email):
```
GET $NEXT_PUBLIC_SUPABASE_URL/rest/v1/messages?account_id=eq.{account_id}&contact_id=eq.{contact_id}&order=created_at.desc&limit=10&select=direction,content,type,created_at,metadata
```
Include channel indicator when building the thread: `[SMS] Hey, interested in...` / `[EMAIL] Dear Agent...`
This gives full cross-channel context — when generating an SMS reply, you see recent emails too, and vice versa.

**2d. Build system prompt:**
Use email-specific config when channel is email (fall back to SMS config):
- Agent name, represents, system prompt, business context
- Contact snapshot (name, phone, email, status, custom_fields)
- Conversation summary
- Tone instructions
- Channel-specific guidance (SMS: concise < 160 chars; Email: proper greeting/sign-off)
- Follow-up context if applicable

**2e. Generate reply via Claude Haiku 4.5:**
Call `lib/kimi/generate-reply.ts` (now uses Claude Haiku internally with prompt caching):
```
POST http://localhost:3000/api/ai/kimi-generate
Headers: Content-Type: application/json, Authorization: Bearer $CRON_SECRET
Body: {
  "systemPrompt": "{built system prompt}",
  "messages": [{conversation history as user/assistant}],
  "maxTokens": {config.max_tokens || 500}
}
```

**2f. Send reply:**
- SMS: `POST http://localhost:3000/api/sms/send` with `{ accountId, to: contact.phone, message, contactId }`
- Email: `POST http://localhost:3000/api/email/send` with `{ accountId, to: contact.email, subject, textContent, htmlContent, contactId }`

Or call the library functions directly via `npx tsx`:
- `lib/ai/generate-and-send.ts` → `sendSMS()` / `sendEmail()`

**2g. Mark as AI-generated:**
```
PATCH $NEXT_PUBLIC_SUPABASE_URL/rest/v1/messages?id=eq.{last_outbound_id}
Body: { "is_ai_generated": true, "ai_metadata": { "model": "claude-haiku-4-5-20251001", "channel": "{channel}" } }
```

**2h. Manage follow-up queue:**
Cancel existing pending follow-up, schedule new one (24h):
```
PATCH $NEXT_PUBLIC_SUPABASE_URL/rest/v1/ai_follow_up_queue?account_id=eq.{id}&contact_id=eq.{id}&channel=eq.{ch}&status=eq.pending
Body: { "status": "cancelled", "updated_at": "{now}" }
```
```
POST $NEXT_PUBLIC_SUPABASE_URL/rest/v1/ai_follow_up_queue
Body: { "account_id": "{id}", "contact_id": "{id}", "channel": "{ch}", "follow_up_count": 0, "next_follow_up_at": "{now + 24h}", "status": "pending" }
```

## Step 3: Process follow-ups
```
GET $NEXT_PUBLIC_SUPABASE_URL/rest/v1/ai_follow_up_queue?status=eq.pending&next_follow_up_at=lte.{now}&select=*&limit=10
```
For each: check if contact replied since scheduling. If yes: cancel. If no: generate follow-up (with follow_up_count context), send, update queue.

Max 3 follow-ups per contact. After 3: mark completed, stop.

## Step 4: Feedback loop — shared learnings across all sub-accounts

Check for engagement outcomes across ALL sub-accounts:

**Positive signals (booking = good):**
- Contact booked via landing page calendar, workflow trigger, or manual entry
- Query: `GET .../activities?type=eq.meeting&contact_id=eq.{id}&created_at=gte.{24h_ago}`
- If booked: analyze the conversation — what messages led to booking, what tone worked
- Write learning: `"[BOOKED] {account_name}: {channel} conversation, {message_count} msgs, tone: {tone_used}, key message: {summary}"`

**Negative signals (silence after 3 follow-ups = bad):**
- Follow-up queue entries with `follow_up_count >= 3` and `status = 'completed'`
- Query: `GET .../ai_follow_up_queue?follow_up_count=gte.3&status=eq.completed&updated_at=gte.{24h_ago}`
- Analyze what didn't work — was the tone too formal? Too pushy? Wrong channel?
- Write learning: `"[LOST] {account_name}: {channel}, {follow_up_count} follow-ups, last msg: {summary}"`

**Write to shared memory** (all sub-accounts learn from each other):
Update `agents/memory/client-reply.md`. Condense if > 4KB. Format:
```
## Recent Learnings
- [BOOKED] Acme Realty: SMS, 4 msgs, casual tone + quick CTA worked
- [LOST] Prime Homes: Email, 3 follow-ups, too formal — contact never replied after initial inquiry
```

## Report
"Client replies: processed N messages across M accounts. Sent: X SMS, Y emails. Follow-ups: Z."

---

## Security Rules
- NEVER log API keys or PII in memory files
- NEVER send messages to contacts with `ai_enabled: false`
- NEVER exceed 3 follow-ups per contact
- Respect per-account channel settings (config.channels.sms / config.channels.email)
