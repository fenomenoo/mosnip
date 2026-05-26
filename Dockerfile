FROM node:20-bookworm-slim

# System dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Python venv — install yt-dlp via pip (required for plugin discovery)
# and bgutil-ytdlp-pot-provider (generates PO tokens to bypass YouTube bot detection)
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --upgrade pip \
    && pip install "yt-dlp>=2024.12.13" faster-whisper "bgutil-ytdlp-pot-provider"

# Pre-download Whisper base model
RUN python3 -c "from faster_whisper import WhisperModel; WhisperModel('base', device='cpu', compute_type='int8')"

WORKDIR /app

# Install ALL node deps (including devDeps needed for tsc)
COPY package*.json ./
RUN npm ci

# Install and build client
COPY client/package*.json ./client/
RUN cd client && npm ci
COPY client/ ./client/
RUN cd client && npm run build

# Copy source and compile TypeScript
COPY . .
RUN npx tsc && test -f dist/server/index.js

# Pre-create runtime dirs
RUN mkdir -p /app/output /app/temp

# Prune dev deps after build
RUN npm prune --omit=dev

COPY scripts/start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 3000
CMD ["/start.sh"]
