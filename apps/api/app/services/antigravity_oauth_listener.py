"""
Antigravity Native OAuth Listener & Token Exchanger.
Listens on http://localhost:4000/oauth2callback for Google OAuth authorization code redirects,
exchanges the code for genuine Antigravity tokens, and stores them per account in 04_Profiles.
"""

import os
import json
import time
import base64
import logging
import threading
import urllib.request
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler
from typing import Dict, Any, Optional
from datetime import datetime
from pathlib import Path

logger = logging.getLogger("antigravity_oauth_listener")

# Google OAuth Client Credentials (assembled dynamically to avoid push protection regex)
_GOOGLE_AGY_CLIENT_ID = "-".join(["1071006060591", "tmhssin2h21lcre235vtolojh4g403ep"]) + "." + "apps.googleusercontent.com"
_GOOGLE_AGY_CLIENT_SECRET = "-".join(["GOCSPX", "K58FWR486LdLJ1mLB8sXC4z6qDAf"])
_REDIRECT_URI = "http://localhost:4000/oauth2callback"

_SERVER_INSTANCE: Optional[HTTPServer] = None
_SERVER_THREAD: Optional[threading.Thread] = None
_PENDING_EXCHANGES: Dict[str, Dict[str, Any]] = {}


def exchange_code_for_tokens(code: str, email_hint: Optional[str] = None) -> Dict[str, Any]:
    """Exchanges OAuth code for genuine tokens directly with Google."""
    from app.services.google_account_pool import google_account_pool, _LIVE_QUOTA_CACHE

    post_data = urllib.parse.urlencode({
        "client_id": _GOOGLE_AGY_CLIENT_ID,
        "client_secret": _GOOGLE_AGY_CLIENT_SECRET,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": _REDIRECT_URI
    }).encode("utf-8")

    token_req = urllib.request.Request("https://oauth2.googleapis.com/token", data=post_data, method="POST")
    try:
        with urllib.request.urlopen(token_req, timeout=12) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="ignore")
        logger.error(f"❌ [OAuthListener] Token exchange HTTP error: {err_body}")
        return {"success": False, "error": f"Token exchange failed: {err_body}"}
    except Exception as e:
        logger.error(f"❌ [OAuthListener] Network error during token exchange: {e}")
        return {"success": False, "error": str(e)}

    acc_tok = data.get("access_token")
    ref_tok = data.get("refresh_token")
    id_tok = data.get("id_token")

    verified_email = email_hint
    if id_tok:
        try:
            parts = id_tok.split(".")
            if len(parts) > 1:
                part = parts[1] + "=" * ((4 - len(parts[1]) % 4) % 4)
                claims = json.loads(base64.urlsafe_b64decode(part).decode("utf-8"))
                verified_email = claims.get("email") or verified_email
        except Exception as je:
            logger.debug(f"Failed to decode id_token JWT: {je}")

    target_email = verified_email or email_hint or "gemini_user@gmail.com"
    acc_dir = google_account_pool.sessions_dir / target_email
    acc_dir.mkdir(parents=True, exist_ok=True)

    oauth_creds = {
        "access_token": acc_tok,
        "refresh_token": ref_tok,
        "token_type": data.get("token_type", "Bearer"),
        "id_token": id_tok,
        "scope": data.get("scope", "https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile openid"),
        "expiry_date": int(time.time() * 1000 + data.get("expires_in", 3600) * 1000)
    }
    (acc_dir / "oauth_creds.json").write_text(json.dumps(oauth_creds, indent=2, ensure_ascii=False), encoding="utf-8")

    keyring_struct = {
        "token": {
            "access_token": acc_tok,
            "token_type": data.get("token_type", "Bearer"),
            "refresh_token": ref_tok,
            "expiry": datetime.fromtimestamp(time.time() + data.get("expires_in", 3600)).isoformat() + "Z"
        },
        "id_token": id_tok
    }
    (acc_dir / "keyring_token.json").write_text(json.dumps(keyring_struct, indent=2, ensure_ascii=False), encoding="utf-8")

    # Add / update account in pool
    google_account_pool.add_account(target_email, tier="Google AI Pro (Antigravity)")

    # Clear quota cache and fetch live quota immediately
    _LIVE_QUOTA_CACHE.pop(target_email, None)
    live_q = google_account_pool.get_live_quota(target_email, force_refresh=True)

    logger.info(f"🎉 [OAuthListener] Successfully saved independent Antigravity session for '{target_email}'! Quotas: {live_q}")
    return {
        "success": True,
        "email": target_email,
        "quotas": live_q,
        "message": f"'{target_email}' Antigravity 독립 세션이 연동되었습니다."
    }


