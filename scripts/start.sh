#!/bin/bash
echo "[startup] yt-dlp: $(yt-dlp --version 2>&1)"
echo "[startup] python: $(python3 --version 2>&1)"
echo "[startup] starting Node server"
exec node dist/server/index.js
