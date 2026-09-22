import re

def analyze_comp(name):
    with open(f'temp_pixeling_re/comp_{name}.js', 'r', encoding='utf-8') as f:
        code = f.read()
    print(f"=== {name} ({len(code)} bytes) ===")
    
    # Extract KN.* usages
    kn_calls = set(re.findall(r'KN\.([A-Za-z0-9_]+)', code))
    print("KN usages:", kn_calls)
    
    # Extract Korean strings
    korean = set(re.findall(r'["\']([^"\']*[\uac00-\ud7a3][^"\']*)["\']', code))
    print("Korean strings count:", len(korean))
    for k in sorted(korean)[:15]:
        print("  -", k)

for c in ['KB', 'KP', 'KO', 'KU']:
    analyze_comp(c)
