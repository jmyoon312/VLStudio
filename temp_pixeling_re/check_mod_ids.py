with open('temp_pixeling_re/24259-e2b669ff1d273a05.js', 'r', encoding='utf-8') as f:
    bundle = f.read()

import re
# Find all module keys in { ... }
mod_ids = [int(m) for m in re.findall(r'[,{](\d{3,6}):\(', bundle)]
print(f"Total modules in 24259: {len(mod_ids)}")
print(f"Min module ID: {min(mod_ids)}, Max: {max(mod_ids)}")
if 98493 in mod_ids:
    print("98493 IS in mod_ids!")
else:
    print("98493 is NOT in 24259. Nearest module IDs:")
    nearest = sorted(mod_ids, key=lambda x: abs(x - 98493))[:10]
    print(nearest)
