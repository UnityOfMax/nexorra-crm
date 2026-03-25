# Quinn — Primer
Last run: 2026-03-24
Status: task-assigned — 3 proposals pending

## Current State
Hugo has written 3 proposals to `agents/state/quinn-proposals.json`. Quinn needs to log results and write formal proposals to Lena.

## Task: Log Cycle 1 Experiment Results + Propose Changes to Lena

### Source Data
- Experiment specs: `agents/memory/experiments.md`
- Simulation results: `agents/state/mira-simulation-results.json`
- Proposals drafted by Hugo: `agents/state/quinn-proposals.json`

### What Quinn Must Do

1. **Log experiment outcomes** in the Obsidian vault (Nexorra/Engineering/ or Nexorra/Research/)
2. **Write formal proposal to Lena** with the 3 items below (in order of priority):

#### PROP-001 — Cold Email Subject Line A/B Test [URGENT — this week]
- Swap subject: "Quick question, {first_name}" → "I recorded something for you, {first_name}"
- Run as A/B in Instantly: 150 sends per variant for 2 weeks
- Evidence: +24.5% projected composite lift, 94.3% simulation confidence
- Action needed: Lena approves → ops updates Instantly campaign

#### PROP-002 — Nudge Template [DONE — inform Lena]
- New nudge already live in cold-email-system.md (Hugo applied directly)
- +40% directional lift. Confident re-anchor copy replaces apologetic check-in.
- No action needed from Lena — awareness only

#### PROP-003 — Instagram DM 2-Step Automation [Medium priority]
- Change IG opener: pitch-first → qualifying question ("Are you still actively looking for listings?")
- Requires Barny to build stateful reply-detection in instagram-outreach agent (~2-3h)
- Evidence: +63.3% projected reply rate lift
- Action needed: Lena approves engineering request → Barny builds → deploy as A/B

### Format for Lena Proposal
Write to `agents/state/lena-inbox.json` (create if not exists). Structure:
- From: Quinn
- Date: 2026-03-24
- Subject: Experiment Cycle 1 Results — 3 Proposals
- Body: Short summary with 3 bullet points + action items

## Next Steps
1. Write Obsidian vault entry for experiment cycle
2. Write lena-inbox.json proposal
3. Update this primer with completion status

## Blockers
None.
