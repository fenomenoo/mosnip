import { useState, type FormEvent } from 'react';

export type ClipFormat = 'original' | 'portrait';
export type ClipQuality = 'best' | '1080p' | '720p';

export interface SubmitOptions {
  input: string;
  format: ClipFormat;
  quality: ClipQuality;
  captions: boolean;
}

interface Props {
  onSubmit: (opts: SubmitOptions) => void;
}

function PillGroup<T extends string>({
  label, options, value, onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-mono text-brown-400 w-14 shrink-0">{label}</span>
      <div className="flex gap-1">
        {options.map(o => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`text-xs px-3 py-1 rounded-full font-medium transition-all cursor-pointer border
              ${value === o.value
                ? 'bg-brown-700 text-white border-brown-700'
                : 'bg-parchment text-brown-400 border-sand hover:border-brown-300 hover:text-brown-700'
              }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function UrlInput({ onSubmit }: Props) {
  const [value, setValue]     = useState('');
  const [focused, setFocused] = useState(false);
  const [format, setFormat]   = useState<ClipFormat>('original');
  const [quality, setQuality] = useState<ClipQuality>('best');
  const [captions, setCaptions] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const t = value.trim();
    if (t) onSubmit({ input: t, format, quality, captions });
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto space-y-4">
      {/* URL input */}
      <div className={`flex items-center bg-white rounded-2xl border transition-all duration-200 shadow-warm-sm
        ${focused ? 'border-yt-red shadow-yt' : 'border-sand'}`}>
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
          className="flex-1 px-4 py-4 bg-transparent text-brown-700 placeholder-brown-300 focus:outline-none text-sm font-mono"
          autoFocus
        />
        <button
          type="submit"
          disabled={!value.trim()}
          className={`mr-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200
            ${value.trim() ? 'bg-yt-red text-white hover:bg-yt-dark shadow-yt cursor-pointer' : 'bg-parchment text-brown-300 cursor-not-allowed'}`}
        >
          {value.trim() ? 'Generate →' : 'Generate'}
        </button>
      </div>

      {/* Options */}
      <div className="bg-parchment rounded-xl border border-sand px-4 py-3 space-y-2.5">
        <PillGroup
          label="Format"
          options={[
            { value: 'original', label: 'Original' },
            { value: 'portrait', label: '9:16 Portrait' },
          ]}
          value={format}
          onChange={setFormat}
        />
        <PillGroup
          label="Quality"
          options={[
            { value: 'best', label: 'Best' },
            { value: '1080p', label: '1080p' },
            { value: '720p', label: '720p' },
          ]}
          value={quality}
          onChange={setQuality}
        />
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-brown-400 w-14 shrink-0">Captions</span>
          <button
            type="button"
            onClick={() => setCaptions(c => !c)}
            className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer border
              ${captions ? 'bg-brown-700 border-brown-700' : 'bg-sand border-sand'}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform
              ${captions ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </button>
          <span className="text-xs font-mono text-brown-400">{captions ? 'On' : 'Off'}</span>
        </div>
      </div>

      <p className="text-xs font-mono text-brown-300 text-center">
        YouTube · up to 10 clips · 5–15 min processing
      </p>
    </form>
  );
}
