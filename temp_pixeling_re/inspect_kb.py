import re

with open('temp_pixeling_re/kb_full_context.js', 'r', encoding='utf-8') as f:
    text = f.read()

# Extract Korean strings
korean_matches = set(re.findall(r'[\uac00-\ud7a3][^\'"`\n\r\{\}\<\>]{2,}', text))
print(f'Total Korean occurrences: {len(korean_matches)}')
for s in sorted(korean_matches)[:50]:
    print('KR:', s.strip()[:60])

# Look for endpoints
endpoints = set(re.findall(r'["\'`]/api/[a-zA-Z0-9_\-\/]+["\'`]', text))
print('\nEndpoints found:')
for ep in sorted(endpoints):
    print('  ', ep)
