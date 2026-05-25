import { useEffect, useRef } from 'react';
import type { LogEntry, Phase } from '../App';

interface Props {
  logs: LogEntry[];
  phase: Phase;
  error: string;
}

const levelStyles: Record<string, string> = {
  step: 'text-violet-400 font-semibold',
  success: 'text-emerald-400',
  info: 'text-zinc-400',
  warn: 'text-amber-400',
  error: 'text-red-400',
};

const levelLabels: Record<string, string> = {
  step: 'STEP',
  success: 'DONE',
  info: 'INFO',
  warn: 'WARN',
  error: 'ERR ',
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour12: false });
}

export default function JobProgress({ logs, phase, error }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const statusBadge = {
    processing: <span className="flex items-center gap-1.5 text-xs text-violet-400"><span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />Processing</span>,
    done: <span className="flex items-center gap-1.5 text-xs text-emerald-400"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Complete</span>,
    error: <span className="flex items-center gap-1.5 text-xs text-red-400"><span className="w-1.5 h-1.5 rounded-full bg-red-400" />Failed</span>,
    idle: null,
  }[phase];

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 bg-zinc-900">
        <span className="text-xs text-zinc-500 font-mono">pipeline log</span>
        {statusBadge}
      </div>
      <div className="h-72 overflow-y-auto p-4 font-mono text-xs space-y-0.5">
        {logs.map((entry, i) => (
          <div key={i} className="flex gap-3 leading-5">
            <span className="text-zinc-600 shrink-0">{formatTime(entry.timestamp)}</span>
            <span className={`shrink-0 w-7 ${levelStyles[entry.level] ?? 'text-zinc-400'}`}>
              {levelLabels[entry.level] ?? entry.level.toUpperCase().slice(0, 4)}
            </span>
            <span className={levelStyles[entry.level] ?? 'text-zinc-300'}>{entry.message}</span>
          </div>
        ))}
        {phase === 'error' && error && (
          <div className="flex gap-3 leading-5 mt-2 pt-2 border-t border-zinc-800">
            <span className="text-zinc-600 shrink-0">——</span>
            <span className="text-red-400 shrink-0 w-7">ERR</span>
            <span className="text-red-400">{error}</span>
          </div>
        )}
        {phase === 'processing' && (
          <div className="flex gap-3 leading-5 text-zinc-600">
            <span className="shrink-0">——</span>
            <span className="animate-pulse">▌</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
