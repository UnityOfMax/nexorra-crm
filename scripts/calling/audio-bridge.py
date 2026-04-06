#!/usr/bin/env python3
"""
audio-bridge.py — Bridges PulseAudio virtual devices to PersonaPlex on RunPod.

Audio flow:
  openphone_out.monitor (PulseAudio) → Opus encode → PersonaPlex WebSocket (RunPod)
  PersonaPlex WebSocket → Opus decode → personaplex_out (PulseAudio)

Also:
  - Receives PersonaPlex text tokens → publishes to Transcript Router queue
  - Receives inject commands from Transcript Router → drip-feeds via sendText()
  - Detects call end via silence timeout
  - Posts transcript + outcome to CRM internal API on call end
"""

import asyncio
import json
import os
import struct
import sys
import time
import argparse
import logging
from pathlib import Path

import numpy as np
import sounddevice as sd
import opuslib
import websockets
import aiohttp
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent.parent / '.env.local')

logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s %(message)s',
    datefmt='%H:%M:%S',
)
log = logging.getLogger(__name__)

# ─── Config ─────────────────────────────────────────────────────────────────

PERSONAPLEX_WS   = os.environ.get('RUNPOD_PERSONAPLEX_WS', '')  # wss://xxx.proxy.runpod.net:8998
SINK_IN          = os.environ.get('PULSEAUDIO_SINK_IN', 'openphone_out')   # prospect voice in
SINK_OUT         = os.environ.get('PULSEAUDIO_SINK_OUT', 'personaplex_out')  # AI voice out
CRM_URL          = os.environ.get('NEXT_PUBLIC_SUPABASE_URL', '').replace('supabase.co', 'localhost:3000').split('supabase')[0] + 'localhost:3000'
CRM_SECRET       = os.environ.get('CRON_SECRET', '')
BRIDGE_PORT      = int(os.environ.get('AUDIO_BRIDGE_PORT', '5051'))  # internal HTTP status port

SAMPLE_RATE      = 24000   # PersonaPlex native sample rate
CHANNELS         = 1
FRAME_DURATION   = 0.080   # 80ms Moshi frame size
FRAME_SAMPLES    = int(SAMPLE_RATE * FRAME_DURATION)  # 1920 samples
SILENCE_TIMEOUT  = 8.0     # seconds of silence before declaring call ended
SILENCE_THRESHOLD = 0.002  # RMS threshold for silence detection

# Moshi WebSocket message types
MSG_HANDSHAKE = 0x00
MSG_AUDIO     = 0x01
MSG_TEXT      = 0x02
MSG_CONTROL   = 0x03
MSG_METADATA  = 0x04
MSG_ERROR     = 0x05
MSG_PING      = 0x06

# ─── State ──────────────────────────────────────────────────────────────────

class BridgeState:
    def __init__(self):
        self.call_active = False
        self.call_session_id: str | None = None
        self.lead: dict | None = None
        self.transcript_lines: list[dict] = []
        self.last_audio_time = time.monotonic()
        self.inject_queue: asyncio.Queue = asyncio.Queue()
        self.transcript_queue: asyncio.Queue = asyncio.Queue()
        self.ws: websockets.WebSocketClientProtocol | None = None

state = BridgeState()

# ─── Opus Codec ─────────────────────────────────────────────────────────────

encoder = opuslib.Encoder(SAMPLE_RATE, CHANNELS, opuslib.APPLICATION_VOIP)
decoder = opuslib.Decoder(SAMPLE_RATE, CHANNELS)

def encode_frame(pcm_float32: np.ndarray) -> bytes:
    """Encode float32 PCM to Opus bytes."""
    pcm_int16 = (pcm_float32 * 32767).astype(np.int16)
    return encoder.encode(pcm_int16.tobytes(), FRAME_SAMPLES)

def decode_frame(opus_bytes: bytes) -> np.ndarray:
    """Decode Opus bytes to float32 PCM."""
    pcm_bytes = decoder.decode(opus_bytes, FRAME_SAMPLES)
    pcm_int16 = np.frombuffer(pcm_bytes, dtype=np.int16)
    return pcm_int16.astype(np.float32) / 32767.0

def make_ws_message(msg_type: int, payload: bytes) -> bytes:
    """Prefix payload with 1-byte message type (Moshi protocol)."""
    return bytes([msg_type]) + payload

def parse_ws_message(data: bytes) -> tuple[int, bytes]:
    """Parse Moshi protocol message: (type, payload)."""
    return data[0], data[1:]

# ─── PulseAudio I/O ─────────────────────────────────────────────────────────

audio_in_queue: asyncio.Queue[np.ndarray] = asyncio.Queue(maxsize=20)
audio_out_queue: asyncio.Queue[np.ndarray] = asyncio.Queue(maxsize=20)
loop: asyncio.AbstractEventLoop | None = None

def audio_in_callback(indata, frames, time_info, status):
    """sounddevice callback — runs in audio thread, pushes to asyncio queue."""
    if status:
        log.warning(f"Audio in status: {status}")
    if loop and not loop.is_closed():
        pcm = indata[:, 0].copy()  # mono
        asyncio.run_coroutine_threadsafe(
            audio_in_queue.put(pcm), loop
        )
        # Update silence detection
        rms = float(np.sqrt(np.mean(pcm**2)))
        if rms > SILENCE_THRESHOLD:
            state.last_audio_time = time.monotonic()

