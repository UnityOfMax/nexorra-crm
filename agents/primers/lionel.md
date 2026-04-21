# Lionel — Cold Email Maintenance Agent
Last run: 2026-04-21 (complete)
Status: partially operational (4 critical blockers remain)

## What Just Happened (Run 2026-04-21)

### Maintenance Actions Summary
✓ Nudge Check: 0 conversations ready
✓ Ghosted Detection: 0 conversations to mark ghosted
✓ Video Viewed Check: 0 leads viewed videos in last 3 days
✗ Scheduled Messages: BLOCKED (schema columns missing)
✗ Instantly Status Sync: BLOCKED (401 API auth error)
✓ Learning Cycle: 0 unlearned outcomes

### Status by Component
| Component | Status | Result |
|-----------|--------|--------|
| Nudge send | ✓ OK | 0 ready |
| Ghosted detection | ✓ OK | 0 to mark |
| Video conditional | ✓ OK | 0 viewers |
| Scheduled send | ✗ Blocked | Schema columns missing |
| Instantly sync | ✗ Blocked | 401 auth error |
| Learning cycle | ✓ OK | 0 unlearned outcomes |

### Execution Summary
- 1 day since last run (2026-04-20)
- All operational components executed successfully
- Zero actionable items: 0 nudges, 0 ghosted, 0 video views, 0 learnings
- All 4 blockers remain unresolved (24 days stuck since 2026-03-31)
- **No progress** — system still waiting on Instantly fixes + ANTHROPIC_API_KEY

### Status
System operational but idle. No incoming replies to nudge, no leads crossing ghosted threshold. Next actionable event: when new replies arrive (awaiting inbound traffic).

---

## What Just Happened (Run 2026-04-20)

### Maintenance Actions Summary
✓ Nudge Check: 0 conversations ready
✓ Ghosted Detection: 0 conversations to mark ghosted
✓ Video Viewed Check: 0 leads viewed videos in last 3 days
✗ Scheduled Messages: BLOCKED (schema columns missing)
✗ Instantly Status Sync: BLOCKED (not run due to socket error)
✓ Learning Cycle: 0 unlearned outcomes

### Status by Component
| Component | Status | Result |
|-----------|--------|--------|
| Nudge send | ✓ OK | 0 ready |
| Ghosted detection | ✓ OK | 0 to mark |
| Video conditional | ✓ OK | 0 viewers |
| Scheduled send | ✗ Blocked | Schema columns missing |
| Instantly sync | ✗ Blocked | Socket timeout (persistent) |
| Learning cycle | ✓ OK | 0 unlearned outcomes |

### Execution Summary
- 12 days since last run (2026-04-08)
- All operational components executed successfully
- Zero actionable items: 0 nudges, 0 ghosted, 0 video views, 0 learnings
- All 4 blockers remain unresolved (23 days stuck since 2026-03-31)
- **No progress** — system still waiting on Instantly fixes + ANTHROPIC_API_KEY

### Status
System operational but idle. No incoming replies to nudge, no leads crossing ghosted threshold. Next actionable event: when new replies arrive (awaiting inbound traffic).

---

## What Just Happened (Run 2026-04-08)

### Maintenance Actions Summary
✓ Nudge Check: 0 conversations ready
✓ Ghosted Detection: 0 conversations to mark ghosted
✓ Video Viewed Check: 0 leads viewed videos in last 3 days
✗ Scheduled Messages: BLOCKED (schema columns missing)
✗ Instantly Status Sync: BLOCKED (sync script timeout — socket error)
✓ Learning Cycle: **1 outcome analyzed and saved**

### Status by Component
| Component | Status | Result |
|-----------|--------|--------|
| Nudge send | ✓ OK | 0 ready (all sent or < 2 days old) |
| Ghosted detection | ✓ OK | 0 to mark (no 7-day+ replied, no 4-day+ nudges) |
| Video conditional | ✓ OK | 0 viewers in last 3 days |
| Scheduled send | ✗ Blocked | Schema columns missing |
| Instantly sync | ✗ Blocked | Timeout after ~5s (socket close) |
| Learning cycle | ✓ COMPLETED | 1 immediate unsubscribe analyzed |

