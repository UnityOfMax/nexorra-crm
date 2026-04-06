#!/usr/bin/env python3
"""
transcript-router.py — Classifies call transcript lines and routes complex questions
to Claude Haiku. Injects answers back via the Audio Bridge drip endpoint.

Routes:
  Audio Bridge /transcript POST → this router → classify → handle → Audio Bridge /inject POST
"""

import asyncio
import json
import os
import logging
from pathlib import Path

import aiohttp
from anthropic import AsyncAnthropic
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent.parent / '.env.local')

logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s %(message)s',
    datefmt='%H:%M:%S',
)
log = logging.getLogger(__name__)

# ─── Config ─────────────────────────────────────────────────────────────────

ANTHROPIC_API_KEY   = os.environ.get('ANTHROPIC_API_KEY', '')
CALENDLY_API_KEY    = os.environ.get('CALENDLY_API_KEY', '')
CALENDLY_EVENT_URI  = os.environ.get('CALENDLY_EVENT_TYPE_URI', '')
BRIDGE_URL          = 'http://127.0.0.1:5051'
ROUTER_PORT         = int(os.environ.get('TRANSCRIPT_ROUTER_PORT', '5052'))

# ─── Knowledge Base ──────────────────────────────────────────────────────────

KNOWLEDGE_BASE_PATH = Path(__file__).parent / 'knowledge-base.md'
_knowledge_cache: str | None = None

def get_knowledge_base() -> str:
    global _knowledge_cache
    if _knowledge_cache is None:
        if KNOWLEDGE_BASE_PATH.exists():
            _knowledge_cache = KNOWLEDGE_BASE_PATH.read_text()
        else:
            _knowledge_cache = "(Knowledge base not yet populated — see scripts/calling/knowledge-base.md)"
    return _knowledge_cache

# ─── Claude Haiku Client ─────────────────────────────────────────────────────

def get_anthropic_client():
    if ANTHROPIC_API_KEY:
        return AsyncAnthropic(api_key=ANTHROPIC_API_KEY)
    # OAuth fallback (local dev)
    creds_path = Path.home() / '.claude' / '.credentials.json'
    if creds_path.exists():
        import time
        creds = json.loads(creds_path.read_text())
        oauth = creds.get('claudeAiOauth', {})
        if oauth.get('accessToken') and oauth.get('expiresAt', 0) > time.time() * 1000:
            return AsyncAnthropic(api_key=oauth['accessToken'])
    raise RuntimeError("No Anthropic credentials found. Set ANTHROPIC_API_KEY in .env.local")

# ─── Classifier ─────────────────────────────────────────────────────────────

CLASSIFY_PROMPT = """You classify a real estate agent's utterance during a cold call.
Return exactly one word from: complex_question, booking_intent, objection, positive, hangup, small_talk

complex_question: asks about pricing, how it works, case studies, specific features, ROI, competitors
booking_intent: shows interest in a meeting/call/demo, asks about scheduling
objection: pushes back, raises a concern, says not interested (but hasn't hung up)
positive: short affirmative, yes, sounds good, I see, okay, mmm
hangup: says goodbye, not interested, don't call again
small_talk: weather, pleasantries, unrelated conversation

Utterance: {utterance}
Classification:"""

async def classify(utterance: str, client: AsyncAnthropic) -> str:
    """Fast classification — no knowledge base, just haiku."""
    msg = await client.messages.create(
        model='claude-haiku-4-5-20251001',
        max_tokens=10,
        messages=[{'role': 'user', 'content': CLASSIFY_PROMPT.format(utterance=utterance)}],
    )
    return msg.content[0].text.strip().lower().split()[0]

# ─── Filler Drip ────────────────────────────────────────────────────────────

FILLERS = [
    "let me just check that for you...",
    "good question, hang on one second...",
    "yeah sure, let me look at that...",
]
_filler_idx = 0

async def drip_filler():
    """Immediately drip a filler sentence while we wait for Haiku."""
    global _filler_idx
    filler = FILLERS[_filler_idx % len(FILLERS)]
    _filler_idx += 1
    await inject(filler)

async def inject(text: str):
    """Send text to Audio Bridge for drip injection into PersonaPlex."""
    try:
        async with aiohttp.ClientSession() as session:
            await session.post(
                f'{BRIDGE_URL}/inject',
                json={'text': text},
                timeout=aiohttp.ClientTimeout(total=2),
            )
    except Exception as e:
        log.warning(f"Inject failed: {e}")

# ─── Knowledge Handler ───────────────────────────────────────────────────────

KNOWLEDGE_SYSTEM = """You are Marcus's internal knowledge assistant on a live call.
A real estate agent just asked a complex question. Give Marcus a short, natural answer
he can speak (under 60 words). Use the knowledge base below.
Be specific — give real numbers, real examples. Sound human, not corporate.

Knowledge base:
{knowledge}"""

