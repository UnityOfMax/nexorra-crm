#!/usr/bin/env python3
"""
Pre-renders per-brokerage Chrome header PNGs (1920x88px) using PIL.
Realistic Chrome dark-mode UI: rounded tab, address bar with lock icon,
navigation buttons, window controls.

Output: assets/chrome-frames/{brokerage}.png
Run via: npx tsx scripts/loom-video/prerender-brokerage-frames.ts
"""

from PIL import Image, ImageDraw, ImageFont
import os, sys

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUTPUT_DIR   = os.path.join(PROJECT_ROOT, "assets", "chrome-frames")

W, H = 1920, 88

# Chrome dark-mode colours
C_BG        = (32,  33,  36)    # #202124 — window bg / tab strip
C_TAB       = (53,  54,  58)    # #35363a — active tab
C_DIVIDER   = (48,  49,  52)    # subtle separator line
C_ADDR_BG   = (53,  54,  58)    # address bar pill
C_WHITE     = (232, 234, 237)   # primary text
C_GREY      = (154, 160, 166)   # secondary text / icons
C_DIM       = (80,  84,  89)    # dimmed (disabled forward btn)
C_FAVICON   = (66,  133, 244)   # blue placeholder favicon

BROKERAGES = [
    {"key": "compass",        "title": "Real Estate Agents · Compass",                         "url": "compass.com/agents"},
    {"key": "bhhs",           "title": "Find an Agent · Berkshire Hathaway HomeServices",      "url": "bhhs.com/find-an-agent"},
    {"key": "remax",          "title": "Real Estate Agent Profile · RE/MAX",                   "url": "remax.com/real-estate-agents"},
    {"key": "realtor",        "title": "Find Real Estate Agents · Realtor.com",                "url": "realtor.com/realestateagents"},
    {"key": "sothebys",       "title": "Real Estate Agent · Sotheby's International Realty",   "url": "sothebysrealty.com/eng/associates"},
    {"key": "exp",            "title": "Real Estate Agent Profile · eXp Realty",               "url": "exprealty.com/agents"},
    {"key": "kw",             "title": "Real Estate Agent Profile · Keller Williams",          "url": "kw.com/agents"},
    {"key": "coldwellbanker", "title": "Real Estate Agent · Coldwell Banker",                  "url": "coldwellbanker.com"},
    {"key": "century21",      "title": "Real Estate Agent · Century 21",                       "url": "century21.com/find-a-real-estate-agent"},
    {"key": "instagram",      "title": "Instagram · Real Estate Agent",                        "url": "instagram.com"},
    {"key": "default",        "title": "Real Estate Agent Profile",                            "url": "realtor.com/realestateagents"},
]

# ── Font helpers ────────────────────────────────────────────────────────────

def load_font(size, bold=False):
    paths = (
        ["/usr/share/fonts/truetype/ubuntu/Ubuntu-B.ttf",
         "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"]
        if bold else
        ["/usr/share/fonts/truetype/ubuntu/Ubuntu-R.ttf",
         "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
         "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"]
    )
    for p in paths:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()

