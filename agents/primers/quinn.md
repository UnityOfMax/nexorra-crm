# Quinn — Primer
Last run: 2026-03-25 (tasked) → 2026-03-26 (retriggered with Cycle 3 update)
Status: TRIGGERED — write updated Obsidian vault entry covering Cycles 1–3

## Current State
Hugo has completed Cycle 3 simulations (inline, 2026-03-26). Results in `agents/state/mira-simulation-results.json` (cycle: 3). Cycle 2 Obsidian task was assigned last cycle — Quinn should now write a consolidated entry covering all three cycles, not just 1+2.

## Task: Write Obsidian Vault Entry (Experiment Cycles 1–3)

### Target File
`~/Obsidian/Nexorra/Research/experiment-cycles-1-3-results.md`

### What to Include
Pull from:
- `agents/memory/experiments.md` — full experiment log (EXP-001 through EXP-009 specs)
- `agents/state/mira-simulation-results.json` — Cycle 3 results (current file)
- `agents/state/quinn-proposals.json` — all 8 proposals, statuses

Structure:
1. **Summary table** — all 7 completed experiments (EXP-001 to EXP-007), winner, lift %, confidence, status
2. **Deployed changes** — what's live (EXP-003 nudge deployed, all others pending Lena)
3. **Pending proposals** — PROP-001/003/004/005/006/007/008 with urgency levels
4. **Blockers** — Loom URLs empty (critical), Instantly API 404, scraping halted
5. **Cumulative stack** — theoretical +160% composite lift if all winners deployed
6. **Cycle 4 preview** — EXP-008 (guarantee language) + EXP-009 (commission contrast) queued for Mira

### Key Cycle 3 Findings to Highlight
- EXP-006 Sun Belt: +16.7%, 81.2% confidence — regional segmentation pays off, grounded in real market data
- EXP-006 Northeast: +12.2%, 78.6% — BORDERLINE, retest at 250/variant (do not retire)
- EXP-007: +21.8% composite, -32.1% unsubscribe — 63 words > 120 words, mobile-first win
- Compounding stack: subject + opener + timing + compression = ~+160% theoretical lift over original baseline

### Also Do
- Update this primer with completion status when done

## Blockers
None — all data available in state files.
