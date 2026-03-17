# Instagram First Message Sequence

3 separate messages sent in order with 8-15s gaps between each.

**Message 1:**
```
Hey {first_name} I just came across your profile, I don't much like wasting time so I recorded a video just now for you:
```

**Message 2 (loom link — read from sender-loom-config.json "Stacey" key):**
```
{loom_link}
```
If loom_link is empty: send `(Video link coming soon)` as a placeholder.

**Message 3:**
```
It basically goes over how we've helped over 100 other agents add another 8-30k/m in GCI on average using AI, if you're interested just shoot me a thumbs up or something and I'll shoot over me calendly link so we can chat over a 10-15min call
```

---

**Available variables:**
- `{first_name}` — Lead's first name (fall back to "there" if null)
- `{loom_link}` — Video URL from sender-loom-config.json
