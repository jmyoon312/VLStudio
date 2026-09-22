import re

with open(r'c:\ViraLoopMedia\VLStudio\temp_pixeling_re\z4_full.js', 'r', encoding='utf-8') as f:
    text = f.read()

# Find Korean strings (unescaped or unicode \uXXXX)
hangul = re.findall(r'[\'"][^\'"]*[\uac00-\ud7a3]+[^\'"]*[\'"]', text)
print(f'Total korean strings: {len(hangul)}')
unique_hangul = sorted(list(set(hangul)))
print(f'Unique Korean strings: {len(unique_hangul)}')
with open(r'c:\ViraLoopMedia\VLStudio\temp_pixeling_re\z4_korean_strings.txt', 'w', encoding='utf-8') as out:
    for h in unique_hangul:
        out.write(h + '\n')

endpoints = set(re.findall(r'\/api\/[a-zA-Z0-9_\-\/]+', text))
print('Endpoints:', endpoints)

# Find JSX elements or subcomponents
components = set(re.findall(r'<([A-Z][a-zA-Z0-9]+)', text))
print('JSX components:', components)
