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
  const [phase, setPhase] = useState<Phase>('idle');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [clips, setClips] = useState<Clip[]>([]);
  const [error, setError] = useState('');
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => () => esRef.current?.close(), []);

  async function handleSubmit(input: string) {
    esRef.current?.close();
    setPhase('processing');
    setLogs([]);
    setClips([]);
    setError('');

    let jobId: string;
    try {
      const res = await fetch(`${API_BASE}/api/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? `Server error ${res.status}`);
      }
      const data = await res.json() as { jobId: string };
      jobId = data.jobId;
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
        setLogs((prev) => [...prev, { level: msg.level!, message: msg.message!, timestamp: msg.timestamp! }]);
      } else if (msg.type === 'clips' && msg.clips) {
        setClips(msg.clips);
      } else if (msg.type === 'status') {
        if (msg.status === 'done') { setPhase('done'); es.close(); }
        else if (msg.status === 'error') { setError(msg.error ?? 'Unknown error'); setPhase('error'); es.close(); }
      }
    };
    es.onerror = () => { setError('Connection lost'); setPhase('error'); es.close(); };
  }

  function handleReset() {
    esRef.current?.close();
    setPhase('idle'); setLogs([]); setClips([]); setError('');
  }

  return (
    <div className="min-h-screen bg-[#050510] relative overflow-x-hidden">
      {/* Grid background */}
      <div className="fixed inset-0 grid-bg pointer-events-none" />

      {/* Ambient glows */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-glow-violet pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[400px] h-[400px] bg-glow-cyan pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 border-b border-white/5 bg-[#050510]/80 backdrop-blur-xl sticky top-0">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Logo mark */}
            <div className="relative w-8 h-8">
              <div className="absolute inset-0 rounded-lg bg-violet-600 blur-sm opacity-60" />
              <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">
                M
              </div>
            </div>
            <span className="font-semibold text-white text-lg tracking-tight">mosnip</span>
            <span className="hidden sm:block text-xs font-mono text-violet-400/60 border border-violet-900/40 rounded px-1.5 py-0.5 bg-violet-950/30">
              BETA
            </span>
          </div>
          {phase !== 'idle' && (
            <button
              onClick={handleReset}
              className="text-sm text-zinc-500 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m0 14v1M4 12H3m18 0h-1M6.343 6.343l-.707-.707m12.728 12.728l-.707-.707M6.343 17.657l-.707.707M17.657 6.343l-.707.707" />
              </svg>
              New clip
            </button>
          )}
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-16 space-y-16">

        {/* Hero */}
        {phase === 'idle' && (
          <div className="text-center space-y-10 fade-in-up">
            {/* Tag */}
            <div className="inline-flex items-center gap-2 text-xs font-mono text-cyan-400 border border-cyan-900/50 rounded-full px-3 py-1.5 bg-cyan-950/20">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              Powered by Claude AI + Whisper
            </div>

            <div className="space-y-4">
              <h1 className="text-5xl sm:text-6xl font-bold text-white tracking-tight leading-[1.1]">
                Turn any video into<br />
                <span className="gradient-text">viral clips</span>
              </h1>
              <p className="text-zinc-400 text-lg max-w-lg mx-auto leading-relaxed">
                Paste a YouTube link. AI transcribes, analyses, and cuts the top moments — automatically.
              </p>
            </div>

            <UrlInput onSubmit={handleSubmit} />

            {/* Stats row */}
            <div className="flex items-center justify-center gap-8 text-sm text-zinc-600">
              {[['5 clips', 'per video'], ['AI scored', 'virality'], ['Auto cut', 'no editing']].map(([val, label]) => (
                <div key={val} className="text-center">
                  <div className="text-white font-semibold">{val}</div>
                  <div className="text-zinc-600 text-xs">{label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Processing state */}
        {phase === 'processing' && (
          <div className="space-y-2 fade-in-up">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                <div className="absolute inset-0 rounded-full bg-violet-500 animate-ping opacity-60" />
              </div>
              <span className="text-sm text-zinc-400 font-mono">Pipeline running...</span>
            </div>
          </div>
        )}

        {/* Log stream */}
        {(phase === 'processing' || phase === 'done' || phase === 'error') && logs.length > 0 && (
          <div className="fade-in-up">
            <JobProgress logs={logs} phase={phase} error={error} />
          </div>
        )}

        {/* Clips grid */}
        {clips.length > 0 && (
          <div className="space-y-6 fade-in-up">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold text-white tracking-tight">Your clips</h2>
              <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 border border-emerald-900/50 rounded-full px-2.5 py-1 bg-emerald-950/20">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                </svg>
                {clips.length} clips ready
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
              {clips.map((clip) => (
                <ClipCard key={clip.filename} clip={clip} apiBase={API_BASE} />
              ))}
            </div>
          </div>
        )}

        {/* Error (no logs) */}
        {phase === 'error' && logs.length === 0 && (
          <div className="fade-in-up rounded-2xl border border-red-900/50 bg-red-950/20 p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-950 border border-red-900 flex items-center justify-center mx-auto">
              <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <p className="text-red-300 font-medium">{error}</p>
            <button onClick={handleReset} className="text-sm text-zinc-500 hover:text-white transition-colors underline underline-offset-2">
              Try again
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 mt-24">
        <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between text-xs text-zinc-600 font-mono">
          <span>mosnip v1.0</span>
          <span>claude-sonnet-4 · whisper-base · ffmpeg</span>
        </div>
      </footer>
    </div>
  );
}
