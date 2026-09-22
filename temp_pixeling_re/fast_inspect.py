import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('temp_pixeling_re/24259-e2b669ff1d273a05.js', 'r', encoding='utf-8') as f:
    bundle = f.read()

sub = bundle[1280000:1360000]
base = 1280000

for name in ['vw', 'kh', 'km', 'kj', 'jn', 'ji', 'jl']:
    matches = [base + m.start() for m in re.finditer(rf'\b{name}\b', sub)]
    print(f'{name}: {len(matches)} matches, first few: {matches[:3]}')

# Print definition of vw
m = re.search(r'let\s+vw\s*=\s*\{[^}]+\}', sub)
if m:
    print('\n=== vw definition ===')
    print(m.group(0))

# Print definition of jn, ji
for var in ['jn', 'ji', 'jl']:
    m = re.search(rf'let\s+{var}\s*=\s*[^;]+;', sub)
    if m:
        print(f'\n=== {var} definition ===')
        print(m.group(0))
