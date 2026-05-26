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
    // Decode base64 if stored that way (multiline cookies encoded for safe CLI transport)
    let cookiesContent: string;
    try {
      const decoded = Buffer.from(ytCookies.trim(), 'base64').toString('utf-8');
      cookiesContent = decoded.includes('\t') ? decoded : ytCookies;
    } catch {
      cookiesContent = ytCookies;
    }
    fs.writeFileSync(cookiesPath, cookiesContent, 'utf-8');
    cookiesFlag = `--cookies "${cookiesPath}"`;
    log.info('Using YouTube cookies for authentication');
  }

  const proxy = process.env.YTDLP_PROXY;
  const videoPath = path.join(tempDir, 'video.mp4');

  if (proxy) {
    // Cloud mode: proxy only for URL resolution (~10KB), download CDN URLs directly (saves bandwidth)
    log.info('Resolving video URLs via proxy...');
    const proxyFlag = `--proxy "${proxy}"`;
    let directUrls: string[];
    try {
      // bgutil PO token server (port 4416) handles bot detection automatically via yt-dlp plugin
      const getUrlCmd = `yt-dlp ${proxyFlag} --js-runtimes node --get-url -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best[height<=1080]" "${input}"`;
      const output = execSync(getUrlCmd, { stdio: 'pipe', maxBuffer: 2 * 1024 * 1024 }).toString().trim();
      directUrls = output.split('\n').filter(Boolean);
      log.info(`Resolved ${directUrls.length} CDN URL(s) — downloading directly`);
    } catch (err) {
      const e = err as { stderr?: Buffer; stdout?: Buffer; message?: string };
      const combined = ((e.stderr?.toString() ?? '') + (e.stdout?.toString() ?? '')).trim();
      log.error(`yt-dlp URL resolution failed:\n${combined.split('\n').slice(-20).join('\n') || e.message}`);
      throw new Error('yt-dlp download failed');
    }

    if (directUrls.length === 1) {
      // Progressive stream — download directly without proxy
      log.info('Downloading progressive stream...');
      try {
        execSync(`yt-dlp --no-playlist -o "${videoPath}" "${directUrls[0]}"`, { stdio: 'pipe', maxBuffer: 10 * 1024 * 1024 });
      } catch (err) {
        const e = err as { stderr?: Buffer; message?: string };
        log.error(`Direct download failed: ${e.stderr?.toString()?.trim() || e.message}`);
        throw new Error('Video download failed');
      }
    } else if (directUrls.length >= 2) {
      // DASH streams — download video+audio separately then merge
      log.info('Downloading DASH video+audio streams...');
      const videoRaw = path.join(tempDir, 'video_raw.mp4');
      const audioRaw = path.join(tempDir, 'audio_raw.m4a');
      try {
        execSync(`yt-dlp --no-playlist -o "${videoRaw}" "${directUrls[0]}"`, { stdio: 'pipe', maxBuffer: 10 * 1024 * 1024 });
        execSync(`yt-dlp --no-playlist -o "${audioRaw}" "${directUrls[1]}"`, { stdio: 'pipe', maxBuffer: 10 * 1024 * 1024 });
        execSync(`ffmpeg -y -i "${videoRaw}" -i "${audioRaw}" -c copy "${videoPath}"`, { stdio: 'pipe' });
      } catch (err) {
        const e = err as { stderr?: Buffer; message?: string };
        log.error(`DASH download/merge failed: ${e.stderr?.toString()?.trim() || e.message}`);
        throw new Error('Video download failed');
      } finally {
        if (fs.existsSync(videoRaw)) fs.unlinkSync(videoRaw);
        if (fs.existsSync(audioRaw)) fs.unlinkSync(audioRaw);
      }
    } else {
      throw new Error('No download URLs resolved from yt-dlp');
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
