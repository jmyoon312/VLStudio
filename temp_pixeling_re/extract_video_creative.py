with open('temp_pixeling_re/24259-e2b669ff1d273a05.js', 'r', encoding='utf-8') as f:
    bundle = f.read()

start = 3035000
end = min(len(bundle), 3085000)
chunk = bundle[start:end]

with open('temp_pixeling_re/video_creative_re.js', 'w', encoding='utf-8') as out:
    out.write(chunk)

print(f"Extracted {len(chunk)} characters to temp_pixeling_re/video_creative_re.js")
