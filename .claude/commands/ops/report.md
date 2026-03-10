# Daily Report Agent

**EXECUTE IMMEDIATELY. Do NOT ask questions. Do NOT wait for confirmation. Start aggregating metrics now by following the steps below from Step 1. You are autonomous — query all data sources, compile the report, and output the summary when done.**

Aggregate metrics from leads, campaigns, and client sub-accounts. Run daily at 9 PM.

## Workflow

### Step 1: Lead metrics
```
GET $NEXT_PUBLIC_SUPABASE_URL/rest/v1/leads?select=id,scraped_at,pushed_to_instantly,timezone,source_brokerage,country&scraped_at=gte.{today_start}
Headers: apikey: $SUPABASE_SERVICE_ROLE_KEY, Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY
```
Calculate:
- Scraped today (total + by timezone + by brokerage)
- Pushed to Instantly today
- Total leads in database

### Step 2: Cold email metrics
```
GET $NEXT_PUBLIC_SUPABASE_URL/rest/v1/lead_conversations?select=id,status,updated_at&updated_at=gte.{today_start}
Headers: apikey: $SUPABASE_SERVICE_ROLE_KEY, Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY
```
Calculate:
- New conversations today
- Status breakdown: needs_reply, replied, booked, ghosted, rejected, nudge_sent
- Booking rate (booked / total with outcomes)
- Messages sent today

### Step 3: Instantly campaign stats (if API available)
```
GET https://api.instantly.ai/api/v2/campaigns
Headers: Authorization: Bearer $INSTANTLY_API_KEY
```
Get open rate, reply rate from campaign analytics.

### Step 4: Client sub-account metrics
```
GET $NEXT_PUBLIC_SUPABASE_URL/rest/v1/accounts?type=eq.client&select=id,name
```
For each client account:
- New contacts today
- Messages sent/received today
- Active deals
- AI replies sent

### Step 5: System health
- Check `logs/*.log` for errors in last 24h
- Cron job execution counts
- API error rates

### Step 6: Format report
```markdown
# Nexorra Daily Report — {date}

## Leads
- Scraped today: N (EST: x, CST: x, MST: x, PST: x)
- Pushed to Instantly: N
- Total in database: N

## Cold Email Campaign
- Open rate: X%
- Reply rate: X%
- Booking rate: X%
- New bookings today: N
- Ghosted today: N

## Client Accounts
| Account | Contacts | Messages | Deals | AI Replies |
|---------|----------|----------|-------|------------|
| ... | ... | ... | ... | ... |

## System
- Cron jobs: all OK / issues
- Errors: N
```

### Step 7: Save report
Update `agents/memory/campaign-metrics.md` with today's snapshot.
Log full report to `logs/report.log`.

Optionally: insert into a Supabase `reports` table for CRM display (future feature).
