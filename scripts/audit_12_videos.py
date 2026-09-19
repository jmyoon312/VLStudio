import os
import sys
import subprocess
import json

sys.stdout.reconfigure(encoding='utf-8')

audit_dir = os.path.abspath("05_Exports/channel_dna_audit/숏비타민c")
frames_dir = os.path.join(audit_dir, "frames")
os.makedirs(frames_dir, exist_ok=True)

files = sorted([f for f in os.listdir(audit_dir) if f.endswith('.mp4')])

print(f"=== 12 Video Technical Forensics Audit ===")
video_analysis = []

for i, f in enumerate(files, 1):
    file_path = os.path.join(audit_dir, f)
    size_mb = os.path.getsize(file_path) / (1024 * 1024)
    
    # ffprobe for duration, resolution, audio streams
    cmd = [
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration:stream=width,height,r_frame_rate,codec_type",
        "-of", "json", file_path
    ]
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
        probe = json.loads(res.stdout)
        duration = float(probe.get('format', {}).get('duration', 0))
        streams = probe.get('streams', [])
        v_stream = next((s for s in streams if s.get('codec_type') == 'video'), {})
        a_stream = next((s for s in streams if s.get('codec_type') == 'audio'), {})
        w = v_stream.get('width', 0)
        h = v_stream.get('height', 0)
        fps = v_stream.get('r_frame_rate', 'unknown')
        has_audio = bool(a_stream)
    except Exception as e:
        duration = 0
        w, h = 0, 0
        fps = 'err'
        has_audio = False

    # Extract a representative frame at 2.0s
    frame_path = os.path.join(frames_dir, f"frame_{i:02d}.jpg")
    cmd_frame = [
        "ffmpeg", "-y", "-ss", "00:00:02.000",
        "-i", file_path,
        "-vframes", "1",
        "-q:v", "2",
        frame_path
    ]
    subprocess.run(cmd_frame, capture_output=True)

    info = {
        "index": i,
        "filename": f,
        "size_mb": round(size_mb, 2),
        "duration_sec": round(duration, 1),
        "resolution": f"{w}x{h}",
        "aspect_ratio": f"{w}:{h}",
        "fps": fps,
        "has_audio": has_audio,
        "frame_extracted": os.path.exists(frame_path)
    }
    video_analysis.append(info)
    print(f"[{i:02d}] {f}")
    print(f"     Duration: {info['duration_sec']}s | Res: {info['resolution']} | Size: {info['size_mb']}MB | Frame: {info['frame_extracted']}")

with open(os.path.join(audit_dir, "technical_audit.json"), "w", encoding="utf-8") as out:
    json.dump(video_analysis, out, indent=2, ensure_ascii=False)
