import os
import sys
import asyncio
import httpx
import zipfile
import shutil
import logging
import platform
import subprocess
from app.config import settings

logger = logging.getLogger(__name__)

class DependencyInstaller:
    def __init__(self):
        self.status = {
            "is_installing": False,
            "progress_percent": 0.0,
            "current_task": "Idle",
            "error": None,
            "ready": False
        }
        
        # Local paths for installations
        self.system_bin = os.path.join(settings.MEDIA_ROOT, "09_System", "bin")
        self.ffmpeg_dir = os.path.join(self.system_bin, "ffmpeg")
        self.adb_dir = os.path.join(self.system_bin, "adb")
        
        # Ensure base directories exist
        os.makedirs(self.system_bin, exist_ok=True)

    def is_ffmpeg_installed(self) -> bool:
        ffmpeg_exe = os.path.join(self.ffmpeg_dir, "bin", "ffmpeg.exe")
        return os.path.exists(ffmpeg_exe)

    def is_adb_installed(self) -> bool:
        adb_exe = os.path.join(self.adb_dir, "adb.exe")
        # 구글 배포판은 보통 압축 해제 시 platform-tools 폴더를 생성합니다.
        adb_platform_tools_exe = os.path.join(self.adb_dir, "platform-tools", "adb.exe")
        return os.path.exists(adb_exe) or os.path.exists(adb_platform_tools_exe)

    async def _download_and_extract_zip(self, url: str, extract_to: str, task_name: str, total_progress_weight: float):
        """Downloads a zip file from url and extracts it to extract_to. Updates progress."""
        self.status["current_task"] = f"{task_name} 다운로드 중..."
        
        zip_path = os.path.join(self.system_bin, f"temp_{task_name}.zip")
        
        try:
            async with httpx.AsyncClient(follow_redirects=True, timeout=120.0) as client:
                async with client.stream("GET", url) as response:
                    response.raise_for_status()
                    total_bytes = int(response.headers.get("content-length", 0))
                    downloaded = 0
                    
                    with open(zip_path, "wb") as f:
                        async for chunk in response.aiter_bytes(chunk_size=8192):
                            f.write(chunk)
                            downloaded += len(chunk)
                            if total_bytes > 0:
                                # 다운로드가 해당 작업 가중치의 80% 차지
                                current_weight_progress = (downloaded / total_bytes) * total_progress_weight * 0.8
                                # Base progress logic: we don't accumulate here iteratively, we'd need a base tracker.
                                # To avoid complex tracking, let's just use a simple bump.
                                # Actually, it's better to just set progress at milestones.
        
            self.status["current_task"] = f"{task_name} 압축 해제 중..."
            # 압축 해제는 동기식 I/O이므로 asyncio.to_thread 사용
            def extract():
                with zipfile.ZipFile(zip_path, "r") as zip_ref:
                    zip_ref.extractall(extract_to)
            
            await asyncio.to_thread(extract)
            
            self.status["progress_percent"] += total_progress_weight
            
        finally:
            if os.path.exists(zip_path):
                try:
                    os.remove(zip_path)
                except:
                    pass

    async def install_ffmpeg(self):
        url = "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip"
        temp_extract = os.path.join(self.system_bin, "ffmpeg_temp")
        os.makedirs(temp_extract, exist_ok=True)
        
        await self._download_and_extract_zip(url, temp_extract, "FFmpeg", 40.0)
        
        # BtbN 압축 파일 내부는 'ffmpeg-master-latest-win64-gpl' 폴더로 감싸져 있음
        def move_ffmpeg_contents():
            extracted_folders = os.listdir(temp_extract)
            if extracted_folders:
                source_folder = os.path.join(temp_extract, extracted_folders[0])
                if os.path.exists(self.ffmpeg_dir):
                    shutil.rmtree(self.ffmpeg_dir, ignore_errors=True)
                shutil.move(source_folder, self.ffmpeg_dir)
            shutil.rmtree(temp_extract, ignore_errors=True)
            
        await asyncio.to_thread(move_ffmpeg_contents)
        logger.info("[OK] FFmpeg installed successfully.")

    async def install_adb(self):
        url = "https://dl.google.com/android/repository/platform-tools-latest-windows.zip"
        await self._download_and_extract_zip(url, self.adb_dir, "ADB", 15.0)
        logger.info("[OK] ADB installed successfully.")

    async def install_cloakbrowser(self):
        self.status["current_task"] = "CloakBrowser 엔진(Chromium) 설치 중..."
        try:
            # cloakbrowser/patchright 내부 크로미움 다운로드
            proc = await asyncio.create_subprocess_exec(
                sys.executable, "-m", "patchright", "install", "chromium",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                creationflags=subprocess.CREATE_NO_WINDOW if platform.system() == "Windows" else 0
            )
            
            stdout, stderr = await proc.communicate()
            if proc.returncode == 0:
                logger.info("[OK] CloakBrowser Chromium installed successfully.")
                self.status["progress_percent"] += 45.0
            else:
                logger.error(f"[FAIL] CloakBrowser Engine install failed: {stderr.decode()}")
                self.status["error"] = "Failed to install CloakBrowser Engine."
        except Exception as e:
            logger.error(f"[FAIL] Exception during CloakBrowser install: {e}")
            self.status["error"] = str(e)

    async def _install_routine(self):
        try:
            self.status["is_installing"] = True
            self.status["progress_percent"] = 0.0
            self.status["error"] = None
            
            # Windows 환경에서만 설치 진행 (Docker/Linux 환경 방지)
            if platform.system() != "Windows":
                self.status["ready"] = True
                self.status["is_installing"] = False
                self.status["progress_percent"] = 100.0
                return

            needs_ffmpeg = not self.is_ffmpeg_installed()
            needs_adb = not self.is_adb_installed()
            
            # 완전한 최초 실행을 구분하기 위해 둘 중 하나라도 없을 때 전체 검사를 돌림.
            # Patchright는 이미 설치되어 있으면 매우 빠르게 넘어감 (1~2초)
            needs_cloakbrowser = True 
            
            if not needs_ffmpeg and not needs_adb:
                self.status["ready"] = True
                self.status["is_installing"] = False
                self.status["progress_percent"] = 100.0
                return

            if needs_ffmpeg:
                await self.install_ffmpeg()
            else:
                self.status["progress_percent"] += 40.0
                
            if needs_adb:
                await self.install_adb()
            else:
                self.status["progress_percent"] += 15.0
                
            if needs_cloakbrowser:
                await self.install_cloakbrowser()
            else:
                self.status["progress_percent"] += 45.0
            
            self.status["progress_percent"] = 100.0
            self.status["current_task"] = "설치 완료 (Ready)"
            self.status["ready"] = True
            
        except Exception as e:
            logger.error(f"[FAIL] Dependency auto-install failed: {e}")
            self.status["error"] = str(e)
            self.status["ready"] = False
        finally:
            self.status["is_installing"] = False

    def start_background_install(self):
        """백그라운드에서 의존성 다운로드 및 설치 시작"""
        if self.status["is_installing"] or self.status["ready"]:
            return
            
        loop = asyncio.get_event_loop()
        loop.create_task(self._install_routine())

dependency_installer = DependencyInstaller()
