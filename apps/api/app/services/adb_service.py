import subprocess
import logging
import platform
import os
import time
import re
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
        # [FIX] Prioritize root-level path to bypass Antivirus DLL profile heuristic blocks (STATUS_DLL_NOT_FOUND 0xC0000135)
        legacy_path = r"C:\ViraLoopMedia\bin\adb\adb.exe"
        if os.path.exists(legacy_path):
            self.adb_path = legacy_path
        else:
            from app.config import settings as settings_conf
            self.adb_path = os.path.join(settings_conf.MEDIA_ROOT, "bin", "adb", "adb.exe").replace("\\", "/")
        self.CMD_POWERSHELL = "powershell.exe"
        
        # 장치별 캐시
        self._cached_public_ips = {} # {serial: ip}
        self.default_serial = None
        
        # [NEW] Settings Cache
        self.config_connection_method = "usb"

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
            logger.info(f"🔄 ADB Service config refreshed from DB (Serial: {self.default_serial})")

    def list_devices(self) -> List[str]:
        """연결된 모든 ADB 장치 시리얼 목록 반환"""
        try:
            # 윈도우에서 ADB 실행파일 존재 확인
            if not os.path.exists(self.adb_path):
                logger.error(f"❌ ADB executable not found at: {self.adb_path}")
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
                # Proactively ensure tethering is active on all connected devices
                for serial in devices:
                    self.ensure_tethering_active(serial)

            return devices
        except Exception as e:
            logger.error(f"❌ 장치 목록 조회 실패: {e}")
            return []

    def ensure_tethering_active(self, serial: Optional[str] = None):
        """[CRITICAL] 자동으로 USB 테더링 활성화 (조용히 작동)"""
        try:
            # 이미 IP가 잡혀있다면 아무 작업도 하지 않음
            current_ip = self._cached_public_ips.get(serial or "default", "")
            if current_ip and current_ip not in ["확인 실패", "갱신 중...", "Unknown", ""]:
                return

            # 최초 1회 또는 끊겼을 때만 시도
            self.run_command(['shell', 'svc', 'tethering', 'set-tethering', 'usb', 'true'], serial)
            self.run_command(['shell', 'settings', 'put', 'global', 'usb_tethering', '1'], serial)
            self.run_command(['shell', 'service', 'call', 'tethering', '3', 'i32', '1'], serial)
            self.run_command(['shell', 'service', 'call', 'connectivity', '34', 'i32', '1'], serial)
            self._cached_public_ips[serial or "default"] = "갱신 중..."
        except:
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
            if result.stderr and "error" in result.stderr.lower():
                logger.warning(f"⚠️ ADB Error ({target_serial}): {result.stderr.strip()}")
            return result.stdout.strip()
        except subprocess.TimeoutExpired:
            logger.error(f"❌ ADB 명령 타임아웃: {' '.join(full_cmd)}")
            return ""
        except Exception as e:
            logger.error(f"❌ ADB 명령 실패: {' '.join(full_cmd)} - {e}")
            return ""

    def get_current_ip(self, serial: Optional[str] = None, force: bool = False) -> str:
        """핸드폰 내부에서 공인 IP 확인 (최적화 버전)"""
        target = serial or "default"
        
        # 너무 잦은 폴링 부하 방지: 강제 갱신이 아니고 유효한 IP가 있다면 15초간 캐시 유지
        cached = self._cached_public_ips.get(target)
        last_check = getattr(self, f"_last_check_{target}", 0)
        
        if not force and cached and "." in cached and (time.time() - last_check < 15):
            return cached
            
        providers = ["https://api.ipify.org", "https://ifconfig.me/ip"]
        
        for url in providers:
            # 타임아웃을 2초로 단축
            res = self.run_command(['shell', 'curl', '-s', '--connect-timeout', '2', '--max-time', '3', url], serial)
            if res and len(res) > 6 and "." in res:
                self._cached_public_ips[target] = res
                setattr(self, f"_last_check_{target}", time.time())
                return res
        
        # [FALLBACK] 통신 실패 시 절대 시스템 IP(Wi-Fi)로 덮어쓰지 않음 -> UI Flickering(깜빡임) 방지
        return cached if cached else "오프라인 (연결 안됨)"

    def get_system_public_ip(self) -> str:
        """윈도우 호스트의 공인 IP 확인 (Wi-Fi/유선 인터페이스에 바인딩하여 LTE 우회 방지)"""
        import socket
        import sys
        try:
            from .network_monitor import network_monitor
            status = network_monitor.get_status()
            
            # Wired IP 우선 확인, 없으면 Wifi IP 확인
            bind_ip = ""
            wired_ip = status.get("wired", {}).get("ip", "")
            wifi_ip = status.get("wifi", {}).get("ip", "")
            
            if wired_ip and "169.254" not in wired_ip and wired_ip not in ["Not Detected", "Error", ""]:
                bind_ip = wired_ip
            elif wifi_ip and "169.254" not in wifi_ip and wifi_ip not in ["Not Detected", "Error", ""]:
                bind_ip = wifi_ip
                
            # IP가 감지된 경우에만 소켓 바인딩 시도
            if bind_ip:
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                s.settimeout(5.0)
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
                    if "." in ip:
                        return ip
                raise ConnectionError("Internet query failed on bound interface")
        except Exception as e:
            logger.debug(f"Failed to get system public IP via Wi-Fi/Wired binding: {e}")
            if sys.platform == 'win32':
                # Windows에서는 LTE 유출 방지를 위해 일반 fallback을 차단하고 오프라인 처리
                return "오프라인 (인터넷 연결 없음)"
            
        # Windows가 아닌 플랫폼(Docker, Linux 등)에서만 일반 요청 허용
        if sys.platform != 'win32':
            import urllib.request
            try:
                with urllib.request.urlopen("https://api.ipify.org", timeout=5) as response:
                    return response.read().decode('utf-8').strip()
            except:
                pass
        return "오프라인 (미연결)"

    def rotate_ip(self, serial: Optional[str] = None, method: str = 'hard') -> bool:
        """IP 로테이션 실행 (비행기 모드 토글) — [Bug 10] USB 테더링 재활성화 보장"""
        target = serial or "default"
        logger.info(f"🔄 [{target}] IP 로테이션 시작 (방식: {method})")

        try:
            self._cached_public_ips[target] = "갱신 중..."
            setattr(self, f"_last_check_{target}", time.time())

            if method == 'soft':
                self.run_command(['shell', 'svc', 'data', 'disable'], serial)
                time.sleep(1)
                self.run_command(['shell', 'svc', 'data', 'enable'], serial)
                time.sleep(3)
            else:
                # 비행기 ON
                self.run_command(['shell', 'cmd', 'connectivity', 'airplane-mode', 'enable'], serial)
                time.sleep(5)
                # 비행기 OFF
                self.run_command(['shell', 'cmd', 'connectivity', 'airplane-mode', 'disable'], serial)

                # [Bug 10] 비행기 해제 후 ADB 기기가 다시 응답할 때까지 대기 (최대 15초)
                device_ready = False
                for wait_i in range(15):
                    time.sleep(1)
                    result = subprocess.run(
                        [self.adb_path, 'devices'],
                        capture_output=True, text=True,
                        creationflags=subprocess.CREATE_NO_WINDOW,
                        timeout=5
                    )
                    device_lines = [l for l in result.stdout.splitlines()[1:] if 'device' in l and 'devices' not in l]
                    if device_lines:
                        device_ready = True
                        logger.info(f"[Bug 10] ADB device ready after {wait_i+1}s")
                        break

                # [Bug 10] USB 테더링 재활성화 재시도 (3회, 2초 간격)
                if device_ready:
                    for attempt in range(3):
                        # svc tethering (Android 11+)
                        self.run_command(['shell', 'svc', 'tethering', 'set-tethering', 'usb', 'true'], serial)
                        self.run_command(['shell', 'settings', 'put', 'global', 'usb_tethering', '1'], serial)
                        # Fallback 1: service call tethering (Android 11/12/13/14 specific interface indexes)
                        self.run_command(['shell', 'service', 'call', 'tethering', '3', 'i32', '1'], serial)
                        # Fallback 2: connectivity manager call (Android 10 and below)
                        self.run_command(['shell', 'service', 'call', 'connectivity', '34', 'i32', '1'], serial)
                        
                        time.sleep(2)
                        # 테더링 활성화 확인
                        check = self.run_command(['shell', 'getprop', 'init.svc.dhcpcd_rndis0'], serial)
                        if 'running' in (check or '').lower():
                            logger.info(f"[Bug 10] USB tethering confirmed active (attempt {attempt+1})")
                            break
                        logger.warning(f"[Bug 10] Tethering not yet active (attempt {attempt+1}), retrying...")
                else:
                    logger.error("[Bug 10] ADB device did not come back online within 15s after airplane-off")

            setattr(self, f"_last_check_{target}", 0)  # 캐시 무효화
            new_ip = self.get_current_ip(serial, force=True)
            logger.info(f"✅ [{target}] IP 갱신 완료: {new_ip}")
            return True
        except Exception as e:
            logger.error(f"❌ [{target}] 로테이션 실패: {e}")
            return False

    def enable_wifi(self, serial: Optional[str] = None):
        self.run_command(['shell', 'svc', 'wifi', 'enable'], serial)

    def disable_wifi(self, serial: Optional[str] = None):
        self.run_command(['shell', 'svc', 'wifi', 'disable'], serial)

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
                return clean_name if clean_name else None
            return None
        except Exception:
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
            cmd = f"Get-NetIPAddress -InterfaceAlias '{iface}' -AddressFamily IPv4 | Select-Object -ExpandProperty IPAddress"
            res = subprocess.run(
                ["powershell.exe", "-Command", cmd],
                capture_output=True, text=True,
                creationflags=subprocess.CREATE_NO_WINDOW,
                timeout=5
            )
            if res.returncode == 0 and res.stdout.strip():
                ip = res.stdout.strip().splitlines()[0]
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

    def get_network_status_detail(self, force: bool = False) -> dict:
        """프론트엔드용 네트워크 상세 상태 반환"""
        try:
            from .network_monitor import network_monitor
            
            devices = self.list_devices()
            adb_connected = len(devices) > 0
            tethering_ip = self.get_tethering_interface_ip()
            
            # 기본 상태 정보 (network_monitor에서 가져옴)
            monitor_status = network_monitor.get_status()
            system_ip = self.get_system_public_ip()
            
            # Refresh Mobile IP if adb is connected
            mobile_ip = "Unknown"
            if adb_connected:
                 mobile_ip = self.get_current_ip(force=force) # Actual adb check
            
            # Determine status_detail for frontend logic
            mode = monitor_status.get("system_gateway_mode", "WIFI")
            
            # [FIX] Bridge-mode friendly detection
            # If we have an LTE IP via ADB, we ARE connected to LTE regardless of interface visibility
            is_lte_active = adb_connected and mobile_ip != "Unknown" and mobile_ip != "확인 실패"
            
            if is_lte_active:
                status_detail = "LTE_MODE" if mode == "LTE" else "DUAL_MODE"
                # Update monitor status for UI consistency
                if monitor_status["lte"]["status"] != "Connected":
                    monitor_status["lte"].update({
                        "status": "Connected",
                        "name": "ADB-Tether",
                        "metric": monitor_status["lte"].get("metric", 9000)
                    })
            else:
                status_detail = "WIFI_MODE"

            return {
                "status_detail": status_detail,
                "adb_connected": adb_connected,
                "device_count": len(devices),
                "tethering_ip": tethering_ip if tethering_ip != "Not Detected" else ("ADB-Linked" if adb_connected else "Not Detected"),
                "mobile_data_enabled": True,
                "public_ip": mobile_ip if is_lte_active else system_ip,
                "system_public_ip": system_ip,
                "mobile_public_ip": mobile_ip,
                "monitor": monitor_status,
                "interface_ip": tethering_ip,
                "current_ip": mobile_ip if is_lte_active else system_ip
            }
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