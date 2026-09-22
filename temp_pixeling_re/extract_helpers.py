with open(r'c:\ViraLoopMedia\VLStudio\temp_pixeling_re\24259-e2b669ff1d273a05.js', 'r', encoding='utf-8') as f:
    text = f.read()

import re

# Find definitions of FK, F1, PP, zx, zT, zR, zY, zB
fn_names = ['FK', 'F1', 'PP', 'zx', 'zT', 'zR', 'zY', 'zB', 'R8', 'Fx', 'Pr', 'Fo', 'Fv', 'Fd']
for name in fn_names:
    pos = text.find(f'function {name}(')
    if pos != -1:
        snippet = text[pos:pos+1500]
        print(f'=== function {name} === (pos: {pos})')
        print(snippet[:600])
        print('\n')
