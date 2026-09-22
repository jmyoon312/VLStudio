import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

def is_valid_netscape_cookiefile(path: Optional[str]) -> bool:
    """
    Validate that the cookie file exists, is non-empty, and conforms to Netscape format.
    Prevents yt-dlp crash: 'ERROR: ... does not look like a Netscape format cookies file'.
    """
    if not path or not isinstance(path, str):
        return False
    try:
        if not os.path.exists(path) or not os.path.isfile(path):
            return False
        size = os.path.getsize(path)
        if size < 15:  # Empty or nearly empty files (< 15 bytes) are invalid
            return False
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            for _ in range(15):
                line = f.readline()
                if not line:
                    break
                stripped = line.strip()
                if not stripped:
                    continue
                # Netscape standard headers
                if "# Netscape" in stripped or "# HTTP Cookie File" in stripped:
                    return True
                # Valid tab-separated cookie line (domain, flag, path, secure, expiration, name, value)
                if "\t" in stripped:
                    parts = stripped.split("\t")
                    if len(parts) >= 6:
                        return True
        return False
    except Exception as e:
        logger.debug(f"[CookieUtils] Error checking cookie file {path}: {e}")
        return False

def sanitize_cookiefile(path: Optional[str]) -> Optional[str]:
    """
    Returns the path if valid, otherwise None.
    If the file exists with 0 bytes or invalid format, logs debug notice and returns None.
    """
    if not path:
        return None
    if is_valid_netscape_cookiefile(path):
        return path
    if os.path.exists(path) and os.path.getsize(path) == 0:
        logger.debug(f"[CookieUtils] 0-byte invalid cookie file skipped: {path}")
    return None
