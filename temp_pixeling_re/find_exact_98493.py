with open('temp_pixeling_re/24259-e2b669ff1d273a05.js', 'r', encoding='utf-8') as f:
    bundle = f.read()

import re
# In webpack bundles, module definitions look like: 98493:(e,t,r)=>{ or "98493":(e,t,r)=>{
matches = re.finditer(r'["\']?98493["\']?\s*:\s*(?:function)?\s*\(', bundle)
found = False
for m in matches:
    found = True
    pos = m.start()
    print(f"Found module 98493 definition at {pos}!")
    # extract module 98493 code
    mod_code = bundle[pos:pos+40000]
    with open('temp_pixeling_re/mod_98493_full.js', 'w', encoding='utf-8') as out:
        out.write(mod_code)
    print("Saved mod_98493_full.js")
    break

if not found:
    print("98493 module not found with standard pattern, checking other patterns...")
    # search where 98493 occurs in bundle
    for m in re.finditer(r'98493', bundle):
        print("Occurrence at", m.start(), ":", bundle[max(0, m.start()-50):m.start()+100])
