with open('temp_pixeling_re/video_creative_re.js', 'r', encoding='utf-8') as f:
    text = f.read()

import re

# Find function boundaries
funcs = list(re.finditer(r'function\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)\s*\{', text))
for i, f in enumerate(funcs):
    name = f.group(1)
    args = f.group(2)
    start = f.start()
    end = funcs[i+1].start() if i+1 < len(funcs) else len(text)
    print(f"Component {name}({args[:40]}...) length: {end - start}")
    
    # Save individual component
    with open(f'temp_pixeling_re/comp_{name}.js', 'w', encoding='utf-8') as out:
        out.write(text[start:end])
