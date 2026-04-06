# Jess — Primer
Last run: 2026-04-06 10:45 UTC (Instagram follow-up workflow)
Status: blocked (waiting for config)

## Current State
Loaded `agents/state/instagram-followup-config.json` → all sequences empty. Workflow exited per Step 1 design.

## Last Run (2026-04-06)
- Step 1: Loaded config
- Result: All cases (A, B, C) have empty step arrays
- Action: Exited workflow per design ("No follow-up sequences configured")
- Runtime: 1s

## Blocker
Follow-up sequences not configured. Cannot proceed with Chrome/API follow-ups until:
1. Message templates provided for cases A, B, C
2. GIF files created and stored in `agents/media/`
3. Config populated

Example needed:
```json
{
  "cases": {
    "A": { "label": "No response", "steps": [ { "day_delay": 2, "message": "...", "gif_path": "agents/media/followup-a1.gif" } ] },
    "B": { "label": "Soft interest (replied but went quiet)", "steps": [...] },
    "C": { "label": "Objection / not interested", "steps": [...] }
  }
}
```

## Next Steps
1. Provide message templates for A (no response), B (soft interest), C (objection)
2. Provide GIF files
3. Populate config → Jess will run on next schedule