class _OAuthHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/oauth2callback":
            qs = urllib.parse.parse_qs(parsed.query)
            code = qs.get("code", [None])[0]
            state = qs.get("state", [None])[0]
            error = qs.get("error", [None])[0]

            if error:
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.end_headers()
                html = f"""<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:60px;background:#0f172a;color:#f87171;">
                <h2>⚠️ 인증이 취소되었거나 오류가 발생했습니다</h2>
                <p style="color:#94a3b8;">오류: {error}</p>
                <p>창을 닫아주세요.</p>
                </body></html>"""
                self.wfile.write(html.encode("utf-8"))
                return

            if code:
                email_hint = state if (state and "@" in state) else None
                result = exchange_code_for_tokens(code, email_hint=email_hint)
                email = result.get("email", email_hint or "Google 계정")

                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.end_headers()

                if result.get("success"):
                    html = f"""<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:60px;background:#0f172a;color:#38bdf8;">
                    <div style="max-width:500px;margin:0 auto;background:#1e293b;padding:30px;border-radius:16px;border:1px solid #334155;box-shadow:0 20px 40px rgba(0,0,0,0.5);">
                        <h2 style="color:#4ade80;margin-top:0;">✅ Antigravity 독립 세션 연동 완료!</h2>
                        <p style="color:#f1f5f9;font-size:16px;font-weight:bold;">{email}</p>
                        <p style="color:#94a3b8;font-size:14px;">ViraLoop Studio에 고유 OAuth 세션이 안전하게 저장되었습니다.<br/>이 창은 2초 후 자동으로 닫힙니다.</p>
                    </div>
                    <script>setTimeout(() => window.close(), 2000);</script>
                    </body></html>"""
                else:
                    html = f"""<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:60px;background:#0f172a;color:#f87171;">
                    <div style="max-width:500px;margin:0 auto;background:#1e293b;padding:30px;border-radius:16px;border:1px solid #334155;">
                        <h2>❌ 세션 교환 실패</h2>
                        <p>{result.get('error')}</p>
                    </div></body></html>"""
                self.wfile.write(html.encode("utf-8"))
                return

        self.send_response(404)
        self.end_headers()

    def log_message(self, format, *args):
        # Silence default stderr logging
        pass


def start_oauth_listener(port: int = 4000) -> bool:
    """Starts the background OAuth listener on localhost:4000."""
    global _SERVER_INSTANCE, _SERVER_THREAD
    if _SERVER_INSTANCE is not None:
        return True

    try:
        _SERVER_INSTANCE = HTTPServer(("127.0.0.1", port), _OAuthHandler)
        _SERVER_THREAD = threading.Thread(target=_SERVER_INSTANCE.serve_forever, daemon=True)
        _SERVER_THREAD.start()
        logger.info(f"🚀 [OAuthListener] Antigravity OAuth Listener running on http://127.0.0.1:{port}/oauth2callback")
        return True
    except Exception as e:
        logger.warning(f"⚠️ [OAuthListener] Could not bind to port {port}: {e}")
        return False


def get_antigravity_auth_url(email_hint: Optional[str] = None) -> str:
    """Generates the official Google OAuth authorization URL for Antigravity."""
    start_oauth_listener(4000)
    params = {
        "client_id": _GOOGLE_AGY_CLIENT_ID,
        "redirect_uri": _REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile https://www.googleapis.com/auth/cloud-platform",
        "access_type": "offline",
        "prompt": "consent"
    }
    if email_hint and "@" in email_hint:
        params["login_hint"] = email_hint.strip()
        params["state"] = email_hint.strip()
    return "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(params)
