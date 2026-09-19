import os
import sys
import subprocess
import json

sys.stdout.reconfigure(encoding='utf-8')

yt_dlp = r"C:\Users\jmyoo\AppData\Local\hermes\hermes-agent\venv\Scripts\yt-dlp.exe"
audit_dir = os.path.abspath("05_Exports/channel_dna_audit/숏비타민c")

files = sorted([f for f in os.listdir(audit_dir) if f.endswith('.mp4')])

detailed_data = []

for f in files:
    # extract video id from filename: e.g. 01_01_..._xGo_jUGhpTY.mp4
    basename = os.path.splitext(f)[0]
    vid = basename.split('_')[-1]
    url = f"https://www.youtube.com/shorts/{vid}"
    
    cmd = [yt_dlp, "-J", "--skip-download", url]
    res = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
    if res.returncode == 0:
        d = json.loads(res.stdout)
        item = {
            "id": vid,
            "filename": f,
            "title": d.get("title"),
            "description": d.get("description", "").strip(),
            "duration": d.get("duration"),
            "view_count": d.get("view_count"),
            "like_count": d.get("like_count"),
            "tags": d.get("tags", []),
            "categories": d.get("categories", []),
            "channel": d.get("channel"),
            "channel_url": d.get("channel_url"),
            "upload_date": d.get("upload_date")
        }
        detailed_data.append(item)
        print(f"[*] {vid}: {item['title']}")
        print(f"    Views: {item['view_count']} | Likes: {item['like_count']} | Duration: {item['duration']}s")
        print(f"    Desc: {item['description'][:150]}...")
    else:
        print(f"[!] Failed for {vid}")

with open(os.path.join(audit_dir, "metadata_12_shorts.json"), "w", encoding="utf-8") as out:
    json.dump(detailed_data, out, indent=2, ensure_ascii=False)
