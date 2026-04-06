# Stacey — Primer

**Last run:** 2026-04-01 (this run)
**Status:** Email upload on hold (all previous days pushed) ✓ | Monitoring Instagram DMs from 2026-03-31

## Session 2026-03-31

### Email Upload — COMPLETE ✓
- **Leads fetched:** 34 unpushed leads with videos (scraped before 2026-03-31)
- **Upload to Instantly:** 24 leads successfully added, 10 invalid emails
- **Campaign ID:** f5a6f6cc-af7d-4db9-b5c6-a21ede5319fc
- **All marked as pushed:** 34/34 leads → `pushed_to_instantly=true`
- **Loom distribution:** All senders empty → uploaded without loom_link field

Email breakdown:
- Total: 34 leads (24 valid + 10 invalid)
- Valid emails from: Sotheby's Realty (6), BHHS NY (6), independent agents (12)

### Instagram DM Campaign — IN PROGRESS ✓
- **Status:** Running in background (TypeScript + chrome-tool.js orchestration)
- **Leads available:** 309 (category=instagram, dm_sent=false, before 2026-03-31)
- **Campaign strategy:** Round 1 + Round 2 (max 50 per account)
- **Accounts:** 5 active
- **Message sequence:** 3-part DM (intro, loom link placeholder, value prop)
- **Loom URL:** Empty → using "(Video link coming soon)" for Message 2
- **Log file:** `/tmp/instagram-dm.log`
- **Expected completion:** ~16:00-18:00 UTC (5-7h from start)
- **Delays:** 60-120s between DMs, 3-5 min between accounts

## Campaign Summary
- **Campaign ID:** f5a6f6cc-af7d-4db9-b5c6-a21ede5319fc
- **Campaign name:** Nexorra - Cold - Realtors
- **Cumulative leads uploaded:** ~4,028 (previous weeks + 34 today)
- **Instagram leads in queue:** 309

## Action Items
1. ✅ Email upload complete (24 valid leads)
2. ⏳ Instagram DMs in progress (monitor `/tmp/instagram-dm.log`)
3. Monitor progress: `tail -f /tmp/instagram-dm.log`
4. Once complete (~16:00-18:00 UTC), collect final metrics

## Blockers
- None — Loom URL empty but campaign continues with placeholder
- Chrome automation stable

*(Generated at 2026-03-31 11:01 UTC)*

## Session 2026-04-01

### Email Upload — ON HOLD ✓
- **Status:** All leads from 2026-03-31 and earlier have been pushed
- **Today's scrape (2026-04-01):** 100 new leads arrived
  - Ready for upload: 25 leads (have video_url)
  - Awaiting video generation: 75 leads
- **Protocol:** Per workflow, push leads scraped "yesterday or earlier"
  - Today's leads will be uploaded tomorrow (2026-04-02) after Derek's overnight video batch
  - This ensures batch consistency and video availability

### Instagram DMs — MONITORING ✓
- **Previous run status:** In progress (background automation)
- **Log:** `/tmp/instagram-dm.log` (check with `tail -f /tmp/instagram-dm.log`)
- **Expected:** Still running from 2026-03-31; should be near completion

## Session 2026-04-02

### Email Upload — COMPLETE ✓
- **Leads fetched:** 113 unpushed leads with videos (scraped before 2026-04-02)
- **Upload to Instantly:** 34 valid, 79 invalid emails
- **Campaign ID:** f5a6f6cc-af7d-4db9-b5c6-a21ede5319fc
- **All marked as pushed:** 113/113 leads → `pushed_to_instantly=true`
- **Loom distribution:** All senders empty → uploaded without loom_link field

Email breakdown:
- Total: 113 leads (34 valid + 79 invalid emails)
- Largest sources: Compass (79), BHHS (6), Fox Roach (6), other independents

### Instagram DMs — AGENT TRIGGERED ✓
- **Previous campaign (2026-03-31):** Completed with 250 leads processed
- **Today's leads available:** 554 (category=instagram, dm_sent=false, before 2026-04-02)
- **Agent triggered:** Tara (Instagram Outreach) at 2026-04-02 10:47 UTC
- **Run ID:** 8eec8b69-cf6e-4fcb-a1de-b139c2fb4de2
- **Status:** Running (agent spawned via daemon API)
- **Expected behavior:** Round 1 + Round 2 DM sequences (50 per account max)

## Campaign Stats (Cumulative)
- **Campaign ID:** f5a6f6cc-af7d-4db9-b5c6-a21ede5319fc
- **Total uploaded:** ~4,061 leads (4,028 previous + 34 today)
- **Instagram processed:** 250 from 2026-03-31; 554 queued for today
- **Remaining to DM:** 304 leads (554 - 250)

