import os
import time
import random
import logging
import pathlib
import subprocess
import sys
from typing import Optional

logger = logging.getLogger("PatchrightStealth")

from app.config import settings

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

    def create_page(self, profile_id: str, proxy_port: int = 10800, headless: bool = True):
        """
        자동화(백그라운드) 전용 브라우저 컨텍스트 생성.
        UI 수동 설정 모드(launch_for_setup)와 달리 파이썬 프로세스 내에서 직접 제어합니다.
        """
        from cloakbrowser import launch_persistent_context
        
        profile_dir = get_profile_path(profile_id)
        proxy = f"socks5://127.0.0.1:{proxy_port}" if proxy_port else None
        
        browser_args = [
            "--disable-quic",
            "--disable-ipv6",
            "--disable-background-networking",
            "--force-webrtc-ip-handling-policy=disable_non_proxied_udp",
            "--disable-webrtc-multiple-routes",
            "--use-fake-ui-for-media-stream",
            "--enable-features=DnsOverHttps",
            "--dns-over-https-templates=https://chrome.cloudflare-dns.com/dns-query",
        ]
        
        logger.info(f"Launching Patchright context for profile {profile_id} (Headless: {headless})")
        self.context = launch_persistent_context(
            user_data_dir=profile_dir,
            headless=headless,
            proxy=proxy,
            args=browser_args,
        )
        
        from cloakbrowser.human import patch_page, resolve_config, _CursorState
        
        if self.context.pages:
            page = self.context.pages[0]
        else:
            page = self.context.new_page()
            
        cfg = resolve_config('default')
        cursor = _CursorState()
        patch_page(page, cfg, cursor)
        return page

    def close(self):
        """브라우저 컨텍스트 종료"""
        if self.context:
            try:
                self.context.close()
            except Exception as e:
                logger.error(f"Failed to close context: {e}")
            self.context = None

    def launch_for_setup(self, profile_id: str, email: str = None, password: str = None, target_channel_id: str = None, skip_proxy_check: bool = False, db=None, **kwargs):
        """
        수동 설정(마법사) 모드 전용.
        API 응답 사이클과 분리하기 위해 subprocess를 사용하여 독립적인 로컬 브라우저 창을 띄웁니다.
        """
        try:
            logger.info(f"🛰️ [SAIF-PRO] Launching Patchright engine for YouTube Studio Setup: {profile_id}")
            
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
                
            proxy_port = kwargs.get("proxy_port", 10800)
            
            script_path = os.path.join(os.path.dirname(__file__), "local_browser.py")
            import sys
            
            # Use the venv python if running in a virtual environment
            venv_python = os.path.join(os.path.dirname(sys.executable), "python.exe")
            if not os.path.exists(venv_python):
                venv_python = sys.executable

            url = "https://studio.youtube.com/"
            if target_channel_id:
                url += f"channel/{target_channel_id}"
                
            cmd = [venv_python, script_path, profile_dir, url, str(proxy_port)]
            if email and password:
                cmd.extend([email, password])
                
            logger.info(f"Executing native CloakBrowser via patchright... Command: {cmd}")
            # CREATE_NO_WINDOW = 0x08000000
            subprocess.Popen(
                cmd,
                creationflags=0x08000000 if os.name == 'nt' else 0
            )
            return True
        except Exception as e:
            logger.error(f"❌ [SAIF-PRO] YouTube launch error: {e}")
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
                logger.warning("⚠️ 2FA/Verification detected")
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
            logger.error(f"❌ Login sequence error: {e}")
            return {
                "success": False,
                "error": f"로그인 중 예외 발생: {str(e)}"
            }

# Alias for backward compatibility during refactoring
DrissionStealth = PatchrightStealth
stealth_ops = PatchrightStealth()