### Execution Summary
- All operational components executed successfully
- No actionable nudges, ghosted leads, or video views (0 items)
- Learning cycle: **1 outcome processed** (alex.loyd@compass.com — immediate unsubscribe)
- All 4 blockers remain unresolved (no progress since 2026-03-31, 9 days)
- System operational but limited — waiting for new replies/outcomes to trigger next maintenance

### Learning Outcome (2026-04-08)
**alex.loyd@compass.com (Compass agent)**: Immediately unsubscribed with "Remove me" on first contact.
- **Classification**: Instant rejection (no engagement opportunity)
- **Pattern**: Suggests Compass domain may have active suppression or email opt-out
- **Action**: Add to hard suppression list. Classify as "immediately hostile unsubscribe" rather than standard rejection
- **Saved to**: stacey_learnings table
- **Status**: outcome_learned=true marked

---

## What Just Happened (Run 2026-04-07)

### Maintenance Actions Summary
✓ Nudge Check: 0 conversations ready
✓ Ghosted Detection: 0 conversations to mark ghosted
✓ Video Viewed Check: 0 leads viewed videos in last 3 days
✗ Scheduled Messages: BLOCKED (schema columns missing)
✗ Instantly Status Sync: BLOCKED (sync script timeout — socket error)
✓ Learning Cycle: 0 unlearned outcomes (all already analyzed)

### Status by Component
| Component | Status | Result |
|-----------|--------|--------|
| Nudge send | ✓ OK | 0 ready (all sent or < 2 days old) |
| Ghosted detection | ✓ OK | 0 to mark (no 7-day+ replied, no 4-day+ nudges) |
| Video conditional | ✓ OK | 0 viewers in last 3 days |
| Scheduled send | ✗ Blocked | Schema columns missing |
| Instantly sync | ✗ Blocked | Timeout after ~5s (socket close) |
| Learning cycle | ✓ OK | 0 unlearned outcomes |

### Execution Summary
- All operational components executed successfully
- No actionable items (0 nudges, 0 ghosted, 0 video views, 0 learnings)
- All 4 blockers remain unresolved (no progress since 2026-03-31, 8 days)
- System operational but limited — waiting for new replies/outcomes to trigger next maintenance

---

## What Just Happened (Run 2026-04-06)

### Maintenance Actions Summary
✓ Nudge Check: 0 conversations ready (all already have nudges sent or are < 2 days old)
✓ Ghosted Detection: 0 conversations to mark ghosted
✓ Video Viewed Check: 0 leads viewed videos in last 3 days
✗ Scheduled Messages: BLOCKED (schema columns confirmed missing — conversation_messages.sent, conversation_messages.scheduled_send_at)
✗ Instantly Status Sync: BLOCKED (sync script times out after ~15s — persistent socket error)
✓ Learning Cycle: **4 unlearned outcomes analyzed and saved**

### Status by Component
| Component | Status | Result |
|-----------|--------|--------|
| Nudge send | ✓ OK | 0 ready (all sent or recent) |
| Ghosted detection | ✓ OK | 0 to mark |
| Video conditional | ✓ OK | 0 viewers |
| Scheduled send | ✗ Blocked | Schema columns missing (confirmed) |
| Instantly sync | ✗ Blocked | Timeout after ~15s (socket error) |
| Learning cycle | ✓ COMPLETED | 4 hard unsubscribe rejections analyzed |

### Learning Outcomes (2026-04-06)
**4 unsubscribe rejections analyzed and saved to stacey_learnings:**
1. **Benjean Britt (benjean.britt@exprealty.com)**: Rejected nudge with "Stop" — eXp Realty broker domain (case variation suggests automation)
2. **Benjean Britt (Benjean.Britt@exprealty.com)**: Same lead, different email case — duplicated rejection
3. **Erica Burke (erica.burke@exprealty.com)**: Rejected nudge with "Hi please remove me from your email listed"
4. **Erica Burke (erica@ericamburke.com)**: Same lead, different email — duplicated rejection

