import os
import sys
import json

sys.stdout.reconfigure(encoding='utf-8')

audit_dir = os.path.abspath("05_Exports/channel_dna_audit/숏비타민c")
meta_file = os.path.join(audit_dir, "metadata_12_shorts.json")

with open(meta_file, "r", encoding="utf-8") as f:
    items = json.load(f)

print(f"=== 12 Shorts Exhaustive Survey Summary ({len(items)} videos) ===")
total_views = sum(it.get('view_count', 0) for it in items if it.get('view_count'))
avg_duration = sum(it.get('duration', 0) for it in items if it.get('duration')) / len(items)

print(f"Total Sample Views: {total_views:,}")
print(f"Average Duration: {avg_duration:.1f}s")
print("-" * 70)

for idx, it in enumerate(items, 1):
    print(f"[{idx:02d}] ID: {it['id']} | Duration: {it['duration']}s | Views: {it.get('view_count', 0):,}")
    print(f"     Title: {it['title']}")
    desc = it['description'].replace('\n', ' ')
    print(f"     Description: {desc[:100]}...")
    print(f"     Tags/Topics: {it.get('tags', [])[:5]}")
    print("-" * 70)
