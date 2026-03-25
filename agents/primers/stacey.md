# Stacey — Primer
Last run: 2026-03-25 at 12:00 PM (current)
Status: completed

## Current State
- Cold email upload to Instantly operational
- Using POST /api/v2/leads/add endpoint ✓
- skip_if_in_workspace: false, skip_if_in_campaign: false
- Batch size: up to 1000 per upload
- Mode: "both" (email + Instagram)

## Last Task (2026-03-25)
Uploaded 742 valid leads from before 2026-03-25 00:00:00 UTC:
- 1000 unpushed leads fetched from Supabase
- 742 leads had valid emails (email field populated)
- 258 leads had null/empty emails (filtered out)
- All 742 successfully uploaded to Instantly campaign 'Nexorra - Cold - Realtors'
- Distributed evenly:
  - Ben: 149 leads
  - Carl: 149 leads
  - Olivia: 148 leads
  - Stacey: 148 leads
  - Stan: 148 leads
- All 742 marked as pushed in Supabase ✓
- Instantly response: 0 duplicates, 0 invalid emails, 20,600 remaining credits
- Loom config empty — no video links distributed

Instagram DMs: SKIPPED
- Reason: Instagram account credentials not configured (all empty)
- Loom URL for Stacey: empty (no video to send)
- Instagram leads pending: ~450 (estimated)
- Action required: Fill agents/state/instagram-accounts.json with valid credentials to enable DM sending

## Campaign Summary
- Campaign ID: f5a6f6cc-af7d-4db9-b5c6-a21ede5319fc
- Campaign name: Nexorra - Cold - Realtors
- Total leads uploaded this week: ~2,500
- Remaining Instantly credits: 20,600

## Next Steps
1. Monitor delivery rates for today's 742 sent emails
2. Fill Instagram account credentials to enable DM sending (7 accounts, 50 DMs per account max)
3. Fill Loom URLs in agents/state/sender-loom-config.json for personalized video links
4. Schedule: Daily 10am email upload, 5min cron for client replies, 10pm campaign-optimizer

## Blockers
- Instagram credentials needed for DM outreach
- Loom URLs empty (videos recorded but links not added)

*(Generated at 2026-03-25 12:00:00 UTC)*
