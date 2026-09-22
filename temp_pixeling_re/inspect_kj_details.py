import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('temp_pixeling_re/kj_before_context.js', 'r', encoding='utf-8') as f:
    before = f.read()

with open('temp_pixeling_re/kj_full_component.js', 'r', encoding='utf-8') as f:
    kj = f.read()

# Let's inspect constants, types, defaults, helper functions defined before kj
print('=== CONSTANTS AND HELPERS BEFORE kj ===')
# Find variable/constant declarations like let vw= or const vw=
for match in re.finditer(r'(let|const|var)\s+([a-zA-Z0-9_$]+)\s*=\s*([^;]{5,200});', before):
    print(f'{match.group(1)} {match.group(2)} = {match.group(3)}')

print('\n=== FUNCTIONS BEFORE kj ===')
for match in re.finditer(r'function\s+([a-zA-Z0-9_$]+)\s*\(([^)]*)\)', before):
    print(f'function {match.group(1)}({match.group(2)})')

# Let's inspect the JSX structure and labels in kj
print('\n=== UI LABELS / TEXT IN kj ===')
text_matches = re.findall(r'>([^<>{}]*[\uac00-\ud7a3][^<>{}]*)<', kj)
for t in text_matches[:30]:
    t = t.strip()
    if t:
        print(f' - {t}')

# Let's check attributes / placeholders / titles
print('\n=== PLACEHOLDERS / TITLES / TOASTS ===')
attr_matches = re.findall(r'(placeholder|title|aria-label|notice|description|alt|header|label):\s*["\']([^"\']*[\uac00-\ud7a3][^"\']*)["\']', kj)
for k, v in attr_matches[:30]:
    print(f' [{k}] {v}')