async def handle_complex_question(utterance: str, client: AsyncAnthropic):
    """Get an answer from the knowledge base and inject it."""
    await drip_filler()

    knowledge = get_knowledge_base()
    msg = await client.messages.create(
        model='claude-haiku-4-5-20251001',
        max_tokens=120,
        system=[
            {
                'type': 'text',
                'text': KNOWLEDGE_SYSTEM.format(knowledge=knowledge),
                'cache_control': {'type': 'ephemeral'},
            }
        ],
        messages=[{
            'role': 'user',
            'content': f'Agent asked: "{utterance}"\nGive Marcus a short spoken answer:'
        }],
    )

    answer = msg.content[0].text.strip()
    log.info(f"  Knowledge answer: {answer[:80]}...")
    await inject(answer)

# ─── Booking Handler ─────────────────────────────────────────────────────────

async def get_calendly_slots() -> list[str]:
    """Fetch next 3 available Calendly slots."""
    if not CALENDLY_API_KEY or not CALENDLY_EVENT_URI:
        return ["Tuesday at 2pm EST", "Wednesday at 10am EST", "Thursday at 3pm EST"]

    from datetime import datetime, timezone, timedelta
    now = datetime.now(timezone.utc)
    end = now + timedelta(days=7)

    url = 'https://api.calendly.com/event_type_available_times'
    params = {
        'event_type': CALENDLY_EVENT_URI,
        'start_time': now.isoformat(),
        'end_time': end.isoformat(),
    }
    headers = {'Authorization': f'Bearer {CALENDLY_API_KEY}'}

    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params, headers=headers) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    slots = data.get('collection', [])[:3]
                    return [
                        datetime.fromisoformat(s['start_time'].replace('Z', '+00:00'))
                        .astimezone(None)
                        .strftime('%A at %I:%M %p')
                        for s in slots
                    ]
    except Exception as e:
        log.warning(f"Calendly API error: {e}")

    return ["Tuesday at 2pm EST", "Wednesday at 10am EST", "Thursday at 3pm EST"]

async def handle_booking_intent(client: AsyncAnthropic):
    """Fetch Calendly slots and offer them naturally."""
    await drip_filler()
    slots = await get_calendly_slots()

    if len(slots) >= 3:
        offer = f"I've got {slots[0]}, {slots[1]}, or {slots[2]} — any of those work for you?"
    elif len(slots) >= 1:
        offer = f"I've got {slots[0]} available — does that work?"
    else:
        offer = "What day and time works best for you this week?"

    log.info(f"  Booking offer: {offer}")
    await inject(offer)

# ─── Main Handler ────────────────────────────────────────────────────────────

async def handle_utterance(data: dict, client: AsyncAnthropic):
    """Route a single transcript line."""
    utterance = data.get('text', '').strip()
    speaker = data.get('speaker', 'prospect')

    if speaker != 'prospect' or not utterance:
        return

    log.info(f"  Prospect: {utterance[:80]}")

    try:
        classification = await classify(utterance, client)
        log.info(f"  → {classification}")

        if classification == 'complex_question':
            await handle_complex_question(utterance, client)
        elif classification == 'booking_intent':
            await handle_booking_intent(client)
        elif classification == 'hangup':
            log.info("  Hang-up detected.")
        # positive, small_talk, objection: PersonaPlex handles naturally from persona prompt

    except Exception as e:
        log.error(f"Handle utterance error: {e}")

# ─── HTTP Server ─────────────────────────────────────────────────────────────

async def http_handler(request):
    """Receives transcript lines from Audio Bridge."""
    if request.method == 'POST' and request.path == '/transcript':
        data = await request.json()
        client = get_anthropic_client()
        asyncio.create_task(handle_utterance(data, client))
        return aiohttp.web.Response(text='{"ok":true}', content_type='application/json')
    return aiohttp.web.Response(status=404, text='Not found')

async def main():
    log.info("Starting Transcript Router...")
    log.info(f"  HTTP port: {ROUTER_PORT}")
    log.info(f"  Audio Bridge: {BRIDGE_URL}")

    client = get_anthropic_client()
    log.info("  Anthropic client: OK")

    app = aiohttp.web.Application()
    app.router.add_route('*', '/{path_info:.*}', http_handler)
    runner = aiohttp.web.AppRunner(app)
    await runner.setup()
    site = aiohttp.web.TCPSite(runner, '127.0.0.1', ROUTER_PORT)
    await site.start()
    log.info("Transcript Router ready.")

    try:
        await asyncio.Event().wait()
    except KeyboardInterrupt:
        log.info("Shutting down.")
    finally:
        await runner.cleanup()

if __name__ == '__main__':
    asyncio.run(main())
