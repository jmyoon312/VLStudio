import os
import sys
import subprocess
import json

sys.stdout.reconfigure(encoding='utf-8')

audit_dir = os.path.abspath("05_Exports/channel_dna_audit/숏비타민c")
files = sorted([f for f in os.listdir(audit_dir) if f.endswith('.mp4')])

print("=== Audio Stream & Level Forensics ===")
audio_stats = []

for f in files:
    path = os.path.join(audit_dir, f)
    # ffmpeg volumedetect
    cmd = ["ffmpeg", "-i", path, "-af", "volumedetect", "-vn", "-sn", "-dn", "-f", "null", "NUL"]
    res = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace')
    mean_vol = None
    max_vol = None
    for line in res.stderr.splitlines():
        if "mean_volume:" in line:
            mean_vol = float(line.split("mean_volume:")[1].split("dB")[0].strip())
        if "max_volume:" in line:
            max_vol = float(line.split("max_volume:")[1].split("dB")[0].strip())
    
    stat = {
        "file": f,
        "mean_volume_db": mean_vol,
        "max_volume_db": max_vol
    }
    audio_stats.append(stat)
    print(f"[{f[:30]}...] Mean: {mean_vol} dB | Max: {max_vol} dB")

with open(os.path.join(audit_dir, "audio_levels.json"), "w", encoding="utf-8") as out:
    json.dump(audio_stats, out, indent=2, ensure_ascii=False)
