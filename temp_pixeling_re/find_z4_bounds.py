with open(r'c:\ViraLoopMedia\VLStudio\temp_pixeling_re\24259-e2b669ff1d273a05.js', 'r', encoding='utf-8') as f:
    text = f.read()

start = text.find('function z4(')
print('z4 start:', start)

# Find next top-level function definition after z4
import re
# Let's inspect where z4 ends. In minified JS, functions are often delimited by function XX( or var XX=
matches = [m.start() for m in re.finditer(r'function [a-zA-Z0-9_$]+\(', text[start+100:])]
if matches:
    next_func_offset = matches[0] + start + 100
    print('Next function at:', next_func_offset, 'Length of z4 candidate:', next_func_offset - start)
    z4_code = text[start:next_func_offset]
    print('First 500 chars of z4:', z4_code[:500])
    print('Last 500 chars of z4:', z4_code[-500:])
    with open(r'c:\ViraLoopMedia\VLStudio\temp_pixeling_re\z4_only.js', 'w', encoding='utf-8') as out:
        out.write(z4_code)
