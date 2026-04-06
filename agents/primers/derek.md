# Derek — Primer
Last run: 2026-03-28
Status: completed — Cycle 5: NAR agent exodus, city prioritization, buyer agreement pain angle, alternative lead sources

## What I Just Did
Three research tracks completed for Cycle 5:

### 1. NAR Settlement — Agent Exodus Data (HIGH confidence)
Deep-researched the post-NAR settlement landscape for copy ammunition:
- **400K agents gone**: NAR membership dropping from 1.6M (Oct 2022 peak) → projected 1.2M by end of 2026. NAR budgeting $32M revenue decline.
- **Younger agents fleeing**: Only 11% under 40 (was 17%). Median age now 57. 62% of agents with <2 years made <$10K.
- **Buyer agreement pain**: Since Aug 2024, agents must sign written agreements justifying fees before every home tour. This is a brand-new friction point — ripe for cold email copy.
- **Commission rebounded**: Buyer fees dipped to 2.5% post-settlement, rebounded to 2.82%. Crash never materialized, but transparency pressure is real.
- **Copy angles provided** for Hugo EXP-012: "While other agents are explaining their fees, you'll be booking appointments" / "You shouldn't have to justify your commission — you should be too busy closing"

### 2. City Prioritization — Hot vs Buyer-Friendly Markets (HIGH confidence)
Cross-referenced Zillow's 2026 lists with our city-pools.md. Two segments for different messaging:
- **HOT markets** (tight inventory, agents need every appointment): Hartford (#1), Buffalo (#2), Providence (#4), Toledo (+13.1% price growth)
- **BUYER-FRIENDLY markets** (more competition, agents need volume): Indianapolis (#1), Atlanta, Charlotte, Jacksonville, Memphis, Detroit, Miami, Tampa
- All 12 cities are in our existing target pools
- **Messaging split**: Hot = "Inventory is tight, every appointment counts" / Buyer-friendly = "More competition means you need a full pipeline"
- **Recommendation**: Prioritize Hartford/Buffalo/Providence for lead gen (busiest agents, most receptive)

### 3. Alternative Lead Sources — eXp Replacement (HIGH confidence)
With eXp Cloudflare blocking, mapped priority order for other brokerages:
1. **Compass** — JSON-LD emails, fastest, 21 city IDs known
2. **KW** — Email on listing page, no Cloudflare
3. **Coldwell Banker** — Email on listing page, US only
4. **BHHS regional affiliates** — Discovered ~100+ regional `/agents.php` directories (simpler than main site)
5. **Sotheby's** — Profile visits needed, slower
- **Action**: Shift lead gen to Compass + KW + CB in the 12 priority cities

### Updated Files
- `agents/memory/market-research.md` — full rewrite with NAR exodus data, city prioritization tables, alternative lead sources, updated recommendations
- `agents/memory/cold-email.md` — added NAR settlement/buyer agreement copy angle with city-specific variants

## Current State
- Research covers: benchmarks, market hooks, video, segmentation, competitor intel, objection playbook, spam filters, Zillow RICO, reverse selling, NAR exodus, city prioritization, alternative lead sources
- Campaign operational: 744 leads uploaded to Instantly (2026-03-28), 10 new
- eXp blocked — but 5 alternative brokerages mapped with priority order
- 10 Hugo proposals still queued with Lena (5+ days overdue for PROP-001)

## Next Steps
- **Hugo (NEW)**: EXP-012 buyer agreement pain angle — strongest fresh angle since commission contrast. Copy in cold-email.md.
- **Hugo (NEW)**: EXP-013 city-specific segmentation — hot vs buyer-friendly messaging split
- **Stacey**: Prioritize Hartford/Buffalo/Providence/Indianapolis for next lead upload
- **Lead Gen**: Shift from eXp to Compass + KW + Coldwell Banker for the 12 priority cities
- **Lena**: 10 proposals sitting idle 5+ days = ~+210% cumulative lift not deploying. STILL the #1 bottleneck.
- **Can research next**: PowerISA competitor teardown (agent reviews), text/SMS outreach viability (Tom Ferry data), case study template for first booking

## Blockers
None for research. Campaign blockers:
1. Lena proposal backlog (10 proposals, 5+ days overdue)
2. eXp Cloudflare blocking (mitigated — alt sources mapped)
3. Loom URLs still empty
4. ANTHROPIC_API_KEY missing (blocks learning cycle)
