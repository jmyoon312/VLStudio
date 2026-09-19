import subprocess, json, sys
sys.stdout.reconfigure(encoding='utf-8')

yt_dlp = r"C:\Users\jmyoo\AppData\Local\hermes\hermes-agent\venv\Scripts\yt-dlp.exe"
cmd = [yt_dlp, "--flat-playlist", "--playlist-end", "12", "-J", "https://www.youtube.com/@숏비타민c/shorts"]
proc = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8")
data = json.loads(proc.stdout)
print("Channel Title:", data.get("channel") or data.get("uploader"))
print("Channel URL:", data.get("channel_url") or data.get("uploader_url"))
print("\n=== Actual 12 Shorts List ===")
for i, entry in enumerate(data.get("entries", [])[:12], 1):
    title = entry.get("title")
    vid = entry.get("id")
    views = entry.get("view_count")
    print(f"{i}. [{vid}] {title} (Views: {views})")
