# Brokerage Reference Data

Load this file ONCE at session start. Do not reload per city.

## US Brokerages

| ID | Name | Search URL Pattern |
|---|---|---|
| `kw` | Keller Williams | `https://www.kw.com/kw/agents/search?location={city}%2C+{state}` |
| `remax` | RE/MAX | `https://www.remax.com/real-estate-agents/{city-slug}-{state-lower}` |
| `exp` | eXp Realty | `https://exprealty.com/agents/` (use search form) |
| `century21` | Century 21 | `https://www.century21.com/real-estate-agents/{city-slug}-{state-lower}-homes-for-sale/` |
| `coldwellbanker` | Coldwell Banker | `https://www.coldwellbanker.com/real-estate-agents/{city-slug}-{state-lower}` |
| `bhhs` | Berkshire Hathaway HomeServices | `https://www.bhhsrealtors.com/real-estate-agents` (use search form) |
| `compass` | Compass | `https://www.compass.com/agents/{state-lower}/{city-slug}/` |
| `howardhanna` | Howard Hanna | `https://www.howardhanna.com/Agent/Index?Query={city}%2C+{state}` |
| `sothebys` | Sotheby's International | `https://www.sothebysrealty.com/eng/associates/search?q={city}` |

## Canadian Brokerages

| ID | Name | Search URL Pattern |
|---|---|---|
| `royallepage` | Royal LePage | `https://www.royallepage.ca/en/find-an-agent/` (use search form) |
| `sutton` | Sutton Group | `https://www.sutton.com/find-an-agent` (use search form) |
| `remax_ca` | RE/MAX Canada | `https://www.remax.com/real-estate-agents/{city-slug}-{province-lower}` |

## URL Slug Rules

Lowercase, spaces to hyphens:
- "Los Angeles" → `los-angeles`
- "Salt Lake City" → `salt-lake-city`

Always set sort to alphabetical (name A-Z) before scraping — keeps pagination stable across sessions.
