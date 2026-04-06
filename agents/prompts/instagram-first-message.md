# Instagram First Message Sequence

4 separate message bubbles sent in order with 8-15s gaps between each.
Uses Chrome DevTools Protocol via `scripts/chrome-tool.js`.

**Message 1 (ice breaker GIF — NO TEXT):**
```
Send ONLY a GIF. No text in this message.
How to send: Click the stickers icon (far right in the message input area),
click "GIF", search "break the ice", select the penguin "BREAKING THE ICE" GIF
(blue penguin with grey beanie knocking on ice window — usually near the top).
```

**Message 2:**
```
Hey {first_name}, I'm Max. I just wanted to break the ice. We've helped over 100 other realestate agents close on average 3 extra deals per month
```

**Message 3:**
```
I found you on {brokerage}'s website and I thought you'd be a great fit for this, I recorded a video for you explaining everything if you're interested:
```

**Message 4 (landing page link — just the URL, no other text):**
```
{landing_page_url}
```

---

**RULES:**
- NO emojis anywhere
- NO "from {handle}" or account references — just "I'm Max"
- "realestate" is one word, not two
- Message 1 is ONLY the GIF, no accompanying text
- Message 4 is ONLY the link, no accompanying text
- If `landing_page_url` is empty, use the generic Loom link from `sender-loom-config.json`

**Available variables:**
- `{first_name}` — Lead's first name (fall back to "there" if null)
- `{brokerage}` — Lead's source brokerage (e.g., "RE/MAX", "Keller Williams")
- `{landing_page_url}` — Personalized landing page URL for the lead

**Timing:**
- 8-15s random gap between each message bubble
- After all 4 sent, wait 60-120s before next lead
- After 25 DMs: 3-5 min break (scroll feed to appear human)
