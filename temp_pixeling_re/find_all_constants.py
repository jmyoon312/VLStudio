import sys, re

sys.stdout.reconfigure(encoding='utf-8')

with open('temp_pixeling_re/24259-e2b669ff1d273a05.js', 'r', encoding='utf-8') as f:
    bundle = f.read()

# Search for jn = { or jn={
for m in re.finditer(r'\b(jn|ji|xw)\s*=\s*\{', bundle):
    pos = m.start()
    print(bundle[pos:pos+400])
    print('===\n')
