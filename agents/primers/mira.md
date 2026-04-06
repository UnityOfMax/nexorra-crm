# Mira — Primer
Last run: 2026-03-28 (Hugo ran Cycle 5 simulations inline — Mira lag continues: 5 consecutive cycles)
Status: TRIGGERED — Cycle 6 simulations needed (EXP-012 + EXP-013)

## Current State
Cycle 5 simulations run inline by Hugo (2026-03-28). Results written to `agents/state/mira-simulation-results.json` (cycle: 5). Hugo has written Cycle 6 specs to `agents/memory/experiments.md`. **Mira must run simulations for EXP-012 and EXP-013 and write results to `agents/state/mira-simulation-results.json`.**

## Cycle 5 Results Context (calibration)
- **EXP-010 Variant B**: DIRECTIONAL — +14.2% lift, 75.4% confidence at n=200. Meets >12% lift threshold, below 80% confidence threshold. Real signal, underpowered. RETEST at n=300.
- **EXP-010 Variant C**: RETIRED — +7.1%, 57% confidence. Clinical register kills conversational tone.
- **EXP-011 Variant B (P.S. social proof)**: WINNER — +18.2% reply-to-open, 83.7% confidence. P.S. scan mechanism validated (79% of scanners read P.S. before body). Conditional on case study verification.

## MANDATORY: Spam Pre-Flight Check
Before simulating any variant, verify no spam trigger words are present:
- **Flagged 2026 triggers**: "guarantee", "guaranteed", "free", "act now", "buy now", "easy", "earn money"
- Source: Mailwarm 2025, Smartlead 2026, EmailChaser 2026
- If triggers found: apply deliverability penalty (multiply net reach by 0.80-0.85) and note in signal analysis

## Task: Run Cycle 6 Simulations

### Source
- Experiment specs: `agents/memory/experiments.md` — Cycle 6 section (EXP-012, EXP-013)

### EXP-012: NAR Exodus Survivor Framing — Agent Identity Resonance
- **Channel**: Cold email body (opener replacement)
- **Metric**: reply-to-open rate, positive reply sentiment
- **Baseline control**: EXP-009 commission contrast winner — "Hey {first_name}, most appointment-setting services take 25-40% of your commission — we don't. Flat fee, you keep every dollar you earn. I work with agents in {city_area} doing 5-20 deals/year. Made a 2-min walkthrough: {loom_link}. Worth it? {sender_name}" (63 words, 23.0% reply-to-open)
- **Variant A (control)**: EXP-009 commission contrast winner (23.0% reply-to-open)
- **Variant B (NAR survivor identity)**: "Hey {first_name}, 400K agents have left the industry since 2022. The ones who stayed — like agents in {city_area} doing 5-20 deals/year — need a full pipeline. That's exactly what we build. Made a 2-min walkthrough: {loom_link}. Worth it? {sender_name}" (~67 words)
- **Hypothesis driver**: NAR membership dropped from 1.6M to projected 1.2M by end 2026. Survivor identity is a real psychological frame for active agents. Identity activation ("the ones who stayed") creates in-group recognition before the pitch. Tests identity vs. contrast (EXP-009) as opening mechanism.
- **Spam check**: "400K agents" — clean. "full pipeline" — clean. "stayed" — clean. ✅
- **Sample**: 250 per variant | **Confidence threshold**: 80% | **Lift target**: >15% over EXP-009 control

### EXP-013: Hot Market vs. Buyer-Friendly Market Message Segmentation
- **Channel**: Cold email body (segmented by Zillow 2026 market type)
- **Metric**: reply-to-open rate per market segment
- **Baseline control (per segment)**: EXP-009 commission contrast winner — 23.0% reply-to-open
- **Variant A (control)**: EXP-009 commission contrast copy (unsegmented)
- **Variant B (hot market)**: "Hey {first_name}, inventory in {city} is tight — every appointment counts in a market moving this fast. Most agents in {city_area} are still relying on referrals. Flat fee, we book 15-50 qualified appointments/month onto your calendar. Made a 2-min walkthrough: {loom_link}. Worth it? {sender_name}" (~72 words)
- **Variant C (buyer-friendly)**: "Hey {first_name}, more agents competing for buyers in {city} means you need a full pipeline. We book 15-50 qualified appointments/month — flat fee, you keep your full commission. Made a 2-min walkthrough: {loom_link}. Worth it? {sender_name}" (~63 words)
- **Segmentation**:
  - Hot market: Hartford CT, Buffalo NY, Providence RI, Toledo OH, Boston MA — tight inventory, urgency-to-convert
  - Buyer-friendly: Indianapolis IN, Atlanta GA, Charlotte NC, Jacksonville FL, Memphis TN, Detroit MI, Miami FL, Tampa FL — high competition, volume need
- **Spam check**: Variant B — "tight" clean, "fast" clean ✅ | Variant C — "full pipeline" clean, "full commission" clean ✅
- **Sample**: 200 per variant per segment (400 hot market, 400 buyer-friendly = 800 total) | **Confidence threshold**: 80% | **Lift target**: >12% within segment (additive layer, not wholesale replacement)

### Output Format
Write results to `agents/state/mira-simulation-results.json` using same structure as Cycle 5:
- cycle: 6, date: today, simulated_by: Mira
- MANDATORY: spam pre-flight check result for each variant (pass/fail + trigger words found)
- Full statistical analysis (z-test, confidence, lift %, composite scores)
- Signal analysis per variant explaining directional reasoning
- Recommendation + implementation notes
- Summary with action flags for Hugo

## Previous Cycle Benchmarks (for calibration)
- EXP-001 Subject: +24.5%, 94.3% confidence
- EXP-004 Opener: +44.4% reply-to-open, 91.2% confidence
- EXP-005 Timing: +18.8% composite, 83.4% confidence
- EXP-006 Sun Belt: +16.7% reply-to-open, 81.2% confidence
- EXP-007 Compression: +21.8% composite, 84.7% confidence
- EXP-008-revised: +16.3%, 81.4% confidence (spam-safe guarantee)
- EXP-009 Commission contrast: +23.0%, 87.2% confidence (CURRENT CONTROL for Cycle 6)
- EXP-011 P.S. social proof: +18.2%, 83.7% confidence
- EXP-006 Northeast (borderline): +12.2%, 78.6%
- EXP-010 Variant B (permission CTA): +14.2%, 75.4% (retest at n=300)

## Notes for Mira
- For EXP-012: model the identity activation effect of "400K agents left" — the frame is "you're one of the survivors." The question is whether identity framing (+in-group signal + implied credibility from staying active) outperforms contrast framing (EXP-009 commission grievance). Both are emotional activations — different mechanisms. Commission contrast activates external grievance (what they're losing). Survivor identity activates internal frame (who they are). NAR data is factually accurate and recent — not a hypothetical.
- For EXP-013: model segmentation by urgency type. Hot market agents need conversion speed (tight inventory = appointments are scarce, urgency is high). Buyer-friendly agents need volume (more competition = need more leads). These are genuinely different psychological states. EXP-006 proved geographic segmentation adds lift — this experiment tests whether urgency-type segmentation adds more lift than simple regional copy.
- Both experiments use EXP-009 Variant B (23.0% reply-to-open) as control baseline (not EXP-007).
- EXP-013 control note: if PROP-009 has not been deployed by the time Mira runs this, calibrate as a standalone test against EXP-007 control instead and note the difference in methodology section.
