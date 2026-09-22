import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('temp_pixeling_re/24259-e2b669ff1d273a05.js', 'r', encoding='utf-8') as f:
    bundle = f.read()

sub = bundle[1285000:1290000]

# search for jn= or ji=
import re
for m in re.finditer(r'(let|const|var)\s+(jn|ji)\s*=', sub):
    pos = 1285000 + m.start()
    print(bundle[pos:pos+400])
    print('---')
