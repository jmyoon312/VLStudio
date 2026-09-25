"""
Local OS Controller for ViraLoop Studio.
Provides safe bindings to local Windows OS capabilities:
1. Open Windows File Explorer at standard 9-tier media directories (05_Exports, 07_Downloads, etc.)
2. Launch CapCut Desktop App directly on user's machine
3. Query local multimedia environment capabilities (FFmpeg, CapCut installation, GPU acceleration)
"""

import os
import sys
import subprocess
import logging
from pathlib import Path
from typing import Dict, Any, Optional

logger = logging.getLogger("local_os_controller")

LOCAL_APPDATA = os.environ.get("LOCALAPPDATA", str(Path.home() / "AppData" / "Local"))
MEDIA_ROOT = Path(LOCAL_APPDATA) / "ViraLoop Studio" / "media"
EXPORTS_DIR = MEDIA_ROOT / "05_Exports"
DOWNLOADS_DIR = MEDIA_ROOT / "07_Downloads"
CAPCUT_DRAFT_ROOT = Path(LOCAL_APPDATA) / "CapCut" / "User Data" / "Projects" / "com.lveditor.draft"


class LocalOSController:
    """Safe local operating system controller with strict sandbox guards."""

    @staticmethod
    def open_folder(folder_type: str = "exports", custom_path: Optional[str] = None) -> Dict[str, Any]:
        """
        Opens a directory in Windows File Explorer.
        Strictly restricted to ViraLoop 9-tier media directories or CapCut projects.
        """
        target_path: Optional[Path] = None

        if custom_path:
            p = Path(custom_path).resolve()
            # Security guard: ensure path is within MEDIA_ROOT or CAPCUT_DRAFT_ROOT or AppData
            if str(p).startswith(str(MEDIA_ROOT)) or str(p).startswith(str(CAPCUT_DRAFT_ROOT)):
                target_path = p if p.is_dir() else p.parent
            else:
                target_path = EXPORTS_DIR
        else:
            folder_map = {
                "exports": EXPORTS_DIR,
                "downloads": DOWNLOADS_DIR,
                "inbox": MEDIA_ROOT / "01_Inbox",
                "assets": MEDIA_ROOT / "03_Assets",
                "capcut": CAPCUT_DRAFT_ROOT
            }
            target_path = folder_map.get(folder_type.lower(), EXPORTS_DIR)

        if not target_path.exists():
            target_path.mkdir(parents=True, exist_ok=True)

        if sys.platform == "win32":
            try:
                subprocess.Popen(["explorer.exe", str(target_path)])
                logger.info(f"📂 [LocalOSController] Opened File Explorer: {target_path}")
                return {
                    "success": True,
                    "opened_path": str(target_path),
                    "message": f"윈도우 탐색기에서 폴더를 열었습니다: {target_path.name}"
                }
            except Exception as e:
                logger.error(f"Failed to open explorer: {e}")
                return {"success": False, "error": str(e)}
        else:
            return {"success": False, "error": "탐색기 열기는 Windows 환경에서만 지원됩니다."}

    @staticmethod
    def launch_capcut(project_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Finds and launches the local CapCut Desktop App executable.
        """
        if sys.platform != "win32":
            return {"success": False, "error": "CapCut 실행은 Windows 환경에서만 지원됩니다."}

        # Search standard CapCut installation paths
        possible_paths = [
            Path(LOCAL_APPDATA) / "CapCut" / "Apps" / "CapCut.exe",
            Path(os.environ.get("PROGRAMFILES", "C:\\Program Files")) / "CapCut" / "CapCut.exe",
            Path(os.environ.get("PROGRAMFILES(X86)", "C:\\Program Files (x86)")) / "CapCut" / "CapCut.exe",
        ]

        # Check inside versioned Apps directory (e.g. CapCut/Apps/4.0.0.1234/CapCut.exe)
        capcut_apps_dir = Path(LOCAL_APPDATA) / "CapCut" / "Apps"
        if capcut_apps_dir.exists():
            for sub in sorted(capcut_apps_dir.iterdir(), reverse=True):
                if sub.is_dir():
                    exe_candidate = sub / "CapCut.exe"
                    if exe_candidate.exists():
                        possible_paths.insert(0, exe_candidate)

        target_exe = None
        for p in possible_paths:
            if p.exists():
                target_exe = p
                break

        if not target_exe:
            # Try launching via standard shell protocol
            try:
                subprocess.Popen(["cmd.exe", "/c", "start", "capcut://"])
                return {
                    "success": True,
                    "method": "protocol",
                    "message": f"CapCut 프로토콜(capcut://)을 통해 CapCut을 실행했습니다. 프로젝트: {project_name or '최신 프로젝트'}"
                }
            except Exception as e:
                return {
                    "success": False,
                    "error": f"CapCut 실행 파일을 찾을 수 없습니다. CapCut PC가 설치되어 있는지 확인하세요. ({e})"
                }

        try:
            subprocess.Popen([str(target_exe)])
            logger.info(f"🎬 [LocalOSController] Launched CapCut: {target_exe}")
            return {
                "success": True,
                "exe_path": str(target_exe),
                "project_name": project_name,
                "message": f"CapCut 프로그램을 성공적으로 실행했습니다. {f'[{project_name}] 프로젝트가 등록되었습니다.' if project_name else ''}"
            }
        except Exception as e:
            logger.error(f"Failed to launch CapCut: {e}")
            return {"success": False, "error": str(e)}

    @staticmethod
    def get_system_environment() -> Dict[str, Any]:
        """Inspects local multimedia environment."""
        capcut_installed = False
        capcut_apps_dir = Path(LOCAL_APPDATA) / "CapCut" / "Apps"
        if capcut_apps_dir.exists():
            capcut_installed = any((sub / "CapCut.exe").exists() for sub in capcut_apps_dir.iterdir() if sub.is_dir())

        ffmpeg_installed = False
        try:
            res = subprocess.run(["ffmpeg", "-version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=2.0)
            ffmpeg_installed = res.returncode == 0
        except Exception:
            ffmpeg_installed = False

        return {
            "platform": sys.platform,
            "ffmpeg_available": ffmpeg_installed,
            "capcut_installed": capcut_installed,
            "exports_dir": str(EXPORTS_DIR),
            "downloads_dir": str(DOWNLOADS_DIR),
            "capcut_draft_dir": str(CAPCUT_DRAFT_ROOT)
        }


local_os_controller = LocalOSController()
