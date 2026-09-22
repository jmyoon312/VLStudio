import glob
import os
import re

for filepath in glob.glob('temp_pixeling_re/*'):
    if not os.path.isfile(filepath): continue
    filename = os.path.basename(filepath)
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        # Check for 98493
        if '98493' in content:
            print(f"[FOUND 98493] in {filename}")
            for m in re.finditer(r'.{0,40}98493.{0,40}', content):
                print(f"   {m.group(0)}")
    except Exception as e:
        print(f"Error reading {filename}: {e}")
