import { Router, Request, Response } from 'express';
import { createJob, getJob, setStatus, LogEntry } from '../jobManager';
import { runPipeline } from '../pipeline';
import { ClipOptions, ClipFormat, ClipQuality, DEFAULT_OPTIONS } from '../../src/types';

const router = Router();

router.post('/', (req: Request, res: Response) => {
  const { input, format, quality, captions } = req.body as {
    input?: string;
    format?: string;
    quality?: string;
    captions?: boolean;
  };

  if (!input || !input.trim()) {
    res.status(400).json({ error: 'input is required' });
    return;
  }

  const options: ClipOptions = {
    format: (format === 'portrait' ? 'portrait' : 'original') as ClipFormat,
    quality: (['720p', '1080p'].includes(quality ?? '') ? quality : 'best') as ClipQuality,
    captions: captions === true,
  };

  const job = createJob(input.trim());

  job.emitter.on('log', (entry: LogEntry) => {
    job.logs.push(entry);
  });

  runPipeline(job, options).catch((err) => {
    setStatus(job, 'error', err instanceof Error ? err.message : String(err));
  });

  res.json({ jobId: job.id });
});

router.get('/:id/stream', (req: Request, res: Response) => {
  const job = getJob(req.params.id);
  if (!job) { res.status(404).json({ error: 'Job not found' }); return; }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  job.logs.forEach((entry) => send({ type: 'log', ...entry }));
  if (job.clips.length > 0) send({ type: 'clips', clips: job.clips });

  if (job.status === 'done' || job.status === 'error') {
    send({ type: 'status', status: job.status, error: job.error });
    res.end();
    return;
  }

  const onLog = (entry: LogEntry) => send({ type: 'log', ...entry });
  const onClips = (clips: unknown) => send({ type: 'clips', clips });
  const onStatus = (s: { status: string; error?: string }) => {
    send({ type: 'status', ...s });
    if (s.status === 'done' || s.status === 'error') res.end();
  };

  job.emitter.on('log', onLog);
  job.emitter.on('clips', onClips);
  job.emitter.on('status', onStatus);

  req.on('close', () => {
    job.emitter.off('log', onLog);
    job.emitter.off('clips', onClips);
    job.emitter.off('status', onStatus);
  });
});

router.get('/:id', (req: Request, res: Response) => {
  const job = getJob(req.params.id);
  if (!job) { res.status(404).json({ error: 'Job not found' }); return; }
  res.json({ id: job.id, status: job.status, clips: job.clips, error: job.error });
});

export default router;
