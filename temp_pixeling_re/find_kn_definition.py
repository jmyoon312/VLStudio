with open('temp_pixeling_re/24259-e2b669ff1d273a05.js', 'r', encoding='utf-8') as f:
    bundle = f.read()

idx = bundle.find('function KB()')
# Let's search back up to 100,000 chars before KB to find where KN is defined
before_kb = bundle[max(0, idx - 100000):idx]

# Search for "KN=" or similar
import re
matches = [m.start() for m in re.finditer(r'\bKN\s*=', before_kb)]
print(f"Found {len(matches)} occurrences of KN =")
for m in matches:
    print(before_kb[m-20:m+150])

# Also let's inspect the components defined before KB:
# e.g., KO, KA, etc.
comp_matches = re.findall(r'function\s+(K[A-Za-z0-9_]+)\s*\(', bundle[idx-50000:idx+30000])
print("Components around KB:", set(comp_matches))
