import re

with open('temp_pixeling_re/24259-e2b669ff1d273a05.js', 'r', encoding='utf-8', errors='ignore') as f:
    code = f.read()

# Look for switch(activeTab) or if (activeTab === "one-take") ...
# Let's search for "one-take"===e or "song"===e or similar tab dispatchers
matches = re.findall(r'(\"one-take\"===([a-zA-Z0-9]+)\?[^;]+;)', code)
print("Matches for one-take ternary:", len(matches))
for m, var in matches[:5]:
    print(f"Var: {var}, snippet: {m[:200]}")

# Also look for where the view components are called for each tab:
# e.g., "one-take": <OneTakeBatchView ...>, "song": <SongBatchView ...>
for tab in ["one-take", "song", "long-to-short", "long-to-short-2", "movie-drama-shorts", "text-creative", "video-creative", "meokguri", "ranking-shorts", "stock-motion", "longform-multi"]:
    pattern = rf'[\'\"]{tab}[\'\"]\s*:\s*(?:function|\([^)]*\)\s*=>|\(0,[a-zA-Z0-9_\.]+\)\([a-zA-Z0-9_\.]+)'
    m = re.findall(pattern, code)
    print(f"Tab {tab} mapped: {m[:2]}")