def text_w(draw, text, font):
    try:
        bb = draw.textbbox((0, 0), text, font=font)
        return bb[2] - bb[0]
    except Exception:
        return len(text) * max(6, getattr(font, "size", 12) // 2)

def fit_text(draw, text, font, max_w):
    if text_w(draw, text, font) <= max_w:
        return text
    while len(text) > 1 and text_w(draw, text[:-1] + "…", font) > max_w:
        text = text[:-1]
    return text[:-1] + "…" if text else ""

# ── Per-brokerage frame ─────────────────────────────────────────────────────

def draw_frame(b):
    img  = Image.new("RGB", (W, H), C_BG)
    draw = ImageDraw.Draw(img)

    f_small  = load_font(11)   # tab title
    f_addr   = load_font(13)   # address bar / URL
    f_nav    = load_font(17)   # navigation arrows
    f_ctrl   = load_font(14)   # window control icons

    # ── Tab strip (rows 0–43) ─────────────────────────────────────────────

    TAB_L, TAB_R   = 80, 360
    TAB_T, TAB_B   = 6, 44
    RADIUS         = 8

    # Rounded-rect for the full tab (PIL 8.2+ compatible)
    draw.rounded_rectangle([TAB_L, TAB_T, TAB_R, TAB_B + 4], radius=RADIUS, fill=C_TAB)
    # Square off bottom corners so tab merges flush with toolbar
    draw.rectangle([TAB_L, TAB_B - RADIUS + 1, TAB_R, TAB_B + 4], fill=C_TAB)

    tab_cy = (TAB_T + TAB_B) // 2

    # Favicon (14×14 rounded square)
    fav_x = TAB_L + 12
    fav_half = 7
    draw.rounded_rectangle(
        [fav_x - fav_half, tab_cy - fav_half,
         fav_x + fav_half, tab_cy + fav_half],
        radius=2, fill=C_FAVICON
    )

    # Tab title (truncated to fit, leaving room for close ×)
    title_x   = fav_x + fav_half + 8
    close_x   = TAB_R - 20
    max_title = close_x - title_x - 6
    title     = fit_text(draw, b["title"], f_small, max_title)
    draw.text((title_x, tab_cy - 6), title, fill=C_WHITE, font=f_small)

    # Close button circle + ×
    cr = 8
    draw.ellipse([close_x - cr, tab_cy - cr, close_x + cr, tab_cy + cr],
                 fill=(70, 72, 76))
    draw.text((close_x - 4, tab_cy - 7), "×", fill=C_GREY, font=load_font(14))

    # "+" new-tab button (ghost)
    draw.text((TAB_R + 12, tab_cy - 8), "+", fill=C_DIM, font=load_font(17))

    # ── Window controls — top-right (Linux/Chrome style) ──────────────────
    ctrl_cy = 20

    # Close  ×
    cx = W - 22
    draw.text((cx - 5, ctrl_cy - 7), "×", fill=C_GREY, font=f_ctrl)

    # Maximise □
    mx = W - 56
    bs = 9
    draw.rectangle([mx - bs, ctrl_cy - bs, mx + bs, ctrl_cy + bs],
                   outline=C_GREY, width=1)

    # Minimise ─
    nmx = W - 90
    draw.line([(nmx - 6, ctrl_cy), (nmx + 6, ctrl_cy)], fill=C_GREY, width=2)

    # ── Toolbar (rows 44–88) ──────────────────────────────────────────────
    TOOL_TOP = 44
    tool_cy  = (TOOL_TOP + H) // 2

    # Separator
    draw.line([(0, TOOL_TOP), (W, TOOL_TOP)], fill=C_DIVIDER, width=1)

    # Navigation arrows
    draw.text((12, tool_cy - 10), "←", fill=C_GREY, font=f_nav)       # back
    draw.text((44, tool_cy - 10), "→", fill=C_DIM,  font=f_nav)       # fwd (disabled)
    draw.text((74, tool_cy - 10), "↻", fill=C_GREY, font=f_nav)       # reload

    # Address bar pill
    ADDR_L = 112
    ADDR_R = W - 88
    ADDR_T = TOOL_TOP + 7
    ADDR_B = H - 7
    pill_r = (ADDR_B - ADDR_T) // 2
    draw.rounded_rectangle([ADDR_L, ADDR_T, ADDR_R, ADDR_B],
                            radius=pill_r, fill=C_ADDR_BG)

    # Lock icon  🔒  (padlock outline)
    lx = ADDR_L + 16
    lcy = tool_cy
    # body
    draw.rounded_rectangle([lx - 4, lcy - 2, lx + 4, lcy + 5],
                            radius=1, fill=C_GREY)
    # shackle arch
    draw.arc([lx - 3, lcy - 8, lx + 3, lcy - 2],
             start=0, end=180, fill=C_GREY, width=2)

    # URL text (centred vertically in pill)
    url_x   = ADDR_L + 30
    url_max = (ADDR_R - ADDR_L) - 44
    url     = fit_text(draw, b["url"], f_addr, url_max)
    draw.text((url_x, tool_cy - 7), url, fill=C_GREY, font=f_addr)

    # Three-dot menu ⋮
    dot_x = W - 52
    for dy in (-5, 0, 5):
        draw.ellipse([dot_x - 2, tool_cy + dy - 2,
                      dot_x + 2, tool_cy + dy + 2], fill=C_GREY)

    # Profile / account circle (top-right after dots)
    prof_x = W - 22
    draw.ellipse([prof_x - 10, tool_cy - 10,
                  prof_x + 10, tool_cy + 10], fill=(66, 133, 244))
    draw.text((prof_x - 4, tool_cy - 7), "M", fill=(255, 255, 255), font=load_font(11))

    # ── Save ─────────────────────────────────────────────────────────────
    out = os.path.join(OUTPUT_DIR, f"{b['key']}.png")
    img.save(out, "PNG", optimize=True)
    sz = os.path.getsize(out)
    print(f"[prerender-frames] {b['key']}.png ({sz // 1024}KB) — \"{b['title'][:55]}\"")


# ── Main ────────────────────────────────────────────────────────────────────

os.makedirs(OUTPUT_DIR, exist_ok=True)
print(f"[prerender-frames] Generating {len(BROKERAGES)} brokerage Chrome frames → {OUTPUT_DIR}\n")

ok, failed = 0, 0
for brokerage in BROKERAGES:
    try:
        draw_frame(brokerage)
        ok += 1
    except Exception as exc:
        import traceback
        print(f"[prerender-frames] FAILED {brokerage['key']}: {exc}", file=sys.stderr)
        traceback.print_exc()
        failed += 1

print(f"\n[prerender-frames] Done: {ok} OK, {failed} failed.")
