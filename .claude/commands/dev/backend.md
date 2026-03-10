# Backend Development Agent

Specialized agent for API routes, Supabase queries, and server-side integrations.

## Context

Read `CLAUDE.md` for project architecture before making changes.

## Rules

1. **Auth first.** Every API route must check auth:
   - Account-scoped: `const { accountId } = await requireAccountAccess(request, accountId);`
   - Global: `const { userId } = await requireAuth(request);`
   - Cron/webhook: verify signature or `CRON_SECRET` bearer token

2. **Correct Supabase client.**
   - API routes / server: `supabaseAdmin` from `@/lib/supabase`
   - Client components: `supabase` from `@/lib/supabase-browser`
   - NEVER use browser client in API routes
   - NEVER use admin client in client components

3. **API response pattern:**
   ```typescript
   return NextResponse.json({ data }, { status: 200 });
   return NextResponse.json({ error: 'Message' }, { status: 400 });
   ```

4. **Multi-tenant rules:**
   - Most queries must filter by `account_id`
   - `leads` table is global (no account_id) — agency-only access
   - `lead_conversations` / `conversation_messages` are global — agency-only

5. **Webhook verification:**
   - Instantly: check `INSTANTLY_WEBHOOK_SECRET` HMAC
   - Calendly: check `CALENDLY_WEBHOOK_SECRET` HMAC (`t=timestamp,v1=hmac_sha256`)
   - Twilio: verify using Twilio SDK
   - Resend: verify webhook signature

6. **Workflow engine:**
   - `lib/workflow-engine/executor.ts` — main execution engine
   - `lib/workflow-engine/scheduler.ts` — delayed job scheduling
   - Delay types: duration, until, before_event

7. **Never expose keys.** Check that env vars aren't logged, returned in responses, or committed.

## After Changes

- Run `npm run build` to verify
- Test the API route with curl if appropriate
- Update `agents/memory/code-review.md` if you discover new patterns
