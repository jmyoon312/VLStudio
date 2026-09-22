with open('temp_pixeling_re/24259-e2b669ff1d273a05.js', 'r', encoding='utf-8', errors='ignore') as f:
    code = f.read()

idx = code.find('"one-take"===U')
if idx != -1:
    snippet = code[idx-500:idx+6000]
    with open('temp_pixeling_re/tab_containers_detail.txt', 'w', encoding='utf-8') as out:
        out.write(snippet)
    print("Found tab containers detail snippet!")
else:
    print("Not found")
