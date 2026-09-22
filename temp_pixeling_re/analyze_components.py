with open('temp_pixeling_re/24259-e2b669ff1d273a05.js', 'r', encoding='utf-8', errors='ignore') as f:
    code = f.read()

import re

components = {
    'pt (OneTake/Song)': 'function pt(',
    'cX (LongformMulti)': 'function cX(',
    'wd (LongToShort)': 'function wd(',
    'kj (LongToShort2)': 'function kj(',
    'z4 (MovieDrama)': 'function z4(',
    'KC (TextCreative)': 'function KC(',
    'KB (VideoCreative)': 'function KB(',
    'Rr (Meokguri)': 'function Rr(',
    'JC (Ranking)': 'function JC(',
    'JH (StockMotion)': 'function JH('
}

results = []
for name, decl in components.items():
    idx = code.find(decl)
    if idx != -1:
        chunk = code[idx:idx+3500]
        # Extract Korean text from chunk
        ko_texts = re.findall(r'[\'\"]([가-힣\s\(\)\[\]\/\:\.\,\!\?\-\+\%]{2,40})[\'\"]', chunk)
        results.append(f"=== {name} ===")
        results.append(f"Korean strings ({len(ko_texts)}): " + ", ".join(ko_texts[:15]))
        results.append(chunk[:400] + "\n...\n")
    else:
        results.append(f"=== {name} === NOT FOUND by exact decl")

with open('temp_pixeling_re/tab_components_analyzed.txt', 'w', encoding='utf-8') as out:
    out.write("\n".join(results))

print("Analysis written to temp_pixeling_re/tab_components_analyzed.txt")
