import sqlite3
import os
import glob

# Search all sqlite db files in project
db_files = glob.glob("**/*.db", recursive=True)

for db_path in db_files:
    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='work_queue_items'")
        if cur.fetchone():
            cur.execute("PRAGMA table_info(work_queue_items)")
            columns = [col[1] for col in cur.fetchall()]
            if "render_engine" not in columns:
                cur.execute("ALTER TABLE work_queue_items ADD COLUMN render_engine VARCHAR DEFAULT 'REMOTION'")
                conn.commit()
                print(f"✅ Added render_engine to {db_path}")
            else:
                print(f"render_engine already exists in {db_path}")
        conn.close()
    except Exception as e:
        print(f"Notice on {db_path}: {e}")

# Also check AppData if exists
local_app_data = os.environ.get("LOCALAPPDATA")
if local_app_data:
    app_db = os.path.join(local_app_data, "ViraLoop Studio", "vl_database.db")
    if os.path.exists(app_db):
        try:
            conn = sqlite3.connect(app_db)
            cur = conn.cursor()
            cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='work_queue_items'")
            if cur.fetchone():
                cur.execute("PRAGMA table_info(work_queue_items)")
                columns = [col[1] for col in cur.fetchall()]
                if "render_engine" not in columns:
                    cur.execute("ALTER TABLE work_queue_items ADD COLUMN render_engine VARCHAR DEFAULT 'REMOTION'")
                    conn.commit()
                    print(f"✅ Added render_engine to AppData {app_db}")
            conn.close()
        except Exception as e:
            print(f"Notice on AppData {app_db}: {e}")
