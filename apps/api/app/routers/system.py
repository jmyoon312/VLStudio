from fastapi import APIRouter, HTTPException, Request, Depends
from sqlalchemy.orm import Session
from .. import database, models, schemas
from pydantic import BaseModel
import os
import subprocess
import platform
# import tkinter as tk
# from tkinter import filedialog

router = APIRouter(tags=["system"])

class PathRequest(BaseModel):
    path: str

import sys

@router.post("/pick-folder")
def pick_folder():
    """Opens a native Windows folder browser dialog via PowerShell."""
    try:
        ps_cmd = (
            "[System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null; "
            "$f = New-Object System.Windows.Forms.FolderBrowserDialog; "
            "$f.Description = '폴더를 선택하세요'; "
            "$f.ShowNewFolderButton = $true; "
            "if ($f.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $f.SelectedPath }"
        )
        res = subprocess.run(
            ["powershell", "-NoProfile", "-NonInteractive", "-Command", ps_cmd],
            capture_output=True, text=True, timeout=60
        )
        selected = res.stdout.strip()
        if selected:
            return {"status": "success", "path": selected.replace("\\", "/")}
        return {"status": "cancelled", "path": ""}
    except Exception as e:
        return {"status": "error", "message": str(e), "path": ""}

@router.post("/pick-file")
def pick_file():
    """Opens a native Windows file browser dialog via PowerShell."""
    try:
        ps_cmd = (
            "[System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null; "
            "$f = New-Object System.Windows.Forms.OpenFileDialog; "
            "$f.Title = '쿠키 또는 설정 파일을 선택하세요'; "
            "$f.Filter = '모든 파일 (*.*)|*.*|텍스트 파일 (*.txt)|*.txt|JSON (*.json)|*.json'; "
            "if ($f.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $f.FileName }"
        )
        res = subprocess.run(
            ["powershell", "-NoProfile", "-NonInteractive", "-Command", ps_cmd],
            capture_output=True, text=True, timeout=60
        )
        selected = res.stdout.strip()
        if selected:
            return {"status": "success", "path": selected.replace("\\", "/")}
        return {"status": "cancelled", "path": ""}
    except Exception as e:
        return {"status": "error", "message": str(e), "path": ""}

