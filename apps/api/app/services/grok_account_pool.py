"""
xAI Grok Account Pool & Multi-Account Sovereign Auto-Rotation Manager.
Provides 2-Tier Sovereign Management across:
  1. Grok Web Sessions (04_Profiles/grok_sessions/{email}/cookies_grok.json)
  2. xAI Official API Keys (Multi-Key Pool)

Features:
  - Multi-Account Session Vault (04_Profiles/grok_sessions/{email}/)
  - Automatic Discovery across local grok_sessions directory
  - Seamless Account Switching & Rotation
  - Zero Fake Hardcoded Accounts
"""

import os
import sys
import json
import time
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
import threading

logger = logging.getLogger("grok_account_pool")

from app.services.grok_oauth import (
    get_dot_grok_token,
    save_credentials_to_dot_grok,
    refresh_access_token
)

IS_WINDOWS = sys.platform == "win32"
LOCAL_APPDATA = os.environ.get("LOCALAPPDATA", str(Path.home() / "AppData" / "Local"))
SESSIONS_DIR = Path(LOCAL_APPDATA) / "ViraLoop Studio" / "media" / "04_Profiles" / "grok_sessions"
POOL_FILE = Path(LOCAL_APPDATA) / "ViraLoop Studio" / "grok_accounts_pool.json"


def _format_reset_time(seconds: Optional[int]) -> str:
    if not seconds or seconds <= 0:
        return "곧 초기화"
    days = seconds // 86400
    hours = (seconds % 86400) // 3600
    mins = (seconds % 3600) // 60
    if days > 0:
        return f"{days}일 {hours}시간 후 초기화"
    if hours > 0:
        return f"{hours}시간 {mins}분 후 초기화"
    return f"{mins}분 후 초기화"


