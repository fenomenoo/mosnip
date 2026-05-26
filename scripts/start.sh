#!/bin/bash
set -e

# Start bgutil PO token server in background (port 4416)
# This generates browser-proof tokens so yt-dlp bypasses YouTube bot detection
# without needing user cookies
python3 -m bgutil_ytdlp_pot_provider server --port 4416 &
BGUTIL_PID=$!

echo "[startup] bgutil PO token server started (pid $BGUTIL_PID)"

# Give it 3 seconds to be ready before the Node server starts accepting jobs
sleep 3

echo "[startup] starting Node server"
exec node dist/server/index.js
