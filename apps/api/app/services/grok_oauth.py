"""
xAI Grok Sovereign Native OAuth & Device Auth Service.
Provides 100% Free xAI Grok Access via Official OAuth Device Grant (RFC 8628)
and Direct Native Streaming via cli-chat-proxy.grok.com.

Zero OmniRoute Forcing Law & Zero CLI Subprocess Law:
Calls official https://auth.x.ai and https://cli-chat-proxy.grok.com directly over HTTP.
Zero payment / $0 cost using regular xAI accounts.
"""

import os
import sys
import json
import time
import logging
from pathlib import Path
from typing import Dict, Any, Optional
import requests

logger = logging.getLogger("grok_oauth")

CLIENT_ID = "b1a00492-073a-47ea-816f-4c329264a828"
AUTH_BASE_URL = "https://auth.x.ai"
DEVICE_CODE_URL = f"{AUTH_BASE_URL}/oauth2/device/code"
TOKEN_URL = f"{AUTH_BASE_URL}/oauth2/token"
PROXY_CHAT_URL = "https://cli-chat-proxy.grok.com/v1/chat/completions"

HEADERS_DEFAULT = {
    "User-Agent": "xai-grok-cli/0.1.220",
    "Content-Type": "application/x-www-form-urlencoded",
    "Accept": "application/json"
}

DOT_GROK_DIR = Path.home() / ".grok"
AUTH_JSON_PATH = DOT_GROK_DIR / "auth.json"


def request_device_code() -> Dict[str, Any]:
    """Request a new OAuth device code from xAI.
    
    Returns:
        dict with device_code, user_code, verification_uri, verification_uri_complete, expires_in, interval
    """
    data = {
        "client_id": CLIENT_ID
    }
    resp = requests.post(DEVICE_CODE_URL, data=data, headers=HEADERS_DEFAULT, timeout=15)
    if resp.status_code != 200:
        logger.error(f"❌ [GrokOAuth] Device code request failed ({resp.status_code}): {resp.text}")
        raise RuntimeError(f"xAI Device code request failed: {resp.text}")

    result = resp.json()
    logger.info(f"✅ [GrokOAuth] Issued device code for user_code: {result.get('user_code')}")
    return result


def poll_device_token(device_code: str) -> Dict[str, Any]:
    """Poll xAI OAuth token endpoint for user completion of device authorization.
    
    Returns:
        dict with status ("pending" | "success" | "error"), and tokens if success.
    """
    data = {
        "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
        "device_code": device_code,
        "client_id": CLIENT_ID
    }
    resp = requests.post(TOKEN_URL, data=data, headers=HEADERS_DEFAULT, timeout=15)

    if resp.status_code == 200:
        tokens = resp.json()
        logger.info("🎉 [GrokOAuth] Device authorization completed successfully!")
        return {
            "status": "success",
            "access_token": tokens.get("access_token"),
            "refresh_token": tokens.get("refresh_token"),
            "expires_in": tokens.get("expires_in", 604800),
            "id_token": tokens.get("id_token"),
            "token_type": tokens.get("token_type", "Bearer")
        }

    try:
        err_json = resp.json()
        err_code = err_json.get("error")
        if err_code == "authorization_pending":
            return {"status": "pending"}
        if err_code == "slow_down":
            return {"status": "pending", "slow_down": True}
        return {"status": "error", "error": err_code, "error_description": err_json.get("error_description")}
    except Exception:
        return {"status": "error", "error": f"HTTP {resp.status_code}", "error_description": resp.text}


def refresh_access_token(refresh_token: str) -> Optional[Dict[str, Any]]:
    """Refresh an expired access token using the stored refresh_token."""
    data = {
        "grant_type": "refresh_token",
        "refresh_token": refresh_token,
        "client_id": CLIENT_ID
    }
    try:
        resp = requests.post(TOKEN_URL, data=data, headers=HEADERS_DEFAULT, timeout=15)
        if resp.status_code == 200:
            tokens = resp.json()
            logger.info("🔄 [GrokOAuth] Successfully refreshed xAI OAuth token.")
            return tokens
        else:
            logger.warning(f"⚠️ [GrokOAuth] Token refresh failed ({resp.status_code}): {resp.text}")
            return None
    except Exception as e:
        logger.error(f"❌ [GrokOAuth] Token refresh error: {e}")
        return None


def get_dot_grok_token() -> Optional[Dict[str, Any]]:
    """Read credentials from ~/.grok/auth.json if present."""
    if not AUTH_JSON_PATH.exists():
        return None
    try:
        raw = json.loads(AUTH_JSON_PATH.read_text(encoding="utf-8"))
        sign_in_entry = raw.get("https://accounts.x.ai/sign-in", {})
        access_token = sign_in_entry.get("key") or raw.get("access_token")
        refresh_token = sign_in_entry.get("refresh_token") or raw.get("refresh_token")
        expires_at = sign_in_entry.get("expires_at") or raw.get("expires_at", 0)

        if access_token:
            return {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "expires_at": expires_at
            }
    except Exception as e:
        logger.warning(f"Error reading ~/.grok/auth.json: {e}")
    return None


def save_credentials_to_dot_grok(access_token: str, refresh_token: Optional[str] = None, expires_in: int = 604800):
    """Write credentials to ~/.grok/auth.json conforming to official grok CLI format."""
    try:
        DOT_GROK_DIR.mkdir(parents=True, exist_ok=True)
        expires_at = int(time.time()) + expires_in
        data = {
            "https://accounts.x.ai/sign-in": {
                "key": access_token,
                "refresh_token": refresh_token or "",
                "expires_at": expires_at,
                "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            },
            "access_token": access_token,
            "refresh_token": refresh_token or "",
            "expires_at": expires_at
        }
        AUTH_JSON_PATH.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
        logger.info(f"💾 [GrokOAuth] Saved credentials to {AUTH_JSON_PATH}")
    except Exception as e:
        logger.warning(f"Could not write to ~/.grok/auth.json: {e}")
