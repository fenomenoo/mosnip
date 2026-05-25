import { useState, type FormEvent } from 'react';

interface Props {
  onSubmit: (input: string) => void;
}

export default function UrlInput({ onSubmit }: Props) {
  const [value, setValue] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed) onSubmit(trimmed);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div className="flex gap-3">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Paste a YouTube URL..."
          className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors text-sm"
          autoFocus
        />
        <button
          type="submit"
          disabled={!value.trim()}
          className="px-6 py-3 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-medium rounded-xl transition-colors text-sm whitespace-nowrap"
        >
          Generate clips
        </button>
      </div>
      <p className="text-zinc-600 text-xs mt-3 text-center">
        Supports YouTube URLs · Processing takes 5–15 min depending on video length
      </p>
    </form>
  );
}
