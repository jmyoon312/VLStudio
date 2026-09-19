import sqlite3, json, sys
from datetime import datetime
sys.stdout.reconfigure(encoding='utf-8')

db_path = sys.argv[1]
conn = sqlite3.connect(db_path)
c = conn.cursor()

# 1. Update channel_dna_benchmarks
c.execute("""
UPDATE channel_dna_benchmarks 
SET channel_title = '숏비타민c',
    channel_url = 'https://www.youtube.com/@숏비타민c/shorts',
    category_name = 'K-POP / 연예 정보'
WHERE id = 3 OR channel_url LIKE '%숏비타민c%'
""")
print('Updated channel_dna_benchmarks rows:', c.rowcount)

# Get visual_dna for shorts_templates
c.execute("SELECT visual_dna FROM channel_dna_benchmarks WHERE channel_title = '숏비타민c' LIMIT 1")
row = c.fetchone()
visual_dna = json.loads(row[0]) if row else {}

# 2. Insert or replace into shorts_templates
template_id = 'template_short_vitamin_c'
template_name = '🍋 숏비타민c 샌드위치 레터박스형'
badge = '숏비타민c 실측'
desc = '유튜브 @숏비타민c 실측 DNA: 상단 블랙 18.3% 2단 훅 타이틀(#FFFFFF + #F5F420) + 8.5초 잽 훅 + Y 68.5% word_pop 자막'
archetype = 'classic'
now = datetime.now().isoformat()

c.execute("""
INSERT OR REPLACE INTO shorts_templates 
(id, name, badge, description, archetype, aspect_ratio, is_system, channel_id, layout, manifest, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, '9:16', 1, NULL, ?, NULL, ?, ?)
""", (template_id, template_name, badge, desc, archetype, json.dumps(visual_dna, ensure_ascii=False), now, now))
print('Saved to shorts_templates:', c.rowcount)

conn.commit()

# Verify
c.execute("SELECT id, channel_title, channel_url FROM channel_dna_benchmarks")
print('=== Verification: channel_dna_benchmarks ===')
for r in c.fetchall():
    print(r)

c.execute("SELECT id, name, badge, archetype FROM shorts_templates WHERE id = 'template_short_vitamin_c'")
print('=== Verification: shorts_templates ===')
for r in c.fetchall():
    print(r)

conn.close()
