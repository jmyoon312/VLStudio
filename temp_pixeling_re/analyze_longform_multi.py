# -*- coding: utf-8 -*-
import re
import json

with open('temp_pixeling_re/24259-e2b669ff1d273a05.js', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. '롱폼' 관련 문자열 검색
matches = re.findall(r'"([^"\\]*(?:\\.[^"\\]*)*)"', text)
longform_strings = [m for m in matches if '롱폼' in m or '멀티' in m or 'longform' in m.lower()]
print(f"Total matching strings: {len(longform_strings)}")
output_lines = []
output_lines.append(f"Total matching strings: {len(longform_strings)}")
for s in sorted(set(longform_strings)):
    output_lines.append(f"  - {s}")

# 2. cG 내부에서 호출하는 엔드포인트 및 주요 키워드
idx = text.find('function cG(')
cg_text = text[idx:idx+35000]

endpoints = set(re.findall(r'/(?:api|pixi)/[a-zA-Z0-9_\-/]+', text[idx:idx+80000]))
output_lines.append("\nEndpoints found in longform-multi area:")
for ep in sorted(endpoints):
    output_lines.append(f"  * {ep}")

with open('temp_pixeling_re/longform_multi_re_output.txt', 'w', encoding='utf-8') as f:
    f.write("\n".join(output_lines))

print("Saved output to temp_pixeling_re/longform_multi_re_output.txt")


