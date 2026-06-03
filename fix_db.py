import sqlite3

def fix_db():
    db_path = r"C:\Users\jmyoo\AppData\Local\ViraLoop Studio\viral_loop.db"
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    
    # file_path 수정
    c.execute("UPDATE videos SET file_path = REPLACE(file_path, '\\\\영화\\\\', '\\\\영화쇼츠\\\\') WHERE file_path LIKE '%\\\\영화\\\\%'")
    file_changes = c.rowcount
    
    conn.commit()
    conn.close()
    
    print(f"Database updated: {file_changes} video paths.")

if __name__ == "__main__":
    fix_db()
