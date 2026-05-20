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
        # [FIX] Use Absolute Path for Native Windows
        self.adb_path = r"C:\ViraLoopMedia\bin\adb\adb.exe"
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
        """윈도우 호스트의 공인 IP 확인"""
        import urllib.request
        try:
            with urllib.request.urlopen("https://api.ipify.org", timeout=5) as response:
                return response.read().decode('utf-8').strip()
        except:
            return "Unknown"

    def rotate_ip(self, serial: Optional[str] = None, method: str = 'hard') -> bool:
        """IP 로테이션 실행 (비행기 모드 토글)"""
        target = serial or "default"
        logger.info(f"🔄 [{target}] IP 로테이션 시작 (방식: {method})")
        
        try:
            # 갱신 시작 즉시 상태를 변경하여 UI 깜빡임 방지
            self._cached_public_ips[target] = "갱신 중..."
            setattr(self, f"_last_check_{target}", time.time()) # 폴링으로 인한 불필요한 curl 방지
            
            if method == 'soft':
                self.run_command(['shell', 'svc', 'data', 'disable'], serial)
                time.sleep(1)
                self.run_command(['shell', 'svc', 'data', 'enable'], serial)
                time.sleep(3) # 망 접속 대기 (기존 1초는 이전 IP를 다시 잡아오는 경우 발생)
            else:
                self.run_command(['shell', 'cmd', 'connectivity', 'airplane-mode', 'enable'], serial)
                time.sleep(5)
                self.run_command(['shell', 'cmd', 'connectivity', 'airplane-mode', 'disable'], serial)
                time.sleep(10)
            
            setattr(self, f"_last_check_{target}", 0) # 다음 확인 시 즉시 curl 하도록 캐시 무효화
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
        """윈도우에서 테더링 인터페이스 이름 찾기"""
        try:
            from .network_monitor import network_monitor
            status = network_monitor.get_status()
            lte = status.get('lte', {})
            if lte.get('status') == 'Connected':
                return lte.get('name')
            return None
        except:
            return None

    def get_tethering_interface_ip(self) -> str:
        """테더링 인터페이스의 로컬 IP 주소 반환"""
        iface = self._find_tethering_interface()
        if not iface:
            return "Not Detected"
            
        try:
            # 파워쉘을 통해 해당 인터페이스의 IP 확인
            cmd = f"Get-NetIPAddress -InterfaceAlias '{iface}' -AddressFamily IPv4 | Select-Object -ExpandProperty IPAddress"
            res = subprocess.run(["powershell.exe", "-Command", cmd], capture_output=True, text=True, creationflags=subprocess.CREATE_NO_WINDOW)
            if res.returncode == 0 and res.stdout.strip():
                return res.stdout.strip()
            return "Not Detected"
        except:
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