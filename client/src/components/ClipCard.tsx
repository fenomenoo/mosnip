import { useState } from 'react';
import type { Clip } from '../App';

interface Props {
  clip: Clip;
  apiBase: string;
}

function scoreGradient(score: number): string {
  if (score >= 8) return 'from-emerald-500 to-cyan-500';
  if (score >= 5) return 'from-amber-500 to-orange-500';
  return 'from-zinc-600 to-zinc-500';
}

function scoreBg(score: number): string {
  if (score >= 8) return 'border-emerald-900/50 bg-emerald-950/30 text-emerald-300';
  if (score >= 5) return 'border-amber-900/50 bg-amber-950/30 text-amber-300';
  return 'border-zinc-800 bg-zinc-900/50 text-zinc-400';
}

function formatDuration(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}:${String(sec).padStart(2, '0')}` : `${sec}s`;
}

export default function ClipCard({ clip, apiBase }: Props) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      const url = `${apiBase}${clip.url}`;
      const a = document.createElement('a');
      a.href = url;
      a.download = clip.filename;
      a.click();
    } finally {
      setTimeout(() => setDownloading(false), 1500);
    }
  }

  return (
    <div className="fade-in-up group relative rounded-2xl border border-white/5 overflow-hidden transition-all duration-300 hover:border-violet-900/50 hover:-translate-y-0.5"
      style={{ background: 'rgba(12,12,30,0.8)', backdropFilter: 'blur(20px)' }}>

      {/* Score bar at top */}
      <div className={`h-0.5 w-full bg-gradient-to-r ${scoreGradient(clip.virality_score)}`} />

      <div className="p-5 space-y-4">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full border ${scoreBg(clip.virality_score)}`}>
            {clip.virality_score}/10
          </span>
          <span className="text-xs font-mono text-zinc-600">{formatDuration(clip.duration)}</span>
        </div>

        {/* Title */}
        <p className="text-sm font-semibold text-white leading-snug line-clamp-2 min-h-[2.5rem]">
          {clip.title}
        </p>

        {/* Download button */}
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="relative w-full py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 overflow-hidden
            border border-violet-900/50 text-violet-300 bg-violet-950/30
            hover:bg-violet-900/40 hover:border-violet-700/60 hover:text-white
            disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {downloading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Downloading...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download clip
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
