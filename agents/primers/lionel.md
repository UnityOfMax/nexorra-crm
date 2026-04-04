# Lionel — Cold Email Maintenance Agent
Last run: 2026-04-04 (complete)
Status: partially operational (4 critical blockers remain)

## What Just Happened (Run 2026-04-04)

### Maintenance Actions Summary
✓ Nudge Check: 0 conversations ready (all already have nudges sent or are < 3 days old)
✓ Ghosted Detection: 0 conversations to mark ghosted
✓ Video Viewed Check: 0 leads viewed videos in last 3 days
✗ Scheduled Messages: BLOCKED (schema columns confirmed missing — conversation_messages.sent, conversation_messages.scheduled_send_at)
✗ Instantly Status Sync: BLOCKED (sync script times out after 45s — persistent socket error)
✓ Learning Cycle: 0 unlearned outcomes (all analyzed)

### Status by Component
| Component | Status | Blocker |
|-----------|--------|---------|
| Nudge send | ✓ OK | 0 ready (all sent or recent) |
| Ghosted detection | ✓ OK | 0 to mark |
| Video conditional | ✓ OK | 0 viewers |
| Scheduled send | ✗ Blocked | Schema columns missing (confirmed) |
| Instantly sync | ✗ Blocked | Timeout after 45s (socket error) |
| Learning cycle | ✓ OK | 0 unlearned outcomes |

### Blocker Status (CRITICAL — NO PROGRESS SINCE 2026-03-31)

**2026-04-04 Check**: 0 nudges, 0 ghosted, 0 learnings. Same blockers. **No actionable items.**

1. **Instantly reply endpoint** — API requires `reply_to_uuid`, returns 400 if missing
   - Confirmed: Endpoint non-functional without UUID
   - Impact: **blangson@gmail.com stuck for 11 days** — cannot send nudge, now ghosted
   - Root cause: Webhook handler doesn't capture `instantly_msg_id` on inbound (msgs have null instantly_msg_id, no instantly_conversation_id)
   - Fix needed: Fetch UUID from Instantly API or capture from raw_html, OR use different endpoint
   - Status: **CRITICAL BLOCKER — 10 days stuck**

2. **Instantly API socket error** — sync script times out after 30s with socket close
   - Impact: Cannot validate lead statuses from Instantly
   - Status: PERSISTENT (6+ days)
   - Likely: Rate limiting, network instability, or API endpoint deprecation
   - Impact on learning: Cannot distinguish genuine ghosted from "Instantly data stale"

3. **Database schema** — conversation_messages.sent and conversation_messages.scheduled_send_at do not exist
   - Impact: Cannot queue scheduled messages
   - Status: Awaiting migration (low priority, 0 pending)

4. **ANTHROPIC_API_KEY missing** — Not in `.env.local`
   - Impact: Could not use Claude Haiku for learning analysis (worked around manually)
   - Status: Awaiting configuration

## Current State
Database state as of 2026-04-04:
- 0 conversations ready for nudge (all sent or recent)
- 0 video views (last 3 days)
- 0 scheduled messages to send
- 0 unlearned outcomes (all analyzed)
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

## Learnings (Updated 2026-04-02)
**One ghosted outcome analyzed (manual)**:

1. **Pattern: Engaged-but-uncommitted curious replies** (blangson@gmail.com)
   - Lead replied positively ("Will do") to Calendly offer but never booked
   - Classified as "curious" with escalating tone engagement
   - Calendly-only follow-up insufficient for low-conversion intent
   - Fix: For "curious + engaged tone" leads, offer conditional video (e.g., "saw you interested — 2-min recap?") before or alongside Calendly

## Known Issues (Updated 2026-04-02)
- ❌ **CRITICAL**: Instantly reply endpoint requires `reply_to_uuid` → 400 Bad Request (10 days stuck)
- ❌ **CRITICAL**: Instantly API sync times out (30s socket close) → cannot validate lead statuses
- ❌ conversation_messages schema incomplete → affects scheduling (low priority: 0 pending)
- ❌ ANTHROPIC_API_KEY missing → used manual learning workaround
- ✅ Ghosted detection working correctly (1 marked ghosted)
- ✅ Learning analysis working correctly (manual analysis)
- ✅ Video view detection working correctly (0 viewers)

## Today's Briefing

# Morning Briefing — 2026-03-24

## Vault: 395 leads, 0 clients, 1 research topics

## Yesterday's Digest
# Nexorra Digest — 2026-03-23

## Vault Stats
- 195 lead notes
- 0 client profiles



## Active Context
- All agents have access to ~/Obsidian/Nexorra/ via filesystem MCP
- Write findings to the vault using brain.writers.{department}()
- Read from vault to avoid re-querying DB for known information

*(Generated at 2026-03-24 09:55:04)*

*(See full briefing in Obsidian vault)*

