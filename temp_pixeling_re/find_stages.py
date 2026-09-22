with open('temp_pixeling_re/video_creative_re.js', 'r', encoding='utf-8') as f:
    text = f.read()

import re
# Let's search for stage labels or stage definitions
# In KU we saw:
# 검색, 다운로드, 매칭, 편집, CapCut
print("Searching for stage-related patterns:")
for m in re.finditer(r'stage[s]?["\'\s:]+([A-Za-z0-9_\-]+)', text):
    print("  stage:", m.group(0))

# Let's search for stages in Korean:
stages = ['검색', '다운로드', '매칭', '편집', 'CapCut']
for s in stages:
    matches = list(re.finditer(rf'["\']{s}["\']', text))
    print(f"Match for '{s}': {len(matches)}")
