from fastapi import APIRouter, HTTPException, Depends
from app.services.adb_service import adb_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter(tags=["network"])

@router.get("/status")
def get_network_status():
    """
    [SAIF-P1] 실시간 네트워크 격리 및 LTE 상태 조회
    """
    try:
        return adb_service.get_network_status_detail()
    except Exception as e:
        logger.error(f"Failed to get network status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/rotate-ip")
def rotate_network_ip(serial: str = None, method: str = "soft"):
    """
    [SAIF-P1] 강제 IP 로테이션 트리거 (비행기 모드 토글 또는 모바일 데이터 토글)
    """
    try:
        success = adb_service.rotate_ip(serial=serial, method=method)
        if success:
            return {"status": "success", "message": f"IP rotation ({method}) sequence triggered"}
        else:
            raise HTTPException(status_code=500, detail="IP rotation failed on device")
    except Exception as e:
        logger.error(f"IP rotation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
