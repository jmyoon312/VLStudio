import sqlite3
import os

db_path = os.path.expandvars(r'%LOCALAPPDATA%\ViraLoop Studio\viral_loop.db')
if not os.path.exists(db_path):
    print(f"DB not found at {db_path}")
    exit(0)

conn = sqlite3.connect(db_path)
cur = conn.cursor()
cur.execute('PRAGMA table_info(brand_channels)')
existing = {r[1] for r in cur.fetchall()}

needed = [
    ('warmup_last_error', 'TEXT'),
    ('warmup_started_at', 'DATETIME'),
    ('warmup_completed_at', 'DATETIME'),
    ('warmup_total_duration', 'INTEGER DEFAULT 0'),
    ('warmup_error_count', 'INTEGER DEFAULT 0'),
    ('status', "VARCHAR(20) DEFAULT 'ACTIVE'"),
    ('auth_status', "VARCHAR(20) DEFAULT 'PENDING'"),
    ('quarantine_reason', 'TEXT'),
    ('quarantine_until', 'DATETIME'),
    ('dedicated_profile_path', 'VARCHAR(500)'),
    ('last_used_ip', 'VARCHAR(50)'),
    ('last_accessed_at', 'DATETIME'),
]

for col, col_type in needed:
    if col not in existing:
        print(f"Adding column: {col} ({col_type})")
        cur.execute(f"ALTER TABLE brand_channels ADD COLUMN {col} {col_type}")

# Also check channel UC8CSWzfqXvD_6gbNyhtc_Hw and set its initial warmup_last_error from row 11 of warmup_logs
cur.execute("SELECT error_message FROM warmup_logs WHERE channel_id = 'UC8CSWzfqXvD_6gbNyhtc_Hw' ORDER BY id DESC LIMIT 1")
row = cur.fetchone()
if row and row[0]:
    err_msg = "네트워크 연결 실패 (net::ERR_FAILED at youtube.com/shorts/) - SOCKS5 프록시 또는 DNS 응답 지연"
    cur.execute("UPDATE brand_channels SET warmup_last_error = ? WHERE channel_id = 'UC8CSWzfqXvD_6gbNyhtc_Hw'", (err_msg,))
    print(f"Updated channel warmup_last_error to: {err_msg}")

conn.commit()
conn.close()
print("Migration successfully finished!")
