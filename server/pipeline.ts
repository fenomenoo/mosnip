import * as path from 'path';
import * as fs from 'fs';
import { Job, setStatus, setClips, OutputClip } from './jobManager';
import { logEmitter } from '../src/logger';
import { downloadVideo } from '../src/downloader';
import { runTranscription } from '../src/transcriber';
import { analyzeTranscript } from '../src/analyzer';
import { cutAllClips } from '../src/clipper';
import { ClipOptions, DEFAULT_OPTIONS } from '../src/types';

export async function runPipeline(job: Job, options: ClipOptions = DEFAULT_OPTIONS): Promise<void> {
  const tempDir = path.resolve(process.cwd(), 'temp', job.id);

  await logEmitter.run(job.emitter, async () => {
    setStatus(job, 'running');

    try {
      const videoPath = downloadVideo(job.input, tempDir);
      const { transcriptPath, srtPath } = runTranscription(videoPath, tempDir);
      const clips = await analyzeTranscript(transcriptPath);

      if (clips.length === 0) {
        throw new Error('No viral clips identified from transcript');
      }

      const outputPaths = await cutAllClips(videoPath, clips, srtPath, options, tempDir);

      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }

      const outputClips: OutputClip[] = outputPaths.map((p, i) => ({
        filename: path.basename(p),
        title: clips[i]?.title ?? path.basename(p, '.mp4'),
        virality_score: clips[i]?.virality_score ?? 0,
        duration: Math.round((clips[i]?.end ?? 0) - (clips[i]?.start ?? 0)),
        url: `/clips/${encodeURIComponent(path.basename(p))}`,
      }));

      setClips(job, outputClips);
      setStatus(job, 'done');
    } catch (err) {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
      const msg = err instanceof Error ? err.message : String(err);
      setStatus(job, 'error', msg);
    }
  });
}
