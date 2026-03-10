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
| Moonshot AI | Kimi K2.5 reply generation | `MOONSHOT_API_KEY` |
| Google Calendar | Calendar sync (clients) | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |

### API Rate Limits
- Instantly: 5s between calls, 429 → wait 60s + retry once
- Calendly: 10s between calls
- Supabase: no hard limit, but 5s between bulk writes
- Moonshot/Kimi: standard rate limits, retry on 429

---

## Agent System

### Agent Taxonomy

#### A. Nexorra Main Account Operations
| Command | Schedule | Model | Purpose |
|---------|----------|-------|---------|
| `/nexorra/lead-gen` | Cron 8 AM daily | Claude (orchestration) | Scrape brokerage sites → `leads` table |
| `/nexorra/cold-email-upload` | Cron 9 AM daily | Claude (orchestration) | Push leads to Instantly with loom links |
| `/nexorra/cold-email-replies` | Cron every 15 min | Kimi K2.5 (generation) | Classify + respond to cold email replies |
| `/nexorra/cold-email-maintenance` | Cron 8 PM daily | Kimi K2.5 (generation) | Nudge, ghosted detection, learning cycle |
| `/nexorra/campaign-review` | Manual | Claude | Analyze campaign metrics |

#### B. Client Sub-Account Operations
| Command | Schedule | Model | Purpose |
|---------|----------|-------|---------|
| `/client/reply` | Cron every 5 min | Kimi K2.5 (generation) | Handle inbound SMS/email for all sub-accounts |
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

### Kimi K2.5 Integration
Reply generation uses Kimi K2.5 via `lib/kimi/` (~3.5x cheaper than Claude Haiku):
- `lib/kimi/client.ts` — Moonshot API wrapper
- `lib/kimi/generate-reply.ts` — Context builder + Kimi caller

### Self-Learning System
Each agent maintains a learning file in `agents/memory/` (max 4KB, periodically condensed):
- `lead-gen.md` — Scraping patterns, city yields
- `cold-email.md` — Reply strategies → booking outcomes
- `client-reply.md` — Client engagement patterns
- `code-review.md` — Common issues, fixes
- `campaign-metrics.md` — Open/reply/booking rates

### Cron Schedule
| Time | Script | Agent |
|------|--------|-------|
| 8:00 AM | `scripts/cron/lead-gen.sh` | Lead Gen |
| 9:00 AM | `scripts/cron/cold-email-upload.sh` | Cold Email Upload |
| 8:00 PM | `scripts/cron/cold-email-maintenance.sh` | Cold Email Maintenance |
| 9:00 PM | `scripts/cron/daily-report.sh` | Reporter |

### Webhook-Triggered Agents
| Webhook | Agent | Trigger |
|---------|-------|---------|
| Instantly reply | Cold Email Replies | `POST /api/webhooks/instantly` |
| Twilio SMS inbound | Client Reply | `POST /api/webhooks/twilio-inbound` |
| Resend email inbound | Client Reply | `POST /api/webhooks/resend-inbound` |

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
- `app/api/ai/kimi-generate/route.ts` — Kimi reply generation endpoint
- `app/api/automations/configs/route.ts` — Workflow automation configs
- `app/api/sms/send/route.ts` — Send SMS via Twilio
- `app/api/email/send/route.ts` — Send email via Resend

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
- `lib/ai/generate-and-send.ts` — Current AI orchestrator (Claude Haiku → Kimi migration)
- `lib/ai/context.ts` — Conversation context builder + summarizer
- `lib/kimi/client.ts` — Moonshot/Kimi K2.5 API client
- `lib/kimi/generate-reply.ts` — Kimi reply generation helper
- `lib/twilio/client.ts` — Twilio SMS client
- `lib/resend/client.ts` — Resend email client
- `lib/workflow-engine/executor.ts` — Workflow execution engine
- `lib/workflow-engine/scheduler.ts` — Delayed job scheduler

### Agent Files
- `agents/reference/` — Static data (brokerages, city pools)
- `agents/prompts/` — System prompts for reply generation
- `agents/memory/` — Agent learnings (max 4KB each)
- `agents/state/` — Runtime state files
- `.claude/commands/` — Agent command definitions (nexorra/, client/, dev/, ops/)
- `scripts/cron/` — Cron job shell scripts
