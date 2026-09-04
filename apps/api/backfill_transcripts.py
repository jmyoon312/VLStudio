import sys
import os
import re
import urllib.request
import json

sys.path.insert(0, os.path.abspath('apps/api'))

from app.database import engine, SessionLocal, migrate_source_external_id
from app.models import Video

# 1. Run migration to ensure column exists
migrate_source_external_id()

def clean_srt(content: str) -> str:
    lines = content.splitlines()
    cleaned = []
    for line in lines:
        line = line.strip()
        if not line:
            continue
        if line.isdigit():
            continue
        if '-->' in line:
            continue
        cleaned.append(line)
    return ' '.join(cleaned)

def fetch_youtube_ko_title(video_id: str) -> str:
    """Fetch original Korean title from YouTube oEmbed API or noembed"""
    try:
        url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Accept-Language': 'ko-KR,ko;q=0.9'})
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode('utf-8'))
            return data.get('title', '')
    except Exception as e:
        return ''

db = SessionLocal()
videos = db.query(Video).all()
print(f"Total videos in DB: {len(videos)}")

script_videos = [v for v in videos if v.is_script_only]
print(f"Script-only videos: {len(script_videos)}")

updated_transcripts = 0
updated_titles = 0

for v in script_videos:
    # 1. Transcript backfill
    srt_path = (v.file_path or '').replace('.mp4', '.ko.srt')
    if os.path.exists(srt_path):
        try:
            with open(srt_path, 'r', encoding='utf-8') as f:
                raw = f.read()
            cleaned = clean_srt(raw)
            if cleaned:
                v.transcript = cleaned
                updated_transcripts += 1
        except Exception as e:
            print(f"Error reading srt for {v.id}: {e}")
            
    # 2. Korean title fetch if title looks English or has | CRAB
    if v.video_id:
        ko_title = fetch_youtube_ko_title(v.video_id)
        if ko_title and ko_title != v.title:
            print(f"Title update [{v.video_id}]: '{v.title}' -> '{ko_title}'")
            v.title = ko_title
            updated_titles += 1

db.commit()
print(f"Successfully updated transcripts: {updated_transcripts}/{len(script_videos)}")
print(f"Successfully updated titles: {updated_titles}/{len(script_videos)}")

for v in script_videos[:3]:
    preview = v.transcript[:60] if v.transcript else "EMPTY"
    print(f"[{v.id}] {v.title} => Transcript: {preview}")

db.close()
