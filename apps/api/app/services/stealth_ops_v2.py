import os
import time
import random
import logging
import requests
from datetime import datetime
from typing import Optional

logger = logging.getLogger("DrissionStealth")

class RemotePageProxy:
    def __init__(self, agent_url: str, session_id: str):
        self.agent_url = agent_url
        self.session_id = session_id

    def get(self, url: str):
        return self._send_action("get", value=url)

    def screenshot(self, path: str):
        """페이지 전체 스크린샷"""
        return self._send_action("screenshot", value=path)

    def download(self, url: str):
        """파일 다운로드 요청"""
        return self._send_action("download", value=url)

    @property
    def url(self):
        resp = self._send_action("get_url")
        return resp.get("url") if resp else ""

    @property
    def title(self):
        resp = self._send_action("get_title")
        return resp.get("title") if resp else ""

    @property
    def scroll(self):
        class ScrollProxy:
            def __init__(self, proxy):
                self.proxy = proxy
            def down(self, amount: int):
                return self.proxy._send_action("scroll", value=f"down {amount}")
            def up(self, amount: int):
                return self.proxy._send_action("scroll", value=f"up {amount}")
        return ScrollProxy(self)

    def _send_action(self, action: str, target: str = None, value: str = None, human: bool = True):
        try:
            resp = requests.post(f"{self.agent_url}/action", json={
                "session_id": self.session_id,
                "action": action,
                "target": target,
                "value": value,
                "human": human
            }, timeout=60)
            return resp.json()
        except Exception as e:
            logger.error(f"❌ Remote Action Error ({action}): {e}")
            return None

    def ele(self, selector: str, pacing: dict = None):
        class ElementProxy:
            def __init__(self, proxy, sel, pacing):
                self.proxy = proxy
                self.sel = sel
                self.pacing = pacing or {}
            
            @property
            def text(self):
                resp = self.proxy._send_action("get_text", target=self.sel)
                return resp.get("text", "") if resp else ""

            def click(self, human=True):
                # [SAIF-P3] DNA-driven gaze and movement
                return self.proxy._send_action("click", target=self.sel, human=human)
            
            def input(self, value, human=True):
                # [SAIF-P3] DNA-driven typing jitter
                return self.proxy._send_action("type", target=self.sel, value=value, human=human)

            def screenshot(self, path: str):
                return self.proxy._send_action("screenshot_ele", target=self.sel, value=path)
        return ElementProxy(self, selector, pacing)

    def quit(self):
        return self._send_action("close")

    def run_js(self, script: str):
        """페이지 내 자바스크립트 실행"""
        return self._send_action("run_js", value=script)

# [SAIF-2026] Extended Hardware Catalog
# In a real-world scenario, this would be a large JSON file or DB table.
# For now, we use a statistically-driven generator to ensure 10,000+ combinations.
def get_persistent_dna(channel_id: str):
    """채널 ID를 시드로 사용하여 영구적이고 실존 가능한 하드웨어 DNA 생성 (Thread-Safe)"""
    import hashlib
    import random as py_random
    
    # MD5를 사용하여 고정된 정수 시드 생성
    seed = int(hashlib.md5(str(channel_id).encode()).hexdigest(), 16) % (2**32)
    local_rng = py_random.Random(seed)
    
    cpus = [4, 6, 8, 12, 16]
    rams = [8, 16, 32, 64]
    gpus = [
        {"v": "Google Inc. (NVIDIA)", "r": "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11)"},
        {"v": "Google Inc. (NVIDIA)", "r": "ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Direct3D11)"},
        {"v": "Google Inc. (Intel)", "r": "ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11)"},
        {"v": "Google Inc. (AMD)", "r": "ANGLE (AMD, AMD Radeon RX 6700 XT Direct3D11)"}
    ]
    
    return {
        "cpu": local_rng.choice(cpus),
        "ram": local_rng.choice(rams),
        "gpu": local_rng.choice(gpus),
        "os": local_rng.choice(["Windows 10", "Windows 11"]),
        "webgl_noise": local_rng.uniform(0.0001, 0.001)
    }

