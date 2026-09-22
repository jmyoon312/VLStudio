import re

with open('temp_pixeling_re/video_creative_re.js', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Find all function definitions
funcs = re.findall(r'function\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)', text)
print(f"Functions found ({len(funcs)}):")
for name, args in funcs:
    print(f"  {name}({args})")

# 2. Extract Korean strings in order
korean_lines = []
for m in re.finditer(r'["\']([^"\']*[\uac00-\ud7a3][^"\']*)["\']', text):
    korean_lines.append(m.group(1))

print(f"\nTotal Korean strings: {len(korean_lines)}")
with open('temp_pixeling_re/video_creative_korean.txt', 'w', encoding='utf-8') as out:
    for idx, s in enumerate(korean_lines):
        out.write(f"{idx+1}: {s}\n")

# 3. Find data-pixi attributes or data attributes
data_attrs = set(re.findall(r'data-[a-z0-9\-]+', text))
print("\nData attributes:", data_attrs)

# 4. Find button labels, icons, and input names
print("\nFirst 40 Korean strings:")
for s in korean_lines[:40]:
    print(" ", s)
