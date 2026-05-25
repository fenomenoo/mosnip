import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';
import { log } from './logger';

export function extractAudio(videoPath: string, tempDir: string): string {
  const audioPath = path.join(tempDir, 'audio.wav');

  log.step('Extracting audio from video');
  log.info(`Input:  ${videoPath}`);
  log.info(`Output: ${audioPath}`);
  log.info(`Settings: 16kHz mono PCM (optimal for Whisper)`);

  try {
    execSync(
      `ffmpeg -y -i "${videoPath}" -ar 16000 -ac 1 -c:a pcm_s16le "${audioPath}"`,
      { stdio: 'inherit' }
    );
  } catch {
    log.error('FFmpeg audio extraction failed. Ensure ffmpeg is installed and in PATH.');
    throw new Error('FFmpeg audio extraction failed');
  }

  if (!fs.existsSync(audioPath)) {
    log.error(`Expected audio.wav not found at: ${audioPath}`);
    throw new Error('audio.wav not found after ffmpeg extraction');
  }

  const stats = fs.statSync(audioPath);
  log.success(`Audio extracted: ${audioPath} (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);
  return audioPath;
}

export function transcribeAudio(audioPath: string, tempDir: string): string {
  const transcriptPath = path.join(tempDir, 'transcript.txt');

  log.step('Transcribing audio with Whisper');
  log.info(`Input: ${audioPath}`);
  log.info(`Model: base`);
  log.info(`This may take several minutes depending on video length...`);

  try {
    execSync(
      `whisper "${audioPath}" --model base --output_dir "${tempDir}" --output_format txt --word_timestamps True`,
      { stdio: 'inherit' }
    );
  } catch {
    log.error('Whisper transcription failed. Ensure openai-whisper is installed: pip install openai-whisper');
    throw new Error('Whisper transcription failed');
  }

  const whisperOutput = path.join(tempDir, 'audio.txt');

  if (!fs.existsSync(whisperOutput)) {
    log.error(`Whisper did not produce audio.txt in temp/`);
    throw new Error('Whisper output audio.txt not found');
  }

  fs.renameSync(whisperOutput, transcriptPath);
  log.info(`Renamed audio.txt → transcript.txt`);

  const content = fs.readFileSync(transcriptPath, 'utf-8');
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  log.success(`Transcript saved: ${transcriptPath}`);
  log.info(`Transcript stats: ${content.length} characters, ~${wordCount} words`);

  return transcriptPath;
}

export function runTranscription(videoPath: string, tempDir: string): string {
  log.info(`Starting transcription pipeline for: ${videoPath}`);
  const audioPath = extractAudio(videoPath, tempDir);
  const transcriptPath = transcribeAudio(audioPath, tempDir);
  log.success(`Transcription pipeline complete`);
  return transcriptPath;
}
