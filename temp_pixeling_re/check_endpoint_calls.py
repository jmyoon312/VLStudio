import re

with open('temp_pixeling_re/24259-e2b669ff1d273a05.js', 'r', encoding='utf-8', errors='ignore') as f:
    batch_code = f.read()

# Search for calls to /api/ve/ or /api/pixi/
endpoints = [
    '/api/ve/script-generator/song-premium/jobs',
    '/api/ve/highlight-extraction/jobs',
    '/api/ve/long-to-short-2/jobs',
    '/api/ve/movie-drama-shorts/jobs',
    '/api/pixi/ranking/jobs',
    '/api/pixi/meokguri/stt'
]

for ep in endpoints:
    pos = 0
    print(f"\n==================== {ep} ====================")
    while True:
        idx = batch_code.find(ep, pos)
        if idx == -1:
            break
        snippet = batch_code[max(0, idx-150):min(len(batch_code), idx+300)]
        print("  Snippet:", snippet.replace('\n', ' '))
        pos = idx + len(ep) + 50
        if pos > idx + 1000: break
