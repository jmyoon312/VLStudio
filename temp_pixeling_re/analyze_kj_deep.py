import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('temp_pixeling_re/24259-e2b669ff1d273a05.js', 'r', encoding='utf-8') as f:
    bundle = f.read()

pos = 1314715 # start of function kj
# Find the opening brace of the function body (after the parameter list)
# e.g. function kj(...){
param_end = bundle.find('){', pos)
if param_end == -1:
    param_end = bundle.find(') {', pos)
    start_idx = param_end + 2
else:
    start_idx = param_end + 1

depth = 0
end_idx = start_idx
for i in range(start_idx, len(bundle)):
    if bundle[i] == '{':
        depth += 1
    elif bundle[i] == '}':
        depth -= 1
        if depth == 0:
            end_idx = i + 1
            break

kj_body = bundle[pos:end_idx]
print(f'kj function length: {len(kj_body)} characters (from {pos} to {end_idx})')

with open('temp_pixeling_re/kj_full_component.js', 'w', encoding='utf-8') as f:
    f.write(kj_body)

# Also let's find the context before pos (helper functions, constants around kj)
before_context = bundle[max(0, pos-25000):pos]
with open('temp_pixeling_re/kj_before_context.js', 'w', encoding='utf-8') as f:
    f.write(before_context)

print('Saved kj_full_component.js and kj_before_context.js successfully!')
