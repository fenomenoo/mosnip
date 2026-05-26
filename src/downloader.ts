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
    fs.copyFileSync(absPath, destPath);
    log.success(`Local file ready at: ${destPath}`);
    return destPath;
  }

  log.step(`Downloading video from URL`);
  log.info(`URL: ${input}`);

  try {
    execSync('yt-dlp --version', { stdio: 'pipe' });
  } catch {
    log.error('yt-dlp binary not found in PATH');
    throw new Error('yt-dlp not installed');
  }

  let cookiesFlag = '';
  const ytCookies = process.env.YOUTUBE_COOKIES;
  if (ytCookies) {
    const cookiesPath = '/tmp/yt-cookies.txt';
    fs.writeFileSync(cookiesPath, ytCookies, 'utf-8');
    cookiesFlag = `--cookies "${cookiesPath}"`;
    log.info('Using YouTube cookies for authentication');
  }

  const proxy = process.env.YTDLP_PROXY;
  const videoPath = path.join(tempDir, 'video.mp4');

  if (proxy) {
    // Cloud mode: full download via proxy
    log.info('Using proxy for download');
    const proxyFlag = `--proxy "${proxy}"`;
    const outputTemplate = path.join(tempDir, 'video.%(ext)s');
    const cmd = `yt-dlp ${cookiesFlag} ${proxyFlag} --js-runtimes node -f "best[ext=mp4]/best[height<=1080]" --merge-output-format mp4 -o "${outputTemplate}" "${input}"`;
    try {
      execSync(cmd, { stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 10 * 1024 * 1024 });
    } catch (err) {
      const e = err as { stderr?: Buffer; stdout?: Buffer; message?: string };
      const combined = ((e.stderr?.toString() ?? '') + (e.stdout?.toString() ?? '')).trim();
      log.error(`yt-dlp failed:\n${combined.split('\n').slice(-30).join('\n') || e.message}`);
      throw new Error('yt-dlp download failed');
    }
  } else {
    // Local mode: yt-dlp handles everything directly (best quality, no proxy needed)
    log.info('Running yt-dlp (local mode)...');
    const outputTemplate = path.join(tempDir, 'video.%(ext)s');
    const cmd = `yt-dlp ${cookiesFlag} -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" --merge-output-format mp4 -o "${outputTemplate}" "${input}"`;
    try {
      execSync(cmd, { stdio: 'inherit' });
    } catch (err) {
      const e = err as { message?: string };
      log.error(`yt-dlp failed: ${e.message ?? '(no output)'}`);
      throw new Error('yt-dlp download failed');
    }
  }

  if (!fs.existsSync(videoPath)) {
    log.error('video.mp4 not found after download');
    throw new Error('video.mp4 not found after download');
  }

  const stats = fs.statSync(videoPath);
  log.success(`Download complete: ${videoPath} (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);
  return videoPath;
}
