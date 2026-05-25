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

export default function App() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [clips, setClips] = useState<Clip[]>([]);
  const [error, setError] = useState('');
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    return () => esRef.current?.close();
  }, []);

  async function handleSubmit(input: string) {
    esRef.current?.close();
    setPhase('processing');
    setLogs([]);
    setClips([]);
    setError('');

    let jobId: string;
    try {
      const res = await fetch('/api/jobs', {
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

    const es = new EventSource(`/api/jobs/${jobId}/stream`);
    esRef.current = es;

    es.onmessage = (e: MessageEvent) => {
      const msg = JSON.parse(e.data as string) as {
        type: string;
        level?: string;
        message?: string;
        timestamp?: string;
        clips?: Clip[];
        status?: string;
        error?: string;
      };

      if (msg.type === 'log' && msg.level && msg.message && msg.timestamp) {
        setLogs((prev) => [...prev, { level: msg.level!, message: msg.message!, timestamp: msg.timestamp! }]);
      } else if (msg.type === 'clips' && msg.clips) {
        setClips(msg.clips);
      } else if (msg.type === 'status') {
        if (msg.status === 'done') {
          setPhase('done');
          es.close();
        } else if (msg.status === 'error') {
          setError(msg.error ?? 'Unknown error');
          setPhase('error');
          es.close();
        }
      }
    };

    es.onerror = () => {
      if (phase !== 'done') {
        setError('Connection to server lost');
        setPhase('error');
      }
      es.close();
    };
  }

  function handleReset() {
    esRef.current?.close();
    setPhase('idle');
    setLogs([]);
    setClips([]);
    setError('');
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center text-white font-bold text-sm">M</div>
            <span className="font-semibold text-white text-lg tracking-tight">Mosnip</span>
            <span className="text-zinc-500 text-sm">AI Video Clips</span>
          </div>
          {phase !== 'idle' && (
            <button onClick={handleReset} className="text-sm text-zinc-400 hover:text-white transition-colors">
              ← New clip
            </button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-10">
        {/* Hero + Input */}
        {phase === 'idle' && (
          <div className="text-center space-y-8">
            <div className="space-y-3">
              <h1 className="text-4xl font-bold text-white tracking-tight">
                Turn any video into<br />
                <span className="text-violet-400">viral clips</span>
              </h1>
              <p className="text-zinc-400 text-lg">
                Paste a YouTube link. AI finds the best moments and cuts them for you.
              </p>
            </div>
            <UrlInput onSubmit={handleSubmit} />
          </div>
        )}

        {/* Input visible while processing */}
        {phase === 'processing' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
              <span className="text-sm text-zinc-400">Processing video...</span>
            </div>
          </div>
        )}

        {/* Progress */}
        {(phase === 'processing' || phase === 'done' || phase === 'error') && logs.length > 0 && (
          <JobProgress logs={logs} phase={phase} error={error} />
        )}

        {/* Clips */}
        {clips.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-white">Your Clips</h2>
              <span className="text-xs bg-violet-900/50 text-violet-300 px-2 py-0.5 rounded-full border border-violet-800">
                {clips.length} clips ready
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {clips.map((clip) => (
                <ClipCard key={clip.filename} clip={clip} />
              ))}
            </div>
          </div>
        )}

        {/* Error state with no logs */}
        {phase === 'error' && logs.length === 0 && (
          <div className="rounded-xl border border-red-800 bg-red-950/30 p-6 text-center space-y-3">
            <p className="text-red-400 font-medium">Something went wrong</p>
            <p className="text-red-300/70 text-sm">{error}</p>
            <button onClick={handleReset} className="text-sm text-zinc-400 hover:text-white transition-colors underline underline-offset-2">
              Try again
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
