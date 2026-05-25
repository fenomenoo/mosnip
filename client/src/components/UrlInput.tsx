import { useState, type FormEvent } from 'react';

interface Props {
  onSubmit: (input: string) => void;
}

export default function UrlInput({ onSubmit }: Props) {
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed) onSubmit(trimmed);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto space-y-4">
      {/* Input wrapper with animated border */}
      <div className={`relative rounded-2xl transition-all duration-300 ${focused ? 'glow-violet' : ''}`}>
        {/* Gradient border */}
        <div className={`absolute inset-0 rounded-2xl transition-opacity duration-300 ${focused ? 'opacity-100' : 'opacity-40'}`}
          style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.5), rgba(6,182,212,0.5))', padding: '1px' }}>
          <div className="w-full h-full rounded-2xl bg-[#0c0c1e]" />
        </div>

        <div className="relative flex items-center">
          {/* Icon */}
          <div className="pl-5 text-zinc-600">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
          </div>

          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="https://youtube.com/watch?v=..."
            className="flex-1 bg-transparent px-4 py-4 text-white placeholder-zinc-600 focus:outline-none text-sm font-mono"
            autoFocus
          />

          <button
            type="submit"
            disabled={!value.trim()}
            className="relative mr-2 group"
          >
            <div className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
              ${value.trim()
                ? 'bg-gradient-to-r from-violet-600 to-cyan-600 text-white hover:from-violet-500 hover:to-cyan-500 shadow-lg shadow-violet-900/30'
                : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
              }`}>
              Generate
              {value.trim() && (
                <span className="ml-1.5 text-white/60">→</span>
              )}
            </div>
          </button>
        </div>
      </div>

      <p className="text-zinc-600 text-xs text-center font-mono">
        Supports YouTube · Processing takes 5–15 min · Whisper base model
      </p>
    </form>
  );
}
