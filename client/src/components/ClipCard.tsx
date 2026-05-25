import { useState } from 'react';
import type { Clip } from '../App';

interface Props { clip: Clip; apiBase: string; }

function scoreBadge(score: number) {
  if (score >= 8) return 'bg-red-50 text-yt-dark border-red-200';
  if (score >= 5) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-parchment text-brown-400 border-sand';
}

function scoreBar(score: number) {
  if (score >= 8) return 'bg-yt-red';
  if (score >= 5) return 'bg-amber-400';
  return 'bg-brown-200';
}

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}:${String(sec).padStart(2, '0')}` : `${sec}s`;
}

export default function ClipCard({ clip, apiBase }: Props) {
  const [downloading, setDownloading] = useState(false);

  function handleDownload() {
    setDownloading(true);
    const a = document.createElement('a');
    a.href = `${apiBase}${clip.url}`;
    a.download = clip.filename;
    a.click();
    setTimeout(() => setDownloading(false), 1500);
  }

  return (
    <div className="fade-in-up group rounded-2xl border border-sand bg-white overflow-hidden
      shadow-warm-sm hover:shadow-warm-md transition-all duration-200 hover:-translate-y-0.5">

      {/* Score bar */}
      <div className={`h-1 w-full ${scoreBar(clip.virality_score)}`}
        style={{ width: `${clip.virality_score * 10}%`, background: undefined }}
      >
        <div className={`h-full ${scoreBar(clip.virality_score)}`} />
      </div>

      <div className="p-5 space-y-4">
        {/* Meta row */}
        <div className="flex items-center justify-between">
          <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full border ${scoreBadge(clip.virality_score)}`}>
            {clip.virality_score}/10
          </span>
          <span className="text-xs font-mono text-brown-300">{fmt(clip.duration)}</span>
        </div>

        {/* Title */}
        <p className="text-sm font-semibold text-brown-700 leading-snug line-clamp-2 min-h-[2.5rem]">
          {clip.title}
        </p>

        {/* Download */}
        <button
          onClick={handleDownload}
          disabled={downloading}
          className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2
            ${downloading
              ? 'bg-parchment text-brown-300 cursor-not-allowed'
              : 'bg-yt-red text-white hover:bg-yt-dark shadow-yt hover:shadow-none'
            }`}
        >
          {downloading ? (
            <>
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Downloading...
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download clip
            </>
          )}
        </button>
      </div>
    </div>
  );
}
