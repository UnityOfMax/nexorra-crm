# Brokerage Reference — Exact URL Patterns

USE ONLY THESE 6 BROKERAGES. Do not guess or construct URLs for any other brokerage.

---

## kw (Keller Williams)

**Search URL:** `https://kw.com/agents?location={City}%2C+{ST}&page={page}`
**Example:** `https://kw.com/agents?location=Houston%2C+TX&page=1`
- Use `location=` param (NOT `agentName=` which searches by name not city)
- City and state URL-encoded with `%2C` for comma and `+` for spaces
- `page` starts at 1, increment until 0 results
- **Email on listing page** — use `agents kw`
- Works: US + Canada

## exp (eXp Realty)

**Search URL:** `https://www.exprealty.com/agents-search?page={page}&country={country}&m=f&location={City}%2C+{ST}`
**Example:** `https://www.exprealty.com/agents-search?page=1&country=US&m=f&location=Austin%2C+TX`
- `country` = `US` or `CA`
- `location` = "City, ST" with comma as `%2C` and space as `+`
- `page` starts at 1, increment until 0 results
- **MUST visit each profile for email** — use `agents exp` for profile URLs, then `navigate` + `profile exp` for each
- Profile URL format: `https://www.exprealty.com/agents-search/{Name}_{uuid}`
- **Cloudflare protection:** eXp uses Cloudflare. Navigate to `https://www.exprealty.com` first and wait 8s to get cookies, THEN navigate to the agent search URL. This bypasses the challenge.
- Works: US + Canada

## coldwellbanker (Coldwell Banker) — US ONLY

**Search URL:** `https://www.coldwellbanker.com/city/{st}/{city-slug}/agents`
**Example:** `https://www.coldwellbanker.com/city/tx/austin/agents`
**Example:** `https://www.coldwellbanker.com/city/ny/new-york/agents`
- `st` = 2-letter state abbreviation, lowercase
- `city-slug` = city name, lowercase, spaces as hyphens
- Pagination: look for next page links or page number links on the page
- **Email on listing page** via `mailto:` in Contact section — use `agents coldwellbanker`
- **US ONLY** — skip this brokerage for Canadian cities

## bhhs (Berkshire Hathaway HomeServices)

**Search URL:** `https://www.bhhs.com/agent-search-results?city={City}%2C+{ST}%2C+{Country}`
**Example US:** `https://www.bhhs.com/agent-search-results?city=New+York%2C+NY%2C+USA`
**Example CA:** `https://www.bhhs.com/agent-search-results?city=Toronto%2C+ON%2C+Canada`
- City, state/province, country — URL-encoded with `%2C` for commas and `+` for spaces
- Country = `USA` or `Canada`
- Pagination: look for pagination controls on search results page
- **MUST visit each profile for email** — use `agents bhhs` for profile URLs, then `navigate` + `profile bhhs` for each
- Email is `mailto:` link in contact details on profile page
- Works: US + Canada

## compass (Compass)

**Direct URL (IDs pre-discovered 2026-03-23):**
`https://www.compass.com/agents/locations/{city-slug}/{numeric-id}/page-{page}/`
**Example:** `https://www.compass.com/agents/locations/austin-tx/42626/page-1/`
- 40 agents per page
- **Email in JSON-LD** — use `agents compass` (reads `script[type="application/ld+json"]` @graph, no profile visits needed)
- Old redirect-based ID discovery no longer works (city URLs now redirect to generic /agents/)

**Known Location IDs:**
```
austin-tx: 42626       houston-tx: 4418        dallas-tx: 40435
new-york-ny: 21429     los-angeles-ca: 6580    san-francisco-ca: 12416
chicago-il: 40768      boston-ma: 12422        washington-dc: 24793
miami-fl: 12421        denver-co: 12424        seattle-wa: 14158
philadelphia-pa: 31493 raleigh-nc: 39870       nashville-tn: 27781
portland-or: 23044     sacramento-ca: 27040    orange-county-ca: 12420
jacksonville-fl: 44337 san-diego-ca: 12623     atlanta-ga: 42508
```
- Paginate with `page-2/`, `page-3/`, etc. Stop when 0 agents returned.
- Works: US only

## sothebys (Sotheby's International Realty)

**US Search URL:** `https://www.sothebysrealty.com/eng/associates/{city-slug}-{st}-usa`
**CA Search URL:** `https://www.sothebysrealty.com/eng/associates/{city-slug}-{province}-canada`
**Example US:** `https://www.sothebysrealty.com/eng/associates/houston-tx-usa`
**Example CA:** `https://www.sothebysrealty.com/eng/associates/toronto-on-canada`
- City and state/province lowercase with hyphens
- Country suffix: `-usa` for US, `-canada` for Canada (NOT `-area` or `-can`)
- Pagination: look for pagination links or "Load More" on the page
- **MUST visit each profile for email** — use `agents sothebys` for profile URLs, then `navigate` + `profile sothebys` for each
- Profile URL format: `https://www.sothebysrealty.com/eng/associate/180-a-{id}/{name-slug}`
- Email is `mailto:` link on profile page
- Works: US + Canada

---

## INSTAGRAM + CALLING LEAD BROKERAGES

These brokerages are for Instagram handles and phone numbers, NOT email leads.

## remax (RE/MAX) — Instagram + Phone Leads

**Search URL:** `https://www.remax.com/real-estate-agents/{city-slug}-{st}?searchQuery=%7B%22filters%22%3A%7B%7D%7D`
**Example:** `https://www.remax.com/real-estate-agents/houston-tx?searchQuery=%7B%22filters%22%3A%7B%7D%7D`
- `city-slug` = lowercase, spaces as hyphens. `st` = 2-letter lowercase.
- MUST visit each profile for Instagram handle and phone
- Use `agents remax` for profile URLs, then `navigate` + `profile remax` for each
- **Category logic (RE/MAX overlap rule):**
  - Has Instagram handle → `lead_category: 'instagram'` (even if also has phone)
  - Has phone but NO Instagram → `lead_category: 'calling'`
  - Has neither → skip
- Works: US + Canada

## century21 (Century 21) — Calling Leads Only

**Search URL:** `https://www.century21.com/agent/list/city/{st}/{city-slug}?page={page}`
**Example:** `https://www.century21.com/agent/list/city/tx/houston?page=1`
- State = 2-letter lowercase. City = lowercase, spaces as hyphens.
- Phone on listing page — use the phone icon number (NOT speech bubble icon)
- Use `agents century21` — returns names + mobile phones directly
- All leads → `lead_category: 'calling'`
- No Instagram available on this brokerage
- Works: US only

---

## URL Construction Rules

- **Slugs** (in URL path): lowercase, spaces→hyphens (e.g., "Salt Lake City" → `salt-lake-city`)
- **Query params**: spaces→`+` (e.g., "Salt Lake City" → `Salt+Lake+City`)
- **Encoded commas**: `%2C` (e.g., "Austin, TX" → `Austin%2C+TX`)
- Always lowercase state abbreviations in URL paths

## Profile-Visit Brokerages

| Brokerage | Listing Command | Profile Command |
|-----------|----------------|-----------------|
| exp | `agents exp` → profile URLs | `profile exp` → email |
| bhhs | `agents bhhs` → profile URLs | `profile bhhs` → email |
| sothebys | `agents sothebys` → profile URLs | `profile sothebys` → email |

## Listing-Only Brokerages (faster — email on listing page)

| Brokerage | Command |
|-----------|---------|
| kw | `agents kw` → full data with email |
| coldwellbanker | `agents coldwellbanker` → full data with email |
| compass | `agents compass` → full data with email |
