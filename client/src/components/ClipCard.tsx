import type { Clip } from '../App';

interface Props {
  clip: Clip;
}

function scoreColor(score: number): string {
  if (score >= 8) return 'text-emerald-400 bg-emerald-950/60 border-emerald-800';
  if (score >= 5) return 'text-amber-400 bg-amber-950/60 border-amber-800';
  return 'text-zinc-400 bg-zinc-800/60 border-zinc-700';
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function ClipCard({ clip }: Props) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3 hover:border-zinc-700 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${scoreColor(clip.virality_score)}`}>
          {clip.virality_score}/10
        </span>
        <span className="text-xs text-zinc-500">{formatDuration(clip.duration)}</span>
      </div>
      <p className="text-sm font-medium text-white leading-snug line-clamp-2">{clip.title}</p>
      <a
        href={clip.url}
        download={clip.filename}
        className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-violet-600/20 hover:bg-violet-600/40 border border-violet-800 text-violet-300 text-xs font-medium transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Download clip
      </a>
    </div>
  );
}
