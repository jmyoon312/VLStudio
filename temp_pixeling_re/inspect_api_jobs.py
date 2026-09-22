import sys, re

sys.stdout.reconfigure(encoding='utf-8')

with open('temp_pixeling_re/24259-e2b669ff1d273a05.js', 'r', encoding='utf-8') as f:
    bundle = f.read()

# Search for /api/ve/long-to-short-2/jobs fetch or payload
matches = [m.start() for m in re.finditer(r'/api/ve/long-to-short-2/jobs', bundle)]
print(f'API matches: {len(matches)}')
for pos in matches:
    print(f'=== At {pos} ===')
    print(bundle[pos-200:pos+600])
    print('\n')
