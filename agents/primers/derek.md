# Derek — Primer
Last run: 2026-03-25
Status: completed

## What I Just Did
Proactive cold email optimization research. Diagnosed why Nexorra's campaign is at 0% booking rate (18 conversations, 9 rejections, 0 bookings). Findings written to `agents/memory/market-research.md`.

### Key Findings
1. **Loom videos not attached** — sender-loom-config.json is empty. The entire campaign architecture relies on Loom as the hook, but no video links are being sent. This is the #1 quick win. Personalized video emails get 3-5x higher reply rates (Intercom: +19%, Zendesk: 41.6% vs 1.3%).
2. **Opener lacks credibility** — "loved the way you work" generates complaints. Need brokerage-specific, verifiable context (city, brokerage name, nearby market results).
3. **Subject line generic** — "Quick question, {first_name}" is overused. Hugo's EXP-001 winner "I recorded something for you, {first_name}" shows +24.5% lift but depends on Loom being filled.
4. **No segmentation** — all leads get identical copy regardless of brokerage, city, or production level. Top performers micro-segment to <200 per list.
5. **38% open rate is actually good** — above industry avg (20.8%). The bottleneck is reply-to-booking conversion, not deliverability.

### Benchmarks Established
- B2B cold email avg reply rate: 3.43% (Instantly 2026)
- Top quartile: >5.5%, elite: >10.7%
- Optimal first email: <80 words, single CTA
- Best cadence: Monday send, Wednesday follow-up, 4-7 touchpoints

### Competitor Intel
- Most RE appointment-setting competitors are phone-based ISA ($7-15/hr)
- Lead gen platforms (Ylopo $295/mo, CINC $1,500/mo, BoomTown $3,000/mo) sell leads, not appointments
- Nexorra's "appointments on calendar" + guarantee positioning is genuinely differentiated
- But cold email doesn't convey this clearly enough

### Deliverables
- `agents/memory/market-research.md` — full research brief with 4 urgency-tiered recommendations
- 2 proposed email templates (Specific+Short, Timeline Hook) for Stacey/Hugo to test

## Current State
Research brief complete. Ready for next assignment.

## Next Steps
- Awaiting feedback from Stacey (Marketing) or Hugo (Experiments) on proposed email templates
- Can run deeper research on: city-specific market data for email personalization, competitor teardowns, YouTube content mining for sales objection handling
- Ready for Jeff to assign next research topic

## Blockers
None.
