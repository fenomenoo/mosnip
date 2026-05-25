#!/usr/bin/env python3
import sys
from faster_whisper import WhisperModel

audio_path = sys.argv[1]
output_path = sys.argv[2]
srt_path = output_path.replace('.txt', '.srt')

model = WhisperModel("base", device="cpu", compute_type="int8")
segments_gen, _ = model.transcribe(audio_path)
segments = list(segments_gen)

def fmt_time(secs):
    h = int(secs // 3600)
    m = int((secs % 3600) // 60)
    s = int(secs % 60)
    ms = int((secs % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

with open(output_path, "w", encoding="utf-8") as f:
    for seg in segments:
        text = seg.text.strip()
        if text:
            f.write(text + " ")

with open(srt_path, "w", encoding="utf-8") as f:
    idx = 1
    for seg in segments:
        text = seg.text.strip()
        if not text:
            continue
        f.write(f"{idx}\n{fmt_time(seg.start)} --> {fmt_time(seg.end)}\n{text}\n\n")
        idx += 1

print(f"Transcript and SRT written to {output_path}", file=sys.stderr)
