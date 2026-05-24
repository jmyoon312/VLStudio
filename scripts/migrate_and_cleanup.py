import os
import shutil
import sqlite3
import sys

def migrate():
    # 1. Paths configuration
    src_dir = r"C:\ViraLoopMedia"
    repo_dir = r"C:\ViraLoopMedia\VLStudio"
    
    local_app_data = os.environ.get("LOCALAPPDATA")
    if not local_app_data:
        local_app_data = os.path.join(os.path.expanduser("~"), "AppData", "Local")
    
    dest_root = os.path.join(local_app_data, "ViraLoop Studio")
    dest_media = os.path.join(dest_root, "media")
    db_path = os.path.join(dest_root, "viral_loop.db")
    
    print(f"=== Unified Path Migration and Cleanup ===")
    print(f"Source root: {src_dir}")
    print(f"Target media root: {dest_media}")
    print(f"Active database: {db_path}")
    print(f"Repository directory (EXCLUDED): {repo_dir}")
    
    # 2. Update Database settings row
    if os.path.exists(db_path):
        print(f"\n[1/3] Updating settings in active database: {db_path}")
        try:
            conn = sqlite3.connect(db_path)
            cur = conn.cursor()
            
            # Check if settings table exists
            cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='settings';")
            if cur.fetchone():
                # Get current settings
                cur.execute("SELECT root_download_path, cookies_path, whisper_model_path, supertone_model_path, chrome_path FROM settings WHERE id=1")
                row = cur.fetchone()
                if row:
                    print(f"  Current values: root_download_path={row[0]}, cookies_path={row[1]}, whisper_model_path={row[2]}, supertone_model_path={row[3]}, chrome_path={row[4]}")
                
                # Update settings
                cur.execute("""
                    UPDATE settings 
                    SET root_download_path = '',
                        cookies_path = '',
                        whisper_model_path = '',
                        supertone_model_path = '',
                        chrome_path = ''
                    WHERE id = 1
                """)
                conn.commit()
                print("  Successfully cleared absolute paths in database settings (set to dynamic defaults).")
            else:
                print("  Warning: settings table not found in active database.")
            conn.close()
        except Exception as e:
            print(f"  Error updating database settings: {e}")
            sys.exit(1)
    else:
        print(f"\n[1/3] Active database at {db_path} does not exist yet. It will be initialized on first run.")

    # 3. Migrate folders
    print(f"\n[2/3] Migrating data folders from {src_dir} to {dest_media}")
    
    # Define folder mapping: src subfolder -> dest subfolder relative to dest_media
    folder_mapping = {
        "01_Inbox": "01_Inbox",
        "inbox": "01_Inbox",
        
        "02_Operations": "02_Operations",
        "operations": "02_Operations",
        
        "03_Assets": "03_Assets",
        "assets": "03_Assets",
        
        "04_Profiles": "04_Profiles",
        "Profiles": "04_Profiles",
        
        "05_Exports": "05_Exports",
        
        "06_Database": "06_Database",
        
        "downloads": "downloads",
        "temp": "02_Operations/Temp",
        ".cache": ".cache",
        ".swarm": ".swarm",
        "backup": "backup",
        "bin": "bin",
        "brain_vault": "brain_vault",
    }
    
    # File mapping: src file -> dest path
    file_mapping = {
        "cookies.txt": "cookies.txt",
        "settings_backup_2026-04-24.json": "settings_backup_2026-04-24.json",
    }
    
    # Create dest_media immediately
    os.makedirs(dest_media, exist_ok=True)
    
    def merge_directories(src_path, dst_path):
        if not os.path.exists(src_path):
            return
        os.makedirs(dst_path, exist_ok=True)
        for item in os.listdir(src_path):
            s = os.path.join(src_path, item)
            d = os.path.join(dst_path, item)
            if os.path.isdir(s):
                merge_directories(s, d)
            else:
                if not os.path.exists(d) or os.path.getsize(s) != os.path.getsize(d):
                    try:
                        shutil.copy2(s, d)
                        # print(f"    Copied: {item}")
                    except Exception as e:
                        print(f"    Error copying {s} to {d}: {e}")
                        
    # Run migrations
    for src_sub, dest_sub in folder_mapping.items():
        src_full = os.path.join(src_dir, src_sub)
        dest_full = os.path.join(dest_media, dest_sub.replace("/", "\\"))
        if os.path.exists(src_full):
            print(f"  Migrating directory '{src_sub}' -> '{dest_sub}'...")
            merge_directories(src_full, dest_full)
            
    for src_file, dest_file in file_mapping.items():
        src_full = os.path.join(src_dir, src_file)
        dest_full = os.path.join(dest_media, dest_file)
        if os.path.exists(src_full):
            print(f"  Migrating file '{src_file}' -> '{dest_file}'...")
            try:
                shutil.copy2(src_full, dest_full)
            except Exception as e:
                print(f"    Error copying file: {e}")

    # 4. Cleanup old folders
    print(f"\n[3/3] Cleaning up old folders in {src_dir} (EXCLUDING repository {repo_dir})")
    
    # Files to delete
    files_to_delete = [
        "cookies.txt",
        "settings_backup_2026-04-24.json",
        "viral_loop.db",
        "viral_loop.db-shm",
        "viral_loop.db-wal",
        "scan_debug.log",
        "sync_db_schema.py",
        "create_test_data.py",
        "README.md",
    ]
    
    for f in files_to_delete:
        f_path = os.path.join(src_dir, f)
        if os.path.exists(f_path):
            try:
                os.remove(f_path)
                print(f"  Deleted file: {f}")
            except Exception as e:
                print(f"  Error deleting file {f}: {e}")
                
    # Folders to delete
    folders_to_delete = [
        "01_Inbox", "inbox",
        "02_Operations", "operations", "temp",
        "03_Assets", "assets",
        "04_Profiles", "Profiles",
        "05_Exports",
        "06_Database",
        "downloads",
        ".cache",
        ".swarm",
        "backup",
        "bin",
        "brain_vault",
    ]
    
    # Clear read-only flags recursively
    import stat
    def remove_readonly(func, path, excinfo):
        try:
            os.chmod(path, stat.S_IWRITE)
            func(path)
        except Exception as e:
            print(f"    Failed to remove readonly file {path}: {e}")

    for folder in folders_to_delete:
        fol_path = os.path.join(src_dir, folder)
        if os.path.exists(fol_path):
            # Double check to prevent deleting repo
            if os.path.abspath(fol_path) == os.path.abspath(repo_dir):
                print(f"  WARNING: Tried to delete repo dir {fol_path}! Excluded.")
                continue
            print(f"  Deleting old folder: {folder}...")
            try:
                shutil.rmtree(fol_path, onerror=remove_readonly)
            except Exception as e:
                print(f"    Error deleting directory {folder}: {e}")
                
    print("\n=== Migration and Cleanup Completed Successfully! ===")

if __name__ == "__main__":
    migrate()
