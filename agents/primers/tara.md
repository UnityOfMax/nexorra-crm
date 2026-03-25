# Tara — Primer
Last run: 2026-03-25
Status: blocked — no accounts configured

## Current State
Attempted Instagram DM outreach run. Exited immediately at Step 1 — all 7 accounts in `agents/state/instagram-accounts.json` have empty usernames/passwords.

## Blocker
`agents/state/instagram-accounts.json` needs to be populated with real Instagram account credentials before any DMs can be sent.

## Next Steps
1. Max fills in credentials for up to 7 Instagram accounts in `agents/state/instagram-accounts.json`
2. Verify Chrome is running and connected (`node scripts/chrome-tool.js status`)
3. Re-run `/instagram-outreach` — will send up to 50 DMs per account (350 total)

## Notes
- DM template loaded: 3-message sequence (intro → loom link → CTA)
- Loom link source: `agents/state/sender-loom-config.json` (Stacey key)
- 0 DMs sent lifetime

## Today's Briefing

# Morning Briefing — 2026-03-24

## Vault: 395 leads, 0 clients, 1 research topics

## Yesterday's Digest
# Nexorra Digest — 2026-03-23

## Vault Stats
- 195 lead notes
- 0 client profiles



## Active Context
- All agents have access to ~/Obsidian/Nexorra/ via filesystem MCP
- Write findings to the vault using brain.writers.{department}()
- Read from vault to avoid re-querying DB for known information

*(Generated at 2026-03-24 09:55:04)*

*(See full briefing in Obsidian vault)*

