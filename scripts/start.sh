#!/bin/bash
echo "[startup] yt-dlp: $(yt-dlp --version 2>&1)"
echo "[startup] python: $(python3 --version 2>&1)"
echo "[startup] node: $(node --version 2>&1)"

echo "[startup] checking for bgutil plugin..."
python3 -c "
import sys
found = []
for p in sys.path:
    import os
    for root, dirs, files in os.walk(p):
        for f in files:
            if 'bgutil' in f.lower() or 'getpot' in f.lower():
                found.append(os.path.join(root, f))
for f in found[:10]:
    print('  ' + f)
if not found:
    print('  (no bgutil/getpot files found in sys.path)')
" 2>&1

echo "[startup] starting Node server"
exec node dist/server/index.js
