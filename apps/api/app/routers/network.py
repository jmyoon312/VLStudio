from fastapi import APIRouter, HTTPException, Depends
from app.services.adb_service import adb_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter(tags=["network"])

@router.get("/status")
async def get_network_status():
    """
    [SAIF-P1] 실시간 네트워크 격리 및 LTE 상태 조회
    """
    try:
        return adb_service.get_network_status_detail()
    except Exception as e:
        logger.error(f"Failed to get network status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/rotate-ip")
async def rotate_network_ip(serial: str = None):
    """
    [SAIF-P1] 강제 IP 로테이션 트리거 (비행기 모드 토글)
    """
    try:
        success = adb_service.rotate_ip(serial=serial)
        if success:
            return {"status": "success", "message": "IP rotation sequence triggered"}
        else:
            raise HTTPException(status_code=500, detail="IP rotation failed on device")
    except Exception as e:
        logger.error(f"IP rotation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
