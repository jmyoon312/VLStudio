import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('temp_pixeling_re/page-5ca01b04f75cb3f3.js', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

print(f"Total size: {len(text)} bytes")

# 1. Look for all modal / tab / panel headings
# Look for strings ending with '...' or containing feature words
features = [
    '자막', '대본', '컷', '트랙', '오디오', '효과음', '필터', '애니메이션', 
    '템플릿', '클립', '타임라인', '분할', '삭제', '트림', '내보내기', 'AI', 'TTS',
    '배속', '볼륨', '외곽선', '그림자', '배경', '정렬', '크롭', '회전'
]

findings = {}
for feat in features:
    matches = set(re.findall(rf'[\'"][^\'"]*{feat}[^\'"]*[\'"]', text))
    # clean quotes
    clean = [m[1:-1].strip() for m in matches if 2 < len(m[1:-1].strip()) < 60]
    findings[feat] = sorted(clean)

for feat, items in findings.items():
    print(f"\n=== [{feat}] ({len(items)} found) ===")
    for item in items[:15]:
        print(f"  - {item}")
