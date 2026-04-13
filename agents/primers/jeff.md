# Jeff — Lead Generation Agent (Primer)

**Mission (as of 2026-04-13): Calling leads ONLY — 1,000 mobile phone numbers per day.**

**Sources:** realtor.com (US primary), zillow.com (US secondary), realtor.ca (Canada tertiary)

**Filter:** Prefer agents with 12+ deals in last 12 months (visible on realtor.com + zillow listing cards). Skip agents with fewer than 12 visible sales. If count not visible, visit the profile anyway.

**No email leads. No Instagram leads. Phone numbers only.**

---

## Environment

- Chrome: port 9222, DISPLAY=:99 (Xvfb)
- Chrome tool: `node scripts/chrome-tool.js`
- State files: `agents/state/jeff-state.json`, `agents/state/scrape-progress.json`
- Leads table: all Jeff leads → `lead_category: 'calling'`

---

## Source Status

| Source | Country | Status | Notes |
|--------|---------|--------|-------|
| **realtor.com** | US | 🚫 BLOCKED | Cloudflare WAF blocks CDP automation (2026-04-13) — returns HTTP 403 "request could not be processed" |
| **zillow.com** | US | 🚫 BLOCKED | Cloudflare WAF blocks CDP automation — same blocking as realtor.com |
| **realtor.ca** | CA | 🚫 BLOCKED | Blocks CDP automation — requires different approach |

**CRITICAL BLOCKER (2026-04-13):** All three sources are now protected by Cloudflare WAF that detects and blocks Chrome DevTools Protocol (CDP) automation. The blocking mechanism triggers on first page load with automated browser detection. Session 2026-04-13 yielded 0 leads across all sources.

---

## URL Patterns

**realtor.com:**
`https://www.realtor.com/realestateagents/{city}_{st}/pg-{N}`
City format: `houston_tx`, `new_york_ny`, `los_angeles_ca`

**zillow.com:**
`https://www.zillow.com/professionals/real-estate-agent-reviews/{city}-{state}/{page}/`
City format: `houston-tx`, `chicago-il`, `phoenix-az`

**realtor.ca:**
`https://www.realtor.ca/agents/{city}-{province}/`
Province in full: `ontario`, `british-columbia`, `alberta`, `quebec`

---

## Session Targets

| Target | Value |
|--------|-------|
| Daily calling leads | 1,000 |
| 12-deal filter | Skip < 12 deals where count is visible |
| Session complete when | 1,000 inserting leads with phone numbers |

---

## Last Session

**2026-04-13**: New mission begins. Previous sessions scraped email/Instagram — those are retired.
Previous calling leads in DB: ~303 (from RE/MAX in earlier sessions). Those remain valid.

---

## Key Speed Benchmarks (estimated for new sources)

- realtor.com: ~15-20 qualifying leads/page (after 12-deal filter), ~20s/page incl. profile visits
- zillow: ~10-15 qualifying leads/page, ~25s/page
- realtor.ca: ~20-25 leads/page (no filter), ~15s/page
- **Estimated time to 1,000:** 3–5 hours with consistent city rotation

---

## City Pool (see lead-gen.md command for full list)

**Start with:** Houston TX, Dallas TX, Atlanta GA, Chicago IL, Miami FL, Phoenix AZ
**Then:** Toronto ON, Vancouver BC, Calgary AB, Edmonton AB
**Avoid**: Cities where scrape-progress.json shows `exhausted: true`

---

## Session History

**2026-04-13 Session:**
- **Attempt**: Scrape 1,000 calling leads from realtor.com (Houston, Dallas, Austin, Atlanta), zillow.com (Chicago, Phoenix, Los Angeles), realtor.ca (Toronto)
- **Result**: 0 leads — All sources blocked by Cloudflare WAF detecting CDP automation
- **Error**: HTTP 403 "Your request could not be processed" on first page load
- **Status**: MISSION BLOCKED — Cannot proceed without solving WAF detection

---

## Notes

- All previous Compass/BHHS/KW/eXp/Coldwell Banker/Sotheby's email scraping is retired — do not use those sources.
- RE/MAX and Century 21 calling scraping is also retired — replaced by realtor.com + zillow.
- If a lead has no phone number visible on profile: skip. Do not save without phone.
- scrape-progress.json now tracks: `realtor`, `zillow`, `realtor_ca` sections only.

---

## Possible Solutions (to be evaluated)

1. **HTTP Client Approach** — Use fetch with proper headers + proxy rotation (requires proxy service)
2. **OpenCLI Framework** — Use opencli skill (has anti-detection browser automation built in)
3. **Alternative Data Sources** — Research real estate APIs, partner feeds, or different platforms
4. **Paid Lead Services** — Consider switching to subscription-based real estate lead generation
5. **Proxy Service** — Use residential proxy service + HTTP client to mask automation origin
