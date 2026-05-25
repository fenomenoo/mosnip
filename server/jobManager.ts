import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';

export type JobStatus = 'queued' | 'running' | 'done' | 'error';

export interface LogEntry {
  level: string;
  message: string;
  timestamp: string;
}

export interface OutputClip {
  filename: string;
  title: string;
  virality_score: number;
  duration: number;
  url: string;
}

export interface Job {
  id: string;
  input: string;
  status: JobStatus;
  logs: LogEntry[];
  clips: OutputClip[];
  error?: string;
  createdAt: Date;
  emitter: EventEmitter;
}

const jobs = new Map<string, Job>();

export function createJob(input: string): Job {
  const id = randomUUID();
  const emitter = new EventEmitter();
  emitter.setMaxListeners(20);
  const job: Job = { id, input, status: 'queued', logs: [], clips: [], createdAt: new Date(), emitter };
  jobs.set(id, job);
  return job;
}

export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}

export function setStatus(job: Job, status: JobStatus, error?: string): void {
  job.status = status;
  if (error) job.error = error;
  job.emitter.emit('status', { status, error });
}

export function setClips(job: Job, clips: OutputClip[]): void {
  job.clips = clips;
  job.emitter.emit('clips', clips);
}
