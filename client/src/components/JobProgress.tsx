import { useEffect, useRef } from 'react';
import type { LogEntry, Phase } from '../App';

interface Props { logs: LogEntry[]; phase: Phase; error: string; }

const levelColor: Record<string, string> = {
  step:    'text-brown-700 font-semibold',
  success: 'text-green-700',
  info:    'text-brown-400',
  warn:    'text-amber-600',
  error:   'text-red-600',
};

const levelDot: Record<string, string> = {
  step:    'bg-yt-red',
  success: 'bg-green-500',
  info:    'bg-brown-300',
  warn:    'bg-amber-400',
  error:   'bg-red-500',
};

function fmt(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour12: false });
}

export default function JobProgress({ logs, phase, error }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs]);

  return (
    <div className="rounded-2xl border border-sand overflow-hidden bg-white shadow-warm-md">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-sand/60 bg-parchment/60">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400/60" />
            <div className="w-3 h-3 rounded-full bg-amber-400/60" />
            <div className="w-3 h-3 rounded-full bg-green-400/60" />
          </div>
          <span className="text-xs font-mono text-brown-300 ml-2">pipeline.log</span>
        </div>

        <div className="text-xs font-mono">
          {phase === 'processing' && (
            <span className="flex items-center gap-1.5 text-brown-400">
              <span className="w-1.5 h-1.5 rounded-full bg-yt-red animate-pulse" />
              running
            </span>
          )}
          {phase === 'done' && (
            <span className="flex items-center gap-1.5 text-green-600">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              complete
            </span>
          )}
          {phase === 'error' && (
            <span className="flex items-center gap-1.5 text-red-500">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              failed
            </span>
          )}
        </div>
      </div>

      {/* Log lines */}
      <div className="h-72 overflow-y-auto p-5 space-y-1.5 scanline bg-linen/30">
        {logs.map((entry, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className="text-brown-300 font-mono text-xs shrink-0 mt-0.5">{fmt(entry.timestamp)}</span>
            <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${levelDot[entry.level] ?? 'bg-brown-300'}`} />
            <span className={`text-xs font-mono leading-relaxed ${levelColor[entry.level] ?? 'text-brown-500'}`}>
              {entry.message}
            </span>
          </div>
        ))}

        {phase === 'error' && error && (
          <div className="flex items-start gap-3 mt-3 pt-3 border-t border-red-100">
            <span className="text-brown-300 font-mono text-xs shrink-0">——:——:——</span>
            <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 bg-red-500" />
            <span className="text-xs font-mono text-red-600">{error}</span>
          </div>
        )}

        {phase === 'processing' && (
          <div className="flex items-center gap-3 text-brown-200 font-mono text-xs">
            <span className="text-brown-200">——:——:——</span>
            <span className="w-1.5 h-1.5 rounded-full bg-brown-200" />
            <span className="animate-pulse">█</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
