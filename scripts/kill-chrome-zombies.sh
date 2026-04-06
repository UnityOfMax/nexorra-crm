#!/bin/bash
# Kill accumulated Chrome renderer + GPU processes for video pipeline ports.
# Keeps 1 renderer per port (was 2); kills GPU excess; runs every 2 min via cron.
# Min age 90s to avoid killing active captures.
TOTAL=0
MIN_AGE=90   # Don't kill processes younger than 90s

for port in 9224 9226 9227 9228 9229 9230 9231; do
  # --- Renderer processes ---
  mapfile -t rpids < <(ps aux | grep "chrome-video-${port}" | grep "type=renderer" | grep -v grep | awk '{print $2}' | sort -n)
  rcount=${#rpids[@]}
  if [ "$rcount" -gt 1 ]; then
    # Keep only the newest renderer; kill the rest if old enough
    for pid in "${rpids[@]:0:$((rcount - 1))}"; do
      age=$(ps -o etimes= -p "$pid" 2>/dev/null | tr -d ' ')
      [ -z "$age" ] && continue
      [ "$age" -lt "$MIN_AGE" ] && continue
      kill "$pid" 2>/dev/null && TOTAL=$((TOTAL+1))
    done
  fi

  # --- GPU processes (keep only the newest 1) ---
  mapfile -t gpids < <(ps aux | grep "chrome-video-${port}" | grep "type=gpu-process" | grep -v grep | awk '{print $2}' | sort -n)
  gcount=${#gpids[@]}
  if [ "$gcount" -gt 1 ]; then
    for pid in "${gpids[@]:0:$((gcount - 1))}"; do
      age=$(ps -o etimes= -p "$pid" 2>/dev/null | tr -d ' ')
      [ -z "$age" ] && continue
      [ "$age" -lt "$MIN_AGE" ] && continue
      kill "$pid" 2>/dev/null && TOTAL=$((TOTAL+1))
    done
  fi
done

[ "$TOTAL" -gt 0 ] && echo "$(date): Killed $TOTAL zombie Chrome processes (renderers+GPU, age>${MIN_AGE}s)"
