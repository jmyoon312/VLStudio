import re
import json

with open(r'c:\ViraLoopMedia\VLStudio\temp_pixeling_re\z4_only.js', 'r', encoding='utf-8') as f:
    text = f.read()

hangul = sorted(list(set(re.findall(r'[\'"][^\'"]*[\uac00-\ud7a3]+[^\'"]*[\'"]', text))))
print(f'Total distinct Korean strings in z4: {len(hangul)}')

with open(r'c:\ViraLoopMedia\VLStudio\temp_pixeling_re\z4_korean_exact.txt', 'w', encoding='utf-8') as out:
    for h in hangul:
        out.write(h + '\n')

# Check variables and state hooks
print('\n--- Analysis of z4 structure ---')
# Look for subcomponents or JSX element tags:
tags = re.findall(r'jsx\(([A-Za-z0-9_$]+),', text)
print('JSX elements rendered in z4:', sorted(list(set(tags))))
