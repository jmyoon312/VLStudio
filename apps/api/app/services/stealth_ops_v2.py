import os
import time
import random
import logging
import pathlib
import subprocess
import sys
from typing import Optional
from sqlalchemy.orm import Session

logger = logging.getLogger("PatchrightStealth")

from app.config import settings
import threading

class UserInteractiveActiveException(Exception):
    """
    [Level 1 우선권 수호] 사용자가 해당 프로필로 수동 보안 접속 중일 때 발생하는 예외.
    자동화 봇이 사용자의 브라우저 창을 강제 종료(kill)하거나 간섭하는 것을 원천 방지하고 대기/양보를 유도합니다.
    """
    def __init__(self, profile_id: str, message: str = None):
        self.profile_id = profile_id
        msg = message or f"👑 [SessionLock] 프로필 [{profile_id}]은 현재 대표님의 수동 보안 접속 창이 활성화되어 사용 중입니다. 사용자의 작업을 완벽히 보호하기 위해 자동화 작업의 브라우저 점유를 안전하게 유예(대기)합니다."
        super().__init__(msg)

# Level 1 사용자 수동 보안 접속 활성 프로세스 레지스트리 (profile_id -> {process, started_at, pid})
_active_interactive_sessions: dict = {}
_interactive_session_lock = threading.Lock()

def is_user_interactive_active(profile_id: str) -> bool:
    """해당 프로필에 대표님의 수동 보안 접속 창이 활성 상태로 떠 있는지 실시간 검사"""
    if not profile_id:
        return False
    with _interactive_session_lock:
        sess = _active_interactive_sessions.get(profile_id)
        if not sess:
            return False
        proc = sess.get("process")
        if proc and proc.poll() is None:
            return True
        else:
            _active_interactive_sessions.pop(profile_id, None)
            return False

def get_active_interactive_profile_ids() -> list:
    """현재 활성 상태인 수동 보안 접속 profile_id 목록 반환"""
    active_ids = []
    with _interactive_session_lock:
        for pid, sess in list(_active_interactive_sessions.items()):
            proc = sess.get("process")
            if proc and proc.poll() is None:
                active_ids.append(pid)
            else:
                _active_interactive_sessions.pop(pid, None)
    return active_ids

def register_user_interactive_session(profile_id: str, proc: subprocess.Popen):
    """대표님 수동 보안 접속 프로세스를 1급 보호 세션으로 등록"""
    if not profile_id or not proc:
        return
    with _interactive_session_lock:
        _active_interactive_sessions[profile_id] = {
            "process": proc,
            "started_at": time.time(),
            "pid": proc.pid
        }
        logger.info(f"👑 [SessionLock] Registered Level 1 User Interactive Session for profile: {profile_id} (PID: {proc.pid})")

def unregister_user_interactive_session(profile_id: str):
    """대표님 수동 보안 접속 창 종료 시 락 해제"""
    if not profile_id:
        return
    with _interactive_session_lock:
        sess = _active_interactive_sessions.pop(profile_id, None)
        if sess:
            logger.info(f"🔓 [SessionLock] Unregistered User Interactive Session for profile: {profile_id}")

def get_profile_path(profile_id: str) -> str:
    """채널별 프로파일 디렉토리를 리턴 (없으면 생성)"""
    # UI 및 DB와 일치하도록 통합된 04_Profiles 디렉토리를 사용합니다.
    profile_base = pathlib.Path(settings.MEDIA_ROOT) / "04_Profiles"
    path = profile_base / profile_id
    path.mkdir(parents=True, exist_ok=True)
    return str(path)

