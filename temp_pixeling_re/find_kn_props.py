with open('temp_pixeling_re/24259-e2b669ff1d273a05.js', 'r', encoding='utf-8') as f:
    bundle = f.read()

import re

props = ['Mk', 'JF', 'nw', 'm9', 'W1', 'lN', 'Zt', 'hf', 'BA']
for prop in props:
    pat = r'\b' + prop + r'\s*:\s*(?:function|\([^)]*\)|[\[\{"\'0-9])'
    matches = list(re.finditer(pat, bundle))
    print(f"Matches for {prop}: {len(matches)}")
    for m in matches[:3]:
        pos = m.start()
        print(f"  Pos {pos}: {bundle[max(0, pos-40):pos+80]}")
