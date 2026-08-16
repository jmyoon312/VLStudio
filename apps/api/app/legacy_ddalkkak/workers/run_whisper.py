import os
import sys
import json

def main():
    if len(sys.argv) < 3:
        print("Usage: run_whisper.py <audio_path> <language> <model_path>")
        sys.exit(1)
        
    audio_path = sys.argv[1]
    language = sys.argv[2]
    if language == "None" or language == "":
        language = None
        
    model_path = sys.argv[3] if len(sys.argv) > 3 else "base"
    
    total_duration = 0.0
    try:
        import subprocess
        probe = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", audio_path], capture_output=True)
        total_duration = float(probe.stdout.decode().strip())
    except:
        pass

    from faster_whisper import WhisperModel
    # auto device fallback to CPU automatically if CUDA unavailable
    model = WhisperModel(model_path, device="auto", compute_type="default")
    
    kwargs = {"beam_size": 2}
    if language:
        kwargs["language"] = language
        
    segments, info = model.transcribe(audio_path, **kwargs)
    
    out_segments = []
    for s in segments:
        out_segments.append({
            "start": s.start,
            "end": s.end,
            "text": s.text,
            "words": [{"word": w.word, "start": w.start, "end": w.end, "probability": w.probability} for w in getattr(s, 'words', [])] if getattr(s, 'words', None) else []
        })
        if total_duration > 0:
            p = min(1.0, s.end / total_duration)
            print(f"PROGRESS:{p:.3f}", flush=True)
        
    res = {
        "text": "".join([s["text"] for s in out_segments]),
        "segments": out_segments,
        "language": info.language
    }
    print("===RESULT===")
    print(json.dumps(res, ensure_ascii=False))

if __name__ == "__main__":
    main()
