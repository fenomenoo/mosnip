#!/usr/bin/env python3
import sys
import os
from faster_whisper import WhisperModel

audio_path = sys.argv[1]
output_path = sys.argv[2]

model = WhisperModel("base", device="cpu", compute_type="int8")
segments, _ = model.transcribe(audio_path)

with open(output_path, "w") as f:
    for segment in segments:
        text = segment.text.strip()
        if text:
            f.write(text + " ")

print(f"Transcript written to {output_path}", file=sys.stderr)