**Key Pattern**: All 4 are hard unsubscribes (auto-classified). All occurred on 2026-04-06. Likely triggered by the same nudge batch sent at 9:38 AM.

**Action Taken**: All marked outcome_learned=true. Updated cold-email.md memory with unsubscribe pattern.

---

## What Just Happened (Run 2026-04-05)

### Maintenance Actions Summary
✓ Nudge Check: 0 conversations ready (all already have nudges sent or are < 3 days old)
✓ Ghosted Detection: 0 conversations to mark ghosted
✓ Video Viewed Check: 0 leads viewed videos in last 3 days
✗ Scheduled Messages: BLOCKED (schema columns confirmed missing — conversation_messages.sent, conversation_messages.scheduled_send_at)
✗ Instantly Status Sync: BLOCKED (sync script times out after ~15s — persistent socket error)
✓ Learning Cycle: 0 unlearned outcomes (all analyzed)

### Status by Component
| Component | Status | Blocker |
|-----------|--------|---------|
| Nudge send | ✓ OK | 0 ready (all sent or recent) |
| Ghosted detection | ✓ OK | 0 to mark |
| Video conditional | ✓ OK | 0 viewers |
| Scheduled send | ✗ Blocked | Schema columns missing (confirmed) |
| Instantly sync | ✗ Blocked | Timeout after ~15s (socket error) |
| Learning cycle | ✓ OK | 0 unlearned outcomes |

### Blocker Status (CRITICAL — NO PROGRESS SINCE 2026-03-31)

**2026-04-05 Check**: 0 nudges, 0 ghosted, 0 learnings. Same blockers. **No actionable items.**

1. **Instantly reply endpoint** — API requires `reply_to_uuid`, returns 400 if missing
   - Confirmed: Endpoint non-functional without UUID
   - Impact: **blangson@gmail.com stuck for 11 days** — cannot send nudge, now ghosted
   - Root cause: Webhook handler doesn't capture `instantly_msg_id` on inbound (msgs have null instantly_msg_id, no instantly_conversation_id)
   - Fix needed: Fetch UUID from Instantly API or capture from raw_html, OR use different endpoint
   - Status: **CRITICAL BLOCKER — 10 days stuck**

2. **Instantly API socket error** — sync script times out after ~15s with socket close
   - Impact: Cannot validate lead statuses from Instantly
   - Status: PERSISTENT (7+ days, verified 2026-04-05)
   - Likely: Rate limiting, network instability, or API endpoint deprecation
   - Impact on learning: Cannot distinguish genuine ghosted from "Instantly data stale"

3. **Database schema** — conversation_messages.sent and conversation_messages.scheduled_send_at do not exist
   - Impact: Cannot queue scheduled messages
   - Status: Awaiting migration (low priority, 0 pending)

4. **ANTHROPIC_API_KEY missing** — Not in `.env.local`
   - Impact: Could not use Claude Haiku for learning analysis (worked around manually)
   - Status: Awaiting configuration

## Current State
Database state as of 2026-04-06:
- 0 conversations ready for nudge (all sent or recent)
- 0 video views (last 3 days)
- 0 scheduled messages to send
- 0 unlearned outcomes (**all 4 analyzed** as of 2026-04-06)
- **Status**: Waiting on blocker fixes to resume operations

## Next Steps (Prioritized)

### CRITICAL (blocking all nudges/follow-ups)
1. **Fix Instantly reply endpoint** (10 days stuck, no progress since 2026-03-31)
   - Problem: API returns 400 "reply_to_uuid required" but we don't capture it
   - Root cause: Webhook handler doesn't extract `instantly_msg_id` from inbound (all null)
   - Options:
     - A) Update webhook: capture `instantly_msg_id` when inbound comes in
     - B) Store `instantly_conversation_id` and fetch UUID from Instantly API
     - C) Look for UUID in raw_html and parse it
     - D) Find alternate endpoint (e.g., list conversations → get latest message UUID)
   - Impact: **1 lead (blangson@gmail.com) now ghosted after 10 days waiting**

