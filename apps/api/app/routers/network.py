from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from app.services.adb_service import adb_service
from app.services.network_monitor import network_monitor
from app.database import get_db
from app.models import Profile, ProfileStatus
import logging

logger = logging.getLogger(__name__)

router = APIRouter(tags=["network"])

@router.get("/status")
def get_network_status(db: Session = Depends(get_db), force: bool = Query(False)):
    """
    [SAIF-P1] 실시간 네트워크 격리 및 멀티 디바이스 LTE 상태 조회
    프론트엔드 NetworkStatus 인터페이스 포맷으로 응답
    """
    try:
        base = adb_service.get_network_status_detail(force=force, db=db)

        # 프로필 분류 추가
        profiles = db.query(Profile).filter(Profile.status != ProfileStatus.QUARANTINED).all()
        lte_profiles, isp_profiles, direct_profiles = [], [], []
        seen_isp = set()
        isp_proxies = []
        for p in profiles:
            p_data = {
                "id": p.id, "email": p.email, "proxy_mode": p.proxy_mode,
                "proxy_host": p.proxy_host, "proxy_port": p.proxy_port,
                "bound_device_serial": getattr(p, "bound_device_serial", None)
            }
            if p.proxy_mode == "DIRECT_LTE":
                lte_profiles.append(p_data)
            elif p.proxy_mode == "ISP_PROXY":
                isp_profiles.append(p_data)
                if p.proxy_host and p.proxy_port:
                    key = f"{p.proxy_host}:{p.proxy_port}"
                    if key not in seen_isp:
                        seen_isp.add(key)
                        isp_proxies.append({
                            "host": p.proxy_host,
                            "port": p.proxy_port,
                            "protocol": getattr(p, "proxy_protocol", "http") or "http",
                            "username": getattr(p, "proxy_username", None),
                            "account_count": 0
                        })
            else:
                direct_profiles.append(p_data)

        for isp in isp_proxies:
            isp["account_count"] = sum(1 for p in isp_profiles if p.get("proxy_host") == isp["host"] and str(p.get("proxy_port")) == str(isp["port"]))

        base["profiles"] = {"lte": lte_profiles, "isp": isp_profiles, "direct": direct_profiles}
        base["isp_proxies"] = isp_proxies

        # isolation_ok 계산 (프론트엔드 호환)
        mon = base.get("monitor", {})
        lte_status = mon.get("lte", {}).get("status", "Disconnected")
        wifi_status = mon.get("wifi", {}).get("status", "Disconnected")
        base["isolation_ok"] = (lte_status == "Connected" and wifi_status in ["Connected", "Isolated"])

        return base
    except Exception as e:
        logger.error(f"Failed to get network status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/devices")
def get_network_devices(db: Session = Depends(get_db)):
    """연결된 모든 USB 스마트폰 노드 목록 및 할당 상태 조회"""
    try:
        return adb_service.get_connected_devices_info(db=db)
    except Exception as e:
        logger.error(f"Failed to get devices: {e}")
        return []

@router.post("/test-proxy")
def test_network_proxy(payload: dict):
    """사전 네트워크/프록시 연결 테스트 및 실시간 공인 IP 반환"""
    import time
    import requests
    mode = payload.get("proxy_mode", "DIRECT_LTE")
    try:
        if mode == "DIRECT_LTE":
            serial = payload.get("serial")
            port = payload.get("port") or adb_service.get_device_port(serial)
            adb_service.ensure_every_proxy_socks_active(serial)
            proxy_url = f"socks5h://127.0.0.1:{port}"
            proxies = {"http": proxy_url, "https": proxy_url}
        elif mode == "ISP_PROXY":
            host = payload.get("host")
            port = payload.get("port", 1080)
            proto = payload.get("protocol", "http")
            user = payload.get("username")
            pwd = payload.get("password")
            if user and pwd:
                proxy_url = f"{proto}://{user}:{pwd}@{host}:{port}"
            else:
                proxy_url = f"{proto}://{host}:{port}"
            proxies = {"http": proxy_url, "https": proxy_url}
        else:
            proxies = None

        start = time.time()
        resp = requests.get("https://api.ipify.org", proxies=proxies, timeout=5.0)
        elapsed = round((time.time() - start) * 1000)
        public_ip = resp.text.strip()
        return {
            "status": "success",
            "public_ip": public_ip,
            "elapsed_ms": elapsed,
            "mode": mode
        }
    except Exception as e:
        logger.error(f"Proxy test failed: {e}")
        return {
            "status": "error",
            "detail": str(e),
            "mode": mode
        }

@router.post("/rotate-ip")
def rotate_network_ip(serial: str = None, method: str = "soft"):
    """
    [SAIF-P1] 강제 IP 로테이션 트리거 (비행기 모드 토글 또는 모바일 데이터 토글)
    """
    try:
        success = adb_service.rotate_ip(serial=serial, method=method)
        if success:
            new_ip = adb_service.get_current_ip(serial=serial, force=False)
            return {"status": "success", "message": f"IP rotation ({method}) sequence triggered", "current_ip": new_ip, "serial": serial}
        else:
            raise HTTPException(status_code=500, detail="IP rotation failed on device")
    except Exception as e:
        logger.error(f"IP rotation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/rotate/{method}")
def rotate_network_method(method: str, serial: str = None):
    """
    [SAIF-P1] 표준 경로 기반 IP 로테이션 트리거 (/api/network/rotate/{method})
    """
    try:
        success = adb_service.rotate_ip(serial=serial, method=method)
        new_ip = adb_service.get_current_ip(serial=serial, force=False) if success else None
        return {"status": "rotated" if success else "failed", "current_ip": new_ip, "serial": serial}
    except Exception as e:
        logger.error(f"IP rotation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/source/{source}")
def switch_network_source_endpoint(source: str):
    """
    [SAIF-P1] 인터넷 소스 스위칭 (/api/network/source/{source})
    """
    try:
        from app.services.network_core import network_service
        network_service.set_internet_source(source)
        if source.upper() == "WIFI":
            adb_service.enable_wifi()
        elif source.upper() == "LTE":
            adb_service.disable_wifi()
        return {"status": "success", "target": source}
    except Exception as e:
        logger.error(f"Source switch error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/adapters/debug")
def get_adapter_debug():
    """
    [Debug] 현재 감지된 모든 어댑터 상태를 반환 (LTE 인식 문제 진단용)
    """
    try:
        from app.services.network_monitor import network_monitor as nm
        adb_devices = adb_service.list_devices()
        return {
            "network_monitor_status": nm.get_status(),
            "adb_connected": len(adb_devices) > 0,
            "adb_devices": adb_devices,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