@router.post("/open-folder")
def open_folder(request: PathRequest, db: Session = Depends(database.get_db)):
    path = request.path
    original_path = path

    # 1. Try direct check
    if not os.path.exists(path):
        # 2. Try simple abspath (if relative)
        abs_path = os.path.abspath(path)
        if os.path.exists(abs_path):
            path = abs_path
        else:
            # 3. Try resolving against Download Root (Settings)
            try:
                settings = db.query(models.Settings).first()
                from app.config import settings as settings_conf
                root_path = settings.root_download_path if settings and settings.root_download_path else settings_conf.MEDIA_ROOT
                if root_path:
                    joined_path = os.path.join(root_path, original_path)
                    if os.path.exists(joined_path):
                        path = joined_path
            except Exception as e:
                print(f"Error checking settings path: {e}")
                print(f"Error checking settings path: {e}")

    # Final check
    if not os.path.exists(path):
        # Try resolving relative path against project root (assuming backend is cwd)
        # e.g. path="downloads/rendered", cwd=".../backend" -> ".../downloads/rendered"
        # Try resolving relative path against backend dir and project root
        cwd = os.getcwd()
        basename = os.path.basename(cwd)
        
        # Candidate 1: Direct relative to CWD
        candidate1 = os.path.abspath(os.path.join(cwd, path))
        if os.path.exists(candidate1):
            path = candidate1
        else:
            # Candidate 2: Relative to project root (if we are in backend)
            if basename == "backend":
                project_root = os.path.dirname(cwd)
                candidate2 = os.path.abspath(os.path.join(project_root, path))
                if os.path.exists(candidate2):
                    path = candidate2
            # Candidate 3: Relative to backend (if we are in project root)
            else:
                backend_dir = os.path.join(cwd, "backend")
                candidate3 = os.path.abspath(os.path.join(backend_dir, path))
                if os.path.exists(candidate3):
                    path = candidate3
        
        # Try to just open the parent folder if the file itself is missing
        if not os.path.exists(path):
            parent = os.path.dirname(path)
            if os.path.exists(parent):
                path = parent
            else:
                 print(f"Path not found: {original_path} -> {path}")
                 raise HTTPException(status_code=404, detail=f"Path not found: {path} (Resolved: {os.path.abspath(path)})")
    
    # If the path exists but is a file, open its parent directory
    if os.path.isfile(path):
        path = os.path.dirname(path)

    import logging
    logger = logging.getLogger("uvicorn.error")
    
    try:
        # Determine if we should use the Windows Agent (for Docker environments)
        agent_url = os.getenv("WINDOWS_AGENT_URL", "http://host.docker.internal:8001")
        is_docker = os.path.exists("/.dockerenv")
        settings = db.query(models.Settings).first()

        if is_docker:
            # 1. Fetch Host Media Root from Agent itself (The Source of Truth)
            try:
                import requests
                health_resp = requests.get(f"{agent_url}/health", timeout=2)
                if health_resp.status_code == 200:
                    agent_info = health_resp.json()
                    host_media_root = agent_info.get("media_dir", "C:\\ViraLoopMedia")
                else:
                    host_media_root = "C:\\ViraLoopMedia" # Fallback
            except:
                host_media_root = "C:\\ViraLoopMedia"

            # Settings.root_download_path is usually '/app/media'
            from app.config import settings as settings_conf
            db_root = settings.root_download_path if settings and settings.root_download_path else settings_conf.MEDIA_ROOT
            target_path = os.path.abspath(path)
            
            if target_path.startswith(db_root):
                rel_path = target_path[len(db_root):].lstrip('/')
                win_path = os.path.join(host_media_root, rel_path).replace("/", "\\")
            else:
                # If path is not under root, just add 07_Downloads as suggested by user
                win_path = os.path.join(host_media_root, "07_Downloads", os.path.basename(path)).replace("/", "\\")
            
            win_path = win_path.replace("\\\\", "\\")
                
            # 3. Fallback to 8001 Agent (as suggested by user)
            try:
                logger.info(f"📡 Sending open_path request to Agent (8001): {win_path}")
                payload = {
                    "session_id": "SYSTEM_SHELL", 
                    "action": "open_path",
                    "value": win_path
                }
                # Try the standard action endpoint
                resp = requests.post(f"{agent_url}/action", json=payload, timeout=5)
                
                # Also try the simplified /open endpoint just in case
                try:
                    requests.post(f"{agent_url}/open", json={"path": win_path, "session_id": "SYSTEM_SHELL"}, timeout=2)
                except:
                    pass

                if resp.status_code == 200:
                    return {"ok": True, "message": "Folder open request sent to Windows Agent"}
                else:
                    logger.error(f"[FAIL] Agent returned error: {resp.status_code} - {resp.text}")
                    raise HTTPException(status_code=500, detail=f"Agent error: {resp.text}")
            except Exception as e:
                logger.error(f"[WARN] Agent communication failed: {e}")
                raise HTTPException(status_code=500, detail=f"Windows Agent (8001) is unreachable or failed: {e}")

        # --- Local execution fallback (ONLY for non-docker native environments) ---
        if platform.system() == "Windows":
            os.startfile(path)
        elif platform.system() == "Darwin":
            subprocess.Popen(["open", path])
        else:
            # Linux / WSL Logic
            is_wsl = False
            try:
                if os.path.exists('/proc/version'):
                    with open('/proc/version', 'r') as f:
                        if 'microsoft' in f.read().lower():
                            is_wsl = True
            except: pass

            if is_wsl:
                try:
                    wsl_proc = subprocess.run(["wslpath", "-w", os.path.abspath(path)], capture_output=True, text=True)
                    win_path = wsl_proc.stdout.strip() if wsl_proc.returncode == 0 else os.path.abspath(path)
                    try:
                        subprocess.Popen(["explorer.exe", win_path])
                    except:
                        subprocess.Popen(["/mnt/c/Windows/explorer.exe", win_path])
                except:
                    subprocess.Popen(["explorer.exe", "."])
            else:
                try:
                    subprocess.Popen(["xdg-open", path])
                except:
                    subprocess.Popen(["gio", "open", path])

        return {"ok": True}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

