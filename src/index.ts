import * as dotenv from 'dotenv';
dotenv.config();

import * as path from 'path';
import * as fs from 'fs';
import { log } from './logger';
import { downloadVideo } from './downloader';
import { runTranscription } from './transcriber';
import { analyzeTranscript } from './analyzer';
import { cutAllClips } from './clipper';

function parseArgs(): { input: string } {
  const args = process.argv.slice(2);
  const inputIdx = args.indexOf('--input');

  if (inputIdx === -1 || !args[inputIdx + 1]) {
    log.error('Missing --input argument.');
    log.error('Usage: npm start -- --input <YouTube-URL-or-local-file-path>');
    log.error('Examples:');
    log.error('  npm start -- --input "https://www.youtube.com/watch?v=dQw4w9WgXcQ"');
    log.error('  npm start -- --input ./my-video.mp4');
    process.exit(1);
  }

  return { input: args[inputIdx + 1] };
}

function validateEnv(): void {
  log.info('Validating environment...');

  if (!process.env.ANTHROPIC_API_KEY) {
    log.error('ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key.');
    process.exit(1);
  }

  if (process.env.ANTHROPIC_API_KEY === 'your_api_key_here') {
    log.error('ANTHROPIC_API_KEY is still the placeholder value. Open .env and set your key.');
    process.exit(1);
  }

  log.success('ANTHROPIC_API_KEY is set');
}

async function cleanup(tempDir: string): Promise<void> {
  log.step('Cleaning up temp/ directory');

  if (fs.existsSync(tempDir)) {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
      log.success('temp/ directory removed successfully');
    } catch (err) {
      log.warn(`Could not fully clean temp/: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

async function main(): Promise<void> {
  log.step('=== MOSNIP — AI Video Clipping Tool ===');
  log.info(`Started at: ${new Date().toISOString()}`);

  validateEnv();

  const { input } = parseArgs();
  log.info(`Input: ${input}`);

  const tempDir = path.resolve(process.cwd(), 'temp');

  try {
    log.step('[1/4] Locating / downloading video');
    const videoPath = downloadVideo(input, tempDir);

    log.step('[2/4] Transcribing video');
    const transcriptPath = runTranscription(videoPath, tempDir);

    log.step('[3/4] Analyzing transcript for viral moments');
    const clips = await analyzeTranscript(transcriptPath);

    if (clips.length === 0) {
      log.warn('No valid clips identified. Nothing to cut.');
      await cleanup(tempDir);
      process.exit(0);
    }

    log.step('[4/4] Cutting clips');
    const outputPaths = await cutAllClips(videoPath, clips);

    await cleanup(tempDir);

    log.step('=== COMPLETE ===');
    log.success(`${outputPaths.length} clips saved to output/:`);
    outputPaths.forEach((p, i) => {
      log.success(`  ${i + 1}. ${path.basename(p)}`);
    });
    log.info(`Finished at: ${new Date().toISOString()}`);
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
