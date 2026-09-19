import os
import sys
import subprocess
import json

sys.stdout.reconfigure(encoding='utf-8')

audit_dir = os.path.abspath("05_Exports/channel_dna_audit/숏비타민c")
os.makedirs(audit_dir, exist_ok=True)

yt_dlp = r"C:\Users\jmyoo\AppData\Local\hermes\hermes-agent\venv\Scripts\yt-dlp.exe"

# 12 real shorts URLs from @숏비타민c
video_ids = [
    ("xGo_jUGhpTY", "01_딸이_난생처음_요리를_하면"),
    ("EeLU0Td3NIA", "02_전설의_놀이_퀄리티"),
    ("EBz18tILN0g", "03_We_are_not_that_kind"),
    ("-HZX-42OSIE", "04_남편은_절대_모르는_밸런스게임"),
    ("3HUm0FFBYr4", "05_영앤리치_누나의_클라스"),
    ("YBEYndT3PFU", "06_같은_쇼핑몰_다른_세상"),
    ("us8AbRCsWt8", "07_남편_전용_커피잔"),
    ("yFuOU84shJE", "08_남편들의_눈물겨운_생존본능"),
    ("sQEV-KOUBpE", "09_아내_몰래_왕놀이_하는_남편"),
    ("-p7viz9lFiU", "10_딸과_아들의_놀이차이"),
    ("ZjptOdsyG6Y", "11_기적의_다트_실력"),
    ("7Igl6JoApG8", "12_고사리손으로_오빠_챙겨주는_동생")
]

print(f"[*] Starting download of 12 real shorts to: {audit_dir}")

downloaded = []
for idx, (vid, slug) in enumerate(video_ids, 1):
    url = f"https://www.youtube.com/shorts/{vid}"
    out_tmpl = os.path.join(audit_dir, f"{idx:02d}_{slug}_{vid}.%(ext)s")
    print(f"[{idx}/12] Downloading {vid} ({slug})...")
    
    cmd = [
        yt_dlp,
        "-f", "mp4[height<=1080]/best[ext=mp4]/best",
        "--output", out_tmpl,
        "--no-playlist",
        url
    ]
    res = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8")
    if res.returncode == 0:
        print(f"    -> [SUCCESS]")
    else:
        print(f"    -> [WARN] Error: {res.stderr[:200]}")

files = [f for f in os.listdir(audit_dir) if f.endswith(('.mp4', '.mkv', '.webm'))]
print(f"\n[*] Total downloaded files in {audit_dir}: {len(files)}")
for f in sorted(files):
    size_mb = os.path.getsize(os.path.join(audit_dir, f)) / (1024 * 1024)
    print(f"  - {f} ({size_mb:.2f} MB)")