DB_FILE = os.path.join(os.environ.get("LOCALAPPDATA", os.path.expanduser("~")), "ViraLoop Studio", "viral_loop.db")
BACKUP_DIR = os.path.join(os.environ.get("LOCALAPPDATA", os.path.expanduser("~")), "ViraLoop Studio", "db", "backups")


@router.post("/backup-database")
def backup_database_now():
    """Create a manual database backup to AppData/ViraLoop Studio/db/backups/"""
    import shutil, datetime
    try:
        os.makedirs(BACKUP_DIR, exist_ok=True)
        if not os.path.exists(DB_FILE):
            raise HTTPException(status_code=404, detail=f"데이터베이스 파일을 찾을 수 없습니다: {DB_FILE}")
        
        ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_filename = f"viral_loop_backup_{ts}.db"
        backup_path = os.path.join(BACKUP_DIR, backup_filename)
        shutil.copy2(DB_FILE, backup_path)
        size_kb = os.path.getsize(backup_path) // 1024
        return {
            "ok": True,
            "message": f"백업 완료: {backup_filename} ({size_kb:,} KB)",
            "backup_path": backup_path.replace("\\", "/"),
            "backup_dir": BACKUP_DIR.replace("\\", "/"),
            "filename": backup_filename,
            "size_kb": size_kb
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"백업 실패: {str(e)}")


