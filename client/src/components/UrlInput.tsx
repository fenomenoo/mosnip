import { useState, type FormEvent } from 'react';

interface Props {
  onSubmit: (input: string) => void;
}

export default function UrlInput({ onSubmit }: Props) {
  const [value, setValue]   = useState('');
  const [focused, setFocused] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const t = value.trim();
    if (t) onSubmit(t);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto space-y-3">
      <div className={`flex items-center bg-white rounded-2xl border transition-all duration-200 shadow-warm-sm
        ${focused ? 'border-yt-red shadow-yt' : 'border-sand'}`}>

        {/* Link icon */}
        <div className="pl-5 text-brown-300 shrink-0">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
          </svg>
        </div>

        <input
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="https://youtube.com/watch?v=..."
          className="flex-1 px-4 py-4 bg-transparent text-brown-700 placeholder-brown-300
            focus:outline-none text-sm font-mono"
          autoFocus
        />

        <button
          type="submit"
          disabled={!value.trim()}
          className={`mr-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200
            ${value.trim()
              ? 'bg-yt-red text-white hover:bg-yt-dark shadow-yt'
              : 'bg-parchment text-brown-300 cursor-not-allowed'
            }`}
        >
          {value.trim() ? 'Generate →' : 'Generate'}
        </button>
      </div>

      <p className="text-xs font-mono text-brown-300 text-center">
        YouTube · up to 10 clips · 5–15 min processing time
      </p>
    </form>
  );
}
