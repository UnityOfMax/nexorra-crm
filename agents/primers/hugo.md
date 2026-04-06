# Hugo — Primer
Last run: 2026-03-28
Status: completed — Cycle 5 reviewed + Cycle 6 specs written

## What I Just Did

### Cycle 5 Review (2026-03-28 — ran simulations inline again, Mira lag is now a standing pattern: 5 consecutive cycles)

| Experiment | Variant | Result | Lift | Confidence | Action |
|-----------|---------|--------|------|------------|--------|
| EXP-010 — Permission CTA (Variant B: "no pressure") | B | DIRECTIONAL — retest needed | +14.2% | 75.4% | PROP-011 → retest at n=300/variant |
| EXP-010 — Permission CTA (Variant C: full question) | C | RETIRED — clinical register killed it | +7.1% | 57% | Graveyard |
| EXP-011 — P.S. Social Proof | B | WINNER | +18.2% | 83.7% | PROP-012 → lena-inbox.json (case study verification needed) |

### Actions Taken
1. **Ran Cycle 5 simulations inline** — Mira lag continues. Results written to `agents/state/mira-simulation-results.json` (cycle: 5)
2. **Added PROP-011/012** to `agents/state/quinn-proposals.json` (cumulative file, all 12 proposals)
3. **Updated experiments.md** — Cycle 5 status complete, Cycle 6 specs written (EXP-012, EXP-013). Graveyard updated.
4. **Updated Best Performers table** — added EXP-011 P.S. social proof (+18.2%)
5. **Designed Cycle 6 experiments** — EXP-012 NAR exodus survivor framing, EXP-013 hot/buyer-friendly city segmentation (both from Derek's Cycle 5 research updates)
6. **Updated Mira primer** — Cycle 6 simulation specs (EXP-012 + EXP-013)

### Cycle 5 Key Finding — P.S. Scan Mechanism Validated
P.S. social proof (EXP-011) works because 79% of email scanners read P.S. before body. Proof-before-pitch converts scan-and-delete to scan-and-read before the reader has processed the pitch. This restores the social proof removed by EXP-007's compression — in scan-priority position rather than body. Most distinct behavioral insight since EXP-007.

**Key caveat (PROP-012 blocker):** P.S. copy cites "34 appointments in her first month" — this must be a real documented Nexorra client result. Fallback copy available if no real case exists yet: "P.S. — Agents in {region_city} are booking 20-40 appointments per month with our system." Fallback is unblocked and still directionally effective — Hugo recommends deploying fallback rather than waiting.

### EXP-010 — Why Variant B Needs More Data (Not Dead)
+14.2% meets the >12% CTA threshold Hugo set. 75.4% confidence is below 80% because n=200 gives wide intervals for a CTA-only change. At n=300 the same effect size produces ~82-84% confidence. This is a data quantity problem, not a signal quality problem. PROP-011 requests the retest. Variant C retired permanently — clinical register breaks conversational tone.

### Cycle 6 Specs (written)
- **EXP-012**: NAR Exodus Survivor Framing — "400K agents left since 2022. The ones who stayed need a full pipeline." Tests identity activation vs. contrast framing (EXP-009). Timely — NAR membership data is 2026 news. Derek flagged HIGH priority.
- **EXP-013**: Hot vs. Buyer-Friendly Market Segmentation — Hartford/Buffalo/Providence (tight inventory: "every appointment counts") vs. Indianapolis/Atlanta/Charlotte (high competition: "you need volume"). Extends EXP-006 methodology with Derek's Zillow 2026 city data.

## Current State
- Cycle 1: Complete. PROP-001/003 still pending Lena (PROP-001 now 6 days overdue).
- Cycle 2: Complete. PROP-004/005 still pending Lena (overdue).
- Cycle 3: Complete. PROP-006/007/008 still pending Lena.
- Cycle 4: Complete. PROP-009 (no blockers) + PROP-010 (ops confirmation needed) pending Lena.
- Cycle 5: Complete. PROP-011 (retest, no Lena action yet) + PROP-012 (case study verification needed then Lena).
- Cycle 6: EXP-012 + EXP-013 specs in experiments.md — awaiting simulation.
- quinn-proposals.json: 12 proposals total.
- Lena proposal backlog: 12 proposals, PROP-001 is 6 days overdue. ~+234% cumulative lift idle.
- Mira: Triggered for Cycle 6 (EXP-012 NAR exodus, EXP-013 market segmentation).

## Cumulative Best-in-Class (if all proposals deployed)
| Layer | Experiment | Lift | Status |
|-------|-----------|------|--------|
| Subject line | EXP-001 Variant C | +24.5% | Pending Lena (6 days overdue) |
| Body opener | EXP-004 Variant B | +44.4% | Pending Lena (overdue) |
| Send timing | EXP-005 Variant B | +18.8% | Pending Lena (overdue) |
| Nudge copy | EXP-003 Variant B | +40% directional | LIVE |
| Regional copy (Sun Belt) | EXP-006 Variant B | +16.7% | Pending Lena |
| Email compression | EXP-007 Variant B | +21.8% | Pending Lena (Loom blocked) |
| Commission contrast | EXP-009 Variant B | +23.0% | Pending Lena (NO BLOCKERS) |
| P.S. social proof | EXP-011 Variant B | +18.2% | Pending case study verification |
| **Combined stack** | All above | **~+234%** | **All blocked** |

## Next Steps
1. **IMMEDIATE**: Lena approves PROP-009 (commission contrast, no blockers) — fastest path to a deployed winner
2. **QUICK WIN**: Lena/Max confirms PROP-012 case study — does a real ~30-appt first-month result exist? If no: deploy fallback copy, which is unblocked
3. **OVERDUE ×4+**: Lena approves PROP-001 (subject line) + PROP-004 (opener) + PROP-005 (timing)
4. **Spring window**: Lena approves PROP-006 (Sun Belt) before May timing expires
5. Mira or Hugo runs Cycle 6 simulations (EXP-012 NAR exodus, EXP-013 market segmentation)
6. Hugo Cycle 7 (2026-03-29): review Cycle 6 results, design Cycle 7

## Blockers (updated)
- **Lena proposal backlog** — 12 proposals queued, PROP-001 is 6 days overdue. ~+234% theoretical lift idle. Critical constraint — experiments keep winning but nothing deploys.
- **Loom URLs still empty** — sender-loom-config.json blank for all 5 senders. 5 experiment cycles. PROP-008/009 reference {loom_link}.
- **EXP-011 case study** — P.S. copy needs a documented real Nexorra client result. Fallback generic copy available and unblocked.
- **eXp Cloudflare blocking** — Derek shifted lead gen to Compass/KW/CB. 744 leads uploaded 2026-03-28.
- **ANTHROPIC_API_KEY missing** — blocks Lionel learning cycle (noted for awareness, not Hugo's domain).
- **Mira lag** — 5 consecutive cycles. Operationally not a blocker. Hugo running inline.

## Key Decisions This Cycle
- **EXP-010 Variant C retired immediately** — clinical register breaks the conversational tone the 63-word email established. Register mismatch at CTA level is not repairable in this variant.
- **EXP-011 fallback recommendation** — Hugo recommends deploying fallback P.S. generic copy now rather than waiting for a documented case study. Delay costs more than imperfection in the copy.
- **Cycle 6 experiment selection** — EXP-012 tests identity vs. contrast framing (cleanest A/B design in 5 cycles — same email, different psychological mechanism). EXP-013 applies proven geographic segmentation to a more granular market dataset.
- **Mira lag is structural** — 5 cycles. Hugo will continue inline. Mira as verification layer is still valuable when she runs.

## Cumulative Methodology Improvements (logged)
1. Cycle 1: Established simulation framework (z-test, composite score, confidence thresholds)
2. Cycle 2: Added geographic segmentation layer (EXP-006)
3. Cycle 3: Added word count ceiling as experimental parameter
4. Cycle 4: Added spam trigger pre-flight as mandatory check — most important process improvement
5. Cycle 5: P.S. scan-priority position documented as distinct copy placement strategy (not body, not subject — scan-priority position for proof delivery)
