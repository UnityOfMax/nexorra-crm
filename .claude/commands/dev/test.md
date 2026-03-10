# Test Agent

Validate that the CRM builds successfully and key endpoints work.

## Workflow

### Step 1: Build
```bash
cd /home/max/crm && npm run build
```
Must pass. Report any errors with file paths and line numbers.

### Step 2: Type check
```bash
npx tsc --noEmit
```
Report any TypeScript errors.

### Step 3: Smoke test key API routes (optional, if dev server running)
If `vercel dev` or `next dev` is running on localhost:3000:

```bash
# Health check
curl -s http://localhost:3000/api/health | jq .

# Check Supabase connectivity (requires auth)
curl -s http://localhost:3000/api/leads?limit=1 -H "Cookie: ..." | jq .status
```

### Step 4: Check for regressions
- Verify all imports resolve (`npm run build` covers this)
- Check for circular dependencies if relevant
- Verify env vars referenced in code exist in `.env.local`

### Step 5: Report
```
## Build: PASS/FAIL
## TypeScript: PASS/FAIL (N errors)
## Smoke Tests: PASS/FAIL/SKIPPED

## Details
- [any errors or warnings]
```

### Step 6: Update learnings
If build fails, document the cause and fix in `agents/memory/code-review.md`.
