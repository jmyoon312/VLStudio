import re
import json

def analyze():
    bundle_path = r'c:\ViraLoopMedia\VLStudio\temp_pixeling_re\24259-e2b669ff1d273a05.js'
    with open(bundle_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find where meokguri section starts and ends
    # We saw data-pixi-meokguri from ~1620000 to ~1795000
    start_pos = 1620000
    end_pos = 1795000
    chunk = content[start_pos:end_pos]

    # Find API endpoints
    apis = set(re.findall(r'/api/[a-zA-Z0-9_\-\/]+', chunk))

    # Find data-pixi-meokguri attributes with counts
    attrs = re.findall(r'data-pixi-meokguri-[a-z0-9-]+', chunk)
    attr_counts = {}
    for a in attrs:
        attr_counts[a] = attr_counts.get(a, 0) + 1

    # Extract all components: function Xx(...)
    components = re.findall(r'function\s+([A-Za-z0-9_$]+)\s*\(([^)]*)\)', chunk)

    # Search for specific meokguri labels and strings
    korean_strings = []
    # match quotes with korean
    raw_korean = re.findall(r'"([^"]*[\uac00-\ud7a3][^"]*)"', chunk)
    korean_strings.extend(raw_korean)

    # Let's inspect the main sub-components
    # Let's check Rr function signature and state definitions
    rr_idx = content.find('function Rr(')
    rr_snippet = content[rr_idx:rr_idx+8000] if rr_idx != -1 else ''

    # Write report
    report = {
        'apis': sorted(list(apis)),
        'total_data_attrs': len(attr_counts),
        'top_data_attrs': sorted(attr_counts.items(), key=lambda x: x[1], reverse=True)[:50],
        'total_korean_strings': len(korean_strings),
        'sample_korean_strings': list(set(korean_strings))[:80],
        'rr_snippet_first_3000': rr_snippet[:3000]
    }

    with open(r'c:\ViraLoopMedia\VLStudio\temp_pixeling_re\meokguri_deep_analysis.json', 'w', encoding='utf-8') as f_out:
        json.dump(report, f_out, ensure_ascii=False, indent=2)

    print(f"Deep analysis finished. Extracted {len(apis)} APIs, {len(attr_counts)} unique data attributes, {len(korean_strings)} Korean strings.")

if __name__ == '__main__':
    analyze()
