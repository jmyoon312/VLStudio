with open(r'c:\ViraLoopMedia\VLStudio\temp_pixeling_re\24259-e2b669ff1d273a05.js', 'r', encoding='utf-8') as f:
    text = f.read()

import re

components = ['Pr', 'Fx', 'Fo', 'Fv', 'R8', 'Fd', 'R7', 'Po']

out_file = r'c:\ViraLoopMedia\VLStudio\temp_pixeling_re\z4_subcomponents_code.js'
with open(out_file, 'w', encoding='utf-8') as out:
    for name in components:
        # Search for function name(
        pos = text.find(f'function {name}(')
        if pos != -1:
            # find end by next function
            next_func = text.find('function ', pos + 10)
            if next_func == -1:
                next_func = pos + 15000
            snippet = text[pos:next_func]
            out.write(f'/* ======================== COMPONENT: {name} (len: {len(snippet)}) ======================== */\n')
            out.write(snippet + '\n\n')
            print(f'Extracted {name}, length: {len(snippet)}')
        else:
            print(f'Could not find function {name}(')
