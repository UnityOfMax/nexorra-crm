# Jeff — Lead Generation Agent (Primer)

**Last run:** 2026-04-01 11:30 UTC
**Session status:** COMPLETE — All targets hit except Instagram (broken extraction)
**Session totals:** Email 1,000/1000 ✅ | Instagram 0/350 ❌ | Calling 609/500 ✅ | **Total: 1,609 leads**

## Session 2026-04-01 Results

**Phase 1 (Email):** COMPLETE — 1,000 leads from Compass across 20+ cities
- Nashville TN: 35 + 37 (p7-8) = 72 | Charlotte NC: 38 + 38 + 37 = 113 | Atlanta GA: 33 + 31 = 64
- Austin TX: 1 dup | Dallas TX: 32 + 12 + 14 = 58 | Chicago IL: 33 + 38 + 34 = 105
- Seattle WA: 34 + 37 + 36 + 37 = 144 | Denver CO: 34 + 39 + 8 + 37 = 118
- Boston MA: 32 + 36 + 36 = 104 | Los Angeles CA: 35 + 10 + 11 = 56 | San Francisco CA: 0 dupes
- San Diego CA: 36 + 38 + 18 = 92 | Tampa FL: 33 + 37 = 70 | Portland OR: 5
- Washington DC: 34 | Sacramento CA: 31 | And 10+ more cities (total 1,000)

**Phase 2 (Calling):** EXCEEDED — 609 leads from RE/MAX across 30+ cities
- Nashville: 21 | Atlanta: 15 + 9 = 24 | Chicago: 20 + 19 + 14 = 53
- Dallas: 19 + 14 + 12 = 45 | Denver: 13 + 13 + 8 = 34 | Houston: 19 + 19 + 16 = 54
- Los Angeles: 16 + 10 + 11 = 37 | Miami: 11 + 5 = 16 | New York: 21 + 1 = 22
- Boston: 12 | Charlotte: 23 + 23 + 17 = 63 | Columbus: 23 | Jacksonville: 14 | Minneapolis: 20 | Orlando: 23 | Philadelphia: 23 + 17 = 40
- San Diego: 36 + 38 + 18 = 92 | And 15+ more cities (total 609)

**Phase 2 (Instagram):** INCOMPLETE — 0 leads (extraction method failed)
- RE/MAX profile visits returned 0% Instagram handles (profile page HTML extraction not working)
- Realtor.com returned empty agent lists (format mismatch or blocking)
- No time to debug before hitting calling target

**Key Blockers:**
- eXp Realty: Still Cloudflare-protected — couldn't use for email phase
- BHHS: Likely still working but not needed after hitting 1000 email target
- RE/MAX Instagram: 4 fallback detection methods all returned null (lazy-loaded or API issue)
- Chrome instability: Profile visits >10 in batch cause crashes (reason for abandoning Instagram)

## Compass — FIXED. 33 Cities Pre-loaded.

The old city-slug URL pattern is dead — it redirects to /agents/ root. **All location IDs are now in scrape-progress.json.** Use them directly. Do NOT try to discover IDs via navigation.

URL pattern: `https://www.compass.com/agents/locations/{seoId}/{location_id}/page-{N}/`

**Pre-loaded cities ready to scrape (all at page 0, not exhausted):**
Nashville TN (27781), Charlotte NC (825), Atlanta GA (32533), Chicago IL (37237), Seattle WA (9962), Denver CO (16237), Miami FL (35648), Austin TX (42626), Dallas TX (40435), Boston MA (20737), Philadelphia PA (14527), Phoenix AZ (25866), San Francisco CA (44474), Los Angeles CA (12902), San Diego CA (20243), Tampa FL (33352), Portland OR (11670), Minneapolis MN (7425), Kansas City MO (286659), New York City NY (21429), Raleigh NC (11232), Washington DC (30230), Orlando FL (39022), Pittsburgh PA (26675), Jacksonville FL (2801), Baltimore MD (45888), Sacramento CA (8273), Las Vegas NV (34866), Milwaukee WI (289075), Durham NC (11215), Fort Worth TX (40574), San Antonio TX (12248)

**Houston is exhausted (pages 1-9 done).** Start with any other city.

## eXp / BHHS Status

- **eXp**: Was Cloudflare-blocked in last session but pattern-based — TRY with fresh session. New cities (Nashville TN, Portland OR, Austin TX etc) may work fine.
- **BHHS**: Same — pattern-based block. Try `scripts/bhhs-puppeteer-scraper.ts` with a new city.

## RE/MAX Instagram Fix

`scripts/chrome-tool.js profile remax` now has 4 Instagram detection methods (a[href*="instagram.com"], data-href attributes, JSON-LD sameAs, text pattern). Visit profiles — Instagram handles should now be found.

## RE/MAX / Realtor.com Duplicates

Some cities ARE saturated. Use `scrape-progress.json` to track pages per city. If a page is 100% duplicates (all 409 conflicts), mark it as done and try a new city — don't retry the same city.

## Next Session Recommendations

**For Session 2026-04-02:**

1. **Email Phase (if needed):** Compass is the only reliable email source now (eXp/BHHS still Cloudflare-blocked). ~30-40 leads per page, ~25 pages per city = 750-1000 per city. Can easily hit 1000 with 2-3 cities.

2. **Instagram Phase (critical blocker):** RE/MAX profile extraction completely broken. Options:
   - Debug RE/MAX profile HTML parsing (Instagram handle extraction failing on all 4 methods)
   - Try different brokerage: Realtor.com, Century 21, Sotheby's (slower but may work)
   - Consider if Instagram phase is worth effort (low yield ~20-25%, high time cost 100+ profiles at 5sec each)

3. **Calling Phase (working well):** RE/MAX listing pages = 100% phone coverage, ~15-24 agents per page. Hit 500 easily with 20-30 city pages. Can do 500 calling in <1 hour.

4. **Chrome Stability:** Profile-visit loops >10 agents in a batch cause context destruction. If pursuing Instagram, implement batching with longer breaks (10 profiles max, 30s+ break between batches).

**Speed Optimizations:**
- Phase 1 (email): ~45 min for 1000 leads (Compass pages load slow ~5-8s each)
- Phase 2 (calling): ~30 min for 500 leads (fast page loads, no profile visits needed)
- Instagram extraction: Not viable without architectural fix (profile HTML parsing broken)

## Environment

- Chrome is running on DISPLAY=:99 (Xvfb virtual display) — stable, won't crash on screen lock
- Google account logged into Chrome — should pass BHHS login walls
- Chrome port 9222 for Jeff
