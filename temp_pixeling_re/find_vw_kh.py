import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('temp_pixeling_re/24259-e2b669ff1d273a05.js', 'r', encoding='utf-8') as f:
    bundle = f.read()

# Let's find all occurrences of 'vw' around kj
matches_vw = list(re.finditer(r'\bvw\b', bundle[1280000:1360000]))
print(f'vw occurrences: {len(matches_vw)}')
for m in matches_vw[:10]:
    pos = 1280000 + m.start()
    print(bundle[max(0, pos-50):pos+150])
    print('---')

# Let's find definition of kh and km
for name in ['km', 'kh', 'kj']:
    pos_list = [m.start() for m in re.finditer(rf'function\s+{name}\b', bundle)]
    print(f'function {name} locations: {pos_list}')
