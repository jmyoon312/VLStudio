import logging
from app.services.adb_service import adb_service

logger = logging.getLogger(__name__)

class ADBBridge:
    """
    Physical Mobile Device Control Bridge via ADB.
    Delegates to adb_service as the single source of truth.
    """
    def __init__(self, settings=None):
        self.settings = settings

    def rotate_ip(self, method='hard'):
        """Rotates mobile IP safely via adb_service."""
        logger.info(f"[REFRESH] [Stealth] IP Rotation Triggered (Method: {method})")
        return adb_service.rotate_ip(method=method)

    def get_mobile_public_ip(self) -> str:
        """Fetches the mobile device's public IP via adb_service."""
        return adb_service.get_current_ip() or "Unknown"
