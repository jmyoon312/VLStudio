# -*- coding: utf-8 -*-
with open('temp_pixeling_re/24259-e2b669ff1d273a05.js', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('function cG(')

# Find where cG returns JSX
# Let's find return (0,i.jsx) or return (0,i.jsxs) inside cG
return_idx = text.find('return(0,i.js', idx + 10000)
print(f"cG return at: {return_idx}")

with open('temp_pixeling_re/cg_jsx_dump.txt', 'w', encoding='utf-8') as f:
    f.write(text[return_idx:return_idx+25000])

print("Saved cG return JSX to temp_pixeling_re/cg_jsx_dump.txt")