@router.get("/backup-list")
def list_backups():
    """List all available database backups."""
    import datetime
    try:
        if not os.path.exists(BACKUP_DIR):
            return {"backups": [], "backup_dir": BACKUP_DIR.replace("\\", "/")}
        
        backups = []
        for f in sorted(os.listdir(BACKUP_DIR), reverse=True):
            fp = os.path.join(BACKUP_DIR, f)
            if os.path.isfile(fp) and f.endswith(".db"):
                stat = os.stat(fp)
                backups.append({
                    "filename": f,
                    "size_kb": stat.st_size // 1024,
                    "created_at": datetime.datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S")
                })
        
        total_kb = sum(b["size_kb"] for b in backups)
        return {
            "backups": backups,
            "total_count": len(backups),
            "total_size_kb": total_kb,
            "backup_dir": BACKUP_DIR.replace("\\", "/")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/open-backup-folder")
def open_backup_folder():
    """Open the backup folder in Windows Explorer."""
    try:
        os.makedirs(BACKUP_DIR, exist_ok=True)
        subprocess.Popen(["explorer.exe", BACKUP_DIR])
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/delete-backup/{filename}")
def delete_backup(filename: str):
    """Delete a specific backup file."""
    try:
        # Safety: only allow deleting files inside BACKUP_DIR
        backup_path = os.path.join(BACKUP_DIR, os.path.basename(filename))
        if not backup_path.startswith(BACKUP_DIR):
            raise HTTPException(status_code=403, detail="잘못된 경로입니다.")
        if not os.path.exists(backup_path):
            raise HTTPException(status_code=404, detail="백업 파일을 찾을 수 없습니다.")
        os.remove(backup_path)
        return {"ok": True, "message": f"{filename} 삭제 완료"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reset-database")
def reset_database():
    """Safely reset database: creates an automatic backup first, then drops and recreates all tables."""
    import shutil, datetime
    try:
        # Step 1: Auto-backup before reset
        os.makedirs(BACKUP_DIR, exist_ok=True)
        if os.path.exists(DB_FILE):
            ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            auto_backup_path = os.path.join(BACKUP_DIR, f"viral_loop_pre_reset_{ts}.db")
            shutil.copy2(DB_FILE, auto_backup_path)
        
        # Step 2: Drop and recreate tables
        from ..database import engine
        from .. import models
        models.Base.metadata.drop_all(bind=engine)
        models.Base.metadata.create_all(bind=engine)
        
        return {
            "ok": True,
            "message": f"데이터베이스 초기화 완료. 초기화 전 자동 백업이 생성되었습니다 (viral_loop_pre_reset_{ts}.db)",
            "backup_dir": BACKUP_DIR.replace("\\", "/")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"초기화 실패: {str(e)}")


# ============================================
# yt-dlp 버전 관리 (Python 패키지 기반)
# 실제 사용: import yt_dlp (venv 또는 PyInstaller 번들)
# 업데이트: pip install --upgrade yt-dlp
# ============================================

import importlib
import yt_dlp as _yt_dlp_module


def _get_ytdlp_version() -> str:
    """Get yt-dlp version from installed Python package."""
    try:
        importlib.reload(_yt_dlp_module)
        return _yt_dlp_module.version.__version__
    except Exception:
        pass
    # Fallback: importlib.metadata (works in both venv and PyInstaller builds)
    try:
        from importlib.metadata import version
        return version("yt-dlp")
    except Exception:
        pass
    return "Unknown"


def _get_ytdlp_install_path() -> str:
    """Return a user-friendly install path description."""
    # PyInstaller frozen build
    if getattr(sys, 'frozen', False):
        return "앱 내장 (배포판 번들)"
    # venv / regular install
    try:
        pkg_dir = os.path.dirname(_yt_dlp_module.__file__)
        # Show only AppData-relative or short form
        local_app = os.environ.get("LOCALAPPDATA", "")
        appdata = os.environ.get("APPDATA", "")
        if local_app and pkg_dir.lower().startswith(local_app.lower()):
            return pkg_dir.replace("\\", "/")
        if appdata and pkg_dir.lower().startswith(appdata.lower()):
            return pkg_dir.replace("\\", "/")
        # Dev/venv path — show as Python package notation
        return f"Python 패키지: {pkg_dir.replace(chr(92), '/')}"
    except Exception:
        return "Unknown"


@router.get("/ytdlp-version")
async def get_ytdlp_version():
    """Get yt-dlp version and install location (Python package)."""
    version = _get_ytdlp_version()
    install_path = _get_ytdlp_install_path()
    is_frozen = getattr(sys, 'frozen', False)

    return {
        "version": version,
        "install_path": install_path,
        "installed": version != "Unknown",
        "is_frozen": is_frozen,
    }


@router.post("/update-ytdlp")
async def update_ytdlp():
    """Update yt-dlp Python package via pip (source installs only)."""
    import asyncio, datetime

    # Packaged/frozen build cannot update via pip
    if getattr(sys, 'frozen', False):
        return {
            "success": False,
            "message": "배포판 빌드에서는 pip 업데이트를 사용할 수 없습니다. 앱 전체를 새 버전으로 업데이트하세요."
        }

    old_version = _get_ytdlp_version()

    def _run_pip_upgrade():
        creationflags = 0x08000000 if sys.platform == "win32" else 0
        return subprocess.run(
            [sys.executable, "-m", "pip", "install", "--upgrade", "yt-dlp"],
            capture_output=True, text=True, timeout=120,
            creationflags=creationflags
        )

    try:
        result = await asyncio.to_thread(_run_pip_upgrade)
        if result.returncode != 0:
            return {"success": False, "message": f"pip 업데이트 실패: {result.stderr.strip()}"}

        # Reload module so new version is reflected in same process
        try:
            importlib.reload(_yt_dlp_module)
        except Exception:
            pass

        new_version = _get_ytdlp_version()

        # Save to DB
        try:
            from ..database import SessionLocal
            from .. import crud
            db = SessionLocal()
            try:
                settings = crud.get_settings(db)
                if settings:
                    settings.ytdlp_version = new_version
                    settings.ytdlp_last_check = datetime.datetime.now()
                    db.commit()
            finally:
                db.close()
        except Exception:
            pass

        if old_version != new_version:
            msg = f"업데이트 완료: {old_version} → {new_version}"
        else:
            msg = f"이미 최신 버전입니다: {new_version}"
        return {"success": True, "message": msg, "version": new_version}

    except Exception as e:
        return {"success": False, "message": f"오류: {str(e)}"}


# ============================================
# CloakBrowser Maintenance Endpoints
# ============================================

def get_cloakbrowser_version():
    """Get current cloakbrowser version using importlib.metadata"""
    try:
        if sys.version_info >= (3, 8):
            from importlib.metadata import version, PackageNotFoundError
            try:
                return version("cloakbrowser")
            except PackageNotFoundError:
                pass
        
        # Fallback to pip show
        result = subprocess.run(
            [sys.executable, '-m', 'pip', 'show', 'cloakbrowser'],
            capture_output=True, text=True, timeout=10
        )
        if result.returncode == 0:
            for line in result.stdout.splitlines():
                if line.startswith("Version:"):
                    return line.split(":", 1)[1].strip()
    except Exception as e:
        print(f"Error checking cloakbrowser version: {e}")
    return "Unknown or not installed"

@router.get("/cloakbrowser/version")
async def get_cloak_version():
    """Get current cloakbrowser version"""
    return {"version": get_cloakbrowser_version()}

@router.post("/cloakbrowser/update")
async def update_cloakbrowser():
    """Update cloakbrowser to the latest version"""
    try:
        result = subprocess.run(
            [sys.executable, '-m', 'pip', 'install', '--upgrade', 'cloakbrowser[patchright]'],
            capture_output=True, text=True, timeout=120
        )
        if result.returncode == 0:
            new_version = get_cloakbrowser_version()
            return {
                "success": True, 
                "message": "CloakBrowser 업데이트가 성공적으로 완료되었습니다.", 
                "version": new_version,
                "logs": result.stdout
            }
        else:
            return {
                "success": False, 
                "message": "업데이트 중 오류가 발생했습니다.",
                "logs": result.stderr
            }
    except Exception as e:
        return {"success": False, "message": f"Error: {str(e)}"}


@router.get("/maintenance-status")
def get_maintenance_status():
    """Get maintenance status including last check time and auto-update setting"""
    try:
        from ..database import SessionLocal
        from .. import crud
        
        db = SessionLocal()
        try:
            settings = crud.get_settings(db)
            if not settings:
                return {
                    "auto_update_enabled": True,
                    "last_check": None,
                    "version": "Unknown"
                }
            
            return {
                "auto_update_enabled": settings.ytdlp_auto_update,
                "last_check": settings.ytdlp_last_check.isoformat() if settings.ytdlp_last_check else None,
                "version": settings.ytdlp_version or "Unknown"
            }
        finally:
            db.close()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/scheduler-status")
def get_scheduler_status(request: Request):
    """Get scheduler status and next run time"""
    try:
        scheduler = getattr(request.app.state, "scheduler", None)
        if not scheduler:
            return {"status": "inactive", "next_run": None}
            
        job = scheduler.get_job('channel_scan')
        if not job:
            return {"status": "no_job", "next_run": None}
            
        return {
            "status": "active" if scheduler.running else "stopped",
            "next_run": job.next_run_time.isoformat() if job.next_run_time else None
        }
    except Exception as e:
        print(f"Scheduler status error: {e}")
        return {"status": "error", "message": str(e)}

# ============================================
# Config Preset Endpoints
# ============================================
from .. import schemas

@router.get("/config-presets/", response_model=list[schemas.ConfigPreset])
def get_config_presets(type: str, db: Session = Depends(database.get_db)):
    """Get presets by type"""
    return db.query(models.ConfigPreset).filter(models.ConfigPreset.type == type).all()

@router.post("/config-presets/", response_model=schemas.ConfigPreset)
def create_config_preset(preset: schemas.ConfigPresetCreate, db: Session = Depends(database.get_db)):
    """Create a new preset"""
    db_preset = models.ConfigPreset(
        type=preset.type,
        name=preset.name,
        config=preset.config
    )
    db.add(db_preset)
    db.commit()
    db.refresh(db_preset)
    return db_preset

@router.delete("/config-presets/{preset_id}/")
def delete_config_preset(preset_id: int, db: Session = Depends(database.get_db)):
    """Delete a preset"""
    db_preset = db.query(models.ConfigPreset).filter(models.ConfigPreset.id == preset_id).first()
    if not db_preset:
        raise HTTPException(status_code=404, detail="Preset not found")
    
    db.delete(db_preset)
    db.commit()
    return {"ok": True}
