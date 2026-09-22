import glob
import os

for js in glob.glob('temp_pixeling_re/*.js'):
    with open(js, 'r', encoding='utf-8') as f:
        content = f.read()
    if '98493' in content:
        print(f"Found 98493 in {js}!")
        # show context
        idx = 0
        while True:
            idx = content.find('98493', idx)
            if idx == -1:
                break
            print(f"  Pos {idx}: {content[max(0, idx-50):idx+100]}")
            idx += 5
