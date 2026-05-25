import { useEffect, useRef } from 'react';
import type { LogEntry, Phase } from '../App';

interface Props {
  logs: LogEntry[];
  phase: Phase;
  error: string;
}

const levelColor: Record<string, string> = {
  step:    'text-violet-400',
  success: 'text-emerald-400',
  info:    'text-zinc-500',
  warn:    'text-amber-400',
  error:   'text-red-400',
};

const levelDot: Record<string, string> = {
  step:    'bg-violet-500',
  success: 'bg-emerald-500',
  info:    'bg-zinc-600',
  warn:    'bg-amber-500',
  error:   'bg-red-500',
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function JobProgress({ logs, phase, error }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="rounded-2xl overflow-hidden border border-white/5" style={{ background: 'rgba(8,8,24,0.8)', backdropFilter: 'blur(20px)' }}>
      {/* Terminal header bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          {/* Traffic lights */}
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/40" />
            <div className="w-3 h-3 rounded-full bg-amber-500/40" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/40" />
          </div>
          <span className="text-xs font-mono text-zinc-600 ml-2">pipeline.log</span>
        </div>

        {/* Status badge */}
        <div className="flex items-center gap-1.5">
          {phase === 'processing' && (
            <span className="flex items-center gap-1.5 text-xs font-mono text-violet-400">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
              running
            </span>
          )}
          {phase === 'done' && (
            <span className="flex items-center gap-1.5 text-xs font-mono text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              complete
            </span>
          )}
          {phase === 'error' && (
            <span className="flex items-center gap-1.5 text-xs font-mono text-red-400">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              failed
            </span>
          )}
        </div>
      </div>

      {/* Log body */}
      <div className="h-72 overflow-y-auto p-5 space-y-1.5 scanline">
        {logs.map((entry, i) => (
          <div key={i} className="flex items-start gap-3 group">
            <span className="text-zinc-700 font-mono text-xs shrink-0 mt-0.5">{formatTime(entry.timestamp)}</span>
            <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${levelDot[entry.level] ?? 'bg-zinc-700'}`} />
            <span className={`text-xs font-mono leading-relaxed ${levelColor[entry.level] ?? 'text-zinc-400'} ${entry.level === 'step' ? 'font-bold' : ''}`}>
              {entry.message}
            </span>
          </div>
        ))}

        {phase === 'error' && error && (
          <div className="flex items-start gap-3 mt-3 pt-3 border-t border-red-900/30">
            <span className="text-zinc-700 font-mono text-xs shrink-0 mt-0.5">——:——:——</span>
            <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 bg-red-500" />
            <span className="text-xs font-mono text-red-400">{error}</span>
          </div>
        )}

        {phase === 'processing' && (
          <div className="flex items-center gap-3 text-violet-500/40 font-mono text-xs">
            <span className="text-zinc-700">——:——:——</span>
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500/40" />
            <span className="animate-pulse">█</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
