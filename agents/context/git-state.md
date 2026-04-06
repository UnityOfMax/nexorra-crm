# Git State (2026-04-06 18:15)
Branch: main

## Last 5 Commits
f9e3346 Replace Outscraper + Apollo with Chrome CDP for free local biz pipeline
803a8fd Fix thumbnail upload: use lead-thumbnails bucket via REST API, add retry logic
c56a8f2 Add video thumbnail preview for Instantly email
3106a9c Stacey 2026-04-05: Email upload 1000 leads complete; Instagram DMs blocked by Chrome automation selector issues
546418b Update Lionel maintenance status: 2026-04-04 check complete

## Modified Files
 M .claude/commands/marketing/cold-email-maintenance.md
 M .claude/commands/marketing/cold-email-upload.md
 M .claude/commands/marketing/instagram-outreach.md
 M .mcp.json
 M agents/context/git-state.md
 M agents/primers/derek.md
 M agents/primers/glen.md
 M agents/primers/hugo.md
 M agents/primers/jeff.md
 M agents/primers/jess.md
 M agents/primers/lionel.md
 M agents/primers/marcus.md
 M agents/primers/mira.md
 M agents/primers/nina.md
 M agents/primers/priya.md
 M agents/primers/quinn.md
 M agents/primers/stacey.md
 M agents/primers/tara.md
 M agents/prompts/cold-email-system.md
 M agents/prompts/instagram-first-message.md
 M app/api/landing-pages/cold-email/route.ts
 M assets/website-demo-templates/salon-barber.html
 M lib/google-maps/scraper.ts
 M lib/instantly/client.ts
 M lib/landing-pages/cold-email-builder.ts
 M lib/landing-pages/website-demo-builder.ts
 M lib/obsidian/brain.ts
 M lib/obsidian/client.ts
 M lib/obsidian/sync.ts
 M package-lock.json
 M package.json
 M scripts/backfill-thumbnails.ts
 M scripts/chrome-launch-video.sh
 M scripts/chrome-launch.sh
 M scripts/chrome-tool.js
 M scripts/cold-email-upload-agent.ts
 M scripts/cron/instagram-outreach.sh
 M scripts/daemon/process-manager.ts
 M scripts/daemon/server.ts
 M scripts/exp_city_scraper.js
 M scripts/local-biz/build-demo.ts
 M scripts/loom-video/capture-profile.ts
 M scripts/loom-video/composite.ts
 M scripts/loom-video/prerender-brokerage-frames.ts
 M scripts/obsidian-setup.ts
 M scripts/setup/sleep-schedule.sh
?? .claude/commands/marketing/calling-outreach.md
?? "Recall Stack Setup Guide (March 2026).docx.pdf"
?? agents/primers/cole.md
?? agents/prompts/cold-email-follow-up-templates-draft.md
?? app/api/internal/
?? assets/chrome-frames/
?? assets/video/circle-mask-200.png
?? assets/video/crm-demo-raw.mp4
?? assets/video/crm-demo.mp4
?? assets/video/crm-portion.mp4
?? assets/video/crm-tail-prerendered.mp4
?? assets/video/talking-head-raw.mp4
?? assets/video/talking-head.mp4
?? assets/video/th-200-sped.mp4
?? assets/video/th-circle-sped.webm
?? migrations/add-calling-tables.sql
?? migrations/add-video-viewed-reply.sql
?? scripts/apply-migration.ts
?? scripts/backfill-landing-pages.ts
?? scripts/batch-insert-leads.js
?? scripts/bhhs-puppeteer-scraper.ts
?? scripts/bhhs-scraper.sh
?? scripts/calling/audio-bridge.py
?? scripts/calling/knowledge-base.md
?? scripts/calling/orchestrator.ts
?? scripts/calling/prompts/
?? scripts/calling/requirements.txt
?? scripts/calling/setup-audio.sh
?? scripts/calling/start-calling.sh
?? scripts/calling/transcript-router.py
?? scripts/chrome-launch-instagram.sh
?? scripts/compass-bulk-scraper.ts
?? scripts/compass-extended-scraper.ts
?? scripts/cron/calling-outreach.sh
?? scripts/cron/chrome-watchdog.sh
?? scripts/cron/obsidian-conversations.sh
?? scripts/cron/video-pipeline.sh
?? scripts/daily-report-2026-04-05.ts
?? scripts/daily-video-pipeline.ts
?? scripts/exp-scraper-temp.ts
?? scripts/ig-dm-session.js
?? scripts/instagram-dm-session.js
?? scripts/instantly-cli.ts
?? scripts/kill-chrome-zombies.sh
?? scripts/local-biz/test-pipeline.ts
?? scripts/loom-video/prerender-brokerage-frames.py
?? scripts/loom-video/prerender-tail.ts
?? scripts/loom-video/prerender-th-circle.ts
?? scripts/loom-video/warmup-cloudflare.ts
?? scripts/phase2-calling-scraper.ts
?? scripts/send_dms_tara.js
?? scripts/setup/restart-nexorra-pa.sh
?? scripts/setup/start-xvfb.sh
?? scripts/temp-analyze.ts
?? scripts/temp-bhhs-scraper.ts
?? scripts/temp-learning.ts
?? scripts/upload-landing-assets.ts
?? scripts/video-pipeline-watchdog.ts

## Untracked
.claude/commands/marketing/calling-outreach.md
Recall Stack Setup Guide (March 2026).docx.pdf
agents/primers/cole.md
agents/prompts/cold-email-follow-up-templates-draft.md
app/api/internal/call-completed/route.ts
assets/chrome-frames/bhhs.png
assets/chrome-frames/century21.png
assets/chrome-frames/coldwellbanker.png
assets/chrome-frames/compass.png
assets/chrome-frames/default.png