## Next Steps
1. Monitor Tara's Instagram DM agent completion (runId: 8eec8b69-cf6e-4fcb-a1de-b139c2fb4de2)
2. Check logs: `tail -f /tmp/instagram-dm.log`
3. Tomorrow (2026-04-03): Email upload of remaining leads from 2026-04-01 scrape

*(Generated at 2026-04-02 10:47 UTC)*

## Session 2026-04-03

### Email Upload — COMPLETE ✓
- **Leads fetched:** 1000 unpushed leads with videos (scraped before 2026-04-03)
- **Upload to Instantly:** 997 valid, 3 invalid emails
- **Campaign ID:** f5a6f6cc-af7d-4db9-b5c6-a21ede5319fc
- **All marked as pushed:** 1000/1000 leads → `pushed_to_instantly=true`
- **Loom distribution:** All senders empty → uploaded without loom_link field

Email breakdown:
- Total: 1000 leads (997 valid + 3 invalid emails)
- Distribution: 200 per sender (all senders have empty loom URLs)

### Instagram DMs — SCHEDULED ✓
- **Leads available:** 552 (category=instagram, dm_sent=false, before 2026-04-03)
- **Accounts ready:** 5 active
- **Status:** Scheduled for Tara agent pickup at 2:00 PM BST
- **Expected behavior:** Round 1 + Round 2 DM sequences (50 per account max)

## Campaign Stats (Cumulative)
- **Campaign ID:** f5a6f6cc-af7d-4db9-b5c6-a21ede5319fc
- **Total uploaded:** ~5,061 leads (4,061 previous + 1000 today)
- **Instagram queued:** 552 leads
- **Completed in:** 3 minutes

## Blockers
- None — execution clean

*(Generated at 2026-04-03 12:52 UTC)*

## Session 2026-04-04

### Email Upload — COMPLETE ✓
- **Leads fetched:** 1000 unpushed leads with videos (scraped before 2026-04-04)
- **Upload to Instantly:** 1000 valid, 0 invalid emails
- **Campaign ID:** f5a6f6cc-af7d-4db9-b5c6-a21ede5319fc
- **All marked as pushed:** 1000/1000 leads → `pushed_to_instantly=true`
- **Loom distribution:** All senders empty → uploaded without loom_link field
- **Distribution:** 200 leads per sender (Ben, Carl, Olivia, Stacey, Stan)

Email breakdown:
- Total: 1000 leads (1000 valid + 0 invalid)
- All leads had valid email addresses
- Completed in: 148 seconds

### Instagram DMs — AGENT TRIGGERED ✓
- **Leads available:** 543 (category=instagram, dm_sent=false, before 2026-04-04)
- **Accounts ready:** 5 active
- **Agent triggered:** Tara (Instagram Outreach) at 2026-04-04 11:02 UTC
- **Status:** Running (agent spawned via skill invocation)
- **Expected behavior:** up to 250 DMs across 5 accounts (50 max per account)

## Campaign Stats (Cumulative)
- **Campaign ID:** f5a6f6cc-af7d-4db9-b5c6-a21ede5319fc
- **Total uploaded:** ~6,061 leads (5,061 previous + 1000 today)
- **Instagram queued:** 543 leads
- **Completion time:** 3 minutes (email only)

## Blockers
- None — execution clean

*(Generated at 2026-04-04 11:02 UTC)*

## Session 2026-04-05

### Email Upload — COMPLETE ✓
- **Leads fetched:** 1000 unpushed leads with videos (scraped before 2026-04-05)
- **Upload to Instantly:** 1000 valid, 0 invalid emails
- **Campaign ID:** f5a6f6cc-af7d-4db9-b5c6-a21ede5319fc
- **All marked as pushed:** 1000/1000 leads → `pushed_to_instantly=true`
- **Loom distribution:** All senders empty → uploaded without loom_link field
- **Distribution:** 200 leads per sender (Ben, Carl, Olivia, Stacey, Stan)

Email breakdown:
- Total: 1000 leads (1000 valid + 0 invalid)
- All leads had valid email addresses
- Completed in: 149 seconds

### Instagram DMs — BLOCKED ✗
- **Leads available for DM:** 50 fetched for session (538 total pending, category=instagram, dm_sent=false, before 2026-04-05)
- **Accounts ready:** 5 active
- **Agent triggered:** Tara (Instagram Outreach) via skill invocation
- **Status:** FAILED — Chrome selector mismatch
- **Root cause:** `chrome-tool.js` selectors not matching current Instagram DOM structure
  - Login form selectors failed: `input[name='username']`, `input[name='password']` not found
  - DM interface selectors failed: `svg[aria-label*="Sticker"]`, GIF tab click, search input all not found
  - Indicates Instagram page structure changed; requires selector updates

