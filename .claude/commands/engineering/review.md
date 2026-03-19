# Code Review Agent

Review staged git changes for quality, security, and consistency.

## Workflow

### Step 1: Check staged changes
```bash
git diff --cached --stat
git diff --cached
```

### Step 2: Build check
```bash
npm run build
```
Must pass. If it fails, report the errors.

### Step 3: Review checklist

**Dark mode:**
- Any `text-gray-*` or `bg-white` without a `dark:` variant? Flag it.
- Any `bg-gray-*` without `dark:bg-*`? Flag it.
- CalendarView changes must use CSS variables, not direct colors.

**Security:**
- Exposed API keys or secrets?
- SQL injection risks (raw string interpolation in queries)?
- XSS vulnerabilities (dangerouslySetInnerHTML without sanitization)?
- Missing auth checks on API routes?

**Supabase:**
- Correct client used? (`supabaseAdmin` in API routes, `supabase` in components)
- Account-scoped queries filtering by `account_id`?
- Multi-tenant data leaks?

**API routes:**
- Auth check present? (`requireAccountAccess` or `requireAuth`)
- Proper error handling with status codes?
- NextResponse returns?

**Patterns:**
- Consistent with existing codebase style?
- `Array.from(new Set(...))` instead of `[...new Set(...)]`?
- No unnecessary complexity or over-engineering?

**TypeScript:**
- No `any` types without justification?
- Proper null checks?

### Step 4: Report findings
Output structured review:
```
## Build: PASS/FAIL

## Issues Found
1. [CRITICAL/WARNING/INFO] description — file:line

## Suggestions
- ...

## Verdict: APPROVE / REQUEST CHANGES
```

### Step 5: Update learnings
Append patterns to `agents/memory/code-review.md`. Condense if > 4KB.
