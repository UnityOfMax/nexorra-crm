# Instagram Follow-up Agent

**EXECUTE IMMEDIATELY. Do NOT ask questions. Do NOT wait for confirmation. Start the follow-up workflow now from Step 1. You are autonomous.**

Daily follow-up agent for Instagram leads. Runs at 6 PM. Sends follow-up GIFs/messages via Chrome (no reply) or Instagram Graph API (replied via Peoples DM).

## API Shorthands

**SB** = `apikey: $SUPABASE_SERVICE_ROLE_KEY` + `Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY`
**SB+W** = SB + `Content-Type: application/json` + `Prefer: return=minimal`

---

## Workflow

### Step 1 — Load follow-up config
Read `agents/state/instagram-followup-config.json`.

If config has no steps defined yet (empty arrays): output "No follow-up sequences configured. Add sequences to agents/state/instagram-followup-config.json." and exit.

The config structure:
```json
{
  "cases": {
    "A": {
      "label": "No response",
      "steps": [
        { "day_delay": 2, "message": "...", "gif_path": "agents/media/followup-a1.gif" },
        { "day_delay": 4, "message": "...", "gif_path": "agents/media/followup-a2.gif" },
        { "day_delay": 7, "message": "...", "gif_path": "agents/media/followup-a3.gif" }
      ]
    },
    "B": { "label": "Soft interest", "steps": [...] },
    "C": { "label": "Objection", "steps": [...] }
  }
}
```

### Step 2 — Chrome path: Follow up with non-repliers
Fetch leads that need a Chrome follow-up (no reply received yet):
```
GET $NEXT_PUBLIC_SUPABASE_URL/rest/v1/leads
  ?lead_category=eq.instagram
  &instagram_dm_sent=eq.true
  &instagram_status=eq.dm_sent
  &instagram_follow_up_count=lt.3
  &select=id,first_name,instagram_handle,instagram_dm_sent_at,instagram_follow_up_count,instagram_last_follow_up_at,instagram_dm_account
  &limit=200
Headers: SB
```

For each lead, determine which follow-up step is due:
- `follow_up_count = 0`: check if `dm_sent_at` + case A step[0].day_delay days ≤ now
- `follow_up_count = 1`: check if `last_follow_up_at` + case A step[1].day_delay days ≤ now
- `follow_up_count = 2`: check if `last_follow_up_at` + case A step[2].day_delay days ≤ now

If no step is due yet (too soon): skip this lead.

**For each lead where a follow-up step is due:**

1. Determine which Instagram account sent the original DM (from `instagram_dm_account`). Use that same account for follow-ups if possible (consistency).

2. Log in:
   ```bash
   node scripts/chrome-tool.js instagram-login "{username}" "{password}"
   ```

3. Navigate to the DM thread (not the profile — navigate directly to DMs):
   ```bash
   node scripts/chrome-tool.js navigate "https://www.instagram.com/direct/inbox/"
   node scripts/chrome-tool.js wait 3000
   ```
   Search for the handle in the inbox, click the thread. If thread not found, try navigating to the profile and clicking Message to reopen:
   ```bash
   node scripts/chrome-tool.js navigate "https://www.instagram.com/{instagram_handle}/"
   node scripts/chrome-tool.js wait 2000
   ```
   Then click Message button to open the existing DM thread.

4. If there's a message to send:
   ```bash
   node scripts/chrome-tool.js instagram-dm "{message_from_step}"
   node scripts/chrome-tool.js wait 3000
   ```

5. If there's a GIF to send (and gif_path file exists):
   ```bash
   node scripts/chrome-tool.js instagram-send-gif "{gif_path}"
   node scripts/chrome-tool.js wait 3000
   ```

6. Log out and wait 60-90s before next follow-up:
   ```bash
   node scripts/chrome-tool.js instagram-logout
   node scripts/chrome-tool.js wait 75000
   ```

7. Update Supabase:
   ```
   PATCH .../leads?id=eq.{id}
   Body: { "instagram_follow_up_count": {count+1}, "instagram_last_follow_up_at": "{now_iso}" }
   ```

8. If follow_up_count reaches 3 after this send, also set:
   ```
   Body: { "instagram_follow_up_count": 3, "instagram_last_follow_up_at": "{now_iso}", "instagram_status": "ignored" }
   ```

**Batch Chrome sessions:** To avoid logging in/out for every single lead, group leads by the same `instagram_dm_account`. Process all leads for account 1, log out, then account 2, etc.

### Step 3 — API path: Follow up with Peoples DM repliers
Fetch leads that replied via Peoples DM and need a follow-up:
```
GET $NEXT_PUBLIC_SUPABASE_URL/rest/v1/leads
  ?lead_category=eq.instagram
  &instagram_reply_channel=eq.peoples_dm
  &instagram_status=in.(replied,engaged)
  &instagram_follow_up_count=lt.3
  &select=id,first_name,instagram_handle,instagram_user_id,instagram_follow_up_count,instagram_last_follow_up_at,instagram_follow_up_case
  &limit=100
Headers: SB
```

For these leads, the follow-up case (A, B, or C) should already be set in `instagram_follow_up_case`. If null, default to case B (soft interest — they replied so there's interest).

Use the Instagram Graph API to send the reply (via `lib/instagram/client.ts`):
- Get IG credentials from `facebook_integrations` table
- Use `sendMessage(igAccountId, recipientId, message, accessToken)`
- If `instagram_user_id` is null: look it up first with `getInstagramUserId(igAccountId, handle, token)` and save it

For GIF follow-ups via API: the Graph API supports media messages. Send the GIF URL if hosted, or fall back to a text-only message if GIF sending via API is not available.

Update Supabase same as Chrome path (follow_up_count + last_follow_up_at).

### Step 4 — Report
"Follow-up done. Chrome: {n} follow-ups sent. API: {m} follow-ups sent. Skipped (too soon): {x}. Sequence ended (marked ignored): {y}."

### Step 5 — Update learnings
Append session summary to `agents/memory/instagram-outreach.md`. Include: follow-up counts, response rates by step, any patterns noticed.

---

## Rules

- Never send a follow-up to a lead with `instagram_status='booked'`
- Never send more than 3 follow-ups per lead total
- Chrome follow-ups do NOT count toward the 50 initial DMs/account limit
- If Chrome loses connection mid-session: log, continue with remaining API-path leads
- If a lead replies (status changes to 'replied') before a Chrome follow-up: skip the Chrome follow-up and switch to API path
