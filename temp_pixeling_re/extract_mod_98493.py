with open('temp_pixeling_re/24259-e2b669ff1d273a05.js', 'r', encoding='utf-8') as f:
    bundle = f.read()

import re
m = re.search(r'[\{,]\s*98493\s*:\s*(?:function)?\s*\(([^)]*)\)\s*=>?\s*\{', bundle)
if m:
    start_pos = m.start()
    print(f"Found module 98493 at {start_pos}")
    # Extract 40,000 chars of module 98493
    mod_text = bundle[start_pos:start_pos + 50000]
    with open('temp_pixeling_re/mod_98493.js', 'w', encoding='utf-8') as out:
        out.write(mod_text)
    print("Wrote mod_98493.js, length:", len(mod_text))
else:
    print("Module 98493 not found via regex, searching literally...")
    idx = bundle.find('98493:')
    if idx != -1:
        print(f"Found 98493: at {idx}")
        with open('temp_pixeling_re/mod_98493.js', 'w', encoding='utf-8') as out:
            out.write(bundle[idx-10:idx+50000])
