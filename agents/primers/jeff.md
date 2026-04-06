# Jeff — Lead Generation Agent (Primer)

**Last run:** 2026-04-06 19:15 UTC (extended email phase — 3.5 hrs) — **COMPLETE**
**Session status:** DONE — 739/1850 leads (40%)
**Session totals:** Email 436/1000 (43%) | Calling 303/500 (60%) | Instagram 0/350 (0%) | **Total: 739/1850 (40%)**

## Session 2026-04-06 Results (Extended Afternoon)
- **Compass Email**: 341 leads from 8+ cities ✅ **HIGHLY PRODUCTIVE**
  - Cities hit: Philadelphia (p2-6), Phoenix (p1), Orlando (p1-4), Raleigh (p1-4), Milwaukee (p1-5), Boston, Miami, Washington DC
  - Added 341 email leads (started at 95, now 436)
  - Rate: ~40 leads/page, but 50%+ duplicate rate after 400+ total leads (database saturation)
- **RE/MAX & Realtor.com**: 0 leads ❌ **BLOCKED**
  - agents remax command returning 0 agents on Houston/Austin pages
  - agents realtor command returning empty pages
  - Chrome tool/page structure issue — needs debugging next session
- **BHHS Instagram**: 0 leads ❌ **EXHAUSTED**
  - BHHS previously scraped extensively (NY p9-26, LA p1-22, Chicago p1-20)
  - Scrape-progress shows BHHS cities exhausted or heavily depleted
  - Would need fresh cities not yet in progress (Houston, Phoenix, Philadelphia, etc.) OR Puppeteer scraper

## Current Blockers (2026-04-06)

1. **Email Saturation**: Compass hitting 50%+ duplicate rate after 436 leads
   - Database already has ~15,359 lifetime leads
   - Each city typically has 50-100 total agents; Compass pages exhausting rapidly
   - Need: (a) Fix RE/MAX/Realtor to get fresh phone leads, (b) Try BHHS, KW, eXp, Coldwell Banker for email, (c) Accept that 1000 daily may be ceiling given DB saturation

2. **Instagram Zero**: All sources blocked
   - RE/MAX agents command returning 0 (not working)
   - BHHS Puppeteer script requires manual execution or Chrome evaluation workaround
   - Profile visit approach too slow without working agents command

3. **Calling Stuck at 303**: RE/MAX/Realtor profile visits not accessible
   - agents remax returning 0 on all pages (issue with chrome-tool or page structure)
   - agents realtor returning empty pages (page not loading or command mismatch)
   - Need: Debug chrome-tool `agents` commands or implement profile visit fallback

## Key Insights
- **Email target (1000)**: Need 564 more. Compass alone insufficient due to saturation. Need 4-5 fresh brokerages or cities not yet scraped.
- **Calling target (500)**: Need 197 more. Close to target but blocked on RE/MAX profiles. Quick win if agents command fixed.
- **Instagram target (350)**: Need 350. Critical blocker — no working source. BHHS Puppeteer or fresh RE/MAX approach needed.

## Next Session Recommendations
1. **For Email**: Continue Compass rotation across remaining 35+ cities (Philadelphia, Raleigh, Orlando, Pittsburgh, etc.)
2. **For Calling**: Finish RE/MAX remaining major cities (San Francisco, Seattle, Boston, Chicago, etc.) — likely hit 500 in next session
3. **For Instagram**: Either fix BHHS Puppeteer connection OR pivot to RE/MAX profile visits (slower but documented approach)

## ⚠️ VIDEO NOTE: BHHS Franchise Subdomain Leads
Derek's video pipeline cannot render pages from BHHS franchise subdomain sites:
`bhhsamericas.com`, `bhhskarr.com`, `bhhslafayette.com`, `bhhsjordan.com`, `bhhsvdw.com`, `bhhscoloradorealestate.com`

These agents are stored in DB but their `profile_url` points to heavy React franchise sites Chrome can't screenshot.
**Action**: When scraping BHHS via Solr API, if an agent's `officeSiteUrl` or profile URL matches these subdomains, still scrape them (email/instagram are fine) — but note that no video will be generated. Do NOT skip them, they are valid email leads. The main `bhhs.com` profile pages work fine.

## Session 2026-04-01 Results (Run 2 — BHHS Instagram + Compass email top-up)

**Email Phase (Run 1 + Run 2):** ~2,919 leads total
- Run 1: ~999 leads from Compass across 20+ cities
- Run 2: +38 from Compass Nashville p8 (top-up) + ~1,882 from BHHS (NY p9-26, LA p1-22, Chicago p1-20) as email-category leads

**Calling Phase:** 609 from RE/MAX (run 1 only — already exceeded)