class PatchrightStealth:
    """
    ViraLoop Sovereign Stealth Engine (v2026 - Patchright/CloakBrowser Native)
    """
    def __init__(self, db=None):
        self.db = db
        # For background automation, we might store the active context
        self.context = None

    def create_page(self, profile_id: str, proxy_port: int = None, headless: bool = True, db: Session = None):
        """
        자동화(백그라운드) 전용 브라우저 컨텍스트 생성.
        DB 프로필의 프록시 설정(LTE EveryProxy 또는 ISP 고정 IP)을 100% 강제 바인딩하여 RAW IP 유출을 차단합니다.
        """
        # ── [Level 1 수호 인터락] 대표님 수동 보안 접속 활성 상태 0순위 전수 검사 ──
        if is_user_interactive_active(profile_id):
            logger.warning(f"🛡️ [SessionLock] User Interactive Session is ACTIVE for profile [{profile_id}]. Blocking automated launch to prevent killing user window!")
            raise UserInteractiveActiveException(profile_id)

        from cloakbrowser import launch_persistent_context
        from app.models import Profile
        
        # Resolve Profile proxy from DB
        proxy_config = None
        created_own_db = False
        if not db:
            from app.database import SessionLocal
            db_session = SessionLocal()
            created_own_db = True
        else:
            db_session = db

        profile_dir = None
        try:
            profile = db_session.query(Profile).filter(Profile.id == profile_id).first()
            if not profile:
                profile = db_session.query(Profile).filter(Profile.channel_id == profile_id).first()
            if profile and profile.folder_path:
                profile_dir = profile.folder_path
            else:
                profile_dir = get_profile_path(profile_id)

            if profile:
                if profile.proxy_mode == "ISP_PROXY" and profile.proxy_host:
                    port = profile.proxy_port or 1080
                    if profile.proxy_username and profile.proxy_password:
                        proxy_config = {
                            "server": f"socks5://{profile.proxy_host}:{port}",
                            "username": profile.proxy_username,
                            "password": profile.proxy_password
                        }
                    else:
                        proxy_config = {"server": f"socks5://{profile.proxy_host}:{port}"}
                    logger.info(f"🔒 [Stealth Shield] Binding ISP Proxy: {profile.proxy_host}:{port}")
                elif profile.proxy_mode == "DIRECT_LTE":
                    # EveryProxy default 1080 (SOCKS5)
                    proxy_config = {"server": "socks5://127.0.0.1:1080"}
                    logger.info("🔒 [Stealth Shield] Binding LTE Mobile Proxy: socks5://127.0.0.1:1080")
        finally:
            if created_own_db:
                try:
                    db_session.close()
                except Exception:
                    pass

        if not profile_dir:
            profile_dir = get_profile_path(profile_id)

        # ── [Level 1 수호 인터락] 대표님 수동 보안 접속 활성 상태 전수 검사 ──
        if is_user_interactive_active(profile_id):
            logger.warning(f"🛡️ [SessionLock] User Interactive Session is ACTIVE for profile [{profile_id}]. Blocking automated launch to prevent killing user window!")
            raise UserInteractiveActiveException(profile_id)
        if profile and profile.channel_id and is_user_interactive_active(profile.channel_id):
            logger.warning(f"🛡️ [SessionLock] User Interactive Session is ACTIVE for channel [{profile.channel_id}]. Blocking automated launch to prevent killing user window!")
            raise UserInteractiveActiveException(profile.channel_id)

        # ── Windows: 프로필 디렉토리 잠금(Lock) 및 좀비 프로세스 자동 해제 (초고속 검사) ──
        if profile_dir and os.path.exists(profile_dir):
            try:
                import psutil
                profile_base = os.path.basename(profile_dir).lower()
                clean_dir = profile_dir.lower().replace('\\', '/')
                current_pid = os.getpid()
                parent_pid = os.getppid() if hasattr(os, 'getppid') else None
                # 최적화: cmdline 파싱 비용을 줄이기 위해 name 먼저 필터링
                for p in psutil.process_iter(['pid', 'name']):
                    try:
                        if p.pid == current_pid or p.pid == parent_pid:
                            continue
                        proc_name = (p.info.get('name') or '').lower()
                        # Only target Chrome browser processes, NEVER Python or other services
                        if 'chrome' in proc_name:
                            cmd_list = p.cmdline() or []
                            cmd_str = ' '.join(cmd_list).lower().replace('\\', '/')
                            if clean_dir in cmd_str or profile_base in cmd_str:
                                logger.info(f"[Stealth Shield] Killing zombie Chrome process {p.pid}")
                                p.kill()
                    except Exception:
                        pass
                
                # Chromium 싱글톤 락 파일 제거 (충돌 방지)
                for lock_name in ["lockfile", "SingletonLock", "SingletonCookie", "SingletonSocket"]:
                    lf = os.path.join(profile_dir, lock_name)
                    if os.path.exists(lf):
                        try:
                            os.remove(lf)
                            logger.info(f"🔓 [Stealth Shield] Removed lingering lockfile: {lock_name}")
                        except Exception:
                            pass
            except Exception as clean_err:
                logger.warning(f"Profile cleanup attempt skipped: {clean_err}")
                
        if not proxy_config and proxy_port:
            proxy_config = {"server": f"http://127.0.0.1:{proxy_port}"}
            
        browser_args = [
            "--test-type",
            "--start-maximized",
            "--window-position=0,0",
            "--disable-quic",
            "--force-webrtc-ip-handling-policy=disable_non_proxied_udp",
            "--disable-webrtc-multiple-routes",
            "--use-fake-ui-for-media-stream",
            "--hide-crash-restore-bubble",
        ]
        
        msg_launch = f"🖥️ [StealthOps] Launching browser window: profile={profile_id}, headless={headless}, proxy={proxy_config}"
        try:
            print(msg_launch)
        except Exception:
            try:
                sys.stdout.buffer.write((msg_launch + "\n").encode('utf-8', errors='replace'))
                sys.stdout.flush()
            except Exception:
                pass
        logger.info(msg_launch)

        self.context = launch_persistent_context(
            user_data_dir=profile_dir,
            headless=headless,
            proxy=proxy_config,
            args=browser_args,
            no_viewport=True,
        )
        
        from cloakbrowser.human import patch_page, resolve_config, _CursorState
        
        if self.context.pages:
            page = self.context.pages[0]
        else:
            page = self.context.new_page()
            
        cfg = resolve_config('default')
        cursor = _CursorState()
        patch_page(page, cfg, cursor)

        # 화면 최상단 포커스 활성화
        try:
            page.bring_to_front()
            logger.info("🖥️ [StealthOps] Page brought to front successfully.")
        except Exception as e:
            logger.warning(f"🖥️ [StealthOps] bring_to_front warning: {e}")

        msg_ready = f"✅ [StealthOps] Browser page ready (headless={headless}, url={page.url})"
        try:
            print(msg_ready)
        except Exception:
            try:
                sys.stdout.buffer.write((msg_ready + "\n").encode('utf-8', errors='replace'))
                sys.stdout.flush()
            except Exception:
                pass
        logger.info(msg_ready)
        return page

    def close(self):
        """브라우저 컨텍스트 종료"""
        if self.context:
            try:
                self.context.close()
            except Exception as e:
                logger.error(f"Failed to close context: {e}")
            self.context = None

    def launch_for_setup(self, profile_id: str, email: str = None, password: str = None, target_channel_id: str = None, skip_proxy_check: bool = False, db=None, rotate_ip_on_close: bool = False, target_url: str = None, **kwargs):
        """
        수동 설정(마법사) 모드 전용.
        API 응답 사이클과 분리하기 위해 subprocess를 사용하여 독립적인 로컬 브라우저 창을 띄웁니다.
        """
        try:
            logger.info(f"🛰️ [SAIF-PRO] Launching Patchright engine for Setup: {profile_id}")
            
            # Fetch profile from DB to get the correct folder_path
            profile_dir = None
            if db:
                from app.models import Profile
                profile = db.query(Profile).filter(Profile.id == profile_id).first()
                if profile and profile.folder_path:
                    profile_dir = profile.folder_path
            
            # Fallback to default if not found in DB
            if not profile_dir:
                profile_dir = get_profile_path(profile_id)
                
            if skip_proxy_check:
                proxy_str = "0"
            else:
                proxy_str = "1080"
                if profile:
                    if profile.proxy_mode == "ISP_PROXY" and profile.proxy_host:
                        p_port = profile.proxy_port or 1080
                        protocol = getattr(profile, "proxy_protocol", "http") or "http"
                        if profile.proxy_username and profile.proxy_password:
                            proxy_str = f"{protocol}://{profile.proxy_username}:{profile.proxy_password}@{profile.proxy_host}:{p_port}"
                        else:
                            proxy_str = f"{protocol}://{profile.proxy_host}:{p_port}"
                    elif profile.proxy_mode == "DIRECT_LTE":
                        from app.services.adb_service import adb_service
                        target_serial = getattr(profile, "bound_device_serial", None)
                        port = getattr(profile, "proxy_port", None) or adb_service.get_device_port(target_serial)
                        adb_service.ensure_every_proxy_socks_active(target_serial)
                        proxy_str = str(port)
            
            script_path = os.path.join(os.path.dirname(__file__), "local_browser.py")
            import sys
            
            # Use the venv python if running in a virtual environment
            from app.utils.python_env import get_venv_python
            venv_python = get_venv_python()

            url = target_url or "https://studio.youtube.com/"
            if not target_url and target_channel_id:
                url += f"channel/{target_channel_id}"
                
            cmd = [venv_python, script_path, profile_dir, url, proxy_str]
            if email and password:
                cmd.extend([email, password])

            # [Level 1 선점권] 백그라운드 자동 웜업/세션이 실행 중이라면 즉시 양보(Soft Abort) 유도
            try:
                from app.services.browser_session_manager import BrowserSessionManager
                sm = BrowserSessionManager()
                target_keys = [profile_id]
                if profile and profile.channel_id:
                    target_keys.append(profile.channel_id)
                for tk in set(target_keys):
                    if tk in sm._sessions:
                        logger.info(f"👑 [SessionLock] Yielding automated session in favor of Level 1 User Interactive launch for {tk}")
                        sm.close_session(tk)
            except Exception as yield_err:
                logger.warning(f"Could not yield automated session: {yield_err}")
                
            # Windows: Zombie process cleanup on the profile directory before setup launch
            if profile_dir:
                try:
                    import psutil
                    profile_base = os.path.basename(profile_dir).lower()
                    clean_dir = profile_dir.lower().replace('\\', '/')
                    for p in psutil.process_iter(['pid', 'name', 'cmdline']):
                        try:
                            cmd_str = ' '.join(p.info.get('cmdline') or []).lower().replace('\\', '/')
                            if (clean_dir in cmd_str or profile_base in cmd_str) and p.pid != os.getpid():
                                p.kill()
                        except Exception:
                            pass
                except Exception as clean_err:
                    logger.warning(f"Profile cleanup attempt skipped: {clean_err}")

            logger.info(f"Executing native CloakBrowser via patchright... Command: {cmd}")
            # 0x08000000 (CREATE_NO_WINDOW): Suppress black cmd console so only Chromium GUI appears
            process = subprocess.Popen(
                cmd,
                creationflags=0x08000000 if os.name == 'nt' else 0
            )

            # [Level 1 등록] 대표님 수동 보안 접속 활성 세션으로 등록 (자동화의 kill 원천 차단)
            register_user_interactive_session(profile_id, process)
            if profile and profile.channel_id and profile.channel_id != profile_id:
                register_user_interactive_session(profile.channel_id, process)

            import threading
            def _on_interactive_close():
                try:
                    logger.info(f"[WAIT] Waiting for CloakBrowser (Profile: {profile_id}) to close...")
                    process.wait()
                finally:
                    # 프로세스 종료 감지 즉시 수동 락 자동 해제
                    unregister_user_interactive_session(profile_id)
                    if profile and profile.channel_id:
                        unregister_user_interactive_session(profile.channel_id)

                    if rotate_ip_on_close:
                        logger.info(f"🚪 CloakBrowser closed for profile {profile_id}. Triggering background IP rotation!")
                        try:
                            from app.services.adb_service import adb_service
                            target_serial = getattr(profile, "bound_device_serial", None)
                            adb_service.rotate_ip(serial=target_serial, method='soft')
                        except Exception as rot_e:
                            logger.warning(f"Background IP rotation error: {rot_e}")

            threading.Thread(target=_on_interactive_close, daemon=True).start()
                
            return True
        except Exception as e:
            logger.error(f"[FAIL] [SAIF-PRO] YouTube launch error: {e}")
            return False

    def human_delay(self, min_sec: float = 1.0, max_sec: float = 3.0):
        time.sleep(random.uniform(min_sec, max_sec))

    def safe_click(self, locator, human: bool = True) -> bool:
        """Patchright Locator를 이용한 안전한 클릭"""
        try:
            if human:
                # Patchright automatically handles human-like clicks somewhat, 
                # but we can add random delay
                self.human_delay(0.5, 1.5)
            locator.click(timeout=10000)
            return True
        except Exception as e:
            logger.warning(f"[Stealth] safe_click failed: {e}")
            return False

    def human_type(self, locator, value: str, human: bool = True) -> bool:
        """Patchright Locator를 이용한 사람다운 타이핑"""
        try:
            if human:
                # delay in milliseconds between key presses
                locator.type(value, delay=random.randint(50, 150), timeout=10000)
            else:
                locator.fill(value, timeout=10000)
            return True
        except Exception as e:
            logger.warning(f"[Stealth] human_type failed: {e}")
            return False

    def login_google(self, page, email: str, password: str) -> dict:
        """Patchright 기반 자동 로그인"""
        logger.info(f"🔑 [SAIF-P2] Auto-login via login_google for {email}...")
        try:
            # 1. 이메일 입력
            email_field = page.locator('input[type="email"]')
            if email_field.is_visible(timeout=5000):
                email_field.fill("")
                self.human_type(email_field, email)
                email_field.press('Enter')
                self.human_delay(3, 5)
                
            # 2. 패스워드 입력
            pwd_field = page.locator('input[type="password"]')
            if pwd_field.is_visible(timeout=5000):
                pwd_field.fill("")
                self.human_type(pwd_field, password)
                pwd_field.press('Enter')
                self.human_delay(4, 6)
            
            # 3. 로그인 성공 여부 검사
            page.wait_for_load_state('networkidle', timeout=10000)
            current_url = page.url.lower()
            
            if "signin" not in current_url and "challenge" not in current_url:
                return {"success": True}
                
            if "challenge" in current_url or "2fa" in current_url or "approve" in current_url:
                logger.warning("[WARN] 2FA/Verification detected")
                return {
                    "success": False,
                    "requires_2fa": True,
                    "error": "2단계 인증(2FA) 또는 추가 본인 확인이 필요합니다."
                }
                
            # 실패 검출
            error_ele = page.locator('div.error, div.Ekjuhf').first
            if error_ele.is_visible(timeout=2000):
                return {
                    "success": False,
                    "error": f"로그인 오류: {error_ele.inner_text()}"
                }
                
            return {"success": True}
        except Exception as e:
            logger.error(f"[FAIL] Login sequence error: {e}")
            return {
                "success": False,
                "error": f"로그인 중 예외 발생: {str(e)}"
            }

    def scout_channel_directly(self, profile_id: str, db=None) -> dict:
        """
        Directly launches Patchright stealth browser headlessly to scout channel ID and Brand Channel Name.
        """
        from app.models import Profile
        if not db:
            from app import database
            db = next(database.get_db())

        profile = db.query(Profile).filter(Profile.id == profile_id).first()
        if not profile or not profile.folder_path:
            return {"success": False, "error": "Profile or folder_path missing"}

        try:
            from patchright.sync_api import sync_playwright
            with sync_playwright() as p:
                proxy_config = None
                if profile.proxy_mode == "ISP_PROXY" and profile.proxy_host:
                    p_port = profile.proxy_port or 1080
                    if profile.proxy_username and profile.proxy_password:
                        proxy_config = {
                            "server": f"http://{profile.proxy_host}:{p_port}",
                            "username": profile.proxy_username,
                            "password": profile.proxy_password
                        }
                    else:
                        proxy_config = {"server": f"http://{profile.proxy_host}:{p_port}"}
                elif profile.proxy_mode == "DIRECT_LTE":
                    proxy_config = {"server": "socks5://127.0.0.1:1080"}

                args = [
                    "--disable-blink-features=AutomationControlled",
                    "--force-webrtc-ip-handling-policy=disable_non_proxied_udp",
                ]
                import platform
                if platform.system() == "Linux":
                    args.extend(["--no-sandbox", "--disable-setuid-sandbox"])

                logger.info(f"🕵️ Launching persistent stealth context for channel scouting: {profile.folder_path}")
                context = p.chromium.launch_persistent_context(
                    user_data_dir=profile.folder_path,
                    headless=True,
                    proxy=proxy_config,
                    args=args,
                    viewport={"width": 1280, "height": 800}
                )

                page = context.pages[0] if context.pages else context.new_page()
                page.set_default_timeout(10000)
                
                from app.services.automation.channel_creator import ChannelCreator
                creator = ChannelCreator(self)
                res = creator.detect_active_channel(page)
                try:
                    context.close()
                except:
                    pass
                return res
        except Exception as e:
            logger.error(f"[FAIL] Direct channel scouting failed: {e}")
            return {"success": False, "error": str(e)}

# Alias for backward compatibility during refactoring
DrissionStealth = PatchrightStealth
stealth_ops = PatchrightStealth()
