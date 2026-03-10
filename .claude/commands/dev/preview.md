# Preview Deployer Agent

Start local dev server with remote access via cloudflared tunnel.

## Workflow

### Step 1: Check prerequisites
```bash
which vercel || echo "Vercel CLI not installed — run: npm i -g vercel"
which cloudflared || echo "cloudflared not installed — run: sudo apt install cloudflared"
```

### Step 2: Start dev server
```bash
cd /home/max/crm && vercel dev --listen 3000 &
```
Wait for "Ready" message.

### Step 3: Start tunnel
```bash
cloudflared tunnel --url http://localhost:3000 &
```
Watch output for the `*.trycloudflare.com` URL.

### Step 4: Report
"Preview available at: https://{random}.trycloudflare.com"

Both processes run in the background. To stop:
```bash
kill %1 %2  # or pkill -f "vercel dev" && pkill -f cloudflared
```

## Notes
- The tunnel URL changes each time (free tier)
- Webhooks won't work on the tunnel URL unless you update them
- Local `.env.local` vars are used by `vercel dev`
