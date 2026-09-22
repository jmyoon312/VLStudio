import re
import json

def extract_detailed_meokguri():
    bundle_path = r'c:\ViraLoopMedia\VLStudio\temp_pixeling_re\24259-e2b669ff1d273a05.js'
    with open(bundle_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Search for functions defined in meokguri section
    # Let's search for Ev, Re, and components like Rr
    # We saw in previous output:
    # return Re?{jobs:..., sourcePairDrafts:..., selectedRenderedJobId:..., sourceFiles:...}
    # [G, X] = useState(() => J?.sourcePairDrafts ?? [Ev()])
    
    # Let's find definition of Ev()
    ev_idx = content.rfind('function Ev(', 0, 1789606)
    if ev_idx == -1:
        ev_matches = [m.start() for m in re.finditer(r'function Ev\(', content)]
        print("Ev matches:", ev_matches)
    else:
        print("Ev found at:", ev_idx)
        print("Ev code:", content[ev_idx:ev_idx+600])

    # Let's find components around Rr (from 1620000 to 1795000)
    # Search for all "function " in this range
    chunk = content[1620000:1795000]
    funcs = re.findall(r'function\s+([A-Za-z0-9_$]+)\s*\(([^)]*)\)\s*\{', chunk)
    print(f"Total functions in chunk: {len(funcs)}")

    func_list = []
    for fname, fargs in funcs:
        # find where this function is in content
        pos = content.find(f'function {fname}(', 1620000)
        # grab first 300 chars
        snippet = content[pos:pos+400]
        # check if it contains any korean or data-pixi-meokguri
        korean = re.findall(r'[\uac00-\ud7a3]+', snippet)
        attrs = re.findall(r'data-pixi-meokguri-[a-z0-9-]+', snippet)
        func_list.append({
            'name': fname,
            'args': fargs,
            'korean': list(set(korean))[:5],
            'attrs': list(set(attrs)),
            'snippet': snippet[:200]
        })

    with open(r'c:\ViraLoopMedia\VLStudio\temp_pixeling_re\meokguri_functions.json', 'w', encoding='utf-8') as out:
        json.dump(func_list, out, ensure_ascii=False, indent=2)

    print("Saved meokguri_functions.json")

if __name__ == '__main__':
    extract_detailed_meokguri()