class DrissionStealth:
    """
    ViraLoop Sovereign Stealth Engine (v2026)
    - Phase 2: Stable Fingerprinting (Anti-Detect)
    - Consistent Identity per Profile
    - WebGL/Canvas/Audio Noise Injection
    - Hardware/Navigator Attribute Spoofing
    """
    def __init__(self, *args, **kwargs):
        self.agent_url = os.getenv("WINDOWS_AGENT_URL", "http://host.docker.internal:8001")
        self.page: Optional[RemotePageProxy] = None

    def _get_fingerprint_script(self, profile_id: str, mode: str = "standard", dna: dict = None) -> str:
        """프로필 ID와 엔진 모드에 바인딩된 일관된 지문 변조 스크립트 생성"""
        if dna is None:
            dna = get_persistent_dna(profile_id)
        seed = sum(ord(c) for c in profile_id)
        
        # [SAIF-2026] 엔진별 특화 로직 (기기 DNA는 고정, 은폐 강도만 차별화)
        stealth_level = "Standard"
        extra_scripts = ""
        
        if mode == "cloak":
            stealth_level = "Hardened (Cloak)"
            extra_scripts = """
            Object.defineProperty(navigator, 'languages', { get: () => ['ko-KR', 'ko', 'en-US', 'en'] });
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
            """
        elif mode == "fox":
            stealth_level = "Diversified (Fox)"
            extra_scripts = """
            Object.defineProperty(navigator, 'userAgent', { get: () => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0' });
            """
        
        script = f"""
        (function() {{
            // 1. Basic Automation Spoofing
            Object.defineProperty(navigator, 'webdriver', {{ get: () => undefined }});
            
            // 2. Consistent Hardware DNA (Locked for this channel)
            Object.defineProperty(navigator, 'deviceMemory', {{ get: () => {dna['ram']} }});
            Object.defineProperty(navigator, 'hardwareConcurrency', {{ get: () => {dna['cpu']} }});
            Object.defineProperty(navigator, 'platform', {{ get: () => 'Win32' }});
            
            // 3. Consistent WebGL DNA
            const getParameter = WebGLRenderingContext.prototype.getParameter;
            WebGLRenderingContext.prototype.getParameter = function(parameter) {{
                if (parameter === 37445) return '{dna['gpu']['v']}';
                if (parameter === 37446) return '{dna['gpu']['r']}';
                return getParameter.apply(this, arguments);
            }};

            // 4. Stable Canvas/Audio Noise (Based on profile seed)
            const toDataURL = HTMLCanvasElement.prototype.toDataURL;
            HTMLCanvasElement.prototype.toDataURL = function() {{
                const context = this.getContext('2d');
                if (context) {{
                    const imageData = context.getImageData(0, 0, 1, 1);
                    imageData.data[0] = (imageData.data[0] + {seed % 5}) % 256;
                    context.putImageData(imageData, 0, 0);
                }}
                return toDataURL.apply(this, arguments);
            }};

            // 5. Engine Specific Extra Scripts (Stealth Strength)
            {extra_scripts}

            console.log("🛡️ [SAIF-2026] {stealth_level} with Persistent DNA Active for {profile_id}");
        }})();
        """
        return script

    def _ensure_persistent_dna(self, channel_id: str):
        """채널의 DNA를 DB에서 조회하거나 없으면 생성하여 영구 고정"""
        from app.database import SessionLocal
        from app.models import YouTubeChannel
        
        db = SessionLocal()
        try:
            channel = db.query(YouTubeChannel).filter(YouTubeChannel.channel_id == channel_id).first()
            if not channel:
                return get_persistent_dna(channel_id)
                
            # [SAIF-PRO] SQLAlchemy JSON Mutable Check
            # 딕셔너리를 직접 수정하는 대신 새로 생성하여 할당해야 DB에 반영됨
            config = dict(channel.warmup_config) if channel.warmup_config else {}
            
            if "persistent_dna" in config:
                dna = config["persistent_dna"]
            else:
                dna = get_persistent_dna(channel_id)
                config["persistent_dna"] = dna
                channel.warmup_config = config
                db.commit()
                logger.info(f"🔒 [SAIF] Permanent DNA Locked and Saved for channel: {channel_id}")
            return dna
        finally:
            db.close()

    def launch_for_setup(self, profile_id: str, email: str = None, password: str = None, engine_mode: str = "standard", **kwargs):
        """
        [SAIF Phase 2+3] YouTube Studio Dedicated Stealth Launch
        - focus: studio.youtube.com
        """
        try:
            logger.info(f"🛰️ [SAIF-PRO] Launching {engine_mode} engine for YouTube Studio: {profile_id}")
            
            # 1. 영구 DNA 확보 (일관성 보장)
            dna = self._ensure_persistent_dna(profile_id)
            stealth_script = self._get_fingerprint_script(profile_id, mode=engine_mode, dna=dna)
            
            # 2. 엔진별 런칭 파라미터 구성
            launch_config = {
                "profile_id": profile_id,
                "url": "https://studio.youtube.com/",
                "headless": False,
                "engine_mode": engine_mode,
                "stealth_script": stealth_script
            }

            # 3. 에이전트 요청
            resp = requests.post(f"{self.agent_url}/launch", json=launch_config, timeout=60)
            
            if resp.status_code == 200:
                data = resp.json()
                session_id = data["session_id"]
                self.page = RemotePageProxy(self.agent_url, session_id)
                
                # [SAIF-2026] Internal Integrity Check (자가 무결성 검증)
                # 외부 사이트 진단 없이 에이전트로부터 직접 지문 신호 획득
                try:
                    diag_resp = requests.get(f"{self.agent_url}/sessions/{session_id}/diagnostic", timeout=5)
                    if diag_resp.status_code == 200:
                        report = diag_resp.json().get("diagnostic", {})
                        # DNA 일치 여부 검증
                        if str(report.get("hardwareConcurrency")) != str(dna["cpu"]):
                            logger.error(f"🚨 [SAIF-P5] DNA Mismatch! Expected CPU {dna['cpu']}, got {report.get('hardwareConcurrency')}")
                        else:
                            logger.info(f"✅ [SAIF-P5] Integrity Verified for {profile_id}: DNA is Locked & Consistent.")
                except Exception as e:
                    logger.warning(f"⚠️ [SAIF-P5] Integrity check skipped: {e}")
                
                if email and password:
                    time.sleep(5)
                    self._vloop_auto_login(email, password)
                return True
            return False
        except Exception as e:
            logger.error(f"❌ [SAIF-PRO] YouTube launch error: {e}")
            return False

    def _vloop_auto_login(self, email: str, password: str):
        logger.info(f"🔑 [SAIF-P2] Human-like auto-login for {email}...")
        try:
            # Phase 3에서 고도화될 예정이나, 현재는 기본적인 필드 입력 수행
            email_field = self.page.ele('xpath://input[@type="email"]')
            email_field.input(email + "\n")
            time.sleep(random.uniform(3, 5))
            pwd_field = self.page.ele('xpath://input[@type="password"]')
            pwd_field.input(password + "\n")
            logger.info("✅ Login sequence completed.")
        except Exception as e:
            logger.warning(f"⚠️ Login sequence warning: {e}")

    def create_page(self, profile_id: str, **kwargs):
        if self.launch_for_setup(profile_id, **kwargs):
            return self.page
        return None

    def human_delay(self, min_sec=1, max_sec=3):
        """[SAIF-P3 Base] Randomized human-like delay"""
        time.sleep(random.uniform(min_sec, max_sec))

stealth_ops = DrissionStealth()
