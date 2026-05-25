import { useState, useRef, useEffect } from 'react';
import UrlInput from './components/UrlInput';
import JobProgress from './components/JobProgress';
import ClipCard from './components/ClipCard';

export type Phase = 'idle' | 'processing' | 'done' | 'error';

export interface LogEntry {
  level: string;
  message: string;
  timestamp: string;
}

export interface Clip {
  filename: string;
  title: string;
  virality_score: number;
  duration: number;
  url: string;
}

const API_BASE = import.meta.env.VITE_API_URL ?? '';

export default function App() {
  const [phase, setPhase]   = useState<Phase>('idle');
  const [logs, setLogs]     = useState<LogEntry[]>([]);
  const [clips, setClips]   = useState<Clip[]>([]);
  const [error, setError]   = useState('');
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => () => esRef.current?.close(), []);

  async function handleSubmit(input: string) {
    esRef.current?.close();
    setPhase('processing'); setLogs([]); setClips([]); setError('');

    let jobId: string;
    try {
      const res = await fetch(`${API_BASE}/api/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        throw new Error(d.error ?? `Server error ${res.status}`);
      }
      jobId = ((await res.json()) as { jobId: string }).jobId;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start job');
      setPhase('error');
      return;
    }

    const es = new EventSource(`${API_BASE}/api/jobs/${jobId}/stream`);
    esRef.current = es;

    es.onmessage = (e: MessageEvent) => {
      const msg = JSON.parse(e.data as string) as {
        type: string; level?: string; message?: string;
        timestamp?: string; clips?: Clip[]; status?: string; error?: string;
      };
      if (msg.type === 'log' && msg.level && msg.message && msg.timestamp) {
        setLogs(p => [...p, { level: msg.level!, message: msg.message!, timestamp: msg.timestamp! }]);
      } else if (msg.type === 'clips' && msg.clips) {
        setClips(msg.clips);
      } else if (msg.type === 'status') {
        if (msg.status === 'done')  { setPhase('done');  es.close(); }
        if (msg.status === 'error') { setError(msg.error ?? 'Unknown error'); setPhase('error'); es.close(); }
      }
    };
    es.onerror = () => { setError('Connection lost'); setPhase('error'); es.close(); };
  }

  function handleReset() {
    esRef.current?.close();
    setPhase('idle'); setLogs([]); setClips([]); setError('');
  }

  return (
    <div className="grain min-h-screen bg-cream">

      {/* Subtle warm texture layer */}
      <div className="fixed inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(212,165,100,0.1) 0%, transparent 70%)' }} />

      {/* Header */}
      <header className="relative z-10 sticky top-0 bg-cream/90 backdrop-blur-sm border-b border-sand/60">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* YouTube-style play button logo */}
            <div className="w-9 h-9 rounded-xl bg-yt-red flex items-center justify-center shadow-yt">
              <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <span className="font-bold text-brown-700 text-xl tracking-tight">mosnip</span>
            <span className="text-xs font-mono text-brown-300 border border-brown-200 rounded px-1.5 py-0.5 bg-parchment">
              BETA
            </span>
          </div>

          {phase !== 'idle' && (
            <button onClick={handleReset}
              className="text-sm text-brown-400 hover:text-brown-700 transition-colors flex items-center gap-1.5 font-medium cursor-pointer">
              ← New clip
            </button>
          )}
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-16 space-y-16">

        {/* ── IDLE HERO ── */}
        {phase === 'idle' && (
          <div className="text-center space-y-10 fade-in-up">

            {/* Pill badge */}
            <div className="inline-flex items-center gap-2 text-xs font-mono text-brown-500
              border border-brown-200 rounded-full px-3 py-1.5 bg-parchment shadow-warm-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-yt-red" />
              Whisper · FFmpeg · Auto-cut
            </div>

            <div className="space-y-4">
              <h1 className="text-5xl sm:text-6xl font-bold text-brown-800 leading-[1.1] tracking-tight">
                Turn any video into<br />
                <span className="gradient-text">viral clips</span>
              </h1>
              <p className="text-brown-400 text-lg max-w-md mx-auto leading-relaxed">
                Paste a YouTube link. AI finds the best moments and cuts up to 10 clips — automatically.
              </p>
            </div>

            <UrlInput onSubmit={handleSubmit} />

            {/* Stats */}
            <div className="flex items-center justify-center gap-10 pt-2">
              {[
                ['Up to 10', 'clips per video'],
                ['Auto scored', 'virality'],
                ['Auto cut', 'no editing'],
              ].map(([val, label]) => (
                <div key={val} className="text-center">
                  <div className="font-bold text-brown-700 text-sm">{val}</div>
                  <div className="text-brown-300 text-xs mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PROCESSING INDICATOR ── */}
        {phase === 'processing' && (
          <div className="flex items-center gap-3 fade-in-up">
            <div className="relative">
              <div className="w-2.5 h-2.5 rounded-full bg-yt-red" />
              <div className="absolute inset-0 rounded-full bg-yt-red animate-ping opacity-50" />
            </div>
            <span className="text-sm font-mono text-brown-400">Pipeline running...</span>
          </div>
        )}

        {/* ── LOG STREAM ── */}
        {(phase === 'processing' || phase === 'done' || phase === 'error') && logs.length > 0 && (
          <div className="fade-in-up">
            <JobProgress logs={logs} phase={phase} error={error} />
          </div>
        )}

        {/* ── CLIPS GRID ── */}
        {clips.length > 0 && (
          <div className="space-y-6 fade-in-up">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold text-brown-800 tracking-tight">Your clips</h2>
              <span className="text-xs font-mono text-yt-dark border border-red-200 rounded-full px-2.5 py-1 bg-red-50">
                {clips.length} clips ready
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
              {clips.map((clip) => (
                <ClipCard key={clip.filename} clip={clip} apiBase={API_BASE} />
              ))}
            </div>
          </div>
        )}

        {/* ── ERROR (no logs) ── */}
        {phase === 'error' && logs.length === 0 && (
          <div className="fade-in-up rounded-2xl border border-red-200 bg-red-50 p-8 text-center space-y-4 shadow-warm-sm">
            <p className="text-red-600 font-semibold">{error}</p>
            <button onClick={handleReset} className="text-sm text-brown-400 hover:text-brown-700 transition-colors underline underline-offset-2">
              Try again
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-sand/60 mt-24">
        <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between text-xs font-mono text-brown-300">
          <span>mosnip v1.0</span>
          <span>whisper-base · ffmpeg · auto-cut</span>
        </div>
      </footer>
    </div>
  );
}
