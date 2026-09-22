import sys
import os

with open('temp_pixeling_re/24259-e2b669ff1d273a05.js', 'r', encoding='utf-8') as f:
    bundle = f.read()

# Find where KN is defined
# In bundle, let's look for `KN=` or `var KN` or `let KN` or `const KN`
import re
kn_defs = re.findall(r'(\b(?:var|let|const)?\s*KN\s*=\s*\{[^;]{10,2000}\})', bundle)
with open('temp_pixeling_re/kn_defs.txt', 'w', encoding='utf-8') as out:
    for kd in kn_defs:
        out.write(kd + '\n---\n')

print(f"Found {len(kn_defs)} KN definition matches")

# Let's also look for KN.hf, KN.W1, KN.Mk, KN.JF, KN.m9, KN.nw, etc.
refs = ['hf', 'W1', 'Mk', 'JF', 'm9', 'nw', 'hV', 'Ip', 'RV', 'fH']
for r in refs:
    matches = re.findall(rf'KN\.{r}\s*[:=]\s*([^,\n;)]+)', bundle)
    print(f"KN.{r}: {matches[:3]}")

# Let's also look at KB's full function body:
idx = bundle.find('function KB()')
if idx != -1:
    # let's find matching braces or take 20000 chars
    kb_func = bundle[idx:idx+25000]
    with open('temp_pixeling_re/kb_full_function.js', 'w', encoding='utf-8') as out:
        out.write(kb_func)
    print("Wrote kb_full_function.js")
