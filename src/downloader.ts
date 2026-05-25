import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';
import { log } from './logger';

export function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    log.info(`Created directory: ${dir}`);
  }
}

export function downloadVideo(input: string, tempDir: string): string {
  ensureDir(tempDir);

  const isUrl = input.startsWith('http://') || input.startsWith('https://');

  if (!isUrl) {
    const absPath = path.resolve(input);
    log.info(`Input detected as local file: ${absPath}`);

    if (!fs.existsSync(absPath)) {
      log.error(`Local file not found: ${absPath}`);
      throw new Error(`Local file not found: ${absPath}`);
    }

    const ext = path.extname(absPath) || '.mp4';
    const destPath = path.join(tempDir, `video${ext}`);
    log.step(`Copying local file to temp/`);
    log.info(`Source: ${absPath}`);
    log.info(`Destination: ${destPath}`);
    fs.copyFileSync(absPath, destPath);
    log.success(`Local file ready at: ${destPath}`);
    return destPath;
  }

  log.step(`Downloading video from URL`);
  log.info(`URL: ${input}`);

  const outputTemplate = path.join(tempDir, 'video.%(ext)s');
  const cmd = `yt-dlp --js-runtimes nodejs -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" --merge-output-format mp4 -o "${outputTemplate}" "${input}"`;

  log.info(`Running yt-dlp...`);

  try {
    execSync('yt-dlp --version', { stdio: 'pipe' });
  } catch {
    log.error('yt-dlp binary not found in PATH — check Dockerfile installation');
    throw new Error('yt-dlp not installed');
  }

  try {
    execSync(cmd, { stdio: ['inherit', 'pipe', 'pipe'] });
  } catch (err) {
    const e = err as { stderr?: Buffer; stdout?: Buffer };
    const detail = (e.stderr?.toString() || e.stdout?.toString() || '').trim().slice(0, 500);
    log.error(`yt-dlp failed: ${detail || '(no output)'}`);
    throw new Error('yt-dlp download failed');
  }

  const videoPath = path.join(tempDir, 'video.mp4');

  if (!fs.existsSync(videoPath)) {
    log.error(`Expected video.mp4 not found in temp/ after download.`);
    throw new Error('video.mp4 not found after yt-dlp download');
  }

  const stats = fs.statSync(videoPath);
  log.success(`Download complete: ${videoPath} (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);
  return videoPath;
}
