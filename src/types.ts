export interface ClipMoment {
  start: number;
  end: number;
  title: string;
  reason: string;
  virality_score: number;
}

export interface PipelineOptions {
  input: string;
}
