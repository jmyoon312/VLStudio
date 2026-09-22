with open('temp_pixeling_re/24259-e2b669ff1d273a05.js', 'r', encoding='utf-8') as f:
    bundle = f.read()

# Let's inspect the first 2000 chars of 24259
print("Bundle header:")
print(bundle[:500])

# Let's search for all occurrences of "98493" in 24259
import re
print("Matches of 98493:")
for m in re.finditer(r'.{0,30}98493.{0,30}', bundle):
    print(m.group(0))
