# -*- coding: utf-8 -*-
import re

with open('temp_pixeling_re/24259-e2b669ff1d273a05.js', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('function cG(')

# Let's inspect around cG to find its sub-components and child JSX
# Look for workspaceView conditions in cG
cg_slice = text[idx:idx+40000]

# Find all occurrences of workspaceView in cg_slice
matches = [m.start() for m in re.finditer(r'workspaceView', cg_slice)]
print(f"Occurrences of workspaceView in cG: {len(matches)}")
for m in matches:
    print("--- snippet ---")
    print(cg_slice[max(0, m-80):min(len(cg_slice), m+150)])

