import os
import sys
import json
from faster_whisper import WhisperModel

sys.stdout.reconfigure(encoding='utf-8')

audit_dir = os.path.abspath("05_Exports/channel_dna_audit/숏비타민c")
files = sorted([f for f in os.listdir(audit_dir) if f.endswith('.mp4')])

cache_dir = os.path.abspath(".cache/huggingface")
os.makedirs(cache_dir, exist_ok=True)
os.environ["HF_HOME"] = cache_dir

print("[*] Loading faster-whisper (tiny/base model for fast profiling)...")
try:
    model = WhisperModel("tiny", device="cpu", compute_type="int8", download_root=cache_dir)
except Exception as e:
    print(f"Error loading model: {e}")
    sys.exit(1)

transcriptions = {}
for i, f in enumerate(files[:6], 1): # First 6 videos
    path = os.path.join(audit_dir, f)
    print(f"\n--- Transcribing [{i}] {f} ---")
    segments, info = model.transcribe(path, beam_size=1)
    print(f"Detected language: {info.language} (prob: {info.language_probability:.2f})")
    
    text_list = []
    for s in segments:
        text_list.append(f"[{s.start:.1f}s - {s.end:.1f}s] {s.text}")
    print("\n".join(text_list) if text_list else "  (No speech / Music only)")
    transcriptions[f] = {
        "language": info.language,
        "prob": round(info.language_probability, 2),
        "segments": text_list
    }

with open(os.path.join(audit_dir, "transcriptions_sample.json"), "w", encoding="utf-8") as out:
    json.dump(transcriptions, out, indent=2, ensure_ascii=False)