def audio_out_callback(outdata, frames, time_info, status):
    """sounddevice callback — pulls from asyncio queue into output."""
    if status:
        log.warning(f"Audio out status: {status}")
    if not audio_out_queue.empty():
        try:
            pcm = audio_out_queue.get_nowait()
            if len(pcm) >= frames:
                outdata[:, 0] = pcm[:frames]
            else:
                outdata[:len(pcm), 0] = pcm
                outdata[len(pcm):, 0] = 0.0
        except asyncio.QueueEmpty:
            outdata[:] = 0.0
    else:
        outdata[:] = 0.0

# ─── PersonaPlex Session ─────────────────────────────────────────────────────

async def personaplex_session(lead: dict):
    """
    Open a PersonaPlex WebSocket session for one call.
    - Injects persona prompt with lead variables
    - Streams audio both ways
    - Forwards text tokens to transcript queue
    - Accepts injections from inject_queue
    """
    if not PERSONAPLEX_WS:
        log.error("RUNPOD_PERSONAPLEX_WS not set in .env.local")
        return

    prompt_path = Path(__file__).parent / 'prompts' / 'nexorra-caller.txt'
    prompt_template = prompt_path.read_text()
    persona_prompt = prompt_template.format(
        first_name=lead.get('first_name', 'there'),
        brokerage=lead.get('source_brokerage', 'your brokerage').upper(),
        city=lead.get('city', 'your area'),
    )

    log.info(f"Connecting to PersonaPlex: {PERSONAPLEX_WS}")
    async with websockets.connect(PERSONAPLEX_WS, max_size=None) as ws:
        state.ws = ws

        # Handshake
        await ws.send(make_ws_message(MSG_HANDSHAKE, bytes([0x01, 0x00])))

        # Inject persona prompt via sendText (drip at 20 chars/80ms)
        await drip_inject(ws, persona_prompt)

        # Start concurrent tasks
        await asyncio.gather(
            send_audio_loop(ws),
            recv_loop(ws),
            inject_loop(ws),
        )

async def send_audio_loop(ws):
    """Continuously encode and send audio frames to PersonaPlex."""
    buffer = np.zeros(0, dtype=np.float32)
    while state.call_active:
        try:
            chunk = await asyncio.wait_for(audio_in_queue.get(), timeout=0.1)
        except asyncio.TimeoutError:
            continue
        buffer = np.concatenate([buffer, chunk])
        while len(buffer) >= FRAME_SAMPLES:
            frame = buffer[:FRAME_SAMPLES]
            buffer = buffer[FRAME_SAMPLES:]
            try:
                opus = encode_frame(frame)
                await ws.send(make_ws_message(MSG_AUDIO, opus))
            except Exception as e:
                log.warning(f"Send audio error: {e}")
                return

async def recv_loop(ws):
    """Receive audio + text from PersonaPlex, route appropriately."""
    async for raw in ws:
        if isinstance(raw, bytes) and len(raw) > 1:
            msg_type, payload = parse_ws_message(raw)

            if msg_type == MSG_AUDIO:
                try:
                    pcm = decode_frame(payload)
                    if not audio_out_queue.full():
                        audio_out_queue.put_nowait(pcm)
                except Exception as e:
                    log.warning(f"Decode error: {e}")

            elif msg_type == MSG_TEXT:
                token = payload.decode('utf-8', errors='replace')
                if token.strip():
                    await state.transcript_queue.put({
                        'speaker': 'agent',
                        'text': token,
                        'timestamp_ms': int(time.monotonic() * 1000),
                    })

            elif msg_type == MSG_ERROR:
                log.error(f"PersonaPlex error: {payload.decode()}")

async def inject_loop(ws):
    """Watch inject_queue and drip text back into PersonaPlex at 20 chars/80ms."""
    while state.call_active:
        try:
            text = await asyncio.wait_for(state.inject_queue.get(), timeout=0.5)
        except asyncio.TimeoutError:
            continue
        await drip_inject(ws, text)

async def drip_inject(ws, text: str):
    """Drip-feed text into Moshi at 20 chars/80ms to avoid degeneration."""
    chunks = [text[i:i+20] for i in range(0, len(text), 20)]
    for chunk in chunks:
        try:
            payload = make_ws_message(MSG_TEXT, chunk.encode('utf-8'))
            await ws.send(payload)
            await asyncio.sleep(0.080)
        except Exception as e:
            log.warning(f"Drip inject error: {e}")
            break

# ─── Call Lifecycle ──────────────────────────────────────────────────────────

async def start_call(lead: dict, call_session_id: str):
    """Called by orchestrator when a call connects."""
    state.call_active = True
    state.call_session_id = call_session_id
    state.lead = lead
    state.transcript_lines = []
    state.last_audio_time = time.monotonic()
    log.info(f"Call started — {lead.get('full_name')} ({lead.get('phone')})")

    await asyncio.gather(
        personaplex_session(lead),
        silence_watchdog(),
    )

