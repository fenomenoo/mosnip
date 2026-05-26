#!/bin/bash

echo "[startup] yt-dlp: $(yt-dlp --version 2>&1)"
echo "[startup] python: $(python3 --version 2>&1)"
echo "[startup] bgutil check: $(python3 -c 'import bgutil_ytdlp_pot_provider; print("OK")' 2>&1)"

# Start bgutil PO token server (generates browser-proof tokens for yt-dlp)
python3 -m bgutil_ytdlp_pot_provider server --port 4416 > /tmp/bgutil.log 2>&1 &
BGUTIL_PID=$!
echo "[startup] bgutil server started (pid=$BGUTIL_PID)"

# Wait for bgutil to be ready
sleep 4
echo "[startup] bgutil log: $(cat /tmp/bgutil.log 2>/dev/null | head -5)"

echo "[startup] starting Node server"
exec node dist/server/index.js
