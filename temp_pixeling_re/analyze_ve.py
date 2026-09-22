import re, json, os

with open('temp_pixeling_re/page-5ca01b04f75cb3f3.js', 'r', encoding='utf-8', errors='ignore') as f:
    ve_code = f.read()

print('=== VE BUNDLE ANALYSIS ===')
print('Size:', len(ve_code), 'characters')

# Look for Korean UI strings to understand every section
korean_strings = set(re.findall(r'[\'\"]([가-힣\s\(\)\[\]\/\:\.\,\!\?\-\+\%]{2,40})[\'\"]', ve_code))
print(f'Total Korean UI strings in /ve: {len(korean_strings)}')

sample_ko = [s.strip() for s in korean_strings if any(w in s for w in ['트랙', '클립', '타임라인', '분할', '자막', '배경', '볼륨', '배속', '효과', '내보내기', '렌더링', '인스펙터', '레이어', '캔버스', '재생', '단축키', '삭제', '선택', '편집기', '오디오', '비디오'])]
print(f'Relevant NLE strings count: {len(sample_ko)}')
print('Relevant NLE strings sample:')
for s in sorted(set(sample_ko))[:60]:
    print(' ', s)
