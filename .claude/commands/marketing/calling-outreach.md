# Cole — AI Calling Agent (Nightly Review)

**EXECUTE IMMEDIATELY. Review today's calling session outcomes, update learnings, report to Max.**

## API Shorthands
**SB** = `apikey: $SUPABASE_SERVICE_ROLE_KEY` + `Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY`

---

## Step 1: Fetch today's call sessions
```
GET $NEXT_PUBLIC_SUPABASE_URL/rest/v1/call_sessions?called_at=gte.{TODAY_MIDNIGHT}&order=called_at.asc&select=id,lead_id,phone_to,status,outcome,duration_seconds,summary,calendly_booked,called_at
Headers: SB
```

If zero rows: report "No calls made today. Calling window did not produce any sessions." and exit.

## Step 2: Pull outcome breakdown
Summarise:
- Total calls: N
- Connected (answered): N
- No answer: N
- Busy / failed: N
- Booked: N
- Not interested: N

Calculate: **connection rate** (connected / total), **booking rate** (booked / connected)

## Step 3: Analyse call transcript patterns
For any calls with `outcome = 'not_interested'` or sessions with objection transcript lines:
```
GET $NEXT_PUBLIC_SUPABASE_URL/rest/v1/call_transcript_lines?classification=eq.objection&select=text,call_session_id&limit=20
Headers: SB
```
Group common objection themes. Note anything new that the persona prompt doesn't handle well.

## Step 4: Review complex questions
```
GET $NEXT_PUBLIC_SUPABASE_URL/rest/v1/call_transcript_lines?classification=eq.complex_question&select=text&limit=20
Headers: SB
```
Note the top 3-5 questions. If any can't be answered by `scripts/calling/knowledge-base.md`, flag them for Max to add.

## Step 5: Timezone analysis
Break down connection rate and booking rate by timezone (EST/CST/MST/PST). Flag any timezone with <15% connection rate — may indicate calling outside good hours, caller ID issues, or bad data.

## Step 6: Update cole-state.json
```
Read: agents/state/cole-state.json
Update: called_today, booked_today, no_answer_today, timezone_breakdown, top_objections, top_complex_questions
```

## Step 7: Update cole primer
Append session summary to `agents/primers/cole.md`.

## Step 8: Send Telegram report
```bash
curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
  -H "Content-Type: application/json" \
  -d '{
    "chat_id": "5880638817",
    "text": "📞 Cole calling report — {DATE}\n\n• Calls: {total}\n• Connected: {connected} ({connection_rate}%)\n• Booked: {booked} ({booking_rate}%)\n• No answer: {no_answer}\n\nTop objection: {top_objection}\nAction needed: {action_or_none}"
  }'
```

---

## Security
- NEVER log phone numbers or personal details in plaintext reports
- NEVER modify call_sessions records (read-only review)
