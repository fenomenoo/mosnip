FROM node:20-bookworm-slim

# System dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp binary
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
    -o /usr/local/bin/yt-dlp && chmod a+rx /usr/local/bin/yt-dlp

# Create venv for Python packages (avoids --break-system-packages issues)
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install openai-whisper inside venv
RUN pip install --upgrade pip && pip install openai-whisper

# Pre-download Whisper base model so first job doesn't stall
RUN python3 -c "import whisper; whisper.load_model('base')"

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

# Pre-create runtime dirs so container doesn't need to mkdir at startup
RUN mkdir -p /app/output /app/temp

# Prune dev deps after build
RUN npm prune --omit=dev

EXPOSE 3000
CMD ["node", "dist/server/index.js"]
