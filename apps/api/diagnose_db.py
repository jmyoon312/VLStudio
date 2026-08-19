import sys, os, sqlite3, traceback
sys.path.insert(0, 'C:/ViraLoopMedia/VLStudio/apps/api')
os.environ.setdefault('JWT_SECRET', 'test-secret')
os.environ.setdefault('SOLO_MODE', '1')

import app.legacy_ddalkkak.api.database as db_module

print(f"DB_PATH: {db_module.DB_PATH}")
print(f"DB exists: {db_module.DB_PATH.exists()}")

if db_module.DB_PATH.exists():
    conn = sqlite3.connect(str(db_module.DB_PATH))
    tables = [r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")]
    print(f"Tables: {tables}")
    for t in ['dissection_analyses', 'subtitle_jobs', 'tts_dub_jobs', 'clip_edit_jobs', 'remixes']:
        if t in tables:
            cols = [r[1] for r in conn.execute(f"PRAGMA table_info({t})")]
            has_cost = 'cost_usd' in cols
            print(f"  {t}.cost_usd: {has_cost}")
        else:
            print(f"  {t}: TABLE MISSING")
    conn.close()
else:
    print("DB does not exist yet - will be created by init_db()")

from app.legacy_ddalkkak.api import main
from fastapi.testclient import TestClient
client = TestClient(main.app)

for ep in ['/subtitle/list', '/tts-dub/list', '/clip-edit/list', '/cost-summary']:
    try:
        r = client.get(ep, headers={'Authorization': 'Bearer solo'})
        print(f"{ep} -> {r.status_code}")
        if r.status_code >= 400:
            print(f"  ERROR: {r.text[:1000]}")
    except Exception as e:
        print(f"{ep} -> EXCEPTION")
        traceback.print_exc()
