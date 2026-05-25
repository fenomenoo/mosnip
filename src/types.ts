export interface ClipMoment {
  start: number;
  end: number;
  title: string;
  reason: string;
  virality_score: number;
}

export type ClipFormat = 'original' | 'portrait';
export type ClipQuality = 'best' | '1080p' | '720p';

export interface ClipOptions {
  format: ClipFormat;
  quality: ClipQuality;
  captions: boolean;
}

export const DEFAULT_OPTIONS: ClipOptions = {
  format: 'original',
  quality: 'best',
  captions: false,
};
