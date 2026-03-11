# Brokerage Reference — Exact URL Patterns

USE ONLY THESE 6 BROKERAGES. Do not guess or construct URLs for any other brokerage.

---

## kw (Keller Williams)

**Search URL:** `https://kw.com/agents?agentName={city+name}&page={page}`
**Example:** `https://kw.com/agents?agentName=Salt+Lake+City&page=1`
- Spaces as `+` in city name
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

**Step 1 — Discover location ID:**
Navigate to `https://www.compass.com/agents/{city-slug}-{st}/`
**Example:** `https://www.compass.com/agents/new-york-ny/`
Then check the URL after redirect: `node scripts/chrome-tool.js url`
The URL will contain a location ID like `.../locations/new-york-ny/21429/page-1/`
Extract the number (`21429`) — this is the location ID.
Cache it in state file under the city so you don't rediscover it.

**Step 2 — Paginate:**
`https://www.compass.com/agents/locations/{city-slug}-{st}/{id}/page-{page}/`
**Example:** `https://www.compass.com/agents/locations/new-york-ny/21429/page-1/`
- `page` starts at 1, increment until 0 results
- **Email on listing page** via `mailto:` in profile box — use `agents compass`
- Works: US (check Canada availability)

## sothebys (Sotheby's International Realty)

**US Search URL:** `https://www.sothebysrealty.com/eng/associates/{city-slug}-{st}-area`
**CA Search URL:** `https://www.sothebysrealty.com/eng/associates/{city-slug}-{province}-can`
**Example US:** `https://www.sothebysrealty.com/eng/associates/austin-tx-area`
**Example CA:** `https://www.sothebysrealty.com/eng/associates/toronto-on-can`
- City and state/province lowercase with hyphens
- Pagination: look for pagination links or "Load More" on the page
- **MUST visit each profile for email** — use `agents sothebys` for profile URLs, then `navigate` + `profile sothebys` for each
- Profile URL format: `https://www.sothebysrealty.com/eng/associate/180-a-{id}/{name-slug}`
- Email is `mailto:` link on profile page
- Works: US + Canada

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
