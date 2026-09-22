import re, json

with open('temp_pixeling_re/24259-e2b669ff1d273a05.js', 'r', encoding='utf-8', errors='ignore') as f:
    code = f.read()

# Search for the tabs array definition
# Pattern like: [{value:"one-take",label:"...",shortLabel:"...",icon:...}, ...]
idx = code.find('value:"one-take"')
if idx != -1:
    snippet = code[idx-50:idx+2500]
    with open('temp_pixeling_re/tabs_snippet.txt', 'w', encoding='utf-8') as out:
        out.write(snippet)
    print("Found snippet around value:\"one-take\"")

# Also search for tab group categories
idx2 = code.find('id:"batch",label:')
if idx2 != -1:
    snippet2 = code[idx2-50:idx2+1500]
    with open('temp_pixeling_re/categories_snippet.txt', 'w', encoding='utf-8') as out:
        out.write(snippet2)
    print("Found categories snippet")
