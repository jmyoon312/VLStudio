"""
DeepSeek Account Pool & Multi-Account Sovereign Auto-Rotation Manager.
Provides 2-Tier Sovereign Management across:
  1. DeepSeek Web Sessions (04_Profiles/deepseek_sessions/{email}/cookies_deepseek.json)
  2. DeepSeek Official API Keys (Multi-Key Pool)

Features:
  - Multi-Account Session Vault (04_Profiles/deepseek_sessions/{email}/)
  - Automatic Discovery across local deepseek_sessions directory
  - Seamless Account Switching & Failover Rotation
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

logger = logging.getLogger("deepseek_account_pool")

IS_WINDOWS = sys.platform == "win32"
LOCAL_APPDATA = os.environ.get("LOCALAPPDATA", str(Path.home() / "AppData" / "Local"))
SESSIONS_DIR = Path(LOCAL_APPDATA) / "ViraLoop Studio" / "media" / "04_Profiles" / "deepseek_sessions"
POOL_FILE = Path(LOCAL_APPDATA) / "ViraLoop Studio" / "deepseek_accounts_pool.json"


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


def _is_valid_deepseek_session(acc_dir: Path) -> bool:
    """Verifies that an account directory contains a genuine, non-dummy userToken or cookie."""
    if not acc_dir.exists() or not acc_dir.is_dir():
        return False

    token_f = acc_dir / "session_token.json"
    if token_f.exists():
        try:
            d = json.loads(token_f.read_text(encoding="utf-8"))
            tok = d.get("token")
            if isinstance(tok, str) and len(tok) > 20 and "null" not in tok and "{" not in tok:
                return True
        except Exception:
            pass

    cookie_f = acc_dir / "cookies_deepseek.json"
    if cookie_f.exists():
        try:
            d = json.loads(cookie_f.read_text(encoding="utf-8"))
            tok = d.get("userToken")
            if isinstance(tok, str) and len(tok) > 20 and "null" not in tok and "{" not in tok:
                return True
            cookies = d.get("cookies", [])
            for c in cookies:
                c_name = str(c.get("name", ""))
                c_val = str(c.get("value", ""))
                if c_name in ["userToken", "ds_token", "auth_token"] and len(c_val) > 20 and "null" not in c_val:
                    return True
        except Exception:
            pass

    return False


class DeepSeekAccountPool:
    """Sovereign Manager for Multi-Account DeepSeek Web Sessions and Rotation."""

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

        for item in self.sessions_dir.iterdir():
            if item.is_dir() and "@" in item.name:
                email = item.name.lower().strip()
                has_auth = _is_valid_deepseek_session(item)

                accounts.append({
                    "account_id": f"deepseek_{email.split('@')[0]}",
                    "email": email,
                    "name": email.split("@")[0],
                    "plan": "DeepSeek Web",
                    "is_active": len(accounts) == 0,
                    "has_session": has_auth,
                    "daily_remaining_pct": 100,
                    "weekly_remaining_pct": 100,
                    "reset_daily": "매일 자정 초기화",
                    "reset_weekly": "월요일 09:00 초기화",
                    "cooldown_until": 0,
                    "exhausted_count": 0,
                    "status": "healthy",
                    "created_at": time.time()
                })
        return accounts

    def _load_pool_unlocked(self) -> List[Dict[str, Any]]:
        if not self.pool_path.exists():
            return []
        try:
            data = json.loads(self.pool_path.read_text(encoding="utf-8"))
            return data if isinstance(data, list) else data.get("accounts", [])
        except Exception as e:
            logger.warning(f"Error loading deepseek pool: {e}")
            return []

    def _save_pool_unlocked(self, accounts: List[Dict[str, Any]]):
        try:
            self.pool_path.write_text(json.dumps(accounts, indent=2, ensure_ascii=False), encoding="utf-8")
        except Exception as e:
            logger.error(f"Error saving deepseek pool: {e}")

    def get_accounts(self) -> List[Dict[str, Any]]:
        with self._lock:
            accounts = self._load_pool_unlocked()
            now = time.time()
            changed = False

            # Infinite N-Account Dynamic Discovery from sessions_dir
            if self.sessions_dir.exists():
                for item in self.sessions_dir.iterdir():
                    if item.is_dir() and "@" in item.name:
                        s_email = item.name.lower().strip()
                        if not any(a.get("email", "").lower() == s_email for a in accounts):
                            has_auth = _is_valid_deepseek_session(item)
                            accounts.append({
                                "account_id": f"deepseek_{s_email.split('@')[0]}",
                                "email": s_email,
                                "name": s_email.split("@")[0],
                                "plan": "DeepSeek Web",
                                "is_active": len(accounts) == 0,
                                "has_session": has_auth,
                                "daily_remaining_pct": 100,
                                "weekly_remaining_pct": 100,
                                "reset_daily": "매일 자정 초기화",
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
                    acc["daily_remaining_pct"] = 100
                    acc["reset_daily"] = "매일 자정 초기화"
                    changed = True
                elif cd and now <= cd:
                    acc["status"] = "cooling_down"
                    acc["daily_remaining_pct"] = 0
                    acc["reset_daily"] = _format_reset_time(int(cd - now))

                acc_email = acc.get("email", "").strip().lower()
                if acc_email:
                    acc_dir = self.sessions_dir / acc_email
                    has_auth = _is_valid_deepseek_session(acc_dir)
                    if acc.get("has_session") != has_auth:
                        acc["has_session"] = has_auth
                        changed = True

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

    def add_account(self, email: str, plan: str = "DeepSeek Web", name: Optional[str] = None) -> Dict[str, Any]:
        email = email.strip().lower()
        acc_dir = self.get_config_dir(email)

        with self._lock:
            accounts = self._load_pool_unlocked()
            existing = next((a for a in accounts if a["email"].lower() == email), None)

            if existing:
                existing["plan"] = plan
                if name:
                    existing["name"] = name
                existing["has_session"] = (acc_dir / "cookies_deepseek.json").exists() or (acc_dir / "session_token.json").exists()
                self._save_pool_unlocked(accounts)
                return existing

            is_first = len(accounts) == 0
            new_acc = {
                "account_id": f"deepseek_{email.split('@')[0]}",
                "email": email,
                "name": name or email.split("@")[0],
                "plan": plan,
                "is_active": is_first,
                "has_session": (acc_dir / "cookies_deepseek.json").exists() or (acc_dir / "session_token.json").exists(),
                "daily_remaining_pct": 100,
                "weekly_remaining_pct": 100,
                "reset_daily": "매일 자정 초기화",
                "reset_weekly": "월요일 09:00 초기화",
                "cooldown_until": 0,
                "exhausted_count": 0,
                "status": "healthy",
                "created_at": time.time()
            }
            accounts.append(new_acc)
            self._save_pool_unlocked(accounts)
            logger.info(f"✅ [DeepSeekAccountPool] Added new account: {email} ({plan})")
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
                logger.info(f"🔄 [DeepSeekAccountPool] Switched active account to: {switched['email']}")
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

            logger.info(f"🗑️ [DeepSeekAccountPool] Removed account: {target['email']}")
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
                    a["daily_remaining_pct"] = 0
                    a["exhausted_count"] = a.get("exhausted_count", 0) + 1
                    a["reset_daily"] = _format_reset_time(cooldown_seconds)
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
                    f"⚠️ [DeepSeekAccountPool] {exhausted_acc['email']} 쿼터 소진 (쿨다운 {cooldown_seconds}s) "
                    f"-> 다음 가용 계정 {next_acc['email']} (으)로 자동 절체 완료"
                )
                return next_acc
            else:
                self._save_pool_unlocked(accounts)
                logger.error(f"❌ [DeepSeekAccountPool] All DeepSeek accounts exhausted in pool!")
                return None

    def get_healthy_web_sessions(self) -> List[Dict[str, Any]]:
        """Return all healthy accounts with valid cookies_deepseek.json or session_token.json."""
        with self._lock:
            accounts = self._load_pool_unlocked()
            now = time.time()
            healthy = []
            for a in accounts:
                cd = a.get("cooldown_until", 0)
                if cd and now < cd:
                    continue
                acc_dir = self.sessions_dir / a["email"].strip().lower()
                cookie_f = acc_dir / "cookies_deepseek.json"
                token_f = acc_dir / "session_token.json"
                if cookie_f.exists() or token_f.exists():
                    healthy.append({
                        "account_id": a.get("account_id"),
                        "email": a.get("email"),
                        "cookies_path": str(cookie_f) if cookie_f.exists() else None,
                        "token_path": str(token_f) if token_f.exists() else None,
                        "is_active": a.get("is_active", False)
                    })
            healthy.sort(key=lambda x: 0 if x.get("is_active") else 1)
            return healthy

    def save_web_session(self, email: str, session_data: Dict[str, Any]) -> Dict[str, Any]:
        """Saves captured cookies or userToken from Electron login."""
        email = email.strip().lower()
        acc_dir = self.get_config_dir(email)
        cookie_path = acc_dir / "cookies_deepseek.json"
        token_path = acc_dir / "session_token.json"

        cookies = session_data.get("cookies", [])
        user_token = session_data.get("userToken") or session_data.get("token")

        if cookies:
            cookie_path.write_text(json.dumps({
                "email": email,
                "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "cookie_count": len(cookies),
                "cookies": cookies
            }, indent=2, ensure_ascii=False), encoding="utf-8")

        if user_token:
            token_path.write_text(json.dumps({
                "email": email,
                "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "token": user_token
            }, indent=2, ensure_ascii=False), encoding="utf-8")

        return self.add_account(email, plan="DeepSeek Web")


deepseek_account_pool = DeepSeekAccountPool()
