import subprocess
import logging
import platform
import os
import time
import re
import xml.etree.ElementTree as ET
from typing import List, Optional

logger = logging.getLogger(__name__)

class ADBService:
    """
    ViraLoop 다중 장치 지원 ADB 서비스
    - 여러 대의 안드로이드 폰을 시리얼 번호로 개별 제어
    - LTE IP 로테이션 (비행기 모드 토글)
    - WSL2/리눅스 환경 호환성 확보
    """
    def __init__(self):
        import shutil
        from app.config import settings as settings_conf
        
        # 1. Check App Root runtime/adb/adb.exe
        current_file = os.path.abspath(__file__)
        root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(current_file))))
        rel_adb = os.path.join(root_dir, "runtime", "adb", "adb.exe")
        
        # 2. Check Auto-Downloaded Dependency Installer Path
        auto_downloaded_path = os.path.join(settings_conf.MEDIA_ROOT, "09_System", "bin", "adb", "platform-tools", "adb.exe").replace("\\", "/")
        fallback_auto_downloaded_path = os.path.join(settings_conf.MEDIA_ROOT, "09_System", "bin", "adb", "adb.exe").replace("\\", "/")
        
        if os.path.exists(rel_adb):
            self.adb_path = rel_adb
        elif os.path.exists(auto_downloaded_path):
            self.adb_path = auto_downloaded_path
        elif os.path.exists(fallback_auto_downloaded_path):
            self.adb_path = fallback_auto_downloaded_path
        elif shutil.which("adb"):
            self.adb_path = shutil.which("adb")
        else:
            self.adb_path = fallback_auto_downloaded_path
        self.CMD_POWERSHELL = "powershell.exe"
        
        # 장치별 캐시 및 포트 매핑
        self._cached_public_ips = {} # {serial: ip}
        self.default_serial = None
        self._device_ports = {} # {serial: port} (e.g. 1080, 1081, 1082)
        self._device_info_cache = {} # {serial: {"data": dict, "time": float}}

        # [Perf] 시스템 공인 IP 캐시 (30초 TTL) — get_system_public_ip() 블로킹 방지
        self._system_ip_cache = ""
        self._system_ip_last_check = 0.0
        self._system_ip_refreshing = False  # 중복 백그라운드 요청 방지

        # [NEW] Settings Cache
        self.config_connection_method = "usb"

        # [Targeted Concurrency Guard] 기기별 독립 Mutex 락 & 디바운스
        import threading
        from collections import defaultdict
        self._rotation_locks = defaultdict(threading.Lock)
        self._last_rotation_times = defaultdict(float)
        # 하위 호환용 글로벌 락
        self._rotation_lock = threading.Lock()
        self._last_rotation_time = 0.0

    def refresh_config(self, db_settings=None):
        """DB 설정을 서비스에 반영"""
        if not db_settings:
            try:
                from app.database import SessionLocal
                from app import crud
                db = SessionLocal()
                db_settings = crud.get_settings(db)
                db.close()
            except:
                return

        if db_settings:
            if db_settings.adb_default_serial:
                self.default_serial = db_settings.adb_default_serial
            if db_settings.adb_connection_method:
                self.config_connection_method = db_settings.adb_connection_method
            logger.info(f"[REFRESH] ADB Service config refreshed from DB (Serial: {self.default_serial})")

    def get_device_port(self, serial: Optional[str] = None) -> int:
        """기기별 고유 로컬 프록시 포트 반환 (1080부터 자동 순차 분배)"""
        devices = self.list_devices()
        if not devices:
            return 1080
        target = serial or self.default_serial or devices[0]
        if target not in self._device_ports:
            used_ports = set(self._device_ports.values())
            try:
                idx = devices.index(target)
                candidate = 1080 + idx
            except ValueError:
                candidate = 1080
            while candidate in used_ports:
                candidate += 1
            self._device_ports[target] = candidate
        return self._device_ports[target]

    def get_connected_devices_info(self, db=None) -> List[dict]:
        """연결된 모든 스마트폰의 상세 정보 (기종, 통신사, 배터리, 포트, 공인 IP, 할당 계정 수) 반환"""
        devices = self.list_devices()
        if not devices:
            return []

        # 프로필 할당 카운트 계산 (db가 제공된 경우)
        assigned_map = {}
        if db:
            try:
                from app.models import Profile, ProfileStatus
                profiles = db.query(Profile).filter(Profile.status != ProfileStatus.QUARANTINED).all()
                for p in profiles:
                    s = getattr(p, "bound_device_serial", None)
                    if s:
                        assigned_map[s] = assigned_map.get(s, 0) + 1
                    elif p.proxy_mode == "DIRECT_LTE":
                        assigned_map["default"] = assigned_map.get("default", 0) + 1
            except Exception as e:
                logger.debug(f"Failed to count assigned accounts: {e}")

        res = []
        now = time.time()
        for idx, serial in enumerate(devices):
            cached = self._device_info_cache.get(serial)
            if cached and (now - cached.get("time", 0) < 10.0):
                info = dict(cached["data"])
                info["assigned_accounts_count"] = assigned_map.get(serial, 0) + (assigned_map.get("default", 0) if idx == 0 else 0)
                info["public_ip"] = self.get_current_ip(serial)
                res.append(info)
                continue

            port = self.get_device_port(serial)
            model = self.run_command(['shell', 'getprop', 'ro.product.model'], serial) or "안드로이드 기기"
            carrier_raw = self.run_command(['shell', 'getprop', 'gsm.sim.operator.alpha'], serial) or ""
            carrier = carrier_raw.strip().rstrip(',').strip() or "알뜰폰/통신사"

            battery_level = 100
            try:
                b_out = self.run_command(['shell', 'dumpsys', 'battery'], serial)
                for line in b_out.splitlines():
                    if 'level:' in line:
                        battery_level = int(line.split('level:')[1].strip())
                        break
            except Exception:
                pass

            public_ip = self.get_current_ip(serial)
            socks_active = self.is_socks_listening(serial)

            info = {
                "serial": serial,
                "model": model,
                "carrier": carrier,
                "battery": battery_level,
                "port": port,
                "public_ip": public_ip,
                "socks_active": socks_active,
                "assigned_accounts_count": assigned_map.get(serial, 0) + (assigned_map.get("default", 0) if idx == 0 else 0),
                "is_default": (serial == self.default_serial) or (idx == 0 and not self.default_serial)
            }
            self._device_info_cache[serial] = {"data": info, "time": now}
            res.append(info)

        return res

    def list_devices(self) -> List[str]:
        """연결된 모든 ADB 장치 시리얼 목록 반환"""
        try:
            # 윈도우에서 ADB 실행파일 존재 확인
            if not os.path.exists(self.adb_path):
                logger.error(f"[FAIL] ADB executable not found at: {self.adb_path}")
                return []

            # [NEW] Try to connect via wireless if configured
            if self.config_connection_method == 'wireless' and self.default_serial:
                if ":" in self.default_serial:
                     subprocess.run([self.adb_path, "connect", self.default_serial], capture_output=True, creationflags=subprocess.CREATE_NO_WINDOW)

            result = subprocess.run([self.adb_path, "devices"], capture_output=True, text=True, creationflags=subprocess.CREATE_NO_WINDOW)
            devices = []
            for line in result.stdout.splitlines()[1:]:
                if "device" in line and not "devices" in line:
                    serial = line.split()[0]
                    devices.append(serial)
            
            if devices:
                # [Fix] Every Proxy(1080 포트) 사용으로 USB 테더링 강제 불필요
                # 구형 기기에서 USB 테더링 명령 시 커널 패닉(무한 재부팅) 발생 방지
                pass

            return devices
        except Exception as e:
            logger.error(f"[FAIL] 장치 목록 조회 실패: {e}")
            return []

    def ensure_tethering_active(self, serial: Optional[str] = None):
        """[Deprecated] Every Proxy 전환으로 인해 사용 안 함. 구형 기기 무한 재부팅 방지용"""
        pass

    def run_command(self, cmd_list: List[str], serial: Optional[str] = None) -> str:
        """특정 시리얼 장치에 대해 ADB 명령 실행"""
        target_serial = serial or self.default_serial
        
        full_cmd = [self.adb_path]
        if target_serial:
            full_cmd += ["-s", target_serial]
        full_cmd += cmd_list
        
        try:
            result = subprocess.run(
                full_cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=10,
                creationflags=subprocess.CREATE_NO_WINDOW
            )
            if result.stderr and "error" in (result.stderr or "").lower():
                logger.warning(f"[WARN] ADB Error ({target_serial}): {(result.stderr or '').strip()}")
            return (result.stdout or "").strip()
        except subprocess.TimeoutExpired:
            logger.error(f"[FAIL] ADB 명령 타임아웃: {' '.join(full_cmd)}")
            return ""
        except Exception as e:
            logger.error(f"[FAIL] ADB 명령 실패: {' '.join(full_cmd)} - {e}")
            return ""

    def is_socks_listening(self, serial: Optional[str] = None) -> bool:
        """스마트폰 내부에서 Every Proxy SOCKS5(포트 1080/0438 hex)가 LISTEN(0A) 상태인지 확인"""
        try:
            out = self.run_command(['shell', "cat /proc/net/tcp /proc/net/tcp6 2>/dev/null | grep ':0438 ' | grep ' 0A '"], serial)
            return bool(out and ':0438 ' in out and ' 0A ' in out)
        except Exception as e:
            logger.debug(f"[SOCKS_CHECK] 소켓 리슨 확인 실패: {e}")
            return False

    def ensure_every_proxy_socks_active(self, serial: Optional[str] = None) -> bool:
        """Every Proxy의 SOCKS 프록시가 꺼져 있으면 화면을 켜고 앱을 실행하여 자동으로 켬 (Self-Healing)"""
        local_port = self.get_device_port(serial)
        # 1. 이미 정상 리슨 중이면 포워딩만 보장하고 즉시 리턴
        if self.is_socks_listening(serial):
            self.run_command(['forward', f'tcp:{local_port}', 'tcp:1080'], serial)
            return True

        logger.info(f"[EVERY_PROXY] SOCKS5(포트 {local_port}->1080) 비활성 감지 -> 전자동 활성화 시퀀스 개시 ({serial or 'default'})")
        try:
            # 2. 화면 깨우기 및 잠금 해제
            self.run_command(['shell', 'input', 'keyevent', '224'], serial)
            self.run_command(['shell', 'wm', 'dismiss-keyguard'], serial)

            # 3. Every Proxy 앱 전면 실행
            self.run_command(['shell', 'am', 'start', '-n', 'com.gorillasoftware.everyproxy/.MainActivity'], serial)
            time.sleep(1.2)

            # 4. 화면 해상도 획득
            screen_w = 1080
            try:
                size_out = self.run_command(['shell', 'wm', 'size'], serial)
                m_size = re.search(r'(\d+)x(\d+)', size_out)
                if m_size:
                    screen_w = int(m_size.group(1))
            except Exception:
                pass

            tap_x = int(screen_w * 0.9)
            tap_y = 536  # 일반적인 SOCKS Proxy 행 기본 높이

            # 5. UI 구조 덤프를 통한 SOCKS Proxy 토글 스위치 정밀 Y좌표 추출
            try:
                self.run_command(['shell', 'uiautomator', 'dump', '/sdcard/ep_auto.xml'], serial)
                xml_data = self.run_command(['shell', 'cat', '/sdcard/ep_auto.xml'], serial)
                if xml_data and 'SOCKS Proxy' in xml_data:
                    root = ET.fromstring(xml_data)
                    for node in root.iter():
                        if node.attrib.get('text') == 'SOCKS Proxy':
                            bounds = node.attrib.get('bounds', '')
                            m = re.findall(r'\[(\d+),(\d+)\]', bounds)
                            if len(m) >= 2:
                                y1, y2 = int(m[0][1]), int(m[1][1])
                                tap_y = (y1 + y2) // 2
                            break
            except Exception as ex:
                logger.debug(f"[EVERY_PROXY] UI Automator 좌표 추출 경고: {ex}")

            # 6. 토글 스위치 터치
            logger.info(f"[EVERY_PROXY] SOCKS 토글 터치 좌표: ({tap_x}, {tap_y})")
            self.run_command(['shell', 'input', 'tap', str(tap_x), str(tap_y)], serial)
            time.sleep(1.5)

            # 7. 홈 화면 복귀 (Every Proxy는 백그라운드 포그라운드 서비스로 계속 상주)
            self.run_command(['shell', 'input', 'keyevent', '3'], serial)

            # 8. 포트 포워딩 갱신
            self.run_command(['forward', f'tcp:{local_port}', 'tcp:1080'], serial)

            listening = self.is_socks_listening(serial)
            logger.info(f"[EVERY_PROXY] ({serial or 'default'} : {local_port}) 자동 활성화 완료 여부: {listening}")
            return listening
        except Exception as e:
            logger.error(f"[EVERY_PROXY] 자동 활성화 실패: {e}")
            return False

    def get_current_ip(self, serial: Optional[str] = None, force: bool = False) -> str:
        """핸드폰 내부에서 공인 IP 확인 (최적화 버전 + SOCKS5 자가치유)"""
        target = serial or "default"
        local_port = self.get_device_port(serial)
        
        # 너무 잦은 폴링 부하 방지: 강제 갱신이 아니고 유효한 IP가 있다면 15초간 캐시 유지
        cached = self._cached_public_ips.get(target)
        last_check = getattr(self, f"_last_check_{target}", 0)
        
        # [Bug Fix] "갱신 중..." 같은 상태 메시지가 마침표(.)를 포함하여 유효한 IP 캐시로 오인되는 것 방지
        is_valid_ip = False
        if cached:
            is_valid_ip = bool(re.match(r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$', cached))
            
        if not force and is_valid_ip and (time.time() - last_check < 15):
            return cached
            
        providers = ["https://api.ipify.org", "https://ifconfig.me/ip"]
        
        # Every Proxy 포트 포워딩 보장 (SOCKS5: local_port -> 1080)
        self.run_command(['forward', f'tcp:{local_port}', 'tcp:1080'], serial)
        import requests

        proxy_endpoints = [f"127.0.0.1:{local_port}"]
        gw_ip = self.get_tethering_gateway_ip()
        if gw_ip and gw_ip not in ("127.0.0.1", ""):
            proxy_endpoints.append(f"{gw_ip}:{local_port}")

        # 1차 시도
        for endpoint in proxy_endpoints:
            # [CRITICAL] socks5h:// 프로토콜 사용 -> DNS 조회를 폰(LTE)에서 원격 수행하여 DNS 누수 및 지연 방지
            proxies = {"http": f"socks5h://{endpoint}", "https": f"socks5h://{endpoint}"}
            for url in providers:
                try:
                    resp = requests.get(url, proxies=proxies, timeout=3.5)
                    res = resp.text.strip()
                    if res and len(res) > 6 and re.match(r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$', res):
                        self._cached_public_ips[target] = res
                        setattr(self, f"_last_check_{target}", time.time())
                        return res
                except Exception:
                    continue

        # [Self-Healing] 통신 실패 시 SOCKS5 비활성 여부 점검 후 자동 활성화 1회 재시도
        if not self.is_socks_listening(serial):
            logger.info("[PROXY_RETRY] SOCKS5 비활성 감지 -> Every Proxy 자동 활성화 후 재시도")
            if self.ensure_every_proxy_socks_active(serial):
                for endpoint in proxy_endpoints:
                    proxies = {"http": f"socks5h://{endpoint}", "https": f"socks5h://{endpoint}"}
                    for url in providers:
                        try:
                            resp = requests.get(url, proxies=proxies, timeout=3.5)
                            res = resp.text.strip()
                            if res and len(res) > 6 and re.match(r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$', res):
                                self._cached_public_ips[target] = res
                                setattr(self, f"_last_check_{target}", time.time())
                                return res
                        except Exception:
                            continue

        # 3차: Fallback으로 adb shell curl 시도 (기기가 직접 curl 가능한 경우)
        for url in providers:
            try:
                res = self.run_command(['shell', 'curl', '-s', '--connect-timeout', '2', '--max-time', '3', url], serial)
                if res and len(res) > 6 and re.match(r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$', res):
                    self._cached_public_ips[target] = res
                    setattr(self, f"_last_check_{target}", time.time())
                    return res
            except Exception:
                pass
        
        # [FALLBACK] 통신 실패 시 절대 시스템 IP(Wi-Fi)로 덮어쓰지 않음 -> UI Flickering(깜빡임) 방지
        return cached if is_valid_ip else "오프라인 (연결 안됨)"

    def _fetch_system_ip_blocking(self) -> str:
        """[Internal] 실제 시스템 공인 IP 조회 (블로킹). 캐시 갱신용 내부 메서드."""
        import socket
        import sys
        try:
            from .network_monitor import network_monitor
            status = network_monitor.get_status()

            bind_ip = ""
            wired_ip = status.get("wired", {}).get("ip", "")
            wifi_ip = status.get("wifi", {}).get("ip", "")

            if wired_ip and "169.254" not in wired_ip and wired_ip not in ["Not Detected", "Error", ""]:
                bind_ip = wired_ip
            elif wifi_ip and "169.254" not in wifi_ip and wifi_ip not in ["Not Detected", "Error", ""]:
                bind_ip = wifi_ip

            if bind_ip:
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                s.settimeout(4.0)
                s.bind((bind_ip, 0))
                s.connect(("api.ipify.org", 80))
                s.sendall(b"GET / HTTP/1.1\r\nHost: api.ipify.org\r\nConnection: close\r\n\r\n")
                response = b""
                while True:
                    chunk = s.recv(4096)
                    if not chunk:
                        break
                    response += chunk
                s.close()
                parts = response.split(b"\r\n\r\n")
                if len(parts) >= 2:
                    ip = parts[1].decode('utf-8').strip()
                    if re.match(r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$', ip):
                        return ip
        except Exception as e:
            logger.debug(f"System public IP fetch failed: {e}")

        if sys.platform != 'win32':
            import urllib.request
            try:
                with urllib.request.urlopen("https://api.ipify.org", timeout=4) as resp:
                    return resp.read().decode('utf-8').strip()
            except Exception:
                pass
        return ""

    def get_system_public_ip(self) -> str:
        """윈도우 호스트 공인 IP (캐시 30초 TTL, 비블로킹).

        - 캐시가 유효하면 즉시 반환 (0ms).
        - 캐시 만료 시 백그라운드 스레드로 갱신 후 기존 캐시 반환.
        - 최초 호출이거나 캐시가 없으면 블로킹 조회 1회 수행.
        """
        import threading
        CACHE_TTL = 30  # 초
        now = time.time()

        # 캐시 유효: 즉시 반환
        if self._system_ip_cache and (now - self._system_ip_last_check) < CACHE_TTL:
            return self._system_ip_cache

        # 캐시 있지만 만료 → 백그라운드 갱신, 기존 값 즉시 반환
        if self._system_ip_cache and not self._system_ip_refreshing:
            self._system_ip_refreshing = True
            def _refresh():
                try:
                    ip = self._fetch_system_ip_blocking()
                    if ip:
                        self._system_ip_cache = ip
                        self._system_ip_last_check = time.time()
                finally:
                    self._system_ip_refreshing = False
            threading.Thread(target=_refresh, daemon=True).start()
            return self._system_ip_cache

        # 최초 호출: 1회 블로킹 (캐시 없음)
        ip = self._fetch_system_ip_blocking()
        if ip:
            self._system_ip_cache = ip
            self._system_ip_last_check = now
            return ip
        return ""

    def rotate_ip(self, serial: Optional[str] = None, method: str = 'soft') -> bool:
        """IP 로테이션 실행 (기본값: 초고속 소프트 데이터 토글) — [Targeted Lock] 개별 스마트폰 독립 회전"""
        if serial in ('soft', 'hard') and method == 'soft':
            method = serial
            serial = None
        
        devices = self.list_devices()
        target = serial or self.default_serial or (devices[0] if devices else "default")
        cmd_serial = target if (target != "default" and target in devices) else None
        
        # 1. 대상 기기 전용 락 획득 (타 기기 회전 블로킹 방지)
        lock = self._rotation_locks[target]
        acquired = lock.acquire(timeout=45.0)
        if not acquired:
            logger.warning(f"[WARN] [{target}] 이전 IP 로테이션이 진행 중이어서 타임아웃 발생")
            return False

        try:
            # 2. 최근 3초 이내에 이미 회전이 완료되었으면 중복 회전 방지 (Debounce)
            now = time.time()
            if now - self._last_rotation_times[target] < 3.0:
                logger.info(f"[SKIP] [{target}] 최근({now - self._last_rotation_times[target]:.1f}초 전)에 이미 로테이션됨 — 최신 IP 유지")
                return True

            logger.info(f"[REFRESH] [{target}] IP 로테이션 시작 (방식: {method})")
            self._cached_public_ips[target] = "갱신 중..."
            setattr(self, f"_last_check_{target}", time.time())

            if method == 'soft':
                # [소프트 교체 - FAST & ROCK SOLID]
                # 기지국 연결(RRC)을 끊지 않고 모바일 데이터 세션만 초고속 재할당 (0.8s)
                # 비행기 모드를 건드리지 않아 삼성 Knox의 보안 잠금(Lock network and security)에 걸리지 않습니다.
                logger.info(f"[SOFT] [{target}] 초고속 데이터 세션 토글 (svc data disable/enable)...")
                self.run_command(['shell', 'svc', 'data', 'disable'], cmd_serial)
                time.sleep(0.8)
                self.run_command(['shell', 'svc', 'data', 'enable'], cmd_serial)
            else:
                # [하드 교체 - Airplane Mode Deep Reset]
                logger.info(f"[HARD] [{target}] 비행기 모드 펄스 (3초)...")
                self.run_command(['shell', 'cmd', 'connectivity', 'airplane-mode', 'enable'], cmd_serial)
                time.sleep(3.0)
                self.run_command(['shell', 'cmd', 'connectivity', 'airplane-mode', 'disable'], cmd_serial)
                self.run_command(['shell', 'svc', 'wifi', 'disable'], cmd_serial)
                self.run_command(['shell', 'svc', 'data', 'enable'], cmd_serial)

            # 3. 통신사 셀룰러 데이터 베어러(mDataConnectionState=2) 활성화 대기 (최대 5초 스마트 폴링)
            bearer_connected = False
            start_bearer_wait = time.time()
            while time.time() - start_bearer_wait < 5.0:
                tel_dump = self.run_command(['shell', 'dumpsys', 'telephony.registry'], cmd_serial)
                if 'mDataConnectionState=2' in tel_dump:
                    bearer_connected = True
                    logger.info(f"[BEARER] [{target}] 통신사 LTE 베어러 연결 완료 ({time.time() - start_bearer_wait:.1f}초 소요)")
                    break
                time.sleep(0.3)

            if not bearer_connected:
                logger.warning(f"[WARN] [{target}] LTE 베어러 5초 이내 미연결 — Every Proxy 및 IP 조회 폴백 시도")

            # Every Proxy 포트 포워딩 보장
            local_port = self.get_device_port(cmd_serial)
            self.run_command(['forward', f'tcp:{local_port}', 'tcp:1080'], cmd_serial)

            setattr(self, f"_last_check_{target}", 0)  # 캐시 무효화
            new_ip = self.get_current_ip(cmd_serial, force=True)

            # 새 IP 조회가 실패하거나 정상 포맷이 아닌 경우 무한 갱신 루프 차단
            if not new_ip or not re.match(r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$', new_ip):
                self._cached_public_ips.pop(target, None)

            self._last_rotation_times[target] = time.time()
            self._last_rotation_time = time.time()
            self._cached_network_status = None
            logger.info(f"[OK] [{target}] IP 갱신 완료: {new_ip}")
            return True
        except Exception as e:
            logger.error(f"[FAIL] [{target}] 로테이션 실패: {e}")
            return False
        finally:
            lock.release()


    def enable_wifi(self, serial: Optional[str] = None):
        self.run_command(['shell', 'svc', 'wifi', 'enable'], serial)
        self._cached_network_status = None

    def disable_wifi(self, serial: Optional[str] = None):
        """스마트폰 Wi-Fi 끄고 순수 LTE 데이터 고정 & 포트 포워딩 보장 (복수 단말기 지원)"""
        if serial:
            serials = [serial]
        else:
            connected = self.get_devices()
            serials = connected if connected else ([self.get_active_device()] if self.get_active_device() else [])

        for s in serials:
            if not s:
                continue
            local_port = self.get_device_port(s)
            self.run_command(['shell', 'svc', 'wifi', 'disable'], s)
            self.run_command(['shell', 'svc', 'data', 'enable'], s)
            self.run_command(['forward', f'tcp:{local_port}', 'tcp:1080'], s)
        self._cached_network_status = None

    def get_tethering_gateway_ip(self) -> Optional[str]:
        """테더링 어댑터의 게이트웨이(스마트폰) IPv4 주소 반환"""
        iface = self._find_tethering_interface()
        if not iface:
            return None
        try:
            cmd = f"[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-NetRoute -InterfaceAlias '{iface}' -DestinationPrefix '0.0.0.0/0' | Select-Object -ExpandProperty NextHop"
            res = subprocess.run(
                ["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", cmd],
                capture_output=True, encoding="utf-8", errors="replace",
                creationflags=subprocess.CREATE_NO_WINDOW,
                timeout=4
            )
            if res.returncode == 0 and res.stdout.strip():
                gw = res.stdout.strip().splitlines()[0].strip()
                if re.match(r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$', gw):
                    return gw
        except Exception:
            pass
        return None

    def _find_tethering_interface(self) -> Optional[str]:
        """윈도우에서 테더링 인터페이스 이름 찾기 — Connected 또는 Isolated 상태 모두 수용"""
        try:
            from .network_monitor import network_monitor
            status = network_monitor.get_status()
            lte = status.get('lte', {})
            # [Bug 3] 'Isolated' 상태 (라우팅 메트릭 9000으로 낮춰진 LTE)도 유효한 인터페이스로 처리
            if lte.get('status') in ('Connected', 'Isolated'):
                name = lte.get('name', '')
                # [Bug 4] 괄호 접미사 제거 (예: "Realtek USB (IP-Match)" → "Realtek USB")
                clean_name = re.sub(r'\s*\([^)]*\)\s*$', '', name).strip()
                if clean_name and clean_name != 'Unknown':
                    return clean_name
        except Exception:
            pass

        # Fallback: OS NetAdapter direct lookup
        try:
            cmd = '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-NetAdapter | Where-Object { $_.Status -eq "Up" -and ($_.InterfaceDescription -match "samsung|rndis|remote ndis|mobile|tether" -or $_.BusType -eq 15) } | Select-Object -ExpandProperty Name'
            res = subprocess.run(
                ["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", cmd],
                capture_output=True, encoding="utf-8", errors="replace",
                creationflags=subprocess.CREATE_NO_WINDOW,
                timeout=4
            )
            if res.returncode == 0 and res.stdout.strip():
                return res.stdout.strip().splitlines()[0].strip()
        except Exception:
            pass
        return None

    def get_tethering_interface_ip(self, use_cache: bool = True) -> str:
        """테더링 인터페이스의 로컬 IP 주소 반환.
        
        Args:
            use_cache: True이면 network_monitor 메모리 캐시를 우선 조회하여
                       PowerShell 호출 없이 0ms 반환. False이면 강제 PS 조회.
        """
        # [Bug 6] 캐시 우선 조회 — PS 호출 오버헤드 제거
        if use_cache:
            try:
                from .network_monitor import network_monitor
                cached_ip = network_monitor.current_status.get('lte', {}).get('ip', '')
                if cached_ip and '169.254' not in cached_ip and cached_ip not in ('', 'Error', 'Not Detected'):
                    return cached_ip
            except Exception:
                pass

        iface = self._find_tethering_interface()
        if not iface:
            return "Not Detected"

        try:
            cmd = f"[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-NetIPAddress -InterfaceAlias '{iface}' -AddressFamily IPv4 | Select-Object -ExpandProperty IPAddress"
            res = subprocess.run(
                ["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", cmd],
                capture_output=True, encoding="utf-8", errors="replace",
                creationflags=subprocess.CREATE_NO_WINDOW,
                timeout=4
            )
            if res.returncode == 0 and res.stdout.strip():
                ip = res.stdout.strip().splitlines()[0].strip()
                if re.match(r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$', ip):
                    # 조회 결과를 monitor 캐시에 반영
                    try:
                        from .network_monitor import network_monitor
                        network_monitor.current_status.setdefault('lte', {})['ip'] = ip
                    except Exception:
                        pass
                    return ip
            return "Not Detected"
        except Exception:
            return "Error"

    def get_network_status_detail(self, force: bool = False, db = None) -> dict:
        """프론트엔드용 네트워크 상세 상태 반환 (5초 인메모리 캐싱으로 폴링 부하 방지 및 고속 반영)"""
        now = time.time()
        if not force and hasattr(self, "_cached_network_status") and self._cached_network_status:
            cached_time, cached_res = self._cached_network_status
            if now - cached_time < 5.0:
                return cached_res

        try:
            from .network_monitor import network_monitor
            
            devices = self.list_devices()
            adb_connected = len(devices) > 0
            tethering_ip = self.get_tethering_interface_ip()
            
            # 기본 상태 정보 (network_monitor에서 가져옴)
            monitor_status = network_monitor.get_status()
            system_ip = self.get_system_public_ip()
            
            # Refresh Mobile IP if adb is connected OR tethering is active
            mobile_ip = "Unknown"
            if adb_connected or (tethering_ip and tethering_ip not in ("Not Detected", "Error", "")):
                 mobile_ip = self.get_current_ip(force=force) # Actual check
            
            # Determine status_detail for frontend logic
            mode = monitor_status.get("system_gateway_mode", "WIFI")
            
            # [FIX] Bridge-mode friendly detection
            # If we have an LTE IP via ADB or Tethering, we ARE connected to LTE regardless of interface visibility
            is_lte_active = (mobile_ip != "Unknown" and mobile_ip != "확인 실패" and "오프라인" not in mobile_ip)
            
            if is_lte_active:
                status_detail = "LTE_MODE" if mode == "LTE" else "DUAL_MODE"
                # Update monitor status for UI consistency
                if monitor_status.get("lte", {}).get("status") != "Connected":
                    monitor_status.setdefault("lte", {}).update({
                        "status": "Connected",
                        "name": "ADB-Tether",
                        "metric": monitor_status.get("lte", {}).get("metric", 9000)
                    })
            else:
                status_detail = "WIFI_MODE"

            # 연결된 안드로이드 기기 상세 정보 목록 (멀티 디바이스 매트릭스)
            devices_info = self.get_connected_devices_info(db=db)

            res = {
                "status_detail": status_detail,
                "adb_connected": adb_connected,
                "device_count": len(devices),
                "devices": devices_info,
                "primary_port": 1080,
                "tethering_ip": tethering_ip if tethering_ip != "Not Detected" else ("ADB-Linked" if adb_connected else "Not Detected"),
                "mobile_data_enabled": True,
                "public_ip": mobile_ip if is_lte_active else system_ip,
                "system_public_ip": system_ip,
                "mobile_public_ip": mobile_ip,
                "monitor": monitor_status,
                "interface_ip": tethering_ip,
                "current_ip": mobile_ip if is_lte_active else system_ip,
                "ldplayer_gateway": {
                    "active": True,
                    "universal_host": "172.16.1.2",
                    "listen_port": 11080,
                    "target_port": 1080
                }
            }
            try:
                from .ldplayer_gateway import ldplayer_gateway
                res["ldplayer_gateway"] = ldplayer_gateway.get_status()
            except Exception:
                pass
            self._cached_network_status = (now, res)
            return res
        except Exception as e:
            logger.error(f"Failed to get network status detail: {e}")
            return {"status": "ERROR", "detail": str(e), "adb_connected": False}

    def perform_rotation_check(self) -> str:
        """로테이션 후 IP 변경 확인"""
        old_ip = self._cached_public_ips.get("default")
        if self.rotate_ip(method='soft'):
            new_ip = self.get_current_ip()
            if new_ip != old_ip:
                return new_ip
        return "Verification Failed"


# 싱글톤 인스턴스
adb_service = ADBService()