import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import { log } from './logger';
import { ClipMoment } from './types';

const MODEL = 'claude-sonnet-4-20250514';

const SYSTEM_PROMPT = `You are a video content analyst specializing in identifying viral moments.
Analyze transcripts and identify the most compelling, shareable clip moments.
You ALWAYS respond with valid JSON only. No markdown. No explanation. No code fences.
Your entire response must be parseable by JSON.parse().`;

function buildUserPrompt(transcript: string): string {
  return `Analyze this video transcript and identify the top 5 most viral-worthy clip moments.

TRANSCRIPT:
${transcript}

Respond with ONLY a JSON array. No markdown, no code fences, no extra text before or after.
Each object in the array must have exactly these fields:
- start: number (start time in seconds, float)
- end: number (end time in seconds, float)
- title: string (short descriptive title, safe for filenames — only letters, numbers, hyphens, spaces)
- reason: string (why this moment is compelling and shareable)
- virality_score: number (integer 1-10, where 10 is most viral)

Rules:
- Sort by virality_score descending (highest first)
- Each clip must be at least 15 seconds and at most 90 seconds long
- Clips must not overlap
- Return exactly 5 clips if possible, fewer only if the content is too short

Example of valid response format:
[{"start":12.5,"end":45.2,"title":"Shocking Reveal Moment","reason":"Unexpected twist that drives shares","virality_score":9},{"start":90.0,"end":130.0,"title":"Hilarious Reaction","reason":"Relatable and funny","virality_score":7}]`;
}

export async function analyzeTranscript(transcriptPath: string): Promise<ClipMoment[]> {
  log.step('Analyzing transcript with Claude AI');

  const transcript = fs.readFileSync(transcriptPath, 'utf-8');
  log.info(`Transcript loaded: ${transcript.length} characters`);
  log.info(`Model: ${MODEL}`);
  log.info(`Requesting top 5 viral clip moments...`);

  const client = new Anthropic();

  let rawResponse: string;

  try {
    log.info(`Sending request to Claude API...`);
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: buildUserPrompt(transcript),
        },
      ],
    });

    const block = message.content[0];
    if (block.type !== 'text') {
      throw new Error(`Unexpected content block type: ${block.type}`);
    }

    rawResponse = block.text;
    log.info(`Claude response received: ${rawResponse.length} characters`);
    log.info(`Usage: ${message.usage.input_tokens} input tokens, ${message.usage.output_tokens} output tokens`);
  } catch (err) {
    log.error(`Claude API request failed: ${err instanceof Error ? err.message : String(err)}`);
    throw new Error(`Claude API request failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  log.info(`Parsing Claude response as JSON...`);

  let clips: ClipMoment[];

  try {
    const cleaned = rawResponse
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    const parsed = JSON.parse(cleaned);

    if (!Array.isArray(parsed)) {
      throw new Error(`Response is not a JSON array — got: ${typeof parsed}`);
    }

    clips = parsed.filter((clip: unknown, idx: number) => {
      const c = clip as Record<string, unknown>;
      const valid =
        typeof c.start === 'number' &&
        typeof c.end === 'number' &&
        typeof c.title === 'string' &&
        typeof c.reason === 'string' &&
        typeof c.virality_score === 'number' &&
        c.end > c.start;

      if (!valid) {
        log.warn(`Clip ${idx + 1} failed validation, skipping: ${JSON.stringify(clip)}`);
      }
      return valid;
    }) as ClipMoment[];

    log.info(`${clips.length} clips passed validation`);
  } catch (parseErr) {
    log.error(`Failed to parse Claude response as JSON: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`);
    log.error(`Raw response (first 500 chars): ${rawResponse.slice(0, 500)}`);
    throw new Error(`Failed to parse Claude response: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`);
  }

  clips.sort((a, b) => b.virality_score - a.virality_score);
  clips = clips.slice(0, 5);

  log.success(`Identified ${clips.length} viral clip moments:`);
  clips.forEach((clip, idx) => {
    log.info(
      `  ${idx + 1}. [Score ${clip.virality_score}/10] "${clip.title}" — ${clip.start.toFixed(1)}s → ${clip.end.toFixed(1)}s (${(clip.end - clip.start).toFixed(1)}s)`
    );
    log.info(`     Why: ${clip.reason}`);
  });

  return clips;
}
