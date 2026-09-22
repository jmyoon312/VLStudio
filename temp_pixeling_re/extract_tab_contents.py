with open('temp_pixeling_re/24259-e2b669ff1d273a05.js', 'r', encoding='utf-8', errors='ignore') as f:
    code = f.read()

import re

# Find all cQ.av blocks with value="..."
matches = re.findall(r'cQ\.av,\{value:[\'\"]([a-zA-Z0-9_\-]+)[\'\"],[^}]*children:([^}]+(?:\{[^}]+\})*[^}]*)\}', code)
print(f"Found {len(matches)} TabsContent definitions:")
for val, child in matches:
    print(f"Tab: {val}")
    print(f"  Child snippet: {child[:200]}")