class GrokAccountPool:
    """Sovereign Manager for Multi-Account xAI Grok Sessions and Rotation."""

    def __init__(self, sessions_dir: Path = SESSIONS_DIR, pool_path: Path = POOL_FILE):
        self.sessions_dir = sessions_dir
        self.pool_path = pool_path
        self.sessions_dir.mkdir(parents=True, exist_ok=True)
        self.pool_path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()
        self._ensure_pool_loaded()

    def _ensure_pool_loaded(self):
        with self._lock:
            if not self.pool_path.exists():
                discovered = self._discover_initial_accounts()
                self._save_pool_unlocked(discovered)

    def _discover_initial_accounts(self) -> List[Dict[str, Any]]:
        accounts = []
        if not self.sessions_dir.exists():
            return accounts

        try:
            for item in self.sessions_dir.iterdir():
                if item.is_dir() and "@" in item.name:
                    email = item.name.lower().strip()
                    has_session = (item / "cookies_grok.json").exists()
                    accounts.append({
                        "account_id": f"grok_{email.split('@')[0]}",
                        "email": email,
                        "name": email.split("@")[0],
                        "plan": "Grok Web",
                        "is_active": len(accounts) == 0,
                        "has_session": has_session,
                        "five_hour_remaining_pct": 100,
                        "weekly_remaining_pct": 100,
                        "reset_5h": "2시간 후 초기화",
                        "reset_weekly": "월요일 09:00 초기화",
                        "cooldown_until": 0,
                        "exhausted_count": 0,
                        "status": "healthy",
                        "created_at": time.time()
                    })
        except Exception as e:
            logger.warning(f"Error discovering initial Grok accounts: {e}")

        return accounts

    def _load_pool_unlocked(self) -> List[Dict[str, Any]]:
        if not self.pool_path.exists():
            return []
        try:
            data = json.loads(self.pool_path.read_text(encoding="utf-8"))
            return data if isinstance(data, list) else data.get("accounts", [])
        except Exception as e:
            logger.warning(f"Error loading grok pool: {e}")
            return []

    def _save_pool_unlocked(self, accounts: List[Dict[str, Any]]):
        try:
            self.pool_path.write_text(json.dumps(accounts, indent=2, ensure_ascii=False), encoding="utf-8")
        except Exception as e:
            logger.error(f"Error saving grok pool: {e}")

    def get_accounts(self) -> List[Dict[str, Any]]:
        with self._lock:
            accounts = self._load_pool_unlocked()
            now = time.time()
            changed = False

            # 🌐 Infinite N-Account Dynamic Discovery from sessions_dir
            if self.sessions_dir.exists():
                for item in self.sessions_dir.iterdir():
                    if item.is_dir() and "@" in item.name:
                        s_email = item.name.lower().strip()
                        if not any(a.get("email", "").lower() == s_email for a in accounts):
                            cookie_f = item / "cookies_grok.json"
                            accounts.append({
                                "account_id": f"grok_{s_email.split('@')[0]}",
                                "email": s_email,
                                "name": s_email.split("@")[0],
                                "plan": "Grok Web",
                                "is_active": len(accounts) == 0,
                                "has_session": cookie_f.exists(),
                                "five_hour_remaining_pct": 100,
                                "weekly_remaining_pct": 100,
                                "reset_5h": "2시간 후 초기화",
                                "reset_weekly": "월요일 09:00 초기화",
                                "cooldown_until": 0,
                                "exhausted_count": 0,
                                "status": "healthy",
                                "created_at": time.time()
                            })
                            changed = True

            # Recover accounts whose cooldown expired and refresh session status
            for acc in accounts:
                cd = acc.get("cooldown_until", 0)
                if cd and now > cd:
                    acc["cooldown_until"] = 0
                    acc["status"] = "healthy"
                    acc["five_hour_remaining_pct"] = 100
                    acc["reset_5h"] = "2시간 후 초기화"
                    changed = True
                elif cd and now <= cd:
                    acc["status"] = "cooling_down"
                    acc["five_hour_remaining_pct"] = 0
                    acc["reset_5h"] = _format_reset_time(int(cd - now))

                acc_email = acc.get("email", "").strip().lower()
                if acc_email:
                    acc_dir = self.sessions_dir / acc_email
                    cookie_exists = (acc_dir / "cookies_grok.json").exists()
                    oauth_exists = (acc_dir / "oauth_token.json").exists()
                    dot_grok = get_dot_grok_token()
                    has_any_auth = cookie_exists or oauth_exists or (dot_grok is not None and acc.get("is_active"))
                    if acc.get("has_session") != has_any_auth:
                        acc["has_session"] = has_any_auth
                        changed = True
                    acc["has_oauth"] = oauth_exists or (dot_grok is not None and acc.get("is_active"))

            if changed:
                self._save_pool_unlocked(accounts)

            return accounts

    def get_active_account(self) -> Optional[Dict[str, Any]]:
        accs = self.get_accounts()
        for a in accs:
            if a.get("is_active"):
                return a
        return accs[0] if accs else None

    def get_config_dir(self, email: str) -> Path:
        dir_path = self.sessions_dir / email.strip().lower()
        dir_path.mkdir(parents=True, exist_ok=True)
        return dir_path

    def add_account(self, email: str, plan: str = "Grok Web", name: Optional[str] = None) -> Dict[str, Any]:
        email = email.strip().lower()
        acc_dir = self.get_config_dir(email)

        with self._lock:
            accounts = self._load_pool_unlocked()
            existing = next((a for a in accounts if a["email"].lower() == email), None)

            if existing:
                existing["plan"] = plan
                if name:
                    existing["name"] = name
                existing["has_session"] = (acc_dir / "cookies_grok.json").exists()
                self._save_pool_unlocked(accounts)
                return existing

            is_first = len(accounts) == 0
            new_acc = {
                "account_id": f"grok_{email.split('@')[0]}",
                "email": email,
                "name": name or email.split("@")[0],
                "plan": plan,
                "is_active": is_first,
                "has_session": (acc_dir / "cookies_grok.json").exists(),
                "five_hour_remaining_pct": 100,
                "weekly_remaining_pct": 100,
                "reset_5h": "2시간 후 초기화",
                "reset_weekly": "월요일 09:00 초기화",
                "cooldown_until": 0,
                "exhausted_count": 0,
                "status": "healthy",
                "created_at": time.time()
            }
            accounts.append(new_acc)
            self._save_pool_unlocked(accounts)
            logger.info(f"✅ [GrokAccountPool] Added new account: {email} ({plan})")
            return new_acc

    def switch_active_account(self, account_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            accounts = self._load_pool_unlocked()
            switched = None
            for a in accounts:
                if a["account_id"] == account_id or a["email"].lower() == account_id.lower():
                    a["is_active"] = True
                    switched = a
                else:
                    a["is_active"] = False

            if switched:
                self._save_pool_unlocked(accounts)
                logger.info(f"🔄 [GrokAccountPool] Switched active account to: {switched['email']}")
            return switched

    def remove_account(self, account_id: str) -> bool:
        with self._lock:
            accounts = self._load_pool_unlocked()
            target = next((a for a in accounts if a["account_id"] == account_id or a["email"].lower() == account_id.lower()), None)
            if not target:
                return False

            accounts = [a for a in accounts if a["account_id"] != target["account_id"]]
            if target.get("is_active") and accounts:
                accounts[0]["is_active"] = True

            self._save_pool_unlocked(accounts)

            # Clean session dir
            target_dir = self.sessions_dir / target["email"]
            if target_dir.exists():
                try:
                    import shutil
                    shutil.rmtree(target_dir, ignore_errors=True)
                except Exception:
                    pass

            logger.info(f"🗑️ [GrokAccountPool] Removed account: {target['email']}")
            return True

    def mark_exhausted(self, account_id: str, cooldown_seconds: int = 7200) -> Optional[Dict[str, Any]]:
        with self._lock:
            accounts = self._load_pool_unlocked()
            now = time.time()
            exhausted_acc = None

            for a in accounts:
                if a["account_id"] == account_id or a["email"].lower() == account_id.lower():
                    a["cooldown_until"] = now + cooldown_seconds
                    a["status"] = "cooling_down"
                    a["five_hour_remaining_pct"] = 0
                    a["exhausted_count"] = a.get("exhausted_count", 0) + 1
                    a["reset_5h"] = _format_reset_time(cooldown_seconds)
                    exhausted_acc = a
                    break

            if not exhausted_acc:
                return None

            candidates = [a for a in accounts if a["status"] == "healthy" and a["account_id"] != exhausted_acc["account_id"]]
            if candidates:
                next_acc = candidates[0]
                for a in accounts:
                    a["is_active"] = (a["account_id"] == next_acc["account_id"])
                self._save_pool_unlocked(accounts)
                logger.warning(
                    f"⚠️ [GrokAccountPool] {exhausted_acc['email']} 쿼터 소진 (쿨다운 {cooldown_seconds}s) "
                    f"-> 다음 가용 계정 {next_acc['email']} (으)로 자동 절체 완료"
                )
                return next_acc
            else:
                self._save_pool_unlocked(accounts)
                logger.error(f"❌ [GrokAccountPool] All Grok accounts exhausted in pool!")
                return None

    def get_healthy_web_sessions(self) -> List[Dict[str, Any]]:
        """Return all healthy accounts with valid cookies_grok.json."""
        with self._lock:
            accounts = self._load_pool_unlocked()
            now = time.time()
            healthy = []
            for a in accounts:
                cd = a.get("cooldown_until", 0)
                if cd and now < cd:
                    continue
                acc_dir = self.sessions_dir / a["email"].strip().lower()
                cookie_f = acc_dir / "cookies_grok.json"
                if cookie_f.exists():
                    try:
                        data = json.loads(cookie_f.read_text(encoding="utf-8"))
                        cookies = data.get("cookies", [])
                        has_auth = any(c.get("name") in ["sso", "sso-rw"] for c in cookies)
                        if has_auth:
                            healthy.append({
                                "account_id": a.get("account_id"),
                                "email": a.get("email"),
                                "cookies_path": str(cookie_f),
                                "is_active": a.get("is_active", False)
                            })
                    except Exception:
                        pass
            healthy.sort(key=lambda x: 0 if x.get("is_active") else 1)
            return healthy


    def save_oauth_session(self, email: str, tokens: Dict[str, Any], plan: str = "Grok Free OAuth") -> Dict[str, Any]:
        """Save captured OAuth credentials and sync to ~/.grok/auth.json."""
        email = email.strip().lower()
        acc_dir = self.get_config_dir(email)
        token_path = acc_dir / "oauth_token.json"

        expires_in = tokens.get("expires_in", 604800)
        token_data = {
            "email": email,
            "access_token": tokens.get("access_token"),
            "refresh_token": tokens.get("refresh_token"),
            "expires_in": expires_in,
            "expires_at": int(time.time()) + expires_in,
            "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }
        token_path.write_text(json.dumps(token_data, indent=2, ensure_ascii=False), encoding="utf-8")

        # Also sync to ~/.grok/auth.json for official CLI interoperability
        save_credentials_to_dot_grok(
            access_token=tokens.get("access_token", ""),
            refresh_token=tokens.get("refresh_token"),
            expires_in=expires_in
        )

        acc = self.add_account(email, plan=plan)
        with self._lock:
            accounts = self._load_pool_unlocked()
            for a in accounts:
                if a["email"].lower() == email:
                    a["has_session"] = True
                    a["has_oauth"] = True
                    a["status"] = "healthy"
                    a["plan"] = plan
            self._save_pool_unlocked(accounts)
        logger.info(f"✅ [GrokAccountPool] Saved OAuth session for {email}")
        return acc

    def get_active_oauth_token(self) -> Optional[str]:
        """Get valid access_token for active account or fallback to ~/.grok/auth.json."""
        active = self.get_active_account()
        now = int(time.time())

        # 1. Check active account's directory
        if active:
            acc_dir = self.get_config_dir(active.get("email", ""))
            token_path = acc_dir / "oauth_token.json"
            if token_path.exists():
                try:
                    data = json.loads(token_path.read_text(encoding="utf-8"))
                    access_token = data.get("access_token")
                    refresh_tok = data.get("refresh_token")
                    expires_at = data.get("expires_at", 0)

                    # If valid, return
                    if access_token and (expires_at - now > 300):
                        return access_token

                    # If expiring or expired, refresh!
                    if refresh_tok:
                        new_tokens = refresh_access_token(refresh_tok)
                        if new_tokens and new_tokens.get("access_token"):
                            self.save_oauth_session(active["email"], new_tokens)
                            return new_tokens["access_token"]
                except Exception as e:
                    logger.warning(f"Error reading account oauth token: {e}")

        # 2. Check ~/.grok/auth.json ONLY IF it belongs to the active account
        dot_tok = get_dot_grok_token()
        if dot_tok:
            dot_email = str(dot_tok.get("email") or "").strip().lower()
            active_email = str(active.get("email") or "").strip().lower() if active else ""
            if not active_email or not dot_email or dot_email == active_email:
                access_token = dot_tok.get("access_token")
                refresh_tok = dot_tok.get("refresh_token")
                expires_at = dot_tok.get("expires_at", 0)
                if access_token and (expires_at - now > 300 or expires_at == 0):
                    return access_token
                if refresh_tok:
                    new_tokens = refresh_access_token(refresh_tok)
                    if new_tokens and new_tokens.get("access_token"):
                        save_credentials_to_dot_grok(
                            access_token=new_tokens["access_token"],
                            refresh_token=new_tokens.get("refresh_token", refresh_tok),
                            expires_in=new_tokens.get("expires_in", 604800)
                        )
                        return new_tokens["access_token"]

        return None


# Global Singleton Instance
grok_account_pool = GrokAccountPool()

