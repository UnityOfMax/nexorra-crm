#!/bin/bash
# setup-audio.sh — Create PulseAudio virtual audio devices for AI calling.
# Run once at boot (add to @reboot crontab or GNOME autostart).
# Safe to run multiple times — skips if devices already exist.

set -euo pipefail

log() { echo "[$(date '+%H:%M:%S')] $*"; }

# Check if sink already exists
sink_exists() {
  pactl list sinks short 2>/dev/null | grep -q "^[0-9]*[[:space:]]$1"
}

if sink_exists "openphone_out"; then
  log "openphone_out already loaded — skipping."
else
  pactl load-module module-null-sink \
    sink_name=openphone_out \
    sink_properties=device.description="OpenPhone-Speaker"
  log "Created null sink: openphone_out (OpenPhone-Speaker)"
fi

if sink_exists "personaplex_out"; then
  log "personaplex_out already loaded — skipping."
else
  pactl load-module module-null-sink \
    sink_name=personaplex_out \
    sink_properties=device.description="PersonaPlex-Mic"
  log "Created null sink: personaplex_out (PersonaPlex-Mic)"
fi

log "Virtual audio devices ready."
log ""
log "ONE-TIME MANUAL STEP (do this in OpenPhone settings once):"
log "  Speaker/Output  → 'OpenPhone-Speaker'  (null sink)"
log "  Microphone      → 'Monitor of PersonaPlex-Mic'  (monitor source)"
log ""
log "Audio flow:"
log "  Prospect voice → OpenPhone → OpenPhone-Speaker sink"
log "  Audio Bridge reads from openphone_out.monitor"
log "  PersonaPlex response → Audio Bridge → personaplex_out sink"
log "  OpenPhone microphone reads from personaplex_out.monitor"
