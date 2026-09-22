with open(r'c:\ViraLoopMedia\VLStudio\temp_pixeling_re\24259-e2b669ff1d273a05.js', 'r', encoding='utf-8') as f:
    text = f.read()

import re

# Look for definitions like function Pr( or var Pr= or function Fx( etc around z4 offset (2189140)
# Let's search in window [2150000 : 2250000]
sub_text = text[2150000:2250000]

target_names = ['Pr', 'Fx', 'Fo', 'Fv', 'R8', 'Fd', 'R7', 'Po', 'Ru', 'z2', 'z5', 'Fa', 'RD', 'RL', 'RY', 'PJ', 'F6', 'FK', 'F1', 'P_', 'PD', 'PP', 'Pz', 'zx', 'zT', 'zR']

found = {}
for name in target_names:
    pattern = rf'(function {name}\b|var {name}\s*=|let {name}\s*=)'
    for m in re.finditer(pattern, text[2100000:2250000]):
        actual_pos = 2100000 + m.start()
        found[name] = actual_pos
        break

print('Found components/functions positions:')
for k, v in found.items():
    print(f'  {k}: {v}')
