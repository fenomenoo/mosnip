import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';
import { log } from './logger';

export function extractAudio(videoPath: string, tempDir: string): string {
  const audioPath = path.join(tempDir, 'audio.wav');

  log.step('Extracting audio from video');
  log.info(`Settings: 16kHz mono PCM`);

  try {
    execSync(
      `ffmpeg -y -i "${videoPath}" -ar 16000 -ac 1 -c:a pcm_s16le "${audioPath}"`,
      { stdio: 'inherit' }
    );
  } catch {
    log.error('FFmpeg audio extraction failed.');
    throw new Error('FFmpeg audio extraction failed');
  }

  if (!fs.existsSync(audioPath)) {
    throw new Error('audio.wav not found after ffmpeg extraction');
  }

  const stats = fs.statSync(audioPath);
  log.success(`Audio extracted (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);
  return audioPath;
}

function fmtSrtTime(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.round((s % 1) * 1000);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')},${String(ms).padStart(3,'0')}`;
}

async function transcribeWithGroq(audioPath: string, tempDir: string): Promise<{ transcriptPath: string; srtPath: string }> {
  const groqKey = process.env.GROQ_API_KEY!;
  const transcriptPath = path.join(tempDir, 'transcript.txt');
  const srtPath = path.join(tempDir, 'transcript.srt');

  // Compress wav → mp3 so it fits under Groq's 25MB limit
  const mp3Path = path.join(tempDir, 'audio.mp3');
  log.info('Compressing audio for upload...');
  execSync(`ffmpeg -y -i "${audioPath}" -b:a 32k -ac 1 "${mp3Path}"`, { stdio: 'pipe' });

  let uploadPath = mp3Path;
  let fileSize = fs.statSync(mp3Path).size;

  // If still too large, re-compress at 16kbps
  if (fileSize > 24 * 1024 * 1024) {
    log.info('Still large, re-compressing at 16kbps...');
    execSync(`ffmpeg -y -i "${audioPath}" -b:a 16k -ac 1 "${mp3Path}"`, { stdio: 'pipe' });
    fileSize = fs.statSync(mp3Path).size;
  }

  log.info(`Uploading ${(fileSize / 1024 / 1024).toFixed(1)} MB to Groq Whisper API...`);

  const fileBuffer = fs.readFileSync(uploadPath);
  const blob = new Blob([fileBuffer], { type: 'audio/mpeg' });
  const formData = new FormData();
  formData.append('file', blob, 'audio.mp3');
  formData.append('model', 'whisper-large-v3-turbo');
  formData.append('response_format', 'verbose_json');

  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${groqKey}` },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq API error ${response.status}: ${err}`);
  }

  const result = await response.json() as {
    text: string;
    segments?: Array<{ start: number; end: number; text: string }>;
  };

  fs.writeFileSync(transcriptPath, result.text, 'utf-8');
  log.success(`Transcript saved (~${result.text.split(/\s+/).filter(Boolean).length} words)`);

  if (result.segments?.length) {
    let srtContent = '';
    result.segments.forEach((seg, i) => {
      srtContent += `${i + 1}\n${fmtSrtTime(seg.start)} --> ${fmtSrtTime(seg.end)}\n${seg.text.trim()}\n\n`;
    });
    fs.writeFileSync(srtPath, srtContent, 'utf-8');
    log.info('SRT subtitle file generated');
  }

  return { transcriptPath, srtPath: fs.existsSync(srtPath) ? srtPath : '' };
}

async function transcribeWithLocal(audioPath: string, tempDir: string): Promise<{ transcriptPath: string; srtPath: string }> {
  const transcriptPath = path.join(tempDir, 'transcript.txt');
  const srtPath = path.join(tempDir, 'transcript.srt');
  const scriptPath = path.join(process.cwd(), 'scripts', 'transcribe.py');

  log.info('Model: tiny (int8)');
  log.info('This may take several minutes...');

  const python = process.platform === 'win32' ? 'python' : 'python3';
  try {
    execSync(`${python} "${scriptPath}" "${audioPath}" "${transcriptPath}"`, { stdio: 'inherit' });
  } catch {
    log.error('Whisper transcription failed.');
    throw new Error('Whisper transcription failed');
  }

  if (!fs.existsSync(transcriptPath)) {
    throw new Error('Transcript not found after whisper');
  }

  const content = fs.readFileSync(transcriptPath, 'utf-8');
  log.success(`Transcript saved (~${content.split(/\s+/).filter(Boolean).length} words)`);

  return { transcriptPath, srtPath: fs.existsSync(srtPath) ? srtPath : '' };
}

export async function transcribeAudio(audioPath: string, tempDir: string): Promise<{ transcriptPath: string; srtPath: string }> {
  if (process.env.GROQ_API_KEY) {
    log.step('Transcribing with Groq Whisper API');
    return transcribeWithGroq(audioPath, tempDir);
  }
  log.step('Transcribing with faster-whisper (local)');
  return transcribeWithLocal(audioPath, tempDir);
}

export async function runTranscription(videoPath: string, tempDir: string): Promise<{ transcriptPath: string; srtPath: string }> {
  const audioPath = extractAudio(videoPath, tempDir);
  const result = await transcribeAudio(audioPath, tempDir);
  log.success('Transcription complete');
  return result;
}
