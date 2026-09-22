with open('temp_pixeling_re/24259-e2b669ff1d273a05.js', 'r', encoding='utf-8') as f:
    bundle = f.read()

idx = bundle.find('function KB()')
before = bundle[max(0, idx - 8000):idx]

with open('temp_pixeling_re/kb_before.js', 'w', encoding='utf-8') as out:
    out.write(before)

print("Wrote kb_before.js, size:", len(before))
