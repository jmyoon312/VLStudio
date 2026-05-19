import os
import sys
import platform
import subprocess
import logging
import json
from typing import Optional, List

logger = logging.getLogger(__name__)

class NetworkStealthManager:
    """
    ViraLoop Sovereign Stealth Manager (v2026)
    - Phase 1: Full-Tunnel Stealth (Total Isolation)
    """
    
    def __init__(self):
        self.is_windows = platform.system() == "Windows"
        self.lte_gateway: Optional[str] = None
        self.last_captain_id: Optional[str] = None
        self.original_wifi_metric: int = 25
        self.active_lte_iface: Optional[str] = None

    def _get_windows_lte_info(self) -> dict:
        """윈도우 호스트에서 LTE 어댑터 정보(Index, Name, Gateway) 추출"""
        try:
            # 1. Get Gateway
            ps_gw = "Get-NetRoute -DestinationPrefix '0.0.0.0/0' | Where-Object { $_.InterfaceDescription -like '*SAMSUNG*' -or $_.InterfaceDescription -like '*Remote NDIS*' } | Select-Object -ExpandProperty NextHop"
            gw_res = subprocess.run(["powershell.exe", "-NoProfile", "-Command", ps_gw], capture_output=True, text=True)
            gw = gw_res.stdout.strip().splitlines()[0] if gw_res.returncode == 0 and gw_res.stdout else None
            
            # 2. Get Adapter Details
            ps_adp = "Get-NetAdapter | Where-Object { $_.InterfaceDescription -like '*SAMSUNG*' -or $_.InterfaceDescription -like '*Remote NDIS*' } | Select-Object Name, InterfaceIndex | ConvertTo-Json"
            adp_res = subprocess.run(["powershell.exe", "-NoProfile", "-Command", ps_adp], capture_output=True, text=True)
            adp = {}
            if adp_res.returncode == 0 and adp_res.stdout:
                try:
                    adp = json.loads(adp_res.stdout)
                except:
                    # JSON이 배열로 올 경우 첫 번째 것 사용
                    raw = json.loads(adp_res.stdout)
                    adp = raw[0] if isinstance(raw, list) else raw
            
            return {
                "gateway": gw,
                "index": adp.get("InterfaceIndex"),
                "name": adp.get("Name")
            }
        except Exception as e:
            logger.error(f"❌ LTE 정보 획득 실패: {e}")
        return {}

    async def prepare_upload_session(self, serial: Optional[str], captain_id: str):
        """[SAIF Phase 1] 업로드 세션 완전 격리 준비"""
        logger.info(f"🛡️ [SAIF-P1] Hardening network for Captain: {captain_id}")
        
        from app.services.adb_service import adb_service
        
        # 1. IP Rotation (선행 필수)
        success = await adb_service.rotate_ip(serial)
        if not success:
            logger.error("❌ [SAIF-P1] IP Rotation failed. Safety breach risk. Aborting.")
            return False
            
        self.last_captain_id = captain_id
        
        # 2. Full-Tunnel Stealth 적용
        return self.apply_full_tunnel_stealth()

    def apply_full_tunnel_stealth(self):
        """[Windows Native] 전 영역 LTE 강제 터널링 및 IPv6 차단"""
        info = self._get_windows_lte_info()
        gw = info.get("gateway")
        idx = info.get("index")
        name = info.get("name")

        if not gw or not idx:
            logger.error("❌ LTE 인터페이스가 활성화되지 않아 보안 강화를 수행할 수 없습니다.")
            return False
            
        self.lte_gateway = gw
        self.active_lte_iface = name
        
        logger.info(f"🚀 [SAIF-P1] Activating Full-Tunnel on {name} (GW: {gw})")
        
        try:
            # A. IPv6 완전 차단 (Leakage 방지)
            ipv6_cmd = f"Disable-NetAdapterBinding -Name '{name}' -ComponentID ms_tcpip6 -ErrorAction SilentlyContinue"
            subprocess.run(["powershell.exe", "-NoProfile", "-Command", ipv6_cmd], capture_output=True)
            
            # B. Default Gateway Metric 조정 (LTE를 최우선으로)
            # 중요: vEthernet (WSL/Docker)은 제외해야 에이전트 통신이 유지됨
            route_cmd = f"Set-NetIPInterface -InterfaceIndex {idx} -InterfaceMetric 1; " \
                        f"Get-NetIPInterface | Where-Object {{ $_.InterfaceAlias -notlike '*SAMSUNG*' -and $_.InterfaceAlias -notlike '*Remote NDIS*' -and $_.InterfaceAlias -notlike '*vEthernet*' }} | Set-NetIPInterface -InterfaceMetric 1000"
            subprocess.run(["powershell.exe", "-NoProfile", "-Command", route_cmd], capture_output=True)
            
            # C. DNS 고정 (구글 보안 DNS)
            dns_cmd = f"Set-DnsClientServerAddress -InterfaceIndex {idx} -ServerAddresses ('8.8.8.8', '8.8.4.4')"
            subprocess.run(["powershell.exe", "-NoProfile", "-Command", dns_cmd], capture_output=True)
            
            logger.info("✅ [SAIF-P1] Full-Tunnel Isolation Active. (Internal Comm Preserved)")
            return True
        except Exception as e:
            logger.error(f"❌ [SAIF-P1] 보안 강화 중 오류 발생: {e}")
            return False
')"
            subprocess.run(["powershell.exe", "-NoProfile", "-Command", dns_cmd], capture_output=True)
            
            logger.info("✅ [SAIF-P1] Full-Tunnel Isolation Active. (IPv6 Disabled, DNS Secured)")
            return True
        except Exception as e:
            logger.error(f"❌ [SAIF-P1] 보안 강화 중 오류 발생: {e}")
            return False

    def reset_routing(self):
        """세션 종료 후 네트워크 원복"""
        if not self.active_lte_iface:
            return
            
        logger.info("♻️ [SAIF-P1] 네트워크 복구 (WiFi 우선순위 환원 및 IPv6 복구)")
        try:
            # 1. IPv6 복구
            ipv6_cmd = f"Enable-NetAdapterBinding -Name '{self.active_lte_iface}' -ComponentID ms_tcpip6 -ErrorAction SilentlyContinue"
            subprocess.run(["powershell.exe", "-NoProfile", "-Command", ipv6_cmd], capture_output=True)
            
            # 2. 메트릭 원복 (자동 메트릭으로 환원)
            metric_cmd = "Get-NetIPInterface | Set-NetIPInterface -AutomaticMetric Enabled"
            subprocess.run(["powershell.exe", "-NoProfile", "-Command", metric_cmd], capture_output=True)
            
            # 3. DNS 초기화
            dns_cmd = f"Set-DnsClientServerAddress -InterfaceIndex (Get-NetAdapter -Name '{self.active_lte_iface}').InterfaceIndex -ResetServerAddresses"
            subprocess.run(["powershell.exe", "-NoProfile", "-Command", dns_cmd], capture_output=True)
            
            logger.info("✅ [SAIF-P1] Routing restored to default.")
        except Exception as e:
            logger.error(f"⚠️ 복구 중 경고: {e}")
        
        self.lte_gateway = None
        self.active_lte_iface = None

# 싱글톤 인스턴스
network_stealth_manager = NetworkStealthManager()