**Instagram Phase:** 360 leads from BHHS `SocialMediaInstagramUrlOrId` field ✅
- **NO PROFILE VISITS NEEDED** — BHHS Solr API returns instagram handle directly
- New York: ~85 instagram (pages 9-26, ~26% of new agents had instagram)
- Los Angeles: ~88 instagram (pages 1-22, ~12% hit rate)
- Chicago: ~187 instagram (pages 1-20, ~14% hit rate)
- BHHS instagram hit rate: **~12% overall** across all agents
- Scraper: `scripts/bhhs-puppeteer-scraper.ts` — now sets `lead_category` properly
  - `lead_category: 'instagram'` if `SocialMediaInstagramUrlOrId` present
  - `lead_category: 'email'` if email-only

## KEY DISCOVERY: BHHS is the PRIMARY Instagram Source

BHHS Solr API returns `SocialMediaInstagramUrlOrId` directly — no slow profile visits.
Instagram leads from BHHS are extracted automatically while scraping for email.
At 12% hit rate × 50 agents/page = ~6 instagram leads per page.
To get 350 instagram = ~58 BHHS pages = ~1 hour of BHHS scraping.

**For Instagram, ALWAYS run BHHS first.** RE/MAX profile visits are a fallback only.

## Compass — FIXED. 33 Cities Pre-loaded.

The old city-slug URL pattern is dead — it redirects to /agents/ root. **All location IDs are now in scrape-progress.json.** Use them directly. Do NOT try to discover IDs via navigation.

URL pattern: `https://www.compass.com/agents/locations/{seoId}/{location_id}/page-{N}/`

**Cities in scrape-progress (check exhausted/last_page before using):**
Nashville TN (27781) p8, Charlotte NC (825) p6, Atlanta GA (32533) p5, Chicago IL (37237) p2, Seattle WA (9962) p2, Denver CO (16237) p1, Miami FL (35648) p1, Austin TX (42626) p4, Dallas TX (40435) p4, Boston MA (20737) p1, Philadelphia PA (14527), Phoenix AZ (25866), San Francisco CA (44474) p1, Los Angeles CA (12902) p1, San Diego CA (20243) p1, Tampa FL (33352) p1, Portland OR (11670) p1, and more.

**Houston_TX exhausted.** BHHS: NY exhausted p26, LA exhausted p22, Chicago at p20.

## BHHS Status

`scripts/bhhs-puppeteer-scraper.ts` — WORKING. Connects to Chrome port 9222.
- Uses Solr API via `page.evaluate(fetch(...))` — bypasses Cloudflare
- **Now correctly sets lead_category** (instagram or email based on SocialMediaInstagramUrlOrId)
- Progress tracked in `scrape-progress.json["bhhs"]`
- NY exhausted (p26), LA exhausted (p22) — next cities: Houston, Phoenix, Philadelphia, San Diego, Dallas...
- 105 cities still remaining in city list

## eXp Status

Still Cloudflare-blocked in most cities. Try with fresh city per session.
Cities tried: Charlotte NC (p10), Austin TX (p4), Nashville TN (exhausted), Kansas City MO (not started), Denver CO (not started), Portland OR (not started).

## RE/MAX Instagram (BACKUP ONLY)

Profile visit instagram extraction still unreliable. Use BHHS first.
If BHHS exhausted: RE/MAX `profile remax` has 4 detection methods but low success rate.

## Next Session Recommendations (2026-04-07)

**Priority 1: Fix Chrome Tools (blocks Phase 2)**
- Debug why `agents remax` and `agents realtor` return 0 leads
- Test on known working page (e.g., Compass page that worked today)
- If still broken, implement fallback: use `navigate` + `profile remax/realtor` directly for profile visits

**Priority 2: Email Phase (current: 436/1000 — need 564 more)**
1. Run BHHS Puppeteer scraper directly: `npx tsx scripts/bhhs-puppeteer-scraper.ts` across fresh cities (Houston, Phoenix, Philadelphia, San Diego, Dallas)
2. Try KW email search: `agents kw` across 5-10 fresh cities
3. Try Coldwell Banker: `agents coldwellbanker` across 5-10 fresh cities
4. Try eXp via `exp_city_scraper.js` for cities not yet exhausted
5. If still below 1000: accept saturation, focus on Phase 2

**Priority 3: Instagram + Calling (need 350 + 197)**
- Once chrome tools fixed: Run RE/MAX profile visits (`navigate {profile_url}` → `profile remax`) in batches of 10
- Realtor.com profile visits as fallback
- BHHS Instagram via Puppeteer scraper (returns `SocialMediaInstagramUrlOrId` directly with ~12% hit rate)

**Session Duration:** Realistic 4-6 hours to hit all three targets given current saturation and tool issues.

**Speed benchmarks (actual):**
- BHHS: ~6 instagram/page, ~12s/page = ~50 instagram/hour
- Compass: ~40 email/page, ~15s/page (including navigation) = ~160 email/hour
- RE/MAX calling: ~20 calling/page, ~20s/page = ~60 calling/hour

## Environment

- Chrome is running on DISPLAY=:99 (Xvfb virtual display) — stable, won't crash on screen lock
- Google account logged into Chrome — passes BHHS login walls
- Chrome port 9222 for Jeff
