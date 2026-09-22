import re

with open('temp_pixeling_re/kj_extracted.js', 'r', encoding='utf-8') as f:
    text = f.read()

# find strings in kj
korean_strings = re.findall(r'["\']([^"\']*[\uac00-\ud7a3][^"\']*)["\']', text)
print(f'Total Korean Strings found: {len(korean_strings)}')
for s in korean_strings[:50]:
    print(' - ', s)

# find store v$ usages
store_usages = set(re.findall(r'v\$\(e=>e\.(\w+)\)', text))
print(f'\n--- Store v$ selectors in kj ({len(store_usages)}) ---')
for u in sorted(store_usages):
    print(' - ', u)

# find API calls or fetch
api_calls = set(re.findall(r'["\'](/api/[^"\']+)["\']', text))
print(f'\n--- API endpoints in kj ({len(api_calls)}) ---')
for a in sorted(api_calls):
    print(' - ', a)
