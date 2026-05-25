FROM node:20-slim

# System dependencies: Python, pip, ffmpeg, curl
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp binary
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

# Install openai-whisper
RUN pip3 install openai-whisper --break-system-packages

# Pre-download Whisper base model so first job doesn't stall
RUN python3 -c "import whisper; whisper.load_model('base')"

WORKDIR /app

# Install server deps
COPY package*.json ./
RUN npm ci --omit=dev && npm install typescript ts-node @types/node @types/express @types/cors @types/fluent-ffmpeg

# Install and build client
COPY client/package*.json ./client/
RUN cd client && npm ci

COPY client/ ./client/
RUN cd client && npm run build

# Copy server source and compile
COPY . .
RUN npx tsc

EXPOSE 3000

CMD ["node", "dist/server/index.js"]