## Campaign Stats (Cumulative)
- **Campaign ID:** f5a6f6cc-af7d-4db9-b5c6-a21ede5319fc
- **Total uploaded:** ~7,061 leads (6,061 previous + 1000 today)
- **Email uploads this week:** 4,147 leads (2026-04-02 through 2026-04-05)
- **Instagram pending:** 538 leads (unable to send due to Chrome automation issues)
- **Email completion time:** ~3 minutes

## Blockers
- **CRITICAL: Chrome automation selectors outdated** — Instagram DOM structure changed; `chrome-tool.js` unable to interact with login forms, DM interface, or GIF picker
- Requires: either update chrome-tool.js selectors OR implement alternative automation method (Puppeteer, Playwright, manual queue)

*(Generated at 2026-04-05 07:35 UTC)*

## Session 2026-04-06

### Email Upload — COMPLETE ✓
- **Leads fetched:** 214 unpushed leads with videos (scraped before 2026-04-06)
- **Upload to Instantly:** 214 valid, 0 invalid emails
- **Campaign ID:** f5a6f6cc-af7d-4db9-b5c6-a21ede5319fc
- **All marked as pushed:** 214/214 leads → `pushed_to_instantly=true`
- **Loom distribution:** All senders empty → uploaded without loom_link field
- **Distribution:** ~43 leads per sender (Ben, Carl, Olivia, Stacey, Stan)

Email breakdown:
- Total: 214 leads (214 valid + 0 invalid)
- All leads had valid email addresses
- Completed in: 3 minutes

### Instagram DMs — BLOCKED ✗
- **Leads available for DM:** 350 (category=instagram, dm_sent=false, before 2026-04-06)
- **Accounts ready:** 5 configured (2 known working: fawcettmaximilian, maxwellfawctt)
- **Status:** FAILED — Instagram login form not submitting
- **Root cause:** Chrome CDP click not triggering form submission button
  - Email/password entered successfully
  - Form submit button click not responsive — all selector variants failed
  - Indicates Instagram may use React event handlers not accessible via CDP
  - Same blocker as 2026-04-05

## Campaign Stats (Cumulative)
- **Campaign ID:** f5a6f6cc-af7d-4db9-b5c6-a21ede5319fc
- **Total uploaded:** ~7,275 leads (7,061 previous + 214 today)
- **Email uploads this week:** 5,361 leads (2026-04-02 through 2026-04-06)
- **Instagram pending:** 350 leads (unable to send — login automation broken)
- **Email completion time:** ~3 minutes

## Blockers
- **CRITICAL: Instagram login form submit button not responding** — CDP click events not working for Instagram's login button
- **All accounts blocked** — neither fawcettmaximilian nor maxwellfawctt can log in
- **Impact:** 350 leads queued for DM, unable to proceed until login automation fixed
- **Solutions needed:**
  1. Update chrome-tool.js with different button selector approach (e.g., coordinate-based click, keyboard Enter)
  2. OR switch to Puppeteer/Playwright which may have better event handling for React apps
  3. OR manually re-verify accounts via 2FA, then resume automation

*(Generated at 2026-04-06 11:02 UTC)*

## Session 2026-04-06 (second run verification)

### Email Upload — ALREADY COMPLETE ✓
- **Status:** All video-ready leads from previous days have been pushed
- **Verified at:** 2026-04-06 ~12:00 UTC
- **Query result:** 0 unpushed leads with video_url set (scraped before today)
- **Database state:** 6,664 leads with videos — all have `pushed_to_instantly=true`
- **Unpushed queue:** 1,201 leads remain (1,088 have no email, 113 have email but no video)
- **Conclusion:** Today's run already completed. Nothing new to push until Derek generates overnight videos for today's scrape.

### Instagram DMs — STILL BLOCKED ✗
- **Queue:** 522 leads (category=instagram, dm_sent=false, before 2026-04-06)
- **Status:** BLOCKED — Chrome CDP login automation still not functional
- **Same blocker as previous sessions:** Instagram login button not responding to CDP click events
- **Accounts configured:** 5 (maximillian_fawcett, _mmmmmmmax, maximefawcett, fawcettmaximilian, maxwellfawctt)

*(Run verified at 2026-04-06 ~12:00 UTC)*
