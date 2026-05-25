import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';
import { log } from './logger';
import { ClipMoment, ClipOptions, DEFAULT_OPTIONS } from './types';

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
  }
}

interface SrtEntry { start: number; end: number; text: string }

function parseSrt(srtPath: string): SrtEntry[] {
  if (!srtPath || !fs.existsSync(srtPath)) return [];
  const raw = fs.readFileSync(srtPath, 'utf-8');
  const entries: SrtEntry[] = [];
  const blocks = raw.trim().split(/\n\n+/);
  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 3) continue;
    const timeLine = lines[1];
    const match = timeLine.match(/(\d+):(\d+):(\d+),(\d+)\s*-->\s*(\d+):(\d+):(\d+),(\d+)/);
    if (!match) continue;
    const toSec = (h: string, m: string, s: string, ms: string) =>
      parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s) + parseInt(ms) / 1000;
    entries.push({
      start: toSec(match[1], match[2], match[3], match[4]),
      end:   toSec(match[5], match[6], match[7], match[8]),
      text:  lines.slice(2).join('\n'),
    });
  }
  return entries;
}

function writeSrtForClip(entries: SrtEntry[], clipStart: number, clipEnd: number, outPath: string): boolean {
  const relevant = entries.filter(e => e.end > clipStart && e.start < clipEnd);
  if (relevant.length === 0) return false;

  const fmt = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    const ms = Math.round((s % 1) * 1000);
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')},${String(ms).padStart(3,'0')}`;
  };

  let content = '';
  let idx = 1;
  for (const e of relevant) {
    const s = Math.max(0, e.start - clipStart);
    const en = Math.min(clipEnd - clipStart, e.end - clipStart);
    content += `${idx}\n${fmt(s)} --> ${fmt(en)}\n${e.text}\n\n`;
    idx++;
  }
  fs.writeFileSync(outPath, content, 'utf-8');
  return true;
}

function buildFfmpegCmd(
  videoPath: string,
  outputPath: string,
  clip: ClipMoment,
  srtFilename: string | null,
  options: ClipOptions
): string {
  const duration = clip.end - clip.start;
  const needsReencode = options.format === 'portrait' || options.captions || options.quality !== 'best';

  const base = `ffmpeg -y -ss ${clip.start} -t ${duration} -i "${videoPath}"`;

  if (!needsReencode) {
    return `${base} -c copy "${outputPath}"`;
  }

  // Build filter chain
  const filters: string[] = [];
  let lastOut = '0:v';

  if (options.format === 'portrait') {
    const pw = options.quality === '720p' ? 720 : 1080;
    const ph = options.quality === '720p' ? 1280 : 1920;
    filters.push(`[0:v]scale=${pw}:${ph}:force_original_aspect_ratio=increase,crop=${pw}:${ph},boxblur=luma_radius=20:luma_power=1[bg]`);
    filters.push(`[0:v]scale=${pw}:${ph}:force_original_aspect_ratio=decrease[fg]`);
    filters.push(`[bg][fg]overlay=(W-w)/2:(H-h)/2[v0]`);
    lastOut = 'v0';
  } else if (options.quality !== 'best') {
    const h = options.quality === '720p' ? 720 : 1080;
    filters.push(`[0:v]scale=-2:${h}[v0]`);
    lastOut = 'v0';
  }

  if (options.captions && srtFilename) {
    const captionStyle = "FontName=Arial,FontSize=20,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Outline=2,Shadow=1,Alignment=2,MarginV=40";
    const nextOut = 'vout';
    filters.push(`[${lastOut}]subtitles='${srtFilename}':force_style='${captionStyle}'[${nextOut}]`);
    lastOut = nextOut;
  } else if (filters.length > 0) {
    // Rename last output to vout
    const last = filters[filters.length - 1];
    filters[filters.length - 1] = last.replace(`[${lastOut}]`, '[vout]');
    lastOut = 'vout';
  }

  const filterArg = filters.length > 0
    ? `-filter_complex "${filters.join(';')}" -map "[${lastOut}]" -map 0:a?`
    : '';

  return `${base} ${filterArg} -c:v libx264 -crf 22 -preset fast -c:a aac -b:a 128k "${outputPath}"`;
}

function cutClip(
  videoPath: string,
  clip: ClipMoment,
  index: number,
  srtEntries: SrtEntry[],
  tempDir: string,
  options: ClipOptions
): Promise<string> {
  return new Promise((resolve, reject) => {
    const safeTitle = sanitizeFilename(clip.title);
    const rank = String(index + 1).padStart(2, '0');
    const outputPath = path.join(OUTPUT_DIR, `${rank}-${safeTitle}.mp4`);

    log.step(`Cutting clip ${index + 1}: "${clip.title}"`);
    log.info(`  Score: ${clip.virality_score}/10 | ${clip.start.toFixed(1)}s → ${clip.end.toFixed(1)}s`);

    // Write clip-specific SRT if captions enabled
    let srtFilename: string | null = null;
    if (options.captions && srtEntries.length > 0) {
      const srtPath = path.join(tempDir, `sub_${index}.srt`);
      const ok = writeSrtForClip(srtEntries, clip.start, clip.end, srtPath);
      if (ok) srtFilename = path.basename(srtPath);
    }

    const cmd = buildFfmpegCmd(videoPath, outputPath, clip, srtFilename, options);
    log.info(`  Options: format=${options.format} quality=${options.quality} captions=${options.captions}`);

    try {
      // Run ffmpeg from tempDir so relative SRT path resolves correctly
      execSync(cmd, { stdio: 'inherit', cwd: tempDir });
      const stats = fs.statSync(outputPath);
      log.success(`  Saved: ${path.basename(outputPath)} (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);
      resolve(outputPath);
    } catch (err) {
      log.error(`  Failed: ${err instanceof Error ? err.message : String(err)}`);
      reject(err);
    }
  });
}

export async function cutAllClips(
  videoPath: string,
  clips: ClipMoment[],
  srtPath: string,
  options: ClipOptions = DEFAULT_OPTIONS,
  tempDir: string = path.dirname(videoPath),
): Promise<string[]> {
  ensureOutputDir();
  log.step(`Cutting ${clips.length} clips`);
  log.info(`Output: ${OUTPUT_DIR}`);

  const srtEntries = options.captions ? parseSrt(srtPath) : [];
  if (options.captions && srtEntries.length === 0) {
    log.warn('Captions requested but no SRT data found — captions will be skipped');
  }

  const outputPaths: string[] = [];
  for (let i = 0; i < clips.length; i++) {
    try {
      const outputPath = await cutClip(videoPath, clips[i], i, srtEntries, tempDir, options);
      outputPaths.push(outputPath);
    } catch {
      log.error(`Skipping clip ${i + 1} due to error`);
    }
  }

  log.success(`Done: ${outputPaths.length}/${clips.length} clips saved`);
  return outputPaths;
}
