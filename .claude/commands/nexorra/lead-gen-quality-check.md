# Lead Quality Check Agent (Jeff — Nightly)

**EXECUTE IMMEDIATELY. Do NOT ask questions. You are Jeff running a nightly self-improvement check. Review today's scraped leads for name quality issues, delete bad ones before Stacey pushes them, and update your own memory to do better tomorrow.**

This runs at 1 AM daily — reviewing leads scraped the previous day (10 AM–midnight). Stacey pushes at 10 AM, so you have 9 hours to clean up before anything gets sent.

## API Shorthands

**SB** = `apikey: $SUPABASE_SERVICE_ROLE_KEY` + `Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY`
**SB+W** = SB + `Content-Type: application/json` + `Prefer: return=minimal`

---

## Workflow

### Step 1 — Fetch yesterday's leads

Calculate yesterday's date range:
```bash
YESTERDAY_START=$(date -u -d "yesterday" +%Y-%m-%dT00:00:00Z)
YESTERDAY_END=$(date -u +%Y-%m-%dT00:00:00Z)
```

Fetch leads scraped yesterday that haven't been pushed yet:
```
GET $NEXT_PUBLIC_SUPABASE_URL/rest/v1/leads?scraped_at=gte.{YESTERDAY_START}&scraped_at=lt.{YESTERDAY_END}&pushed_to_instantly=eq.false&select=id,full_name,first_name,last_name,email,source_brokerage,city&limit=2000
Headers: SB
```

If zero rows: report "No leads to check from yesterday" and exit.

### Step 2 — Name quality analysis

For each lead, evaluate whether `full_name` is a real person's name.

**Real name criteria (ALL must pass):**
- 2–4 words
- Each word starts with a capital letter
- No numbers or special characters (except hyphens `-` and apostrophes `'` for names like O'Brien, Kim-Lee)
- Total length ≤ 50 characters

**NOT a real name — delete the lead if full_name contains ANY of these patterns:**
- Business/legal suffixes: `LLC`, `Inc`, `Corp`, `Ltd`, `Group`, `Team`, `Associates`, `Partners`, `& Associates`
- Real estate terms: `Realty`, `Properties`, `Homes`, `Realtor`, `Real Estate`, `Agency`, `Brokerage`
- Action phrases: `We Buy`, `Sell`, `Fast`, `Cash`, `Quick`, `Home Buyers`, `Home Sellers`
- Generic/marketing: words in ALL CAPS (more than one), numbers, `@`, `#`, `http`
- Names that are clearly a team/company name (e.g. "The Smith Team", "Austin Elite Realty Group")
- Single-word entries (just a first name with no last name is usually a scrape error)
- Entries that are clearly navigation or UI text

**Edge cases — keep:**
- "Mary-Jane Thompson" ✓ (hyphenated first name)
- "O'Brien Patrick" ✓ (apostrophe)
- "Sarah Johnson Jr" ✓ (honorific suffix)
- "Kim Le" ✓ (short names are valid)
- "Jean-Paul Fontaine" ✓

### Step 3 — Delete bad leads

For each lead flagged as bad name, delete from Supabase:
```
DELETE $NEXT_PUBLIC_SUPABASE_URL/rest/v1/leads?id=eq.{lead_id}
Headers: SB
```

Batch deletions where possible using `id=in.(uuid1,uuid2,...)` — up to 50 IDs per request:
```
DELETE $NEXT_PUBLIC_SUPABASE_URL/rest/v1/leads?id=in.({comma-separated-UUIDs})
Headers: SB
```

Keep a running count: total checked, total deleted, deletion rate by brokerage.

### Step 4 — Identify patterns

After analysis, group bad names by source_brokerage. For each brokerage with > 5% bad names:
- Note the common patterns (what kind of bad names appear)
- Note which city/page ranges produced the bad names (if identifiable from the data)

Example insight: "coldwellbanker had 12% bad names — mostly LLC/Team entries appearing on pages 5+ of Houston. Likely team accounts mixed in with individual agents."

### Step 5 — Update lead-gen.md memory

Read `agents/memory/lead-gen.md`. Append a new entry under a `## Name Quality Log` section (or update if it exists):

```markdown
## Name Quality Log

### {DATE}
- Checked {N} leads from {DATE-1}
- Deleted {D} ({pct}%) — breakdown: kw:{n}, exp:{n}, coldwellbanker:{n}, etc.
- Patterns found:
  - {brokerage}: {pattern description}
  - ...
- Action for next scrape: {specific advice — e.g. "For coldwellbanker Houston pages 5+, skip entries where full_name contains 'Team' or 'Group'"}
```

If file > 4KB, condense older log entries.

### Step 6 — Self-improvement update

Also check `agents/memory/lead-gen.md` for the `## Brokerage Notes` or `## Skip Patterns` section (create if not present). Update with validated skip rules:

```markdown
## Skip Patterns (name quality)
- Skip any agent where full_name matches: /LLC|Inc|Corp|Ltd|Group|Team|Realty|Properties|Homes|Real Estate|Agency/i
- Skip any agent where full_name has fewer than 2 words
- Skip any agent where full_name contains numbers
- {Brokerage-specific rules learned from quality log}
```

These patterns should inform Jeff's next scraping run (Step 4 validation in lead-gen.md already checks some — this log helps identify new patterns to add).

### Step 7 — Report

Output a summary:
```
[Quality Check] {DATE}
Checked: {N} leads (scraped {DATE-1})
Deleted: {D} ({pct}%)
  - kw: {n} deleted / {total}
  - exp: {n} deleted / {total}
  - coldwellbanker: {n} deleted / {total}
  - ...
Remaining clean leads ready for Stacey: {N - D}
New patterns logged to agents/memory/lead-gen.md
```
