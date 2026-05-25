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

  let proxyFlag = '';
  const proxy = process.env.YTDLP_PROXY;
  if (proxy) {
    proxyFlag = `--proxy "${proxy}"`;
    log.info('Using proxy for URL resolution');
  }

  // Use proxy+cookies only to resolve the signed video URL (few KB of data)
  // Then download the actual video directly — zero proxy bandwidth for the video itself
  log.info('Resolving direct download URL...');
  let directUrl: string;
  try {
    const getUrlCmd = `yt-dlp ${cookiesFlag} ${proxyFlag} --get-url -f "best[ext=mp4]/best[height<=1080]" "${input}"`;
    const output = execSync(getUrlCmd, { stdio: 'pipe', maxBuffer: 2 * 1024 * 1024 }).toString().trim();
    directUrl = output.split('\n')[0];
    log.info('Download URL resolved');
  } catch (err) {
    const e = err as { stderr?: Buffer; stdout?: Buffer; message?: string };
    const combined = ((e.stderr?.toString() ?? '') + (e.stdout?.toString() ?? '')).trim();
    const lastLines = combined.split('\n').slice(-30).join('\n');
    log.error(`yt-dlp failed:\n${lastLines || e.message || '(no output)'}`);
    throw new Error('yt-dlp download failed');
  }

  // Download the video directly from YouTube's CDN (no proxy needed here)
  const videoPath = path.join(tempDir, 'video.mp4');
  log.info('Downloading video file...');
  try {
    execSync(`curl -L -o "${videoPath}" "${directUrl}"`, { stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 5 * 1024 * 1024 });
  } catch (err) {
    const e = err as { stderr?: Buffer; message?: string };
    log.error(`curl download failed: ${e.stderr?.toString()?.trim() || e.message}`);
    throw new Error('Video download failed');
  }

  if (!fs.existsSync(videoPath)) {
    log.error('video.mp4 not found after download');
    throw new Error('video.mp4 not found after download');
  }

  const stats = fs.statSync(videoPath);
  log.success(`Download complete: ${videoPath} (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);
  return videoPath;
}
