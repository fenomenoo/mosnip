# Mosnip

AI-powered video clipping tool. Downloads a YouTube video (or uses a local file), transcribes it, asks Claude to identify the top 5 viral moments, then cuts and saves each clip automatically.

## How it works

```
Input (URL or file)
  → yt-dlp downloads video to temp/
  → FFmpeg extracts audio (16kHz WAV)
  → Whisper transcribes with word timestamps
  → Claude (claude-sonnet-4-20250514) identifies top 5 viral moments
  → fluent-ffmpeg cuts each clip → output/
  → temp/ cleaned up automatically
```

## Prerequisites

Install these system tools before running Mosnip:

### 1. Node.js
Version 18 or higher. Download from https://nodejs.org

### 2. ffmpeg
Used for audio extraction and video clipping.

- **Windows**: `winget install ffmpeg` or download from https://ffmpeg.org/download.html
- **macOS**: `brew install ffmpeg`
- **Linux**: `sudo apt install ffmpeg`

Verify: `ffmpeg -version`

### 3. yt-dlp
Used to download YouTube videos.

- **All platforms**: `pip install yt-dlp` or download binary from https://github.com/yt-dlp/yt-dlp/releases
- **Windows (winget)**: `winget install yt-dlp`

Verify: `yt-dlp --version`

### 4. Whisper (openai-whisper)
Used for speech-to-text transcription.

```bash
pip install openai-whisper
```

Requires Python 3.8+ and `ffmpeg` (already covered above).

Verify: `whisper --help`

> **Note on first run:** Whisper downloads the model weights on first use (~150 MB for `base`). This is automatic.

---

## Installation

```bash
# Clone or copy this project, then:
npm install
```

## Configuration

```bash
cp .env.example .env
```

Open `.env` and replace `your_api_key_here` with your Anthropic API key.
Get a key at https://console.anthropic.com/

```
ANTHROPIC_API_KEY=sk-ant-...
```

---

## Usage

### YouTube URL

```bash
npm start -- --input "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
```

### Local video file

```bash
npm start -- --input ./my-video.mp4
npm start -- --input "C:\Videos\interview.mp4"
```

---

## Output

Clips are saved in the `output/` folder, numbered and named by title:

```
output/
  01-Shocking-Reveal-Moment.mp4   ← virality score 9/10
  02-Hilarious-Reaction.mp4       ← virality score 8/10
  03-Key-Insight-Explained.mp4    ← virality score 7/10
  04-Emotional-Turning-Point.mp4  ← virality score 6/10
  05-Strong-Opening-Hook.mp4      ← virality score 5/10
```

Clips are sorted highest virality score first. The `temp/` folder is deleted automatically after clips are cut.

---

## Whisper model quality

The default model is `base` (fast, good quality). For better accuracy, edit `src/transcriber.ts` and change `--model base` to:

| Model   | Size   | Speed   | Accuracy |
|---------|--------|---------|----------|
| tiny    | 75 MB  | fastest | lowest   |
| base    | 150 MB | fast    | good     |
| small   | 500 MB | medium  | better   |
| medium  | 1.5 GB | slow    | great    |
| large   | 3 GB   | slowest | best     |

---

## Build (compile TypeScript)

```bash
npm run build
node dist/index.js --input "https://..."
```

---

## Troubleshooting

**`yt-dlp: command not found`**
Install yt-dlp and ensure it's on your PATH.

**`ffmpeg: command not found`**
Install ffmpeg and ensure it's on your PATH.

**`whisper: command not found`**
Run `pip install openai-whisper`. Make sure Python's bin directory is on your PATH.

**`ANTHROPIC_API_KEY is not set`**
Copy `.env.example` to `.env` and add your API key.

**Clips are slightly longer/shorter than expected**
This is normal with codec copy mode — cuts happen at keyframe boundaries (typically ±2 seconds). For frame-accurate cuts, change `videoCodec('copy')` to `videoCodec('libx264')` in `src/clipper.ts` (slower but precise).
