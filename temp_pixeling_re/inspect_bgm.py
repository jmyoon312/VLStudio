import re, sys

sys.stdout.reconfigure(encoding='utf-8')

for fname in ['page-5ca01b04f75cb3f3.js', '24259-e2b669ff1d273a05.js']:
    with open(f'temp_pixeling_re/{fname}', 'r', encoding='utf-8', errors='ignore') as f:
        text = f.read()

    print(f"\n=== Searching {fname} ===")
    # Look for BGM or music names or categories
    bgm_matches = re.findall(r'["\']([^"\']*(?:배경음|BGM|음악|사운드)[^"\']*)["\']', text)
    clean_bgm = set([m.strip() for m in bgm_matches if 2 < len(m.strip()) < 50])
    print(f"Total BGM matches: {len(clean_bgm)}")
    for m in sorted(clean_bgm)[:20]:
        print(f"  - {m}")