async def end_call(outcome: str = 'completed'):
    """Gracefully end the call, save transcript, notify CRM."""
    if not state.call_active:
        return
    state.call_active = False
    log.info(f"Call ending — outcome: {outcome}")

    transcript_text = '\n'.join(
        f"[{t['speaker'].upper()}] {t['text']}"
        for t in state.transcript_lines
    )

    payload = {
        'call_session_id': state.call_session_id,
        'transcript_lines': state.transcript_lines,
        'outcome': outcome,
        'duration_seconds': int(time.monotonic() - state.last_audio_time),
        'transcript': transcript_text,
    }

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                'http://localhost:3000/api/internal/call-completed',
                json=payload,
                headers={'Authorization': f'Bearer {CRM_SECRET}'},
                timeout=aiohttp.ClientTimeout(total=10),
            ) as resp:
                if resp.status == 200:
                    log.info("Transcript saved to CRM.")
                else:
                    log.warning(f"CRM save failed: {resp.status}")
    except Exception as e:
        log.warning(f"Could not reach CRM: {e}")

    state.call_session_id = None
    state.lead = None

async def silence_watchdog():
    """End call if >SILENCE_TIMEOUT seconds of silence detected."""
    while state.call_active:
        await asyncio.sleep(1.0)
        silence_duration = time.monotonic() - state.last_audio_time
        if silence_duration > SILENCE_TIMEOUT:
            log.info(f"Silence timeout ({SILENCE_TIMEOUT}s) — ending call.")
            await end_call('completed')
            return

# ─── HTTP Status Server ──────────────────────────────────────────────────────

async def http_handler(request):
    """Simple HTTP server for orchestrator to poll call status."""
    if request.method == 'GET' and request.path == '/status':
        body = json.dumps({
            'active': state.call_active,
            'call_session_id': state.call_session_id,
            'lead_name': state.lead.get('full_name') if state.lead else None,
        })
        return aiohttp.web.Response(text=body, content_type='application/json')

    if request.method == 'POST' and request.path == '/start':
        data = await request.json()
        if state.call_active:
            return aiohttp.web.Response(status=409, text='Call already active')
        asyncio.create_task(start_call(data['lead'], data['call_session_id']))
        return aiohttp.web.Response(text='{"ok":true}', content_type='application/json')

    if request.method == 'POST' and request.path == '/end':
        data = await request.json()
        asyncio.create_task(end_call(data.get('outcome', 'completed')))
        return aiohttp.web.Response(text='{"ok":true}', content_type='application/json')

    if request.method == 'POST' and request.path == '/inject':
        data = await request.json()
        await state.inject_queue.put(data['text'])
        return aiohttp.web.Response(text='{"ok":true}', content_type='application/json')

    if request.method == 'POST' and request.path == '/transcript':
        data = await request.json()
        state.transcript_lines.append(data)
        await state.transcript_queue.put(data)
        return aiohttp.web.Response(text='{"ok":true}', content_type='application/json')

    return aiohttp.web.Response(status=404, text='Not found')

# ─── Main ────────────────────────────────────────────────────────────────────

async def main():
    global loop
    loop = asyncio.get_event_loop()

    parser = argparse.ArgumentParser()
    parser.add_argument('--test', action='store_true', help='Test mode: play a WAV file instead of PulseAudio')
    parser.add_argument('--test-wav', type=str, help='Path to WAV file for test mode')
    args = parser.parse_args()

    log.info("Starting Audio Bridge...")
    log.info(f"  PersonaPlex WS: {PERSONAPLEX_WS or '(not set)'}")
    log.info(f"  PulseAudio in:  {SINK_IN}.monitor")
    log.info(f"  PulseAudio out: {SINK_OUT}")
    log.info(f"  HTTP port:      {BRIDGE_PORT}")

    # Start audio streams
    with sd.InputStream(
        device=f'{SINK_IN}.monitor',
        samplerate=SAMPLE_RATE,
        channels=CHANNELS,
        dtype='float32',
        blocksize=FRAME_SAMPLES,
        callback=audio_in_callback,
    ), sd.OutputStream(
        device=SINK_OUT,
        samplerate=SAMPLE_RATE,
        channels=CHANNELS,
        dtype='float32',
        blocksize=FRAME_SAMPLES,
        callback=audio_out_callback,
    ):
        # Start HTTP server
        app = aiohttp.web.Application()
        app.router.add_route('*', '/{path_info:.*}', http_handler)
        runner = aiohttp.web.AppRunner(app)
        await runner.setup()
        site = aiohttp.web.TCPSite(runner, '127.0.0.1', BRIDGE_PORT)
        await site.start()
        log.info(f"Audio Bridge HTTP listening on port {BRIDGE_PORT}")

        if args.test:
            log.info("Test mode — waiting for /start call via HTTP")

        # Run until interrupted
        try:
            await asyncio.Event().wait()
        except KeyboardInterrupt:
            log.info("Shutting down.")
        finally:
            await runner.cleanup()

if __name__ == '__main__':
    asyncio.run(main())
