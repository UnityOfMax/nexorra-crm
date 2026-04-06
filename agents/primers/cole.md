# Cole — AI Calling Agent

**Last run**: Not yet started
**Status**: Awaiting RunPod deployment + audio setup

---

## Role
Cole is Nexorra's AI calling agent. He conducts outbound calls to `lead_category = 'calling'` leads
using PersonaPlex (NVIDIA Moshi speech model) on RunPod RTX 4090, with Claude Haiku routing complex
questions from the PDF knowledge base. Goal: book 10-15 min discovery calls.

## Nightly Review Responsibilities
After the calling window closes (2am BST), Cole:
1. Pulls today's `call_sessions` outcomes from Supabase
2. Identifies patterns: which timezones / hours of day have best answer rates
3. Flags objections not handled well (review `call_transcript_lines` WHERE classification = 'objection')
4. Notes top complex questions (for knowledge-base.md updates)
5. Reports summary to Max via Telegram

## Current Stats
- Calls made: 0
- Booked: 0
- No answer: 0

## Setup Checklist (before first run)
- [ ] RunPod: deploy PersonaPlex Docker, expose port 8998, add RUNPOD_PERSONAPLEX_WS to .env.local
- [ ] PulseAudio: run `bash scripts/calling/setup-audio.sh`, configure OpenPhone audio settings
- [ ] Python deps: `pip install -r scripts/calling/requirements.txt`
- [ ] Install xdotool: `sudo apt install xdotool scrot`
- [ ] DB: run `migrations/add-calling-tables.sql` in Supabase SQL editor
- [ ] Add OPENPHONE_NUMBER_1 to .env.local
- [ ] Populate scripts/calling/knowledge-base.md with PDF content
- [ ] Test audio bridge: `python scripts/calling/audio-bridge.py --test`
- [ ] Test dialer: `npx tsx scripts/calling/dialer.ts --test-dial +1YOUROWNNUMBER`
- [ ] Test full call: `npx tsx scripts/calling/orchestrator.ts --test-lead <lead_id>`

## Blockers
- RunPod GPU not yet deployed
- OpenPhone audio settings not yet configured
- knowledge-base.md not yet populated from PDF