2. **Fix Instantly API socket timeout** (6+ days stuck)
   - Problem: sync script hangs for 30s then closes (socket error)
   - Likely cause: Rate limiting, network timeout, or API endpoint deprecation
   - Debug: Check Instantly status page, try manual curl, check rate limits
   - Impact: Cannot validate Instantly lead statuses for learning

### HIGH (good to have)
3. **Add `ANTHROPIC_API_KEY` to .env.local**
   - Enables full Claude Haiku analysis in learning cycle
   - Manual learning worked but less thorough

4. **Add DB columns to conversation_messages** (low priority)
   - `sent` (boolean): whether message was actually sent
   - `scheduled_send_at` (timestamp): when to send queued messages
   - Currently 0 pending messages

## Learnings (Updated 2026-04-06)

### New: Unsubscribe Rejection Pattern (4 leads, 2026-04-06)
**All 4 unlearned outcomes were hard unsubscribes to nudge messages.** Saved to stacey_learnings table:
1. **Benjean Britt (eXp Realty broker)**: "Stop" response (auto-classified unsubscribe)
   - 2 email case variations (benjean.britt@ vs Benjean.Britt@) suggest email system automation
   - **Action**: Do not retry. Add domain to suppression.

2. **Erica Burke (mixed domain)**: "Hi please remove me from your email listed"
   - Polite but explicit. 2 email variations (erica.burke@exprealty.com vs erica@ericamburke.com)
   - **Action**: Do not retry. Add to permanent suppression.

**Pattern**: Likely triggered by same nudge batch (9:38 AM 2026-04-06, Ben Vance/Olivia Harris senders).
**Insight**: Nudge copy ("I still haven't heard back from you") may trigger unsubscribe responses in certain broker domains (eXp).
**Memory**: Updated cold-email.md with unsubscribe pattern + action.

---

## Learnings (Updated 2026-04-02 - ARCHIVED)
**One ghosted outcome analyzed (manual)**:

1. **Pattern: Engaged-but-uncommitted curious replies** (blangson@gmail.com)
   - Lead replied positively ("Will do") to Calendly offer but never booked
   - Classified as "curious" with escalating tone engagement
   - Calendly-only follow-up insufficient for low-conversion intent
   - Fix: For "curious + engaged tone" leads, offer conditional video (e.g., "saw you interested — 2-min recap?") before or alongside Calendly

## Known Issues (Updated 2026-04-06)
- ❌ **CRITICAL**: Instantly reply endpoint requires `reply_to_uuid` → 400 Bad Request (11+ days stuck)
- ❌ **CRITICAL**: Instantly API sync times out (~15s socket close) → cannot validate lead statuses (7+ days stuck)
- ❌ conversation_messages schema incomplete → affects scheduling (low priority: 0 pending)
- ❌ ANTHROPIC_API_KEY missing → used manual learning workaround
- ✅ Nudge check working correctly (0 ready)
- ✅ Ghosted detection working correctly (0 to mark)
- ✅ Video view detection working correctly (0 viewers)
- ✅ Learning cycle working correctly (4 outcomes analyzed 2026-04-06)

## Maintenance Execution Notes

**2026-04-06 Execution**:
- ✓ All operational components executed successfully (nudge check, ghosted detection, video check, learning cycle)
- ✓ Learning cycle produced results: 4 hard unsubscribe rejections analyzed + saved
- ✗ All 4 blockers remain unresolved
- Status: System operational but limited — nudges/ghosted/video checks = 0 items, learning cycle processed 4 outcomes
- Next actionable: When next "replied" conversation reaches 7-day mark without outbound (needs Instantly sync fix to validate)
- Time until next nudge ready: ~5-7 days (depends on when new replies arrive)

