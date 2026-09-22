with open('temp_pixeling_re/comp_KB.js', 'r', encoding='utf-8') as f:
    kb = f.read()

import re
print("KB states:")
for m in re.finditer(r'useState\(([^)]+)\)', kb):
    print("  useState:", m.group(1))

# Let's search for "KE" definition or where KE is defined
with open('temp_pixeling_re/video_creative_re.js', 'r', encoding='utf-8') as f:
    vcre = f.read()

ke_matches = re.findall(r'.{0,50}\bKE\b.{0,50}', vcre)
print("\nKE occurrences in video_creative_re.js:")
for km in ke_matches:
    print("  ", km.strip())
