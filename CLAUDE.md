# Nexorra CRM — Project Instructions

## Overview

Nexorra is an AI-powered appointment-setting agency for real estate agents in the US and Canada.
This CRM (Next.js 14 App Router + Supabase) serves both the agency's own operations and client sub-accounts.

- **Repo**: https://github.com/UnityOfMax/nexorra-crm.git
- **Deploy**: Vercel (auto-deploy from main)
- **Supabase**: Project `nhflmisklsanfiiywrfo`

---

## Architecture

### Multi-Tenant Model
- `accounts` table: agency account (Nexorra) + client sub-accounts
- `account_members` table: users → accounts with roles (owner, admin, member)
- RLS enforced on most tables via `account_id`
- **Exception**: `leads` table is global (no account_id) — agency-only access

### Auth
- Supabase cookie-based auth via `createRouteHandlerClient`
- API route guards: `requireAccountAccess(request, accountId)` for account-scoped routes
- Global routes: `requireAuth(request)`
- Admin client: `supabaseAdmin` from `@/lib/supabase` (uses `SUPABASE_SERVICE_ROLE_KEY`)
- Browser client: `supabase` from `@/lib/supabase-browser` (uses `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

### Key Tables
| Table | Scope | Purpose |
|-------|-------|---------|
| `accounts` | Global | Agency + client accounts |
| `account_members` | Global | User-account membership |
| `contacts` | Per-account | CRM contacts |
| `deals` | Per-account | Sales pipeline |
| `activities` | Per-account | Calendar events, tasks |
| `messages` | Per-account | SMS + email (inbound/outbound) |
| `workflows` / `workflow_executions` | Per-account | Automation engine |
| `leads` | Global | Scraped real estate agent leads (agency-only) |
| `lead_conversations` | Global | Cold email threads (Instantly) |
| `conversation_messages` | Global | Messages within cold email threads |
| `ai_agent_configs` | Per-account | AI reply settings per sub-account |
| `ai_follow_up_queue` | Per-account | Scheduled AI follow-ups |
| `landing_pages` | Per-account | Client landing pages |
| `stacey_learnings` | Global | Cold email outcome learnings |
| `meta_events` | Per-account | CAPI event log (Lead, Schedule events sent to Meta) |
| `meta_ad_metrics` | Per-account | Daily Meta ad set performance metrics |
| `funnel_events` | Per-account | Per-contact funnel stage tracking |
| `optimizer_actions` | Per-account | AI campaign change proposals (approval-gated) |
| `local_biz_leads` | Global | Local business leads for Petra's website demo pipeline |

### API Patterns
- All routes in `app/api/`
- Auth check first, then business logic
- Return `NextResponse.json(...)` with appropriate status
- Use `supabaseAdmin` in API routes, never the browser client

---

## Critical Distinction: Nexorra vs Client Sub-Accounts

**Nexorra Main Account** (agency operations):
- Lead generation (scraping brokerage sites)
- Cold email campaigns via Instantly
- Calendly booking for discovery calls
- Operates on `leads`, `lead_conversations`, `conversation_messages` tables
- Agents: Lead Gen, Cold Email Upload/Replies/Maintenance, Campaign Reviewer

**Client Sub-Accounts** (per-client CRM):
- AI replies to inbound SMS/email contacts
- Uses per-account prompts from `ai_agent_configs`
- Sends via Twilio (SMS) and Resend (email)
- Operates on `contacts`, `messages`, `activities` tables
- Agents: Client Reply Agent

These are completely separate systems with different agents, different feedback loops, and different models.

---

## Integrations

| Service | Purpose | Env Vars |
|---------|---------|----------|
| Supabase | DB + Auth | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| Twilio | SMS (client sub-accounts) | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` |
| Resend | Email (client sub-accounts) | `RESEND_API_KEY` |
| Instantly | Cold email campaigns (Nexorra) | `INSTANTLY_API_KEY`, `INSTANTLY_CAMPAIGN`, `INSTANTLY_WEBHOOK_SECRET` |
| Calendly | Discovery call booking (Nexorra) | `CALENDLY_API_KEY`, `CALENDLY_EVENT_TYPE_URI`, `CALENDLY_USER_URI`, `CALENDLY_WEBHOOK_SECRET` |
| Anthropic | Claude Haiku 4.5 reply generation (with prompt caching) | `ANTHROPIC_API_KEY` |
| Meta Marketing API | Ad metrics + campaign management (ads_management scope) | `META_ACCESS_TOKEN`, `META_AD_ACCOUNT_ID`, `META_DATASET_ID`, `META_PAGE_ID` |
| Meta Conversions API | Server-side Lead/Schedule events (CAPI) | `META_ACCESS_TOKEN`, `META_DATASET_ID` |
| Google AI (Imagen 3) | Ad creative image generation (Nano Banana) | `GOOGLE_AI_API_KEY` |
| Google Calendar | Calendar sync (clients) | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| Outscraper | Google Maps / GMB scraping (Petra) | `OUTSCRAPER_API_KEY` |
| Apollo.io | Email enrichment for local biz leads (Petra) | `APOLLO_API_KEY` |
| Instantly (local biz) | Local biz demo outreach campaign | `INSTANTLY_LOCAL_BIZ_CAMPAIGN` |

### API Rate Limits
- Instantly: 5s between calls, 429 → wait 60s + retry once
- Calendly: 10s between calls
- Supabase: no hard limit, but 5s between bulk writes
- Anthropic: standard rate limits, retry on 429. Prompt caching via `cache_control: { type: 'ephemeral' }` on system blocks.

---

## Agent System

### Agent Taxonomy

#### A. Nexorra Main Account Operations
| Command | Schedule | Model | Purpose |
|---------|----------|-------|---------|
| `/nexorra/lead-gen` | Cron 10 AM daily (BST) | Claude (orchestration) | Scrape brokerage sites → `leads` table |
| `/nexorra/cold-email-upload` | Cron 12 PM daily (BST) | Claude (orchestration) | Push leads to Instantly with loom links |
| `/nexorra/cold-email-replies` | Cron every 15 min | Claude Haiku 4.5 | Classify + respond to cold email replies |
| `/nexorra/cold-email-maintenance` | Cron 8 PM daily | Claude Haiku 4.5 | Nudge, ghosted detection, learning cycle |
| `/nexorra/campaign-review` | Manual | Claude | Analyze campaign metrics |
| `/nexorra/campaign-optimizer` | Cron 10 PM daily | Claude | Analyze Meta + funnel data → propose ad changes |
| `/research/local-biz-scout` | Cron 10:30 AM daily | Claude Sonnet | Petra: GMB demo pipeline — 5-7 parallel workers (Scout+Build+Outreach per worker, 300/day cap) |

#### B. Client Sub-Account Operations
| Command | Schedule | Model | Purpose |
|---------|----------|-------|---------|
| `/client/reply` | Cron every 5 min | Claude Haiku 4.5 | Handle inbound SMS/email for all sub-accounts |
| `/client/onboard` | Manual | Claude | Create new sub-account + defaults |

#### C. Development
| Command | Schedule | Model | Purpose |
|---------|----------|-------|---------|
| `/dev/frontend` | Manual | Claude | React/Next.js component work |
| `/dev/backend` | Manual | Claude | API routes, Supabase, integrations |
| `/dev/review` | Manual | Claude | Review staged changes |
| `/dev/test` | Manual | Claude | Run build, validate API routes |
| `/dev/preview` | Manual | Claude | Local dev + cloudflared tunnel |

#### D. Operations
| Command | Schedule | Model | Purpose |
|---------|----------|-------|---------|
| `/ops/report` | Cron 9 PM daily | Claude | Daily metrics aggregation |

### Claude Haiku Reply Generation
Reply generation uses Claude Haiku 4.5 via `lib/kimi/` (module name kept for backward compat):
- `lib/kimi/client.ts` — Anthropic SDK wrapper with prompt caching
- `lib/kimi/generate-reply.ts` — Context builder + Haiku caller
- System prompts cached via `cache_control: { type: 'ephemeral' }` for ~90% input token savings

### Self-Learning System
Each agent maintains a learning file in `agents/memory/` (max 4KB, periodically condensed):
- `lead-gen.md` — Scraping patterns, city yields
- `cold-email.md` — Reply strategies → booking outcomes
- `client-reply.md` — Client engagement patterns
- `code-review.md` — Common issues, fixes
- `campaign-metrics.md` — Open/reply/booking rates
- `funnel-insights.md` — Cross-client Meta + funnel performance (auto-maintained by campaign-optimizer)
- `local-biz.md` — Local biz pipeline: city/type yield patterns, Apollo success rate, template performance

### Cron Schedule
**Device wake/sleep: 9:50 AM – 2:00 AM BST. No jobs before 10 AM or after 1 AM.**

| Time (BST) | Script | Agent |
|------------|--------|-------|
| 10:00 AM | `scripts/cron/lead-gen.sh` | Lead Gen (Jeff) |
| 10:15 AM | `scripts/cron/meta-sync.sh` | Meta Ad Metrics Sync |
| 10:30 AM | `scripts/cron/petra-pipeline.sh` | GMB Demo Pipeline (Petra) — 5-7 workers, 300/day |
| 12:00 PM | `scripts/cron/cold-email-upload.sh` | Cold Email Upload (Stacey) |
| 2:00 PM | `scripts/cron/instagram-outreach.sh` | Instagram Outreach (Tara) |
| 2:00 PM | `scripts/calling/start-calling.sh` | Calling Start (Cole) |
| 6:00 PM | `scripts/cron/instagram-followup.sh` | Instagram Follow-up |
| 8:00 PM | `scripts/cron/cold-email-maintenance.sh` | Cold Email Maintenance (Lionel) |
| 9:00 PM | `scripts/cron/daily-report.sh` | Reporter |
| 10:00 PM | `scripts/cron/campaign-optimizer.sh` | Campaign Optimizer |
| 11:00 PM | `scripts/cron/lead-gen-quality-check.sh` | Lead Quality Check (Nina) |
| 11:00 PM | `scripts/cron/calling-outreach.sh` | Calling Review (Cole) |
| 1:00 AM | `scripts/cron/landing-page-cleanup.sh` | Landing Page Cleanup |
| 1:15 AM | `scripts/cron/obsidian-conversations.sh` | Obsidian Conversation Sync |
| 2:00 AM | `scripts/setup/sleep-schedule.sh` | Auto-Sleep |

### Webhook-Triggered Agents
| Webhook | Agent | Trigger |
|---------|-------|---------|
| Instantly reply | Cold Email Replies | `POST /api/webhooks/instantly` |
| Twilio SMS inbound | Client Reply | `POST /api/webhooks/twilio-inbound` |
| Resend email inbound | Client Reply | `POST /api/webhooks/resend-inbound` |

---

## UI Change Workflow (MANDATORY)

For **any frontend/UI change**, always follow this sequence — even if Max didn't ask for a preview:

1. **Make the changes** in code
2. **Build a standalone preview** at `/tmp/mobile-preview.html` using Tailwind CDN (dark mode, 390px mobile layout, realistic mock data matching the app's dark palette: `#1c1c1e` bg, `#2c2c2e` cards)
3. **Serve it**: `cd /tmp && nohup python3 -m http.server 8765 &>/tmp/pyserver.log &`
4. **Tunnel it**: `cloudflared tunnel --config /dev/null --no-autoupdate --url http://localhost:8765 > /tmp/cf-preview.log 2>&1 &` → extract URL with `grep -o 'https://[a-zA-Z0-9.-]*trycloudflare\.com' /tmp/cf-preview.log | head -1`
5. **Send preview URL via Telegram** with a short summary of what changed
6. **Wait for approval** before pushing to GitHub

The app requires Supabase auth — the standalone HTML preview is the only way Max can see changes on mobile without logging in.

---

## Coding Standards

- Always add `dark:` variants when modifying UI (check existing patterns)
- Use `supabaseAdmin` in API routes, `supabase` in client components
- API routes: `requireAccountAccess(request, accountId)` for account-scoped, `requireAuth(request)` for global
- Leads table is global (not account-scoped) — agency-only access
- Never expose API keys, never log PII
- Prefer `Array.from(new Set(...))` over `[...new Set(...)]` (Vercel build compatibility)
- Dark mode: use `dark:bg-[#1c1c1e]` for page backgrounds, `dark:bg-[#2c2c2e]` for cards/panels, `dark:bg-[#3a3a3c]` for inputs/elevated elements
- CalendarView uses CSS custom properties (`var(--cal-*)`) defined in `globals.css` for dark mode (inline styles can't use Tailwind `dark:`)

### Frontend Design Standards
- **Typography**: Never use Inter/Roboto/Arial. Prefer distinctive fonts (DM Sans, Satoshi, Plus Jakarta Sans, Cabinet Grotesk).
- **Color**: CSS custom properties. No generic purple-gradient-on-white. Dominant colors with sharp accents.
- **Layout**: Break grid predictability. Mix full-bleed with contained. Intentional negative space.
- **Motion**: Spring easing for entrances. Micro-interactions on hover/focus. Subtle scroll reveals.
- **Atmosphere**: Background textures/gradients for depth. Layer shadows and blur.
- **Anti-patterns**: No generic SaaS template look. No cookie-cutter hero sections. No default Tailwind colors.

### Git Push Command
```bash
GH_TOKEN=$(cat .gh-token) && git push https://${GH_TOKEN}@github.com/UnityOfMax/nexorra-crm.git main
```

---

## Key File Locations

### API Routes
- `app/api/leads/route.ts` — Lead management (agency)
- `app/api/conversations/route.ts` — Cold email conversations
- `app/api/webhooks/instantly/route.ts` — Instantly reply webhook
- `app/api/webhooks/calendly/route.ts` — Calendly booking webhook
- `app/api/webhooks/twilio-inbound/route.ts` — SMS inbound webhook
- `app/api/webhooks/resend-inbound/route.ts` — Email inbound webhook
- `app/api/ai/config/route.ts` — AI agent config per account
- `app/api/ai/kimi-generate/route.ts` — Claude Haiku reply generation endpoint (route name kept for compat)
- `app/api/automations/configs/route.ts` — Workflow automation configs
- `app/api/sms/send/route.ts` — Send SMS via Twilio
- `app/api/email/send/route.ts` — Send email via Resend
- `app/api/analytics/funnel/route.ts` — Per-account funnel metrics
- `app/api/analytics/overview/route.ts` — Agency-wide overview
- `app/api/meta/insights/route.ts` — Ad metrics from DB (meta_ad_metrics table)
- `app/api/meta/manage/route.ts` — Execute approved optimizer_actions (POST) + approve/reject (PATCH)
- `app/api/optimizer/actions/route.ts` — List optimizer_actions
- `app/api/optimizer/propose/route.ts` — Insert optimizer_action proposals (used by campaign-optimizer agent)
- `app/api/cron/meta-sync/route.ts` — Daily Meta → DB metrics sync

### Components
- `components/LeadsList.tsx` — Leads table (agency-only sidebar)
- `components/StaceyConversations.tsx` — Cold email conversations view
- `components/AIAgent.tsx` — AI settings UI per sub-account
- `components/calendar/CalendarView.tsx` — Calendar with CSS variable theming
- `components/workflows/WorkflowBuilder.tsx` — Visual workflow editor
- `components/landing-pages/LandingPageBuilder.tsx` — Landing page editor

### Libraries
- `lib/supabase.ts` — `supabaseAdmin` (service role client)
- `lib/supabase-browser.ts` — Browser client (anon key)
- `lib/ai/generate-and-send.ts` — AI orchestrator (generate + send + funnel tracking + lead scoring)
- `lib/ai/lead-scoring.ts` — Lead scoring algorithm (0-100, 3 DB queries max)
- `lib/analytics/funnel.ts` — Per-account + agency-wide funnel metrics aggregation
- `lib/meta/capi.ts` — Meta Conversions API client (SHA256-hashed PII, logs to meta_events)
- `lib/meta/marketing-api.ts` — Meta Marketing API (read insights + write: pause/budget/creative/ad)
- `lib/meta/creative-generator.ts` — Ad creative generation: Claude Haiku (copy) + Google Imagen 3 (image)
- `lib/ai/context.ts` — Conversation context builder + summarizer
- `lib/kimi/client.ts` — Claude Haiku 4.5 API client with prompt caching
- `lib/kimi/generate-reply.ts` — Claude Haiku reply generation helper
- `lib/twilio/client.ts` — Twilio SMS client
- `lib/resend/client.ts` — Resend email client
- `lib/workflow-engine/executor.ts` — Workflow execution engine
- `lib/workflow-engine/scheduler.ts` — Delayed job scheduler
- `lib/outscraper/client.ts` — Outscraper API client (Google Maps / GMB scraping)
- `lib/apollo/client.ts` — Apollo.io email enrichment client (10K/month free tier)
- `lib/landing-pages/website-demo-builder.ts` — Template engine + personalization for local biz demos

### Agent Files
- `agents/reference/` — Static data (brokerages, city pools)
- `agents/prompts/` — System prompts for reply generation
- `agents/memory/` — Agent learnings (max 4KB each)
- `agents/primers/` — Per-agent state files (auto-updated after each run)
- `agents/state/` — Runtime state files (JSON)
- `.claude/commands/` — Agent command definitions (executive/, research/, marketing/, client/, delivery/, engineering/, experiments/)
- `scripts/cron/` — Cron job shell scripts

### Runnable Scripts (USE THESE — do not recreate)
| Script | Purpose | Run Command |
|--------|---------|-------------|
| `scripts/lead-research.ts` | Deep research on leads (DuckDuckGo + page fetch) | `npx tsx scripts/lead-research.ts` |
| `scripts/lead-research-chrome.js` | Lead research via Chrome (created by Telegram) | `node scripts/lead-research-chrome.js` |
| `scripts/obsidian-sync.ts` | Sync researched leads to Obsidian vault | `npx tsx scripts/obsidian-sync.ts` |
| `scripts/mulch-migrate.ts` | Migrate agent memory to Mulch JSONL | `npx tsx scripts/mulch-migrate.ts` |
| `scripts/generate-gif.ts` | Generate GIF from video | `npx tsx scripts/generate-gif.ts <video>` |
| `scripts/loom-video/batch-generate.ts` | Batch generate lead videos | `npx tsx scripts/loom-video/batch-generate.ts` |
| `scripts/loom-video/generate.ts` | Generate single lead video | `npx tsx scripts/loom-video/generate.ts <lead_id>` |
| `scripts/chrome-tool.js` | Chrome DevTools Protocol tool (navigate, scrape, click) | `node scripts/chrome-tool.js <command>` |
| `scripts/chrome-launch.sh` | Launch Chrome with debug port 9222 | `bash scripts/chrome-launch.sh` |
| `scripts/cold-email-upload-agent.ts` | Upload leads to Instantly campaign | `npx tsx scripts/cold-email-upload-agent.ts` |
| `scripts/daemon/server.ts` | Agent daemon (spawns agents, tracks runs) | `npx tsx scripts/daemon/server.ts` |
| `scripts/local-biz/scout.ts` | Phase 1: Scrape GMB + Apollo enrichment | `npx tsx scripts/local-biz/scout.ts` |
| `scripts/local-biz/build-demo.ts` | Phase 2: Build website demo pages | `npx tsx scripts/local-biz/build-demo.ts` |
| `scripts/local-biz/email-outreach.ts` | Phase 3a: Upload to Instantly (local biz campaign) | `npx tsx scripts/local-biz/email-outreach.ts` |
| `scripts/local-biz/sms-outreach.ts` | Phase 3b: SMS via OpenPhone (10AM–1PM BST only) | `npx tsx scripts/local-biz/sms-outreach.ts` |
| `scripts/chrome-launch-local-biz.sh` | Launch Chrome port 9232 (Petra — isolated) | `bash scripts/chrome-launch-local-biz.sh` |

### Obsidian Vault
- Location: `~/Obsidian/Nexorra/`
- Subdirectories: Leads/, Clients/, Research/, Engineering/, Daily/
- Sync: `npx tsx scripts/obsidian-sync.ts` (syncs researched leads from Supabase)
- MCP: filesystem server has access to the vault

### Mulch Knowledge System
- Config: `.mulch/config.json`
- Data: `.mulch/learnings.jsonl` (gitignored)
- Client: `lib/mulch/client.ts` — record(), query(), getByAgent(), getByDomain()
