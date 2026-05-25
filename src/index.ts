import * as dotenv from 'dotenv';
dotenv.config();

import * as path from 'path';
import * as fs from 'fs';
import { log } from './logger';
import { downloadVideo } from './downloader';
import { runTranscription } from './transcriber';
import { analyzeTranscript } from './analyzer';
import { cutAllClips } from './clipper';
import { ClipOptions, ClipFormat, ClipQuality, DEFAULT_OPTIONS } from './types';

function parseArgs(): { input: string; options: ClipOptions } {
  const args = process.argv.slice(2);

  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : undefined;
  };
  const has = (flag: string) => args.includes(flag);

  const inputIdx = args.indexOf('--input');
  if (inputIdx === -1 || !args[inputIdx + 1]) {
    log.error('Missing --input argument.');
    log.error('Usage: npm start -- --input <URL-or-file> [--format portrait] [--quality 720p|1080p] [--captions]');
    process.exit(1);
  }

  const formatRaw = get('--format') ?? 'original';
  const qualityRaw = get('--quality') ?? 'best';

  const format: ClipFormat = formatRaw === 'portrait' ? 'portrait' : 'original';
  const quality: ClipQuality = ['720p', '1080p'].includes(qualityRaw) ? qualityRaw as ClipQuality : 'best';
  const captions = has('--captions');

  return {
    input: args[inputIdx + 1],
    options: { format, quality, captions },
  };
}

function validateEnv(): void {
  if (!process.env.ANTHROPIC_API_KEY) {
    log.error('ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key.');
    process.exit(1);
  }
  if (process.env.ANTHROPIC_API_KEY === 'your_api_key_here') {
    log.error('ANTHROPIC_API_KEY is still the placeholder. Open .env and set your key.');
    process.exit(1);
  }
  log.success('ANTHROPIC_API_KEY is set');
}

async function cleanup(tempDir: string): Promise<void> {
  if (fs.existsSync(tempDir)) {
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

async function main(): Promise<void> {
  log.step('=== MOSNIP — AI Video Clipping Tool ===');

  validateEnv();

  const { input, options } = parseArgs();
  log.info(`Input: ${input}`);
  log.info(`Format: ${options.format} | Quality: ${options.quality} | Captions: ${options.captions}`);

  const tempDir = path.resolve(process.cwd(), 'temp', `run-${Date.now()}`);

  try {
    log.step('[1/4] Downloading video');
    const videoPath = downloadVideo(input, tempDir);

    log.step('[2/4] Transcribing');
    const { transcriptPath, srtPath } = runTranscription(videoPath, tempDir);

    log.step('[3/4] Analyzing transcript');
    const clips = await analyzeTranscript(transcriptPath);
    if (clips.length === 0) {
      log.warn('No clips identified.');
      await cleanup(tempDir);
      process.exit(0);
    }

    log.step('[4/4] Cutting clips');
    const outputPaths = await cutAllClips(videoPath, clips, srtPath, options, tempDir);

    await cleanup(tempDir);

    log.step('=== COMPLETE ===');
    log.success(`${outputPaths.length} clips saved to output/:`);
    outputPaths.forEach((p, i) => log.success(`  ${i + 1}. ${path.basename(p)}`));
  } catch (err) {
    await cleanup(tempDir);
    log.error(`Pipeline failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

main().catch((err) => {
  log.error(`Unhandled error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
