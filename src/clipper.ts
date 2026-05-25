import ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import * as fs from 'fs';
import { log } from './logger';
import { ClipMoment } from './types';

const OUTPUT_DIR = path.resolve(process.cwd(), 'output');

function sanitizeFilename(title: string): string {
  return title
    .replace(/[^a-zA-Z0-9\s\-_]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function ensureOutputDir(): void {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    log.info(`Created output/ directory at ${OUTPUT_DIR}`);
  } else {
    log.info(`output/ directory exists at ${OUTPUT_DIR}`);
  }
}

function cutClip(videoPath: string, clip: ClipMoment, index: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const duration = clip.end - clip.start;
    const safeTitle = sanitizeFilename(clip.title);
    const rank = String(index + 1).padStart(2, '0');
    const outputFilename = `${rank}-${safeTitle}.mp4`;
    const outputPath = path.join(OUTPUT_DIR, outputFilename);

    log.step(`Cutting clip ${index + 1}/${5}: "${clip.title}"`);
    log.info(`  Virality score: ${clip.virality_score}/10`);
    log.info(`  Time range: ${clip.start.toFixed(1)}s → ${clip.end.toFixed(1)}s`);
    log.info(`  Duration: ${duration.toFixed(1)}s`);
    log.info(`  Output: ${outputPath}`);

    ffmpeg(videoPath)
      .setStartTime(clip.start)
      .setDuration(duration)
      .videoCodec('copy')
      .audioCodec('copy')
      .output(outputPath)
      .on('start', (cmd: string) => {
        log.info(`  FFmpeg started: ${cmd.slice(0, 120)}...`);
      })
      .on('progress', (progress: { percent?: number; timemark?: string }) => {
        if (progress.percent !== undefined && progress.percent > 0) {
          log.info(`  Progress: ${Math.round(progress.percent)}% (${progress.timemark ?? ''})`);
        }
      })
      .on('end', () => {
        const stats = fs.statSync(outputPath);
        log.success(`  Clip saved: ${outputFilename} (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);
        resolve(outputPath);
      })
      .on('error', (err: Error) => {
        log.error(`  Failed to cut clip "${clip.title}": ${err.message}`);
        reject(err);
      })
      .run();
  });
}

export async function cutAllClips(videoPath: string, clips: ClipMoment[]): Promise<string[]> {
  ensureOutputDir();

  log.step(`Cutting ${clips.length} clips from video`);
  log.info(`Source video: ${videoPath}`);
  log.info(`Output directory: ${OUTPUT_DIR}`);
  log.info(`Codec: copy (no re-encode — fast, keyframe-aligned cuts)`);

  const outputPaths: string[] = [];

  for (let i = 0; i < clips.length; i++) {
    try {
      const outputPath = await cutClip(videoPath, clips[i], i);
      outputPaths.push(outputPath);
    } catch (err) {
      log.error(`Skipping clip ${i + 1} due to error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  log.success(`All clips processed: ${outputPaths.length}/${clips.length} succeeded`);
  return outputPaths;
}
