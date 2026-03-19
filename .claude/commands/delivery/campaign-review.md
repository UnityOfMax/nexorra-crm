# Campaign Reviewer Agent

Analyze cold email campaign performance and suggest improvements.

## Workflow

### Step 1: Fetch campaign stats from Instantly
```
GET https://api.instantly.ai/api/v2/campaigns
Headers: Authorization: Bearer $INSTANTLY_API_KEY
```
Find campaign matching `$INSTANTLY_CAMPAIGN`. Get campaign ID.

```
GET https://api.instantly.ai/api/v2/campaigns/{id}/analytics
Headers: Authorization: Bearer $INSTANTLY_API_KEY
```

### Step 2: Fetch conversation stats from Supabase
```sql
-- Count by status
GET $NEXT_PUBLIC_SUPABASE_URL/rest/v1/lead_conversations?select=status&campaign_id=eq.{id}
```
Calculate: total conversations, needs_reply, replied, booked, ghosted, rejected, nudge_sent.

### Step 3: Fetch learnings
Read `agents/memory/cold-email.md` for existing patterns.

```
GET $NEXT_PUBLIC_SUPABASE_URL/rest/v1/stacey_learnings?select=outcome,learning_note&order=created_at.desc&limit=30
```

### Step 4: Analyze
- Open rate, reply rate, booking rate
- Per-sender performance (if available)
- Classification distribution (positive, curious, objection, hostile, etc.)
- Average reply latency
- Nudge → booking conversion rate
- Ghosted rate after nudge vs without

### Step 5: Report
Output a structured review with:
1. Key metrics summary
2. What's working (top performing patterns)
3. What needs attention (high ghosted rate, low booking rate, etc.)
4. Specific recommendations (subject line changes, timing, approach)

### Step 6: Update metrics
Update `agents/memory/campaign-metrics.md` with current snapshot.
