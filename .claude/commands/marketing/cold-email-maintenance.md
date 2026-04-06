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

## Step 2b: Conditional Follow-Up — Video Viewed Check

Before Step 1 fires in Instantly (2 days after Step 0), check which leads have viewed their video.
This runs during every maintenance cycle so it catches viewers before the default "not viewed" Step 1 sends.

**Query leads who viewed their video but haven't been sent the conditional reply yet:**
```bash
set -a && source .env.local && set +a && npx tsx -e "
import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// 1. Get all video_play events from landing pages (last 3 days)
const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
const { data: events } = await sb.from('landing_page_events')
  .select('landing_page_id, lead_id, created_at')
  .eq('event_type', 'video_play')
  .gte('created_at', threeDaysAgo);

if (!events?.length) { console.log('No video views in last 3 days'); process.exit(0); }

// 2. Get the lead IDs that have viewed
const leadIds = [...new Set(events.map(e => e.lead_id).filter(Boolean))];
console.log('Leads who viewed video:', leadIds.length);

// 3. Check which of these leads haven't been sent the 'viewed' conditional reply
const { data: leads } = await sb.from('leads')
  .select('id, email, full_name, first_name')
  .in('id', leadIds)
  .is('video_viewed_reply_sent', null);

console.log(JSON.stringify(leads || [], null, 2));
"
```

For each lead who viewed but hasn't received the conditional reply:

**Send the 'viewed' version via Instantly reply:**
```
POST https://api.instantly.ai/api/v2/emails/reply
Headers: Authorization: Bearer $INSTANTLY_API_KEY, Content-Type: application/json
Body: {
  "campaign_id": "{campaign_id}",
  "lead_email": "{lead.email}",
  "email_account": "{sending_account}",
  "subject": "Re: {original_subject}",
  "body": "<div>Hi {first_name},</div><div><br></div><div>I saw you checked out the video I made for you but didn't book.</div><div><br></div><div>Was it my accent?</div><div><br></div><div>I'd be happy to record a longer one for you if you'd like.</div><div><br></div><div>Best,</div><div>{sender_name} @ Nexorra</div>"
}
```

Then mark the lead so we don't double-send:
```
PATCH $NEXT_PUBLIC_SUPABASE_URL/rest/v1/leads?id=eq.{lead.id}
Headers: SB+W
Body: { "video_viewed_reply_sent": true }
```

Leads who did NOT view will receive the default Step 1 copy from Instantly's sequence (the "not viewed" version).

---

## Step 3: Send Scheduled Messages (including OOO follow-ups)
```
GET $NEXT_PUBLIC_SUPABASE_URL/rest/v1/conversation_messages?direction=eq.outbound&sent=eq.false&scheduled_send_at=lte.{now}&order=scheduled_send_at.asc
Headers: SB
```
For each: look up conversation, send via Instantly API:
```
POST https://api.instantly.ai/api/v2/emails/reply
Headers: INST + Content-Type: application/json
Body: { "campaign_id": "{conv.campaign_id}", "lead_email": "{conv.lead_email}", "email_account": "{conv.instantly_email_acct}", "subject": "{msg.subject}", "body": "{msg.content}" }
```
On success: mark `sent=true, sent_at=now`. Update conversation `last_outbound_at`.
**For OOO follow-ups**: also update conversation `status` from `ooo_scheduled` to `replied`.

## Step 3b: Instantly Status Sync
Run bidirectional sync by executing:
```bash
set -a && source .env.local && set +a && npx tsx scripts/instantly-sync.ts
```
This pulls latest lead statuses from Instantly and updates local DB.

---

## Learning Cycle

### Step 4: Fetch unlearned outcomes
```
GET $NEXT_PUBLIC_SUPABASE_URL/rest/v1/lead_conversations?status=in.(booked,ghosted,rejected,no_show,closed_deal)&outcome_learned=eq.false&limit=10
Headers: SB
```

### Step 5: Analyze each thread
Fetch full thread. **Use Claude Haiku to analyze** (not a hardcoded template). Prompt:
> "Analyze this cold email thread. The outcome was {outcome}. What was the lead's initial reply type? What reply strategy was used? What worked or didn't? Write a specific 2-3 sentence learning note."

Include: the classification of the lead's initial reply, which copy variant was used (if `copy_variant_id` exists on conversation), and the full thread content.

### Step 6: Save learning (multi-layer)

**6a. Save to stacey_learnings table:**
```
POST $NEXT_PUBLIC_SUPABASE_URL/rest/v1/stacey_learnings
Headers: SB+W
Body: { "conversation_id": "{id}", "outcome": "{outcome}", "learning_note": "{note}" }
```
Then: `PATCH .../lead_conversations?id=eq.{id}` → `{ "outcome_learned": true }`

**6b. Update copy variant stats** (if `copy_variant_id` exists on conversation):
```
SELECT $NEXT_PUBLIC_SUPABASE_URL/rest/v1/rpc/increment_variant_stat
Headers: SB+W
Body: { "p_id": "{copy_variant_id}", "p_stat": "{times_booked|times_ghosted|times_replied}" }
```
Map: booked→`times_booked`, ghosted→`times_ghosted`, replied (any non-terminal)→`times_replied`

**6c. Record to Mulch** (for cross-session knowledge):
```bash
# Append to .mulch/learnings.jsonl
echo '{"agent":"lionel","domain":"cold-email","content":"{learning_note}","tags":["{outcome}","{classification}"],"classification":"tactical","timestamp":"..."}' >> .mulch/learnings.jsonl
```

**6d. Write to Obsidian vault** (nightly marketing summary):
After all learnings processed, write a summary to `~/Obsidian/Nexorra/Marketing/email-performance-{date}.md`:
- Today's outcomes: X booked, Y ghosted, Z rejected
- Top performing copy variants (query `email_copy_variants` ordered by `booking_rate`)
- Bottom performing variants
- Key patterns observed

### Step 7: Update learnings file
Append to `agents/memory/cold-email.md`. If > 4KB: condense — keep patterns and booking-rate data, drop individual incidents. This file is read by Priya when generating replies.

### Step 8: Report
"Maintenance: Nudged N, Ghosted M, OOO sent K. Learning cycle: X outcomes (A booked, B ghosted, C rejected). Variant stats updated. Top variant: {name} ({rate}% booking). Memory updated."

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
