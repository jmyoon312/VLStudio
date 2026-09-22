import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('temp_pixeling_re/24259-e2b669ff1d273a05.js', 'r', encoding='utf-8') as f:
    bundle = f.read()

# Let's search for the definitions of km, kh, kf, kj and settings default vw
# Let's find vw
match_vw = re.search(r'let\s+vw\s*=\s*\{([^}]+)\}', bundle[1300000:1350000])
if match_vw:
    print('=== vw (Default Settings) ===')
    print(match_vw.group(0))

# Let's search for functions kh, km, kf in this range
for fn in ['km', 'kh', 'kf', 'kv', 'kw', 'kc']:
    pattern = rf'function\s+{fn}\s*\(([^)]*)\)\s*\{{'
    m = re.search(pattern, bundle[1300000:1355000])
    if m:
        pos = 1300000 + m.start()
        # find end of function
        depth = 1
        i = pos + len(m.group(0))
        while i < len(bundle) and depth > 0:
            if bundle[i] == '{':
                depth += 1
            elif bundle[i] == '}':
                depth -= 1
            i += 1
        fn_code = bundle[pos:i]
        print(f'\n=== Function {fn} ({len(fn_code)} chars) ===')
        # save to separate file
        with open(f'temp_pixeling_re/func_{fn}.js', 'w', encoding='utf-8') as out:
            out.write(fn_code)
        # print some strings
        strings = re.findall(r'["\']([^"\']*[\uac00-\ud7a3][^"\']*)["\']', fn_code)
        print(f'Korean strings count: {len(strings)}')
        for s in strings[:15]:
            print(f'  * {s}')
