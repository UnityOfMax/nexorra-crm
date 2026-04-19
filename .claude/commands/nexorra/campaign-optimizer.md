# Campaign Optimizer Agent

Analyze Meta ad performance and client funnel data → propose ad changes → update AI configs.
Runs nightly at 10 PM. All proposed changes stored in `optimizer_actions` with `applied: false`.
Nothing is auto-applied. Admin approves via dashboard → `POST /api/meta/manage`.

---

## Step 1: Load Memory

Read `agents/memory/funnel-insights.md` for cross-client learnings.

Read recent optimizer actions (last 7 days) to avoid re-proposing already-pending actions:
```
GET $CRM_BASE_URL/api/optimizer/actions?accountId=X&status=pending
Headers: Authorization: Bearer $CRON_SECRET
```

---

## Step 2: Load All Client Accounts

```sql
SELECT id, name, settings
FROM accounts
WHERE account_type = 'client'
  AND settings->'campaign'->>'meta_ad_account_id' IS NOT NULL
   OR settings->'campaign'->>'monthly_budget' IS NOT NULL;
```

---

## Step 3: Per-Client Analysis (repeat for each account)

### 3a. Pull ad metrics (last 7 days)
```
GET $CRM_BASE_URL/api/meta/insights?accountId={id}&days=7
Headers: Authorization: Bearer $CRON_SECRET
```

Response: array of AdSetRow { adset_id, adset_name, spend, leads, cpl, appointments, cpa }

### 3b. Pull funnel metrics
```
GET $CRM_BASE_URL/api/analytics/funnel?accountId={id}&days=7
Headers: Authorization: Bearer $CRON_SECRET
```

Response: { stages, totalLeads, totalBookings, bookingRate }

### 3c. Compute account-level averages
- `avg_cpl` = mean of all adset CPLs (exclude null)
- `avg_booking_rate` = bookingRate from funnel API

### 3d. Classify each adset

**Pause candidate** — if ALL of:
- `cpl > avg_cpl * 2.0`
- booking_rate (from funnel) < 15%
- adset has been active ≥ 3 days

**Budget increase candidate** — if ALL of:
- `cpl < avg_cpl * 0.8`
- `bookingRate > 25%`
- `leads >= 3` in the period

**Creative refresh candidate** — if:
- `leads == 0` for 7 consecutive days
- adset is active (not already paused)

---

## Step 4: Propose Actions (INSERT into optimizer_actions)

For each flagged adset, compute a **confidence score (0–100)** and **impact estimate (%)** before proposing.

**Confidence scoring guide:**
- Start at 50
- +20 if signal persists for ≥ 5 days (not just a 1-day spike)
- +15 if ≥ 5 leads in the sample (sufficient volume)
- +10 if the same adset showed this pattern last week too
- -15 if sample is < 3 leads (low volume — could be noise)
- -10 if the pattern appeared for < 2 days

**Impact estimate (%):**
- `pause_adset`: estimated % CPL improvement across portfolio if paused (e.g. 8% if it's 15% of spend at 2x CPL)
- `increase_budget`: estimated % lead volume increase (e.g. 20% if budget increases 20% on high-performer)
- `creative_refresh`: typically 5–15% — use 10 as default

**Tier auto-assignment:**
- `confidence >= 85` AND `impact_estimate <= 20` → tier = `auto` (executes immediately via cron)
- `confidence >= 60` → tier = `review` (shown in UI, requires approval)
- `confidence < 60` → tier = `hold` (informational only, greyed out)

Call:
```
POST $CRM_BASE_URL/api/optimizer/propose
Headers: Authorization: Bearer $CRON_SECRET
Body: {
  account_id,
  action_type: "pause_adset" | "increase_budget" | "creative_refresh",
  target_id: adset_id,
  target_name: adset_name,
  reason: "CPL $82 (2.4x avg $34), booking rate 8% in last 7 days. Confidence: 87/100 (5-day signal, 8 leads). Estimated impact: 12% CPL reduction.",
  before_state: { status: "ACTIVE", daily_budget: 3000 },
  after_state: { status: "PAUSED" },  // or { daily_budget: 3600 } for +20%
  confidence: 87,
  impact_estimate: 12
}
```

For `creative_refresh`, include in `after_state`:
```json
{ "landing_page_url": "<account's primary landing page URL>" }
```

Fetch landing page URL:
```sql
SELECT slug FROM landing_pages
WHERE account_id = '{account_id}' AND published = true
LIMIT 1;
```
URL = `$CRM_BASE_URL/{slug}`

**Never propose an action if there is already a pending (not rejected/applied) action of the same type for the same target.**

---

## Step 5: AI Config Updates for Low-Engagement Accounts

For accounts where:
- `bookingRate < 20%`
- totalLeads >= 5 in last 7 days
- No `update_ai_tone` action proposed in last 7 days

Load current AI config:
```sql
SELECT system_prompt, tone, business_context
FROM ai_agent_configs
WHERE account_id = '{account_id}';
```

Read `agents/memory/client-reply.md` for successful tone patterns.

Use Claude Haiku to generate 1-2 concrete system prompt improvements:
- Prompt: "This real estate AI agent has a {bookingRate}% booking rate in the last 7 days with {totalLeads} leads. Current tone: {tone}. Current system prompt excerpt: {first 300 chars}. Suggest 1-2 specific, concrete changes to the system prompt or tone that would increase booking rate. Be specific — suggest exact text changes. No generic advice."
- Max 200 tokens, temperature 0.5

Insert `update_ai_tone` into optimizer_actions with:
- `reason` = the AI's suggestion
- `before_state` = { tone, system_prompt_excerpt: first 200 chars }
- `after_state` = { suggested_changes: AI output }

---

## Step 6: Update Memory

Write to `agents/memory/funnel-insights.md` (append/update, max 4KB):
```markdown
## [Date]
- Accounts analyzed: N
- Actions proposed: N (X pause, Y budget, Z creative)
- Top performer: {adset} in {account} — CPL ${X}, {Y}% booking rate
- Worst performer: {adset} — CPL ${X}, paused
- Cross-client avg CPL: ${X}
- Cross-client avg booking rate: {X}%
```

---

## Step 7: Print Summary

Output:
```
Campaign Optimizer Complete — [date]
Accounts analyzed: N
Actions proposed:
  - Pause: N ad sets
  - Budget increase: N ad sets
  - Creative refresh: N ad sets
  - AI tone update: N accounts
Pending approvals: N total
```

---

## Notes

- Never auto-apply. Always `applied: false`, `approved: false` on insert.
- Skip accounts with no `meta_ad_account_id` in campaign settings.
- If Meta API returns error for an account, log and continue to next.
- CPL thresholds are relative (× average), not absolute — this adapts to different markets.
- Proposal endpoint: `POST /api/optimizer/propose` — a lightweight internal route that inserts into optimizer_actions.
