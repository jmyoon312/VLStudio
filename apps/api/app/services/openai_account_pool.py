"""
OpenAI & ChatGPT Account Pool & Multi-Quota Sovereign Auto-Rotation Manager.
Provides 3-Tier Quota Expansion across:
  1. OpenAI Codex Astra / GPT-6 Astra (OAuth Direct Stream)
  2. ChatGPT Web Session (Web Cookies & Free/Plus Quota Expansion)
  3. OpenAI Official API Keys (Multi-Key Pool)

Features:
  - Multi-Account Session Vault (04_Profiles/openai_sessions/{email}/auth.json & cookies_chatgpt.json)
  - Automatic Discovery across Pixeling codex-home, ~/.codex, and session vault
  - Automatic Failover on 5-Hour / Quota Exhaustion (HTTP 429 / limit_reached)
  - Seamless OAuth Token Refresh (auth.openai.com/oauth/token)
  - Free & Plus/Pro Multi-Tier Role Classification
  - Real-time 5h/Weekly Quota Monitoring (chatgpt.com/backend-api/wham/usage)
"""

import os
import json
import time
import logging
import urllib.request
import urllib.error
import urllib.parse
from pathlib import Path
import sys
import base64
from typing import Dict, Any, List, Optional, Tuple
import threading

logger = logging.getLogger("openai_account_pool")

IS_WINDOWS = sys.platform == "win32"
LOCAL_APPDATA = os.environ.get("LOCALAPPDATA", str(Path.home() / "AppData" / "Local"))
SESSIONS_DIR = Path(LOCAL_APPDATA) / "ViraLoop Studio" / "media" / "04_Profiles" / "openai_sessions"
POOL_FILE = Path(LOCAL_APPDATA) / "ViraLoop Studio" / "openai_accounts_pool.json"

PIX_CODEX_DIR = Path(LOCAL_APPDATA) / "Programs" / "Pixeling" / "state" / "codex-home"
HOME_CODEX_DIR = Path.home() / ".codex"

# Official OpenAI Desktop / Codex Client ID
_OPENAI_CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann"

_LIVE_USAGE_CACHE: Dict[str, Tuple[float, Dict[str, Any]]] = {}


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


class OpenAIAccountPool:
    """Sovereign Manager for Multi-Account OpenAI Codex and ChatGPT Web Sessions."""

    def __init__(self, sessions_dir: Path = SESSIONS_DIR, pool_path: Path = POOL_FILE):
        self.sessions_dir = sessions_dir
        self.pool_path = pool_path
        self.sessions_dir.mkdir(parents=True, exist_ok=True)
        self.pool_path.parent.mkdir(parents=True, exist_ok=True)
        self._ensure_pool_loaded()

    def _ensure_pool_loaded(self):
        if not self.pool_path.exists():
            discovered = self._discover_initial_accounts()
            self._save_pool(discovered)

    def _extract_claims_from_token(self, token: str) -> Dict[str, Any]:
        try:
            if token and "." in token:
                part = token.split(".")[1]
                padded = part + "=" * ((4 - len(part) % 4) % 4)
                return json.loads(base64.urlsafe_b64decode(padded.encode()).decode("utf-8", errors="ignore"))
        except Exception:
            pass
        return {}

    def _discover_initial_accounts(self) -> List[Dict[str, Any]]:
        accounts = []
        seeded_emails = set()

        # 1. Seed from Pixeling state/codex-home/auth.json
        pix_auth = PIX_CODEX_DIR / "auth.json"
        if pix_auth.exists():
            try:
                data = json.loads(pix_auth.read_text(encoding="utf-8"))
                toks = data.get("tokens", {})
                acc_tok = toks.get("access_token")
                claims = self._extract_claims_from_token(toks.get("id_token") or acc_tok)
                email = claims.get("email") or "lfrr.50@coconut.beer"
                auth_claim = claims.get("https://api.openai.com/auth", {})
                plan = auth_claim.get("chatgpt_plan_type", "plus").capitalize()

                dest_dir = self.sessions_dir / email
                dest_dir.mkdir(parents=True, exist_ok=True)
                dest_auth = dest_dir / "auth.json"
                if not dest_auth.exists():
                    dest_auth.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")

                accounts.append({
                    "account_id": toks.get("account_id") or f"acc_{email.split('@')[0]}",
                    "email": email,
                    "name": claims.get("name") or email.split("@")[0],
                    "plan": plan,
                    "engine_type": "codex",
                    "is_active": True,
                    "has_auth": True,
                    "has_cookies": (dest_dir / "cookies_chatgpt.json").exists(),
                    "five_hour_remaining_pct": 100,
                    "weekly_remaining_pct": 100,
                    "cooldown_until": 0,
                    "exhausted_count": 0,
                    "created_at": time.time()
                })
                seeded_emails.add(email.lower())
            except Exception as e:
                logger.warning(f"Error seeding initial OpenAI account from Pixeling: {e}")

        # 2. Seed from ~/.codex/auth.json if different
        home_auth = HOME_CODEX_DIR / "auth.json"
        if home_auth.exists():
            try:
                data = json.loads(home_auth.read_text(encoding="utf-8"))
                toks = data.get("tokens", {})
                acc_tok = toks.get("access_token")
                claims = self._extract_claims_from_token(toks.get("id_token") or acc_tok)
                email = claims.get("email")
                if email and email.lower() not in seeded_emails:
                    auth_claim = claims.get("https://api.openai.com/auth", {})
                    plan = auth_claim.get("chatgpt_plan_type", "plus").capitalize()
                    dest_dir = self.sessions_dir / email
                    dest_dir.mkdir(parents=True, exist_ok=True)
                    (dest_dir / "auth.json").write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
                    accounts.append({
                        "account_id": toks.get("account_id") or f"acc_{email.split('@')[0]}",
                        "email": email,
                        "name": claims.get("name") or email.split("@")[0],
                        "plan": plan,
                        "engine_type": "codex",
                        "is_active": len(accounts) == 0,
                        "has_auth": True,
                        "has_cookies": (dest_dir / "cookies_chatgpt.json").exists(),
                        "five_hour_remaining_pct": 100,
                        "weekly_remaining_pct": 100,
                        "cooldown_until": 0,
                        "exhausted_count": 0,
                        "created_at": time.time()
                    })
                    seeded_emails.add(email.lower())
            except Exception:
                pass

        return accounts

    def _sync_and_discover_accounts(self, accounts: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Dynamically discovers and synchronizes any newly added OpenAI accounts across:
        1. 04_Profiles/openai_sessions/*
        2. Pixeling codex-home/auth.json
        3. ~/.codex/auth.json
        Scales to N accounts (Plus, Pro, Free) without manual config.
        """
        dirty = False
        known_emails = {str(a.get("email", "")).lower(): a for a in accounts if a.get("email")}

        if self.sessions_dir.exists():
            for p in self.sessions_dir.iterdir():
                if p.is_dir() and "@" in p.name:
                    em = p.name.strip().lower()
                    auth_f = p / "auth.json"
                    cookie_f = p / "cookies_chatgpt.json"
                    if em not in known_emails:
                        plan = "Plus"
                        acc_id = f"acc_{p.name.split('@')[0]}"
                        if auth_f.exists():
                            try:
                                d = json.loads(auth_f.read_text(encoding="utf-8"))
                                toks = d.get("tokens", {})
                                claims = self._extract_claims_from_token(toks.get("id_token") or toks.get("access_token"))
                                auth_claim = claims.get("https://api.openai.com/auth", {})
                                plan = auth_claim.get("chatgpt_plan_type", "plus").capitalize()
                                acc_id = toks.get("account_id") or acc_id
                            except Exception:
                                pass

                        new_acc = {
                            "account_id": acc_id,
                            "email": p.name.strip(),
                            "name": p.name.split("@")[0],
                            "plan": plan,
                            "engine_type": "codex",
                            "is_active": len(accounts) == 0,
                            "has_auth": auth_f.exists(),
                            "has_cookies": cookie_f.exists(),
                            "five_hour_remaining_pct": 100,
                            "weekly_remaining_pct": 100,
                            "cooldown_until": 0,
                            "exhausted_count": 0,
                            "created_at": time.time()
                        }
                        accounts.append(new_acc)
                        known_emails[em] = new_acc
                        dirty = True
                        logger.info(f"✨ [OpenAIAccountPool] 신규 계정 자동 감지 및 풀 등록: {p.name} ({plan})")

        # Update flags for existing accounts
        for a in accounts:
            em = a.get("email")
            if em:
                auth_f = self.sessions_dir / em / "auth.json"
                cookie_f = self.sessions_dir / em / "cookies_chatgpt.json"
                has_auth = auth_f.exists()
                has_cookie = cookie_f.exists()
                if a.get("has_auth") != has_auth or a.get("has_cookies") != has_cookie:
                    a["has_auth"] = has_auth
                    a["has_cookies"] = has_cookie
                    dirty = True

        if dirty:
            self._save_pool(accounts)

        return accounts

    def _load_pool(self) -> List[Dict[str, Any]]:
        accounts = []
        try:
            if self.pool_path.exists():
                accounts = json.loads(self.pool_path.read_text(encoding="utf-8"))
        except Exception as e:
            logger.error(f"Failed to load openai pool from {self.pool_path}: {e}")

        if not accounts:
            accounts = self._discover_initial_accounts()

        return self._sync_and_discover_accounts(accounts)

    def _save_pool(self, accounts: List[Dict[str, Any]]):
        try:
            self.pool_path.write_text(json.dumps(accounts, indent=2, ensure_ascii=False), encoding="utf-8")
        except Exception as e:
            logger.error(f"Failed to save openai pool to {self.pool_path}: {e}")

    def fetch_live_usage(self, access_token: str) -> Optional[Dict[str, Any]]:
        """Fetches real-time rate limit usage directly from official ChatGPT wham/usage API."""
        if not access_token:
            return None
        try:
            req = urllib.request.Request(
                "https://chatgpt.com/backend-api/wham/usage",
                headers={"Authorization": f"Bearer {access_token}", "User-Agent": "codex-cli/0.155.0"}
            )
            with urllib.request.urlopen(req, timeout=4.0) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read().decode("utf-8"))
                    rl = data.get("rate_limit", {})
                    pw = rl.get("primary_window", {}) or {}
                    sw = rl.get("secondary_window", {}) or {}

                    w5h_used = pw.get("used_percent", 0)
                    w5h_remain = max(0, 100 - w5h_used)
                    w5h_reset = _format_reset_time(pw.get("reset_after_seconds"))

                    wwk_used = sw.get("used_percent", 0)
                    wwk_remain = max(0, 100 - wwk_used)
                    wwk_reset = _format_reset_time(sw.get("reset_after_seconds"))

                    allowed = rl.get("allowed", True)
                    limit_reached = rl.get("limit_reached", False)

                    return {
                        "allowed": allowed,
                        "limit_reached": limit_reached,
                        "plan_type": data.get("plan_type", "plus"),
                        "window_5h": {
                            "used_pct": w5h_used,
                            "remain_pct": w5h_remain,
                            "reset_in": w5h_reset
                        },
                        "window_weekly": {
                            "used_pct": wwk_used,
                            "remain_pct": wwk_remain,
                            "reset_in": wwk_reset
                        }
                    }
        except Exception as e:
            logger.debug(f"Failed to fetch live ChatGPT wham/usage: {e}")
        return None

    def get_valid_token(self, email: str) -> Optional[str]:
        """
        Returns a valid access token for the requested email.
        Automatically refreshes token via auth.openai.com/oauth/token if expired or close to expiry.
        """
        acc_dir = self.sessions_dir / email
        auth_f = acc_dir / "auth.json"

        # Fallback to Pixeling if email matches
        if not auth_f.exists() and (PIX_CODEX_DIR / "auth.json").exists():
            auth_f = PIX_CODEX_DIR / "auth.json"

        if not auth_f.exists():
            return None

        try:
            d = json.loads(auth_f.read_text(encoding="utf-8"))
            toks = d.get("tokens", {})
            acc_tok = toks.get("access_token")
            ref_tok = toks.get("refresh_token")

            # Check expiry from JWT claims
            if acc_tok:
                claims = self._extract_claims_from_token(acc_tok)
                exp = claims.get("exp", 0)
                now = time.time()
                # If valid for more than 120 seconds, return immediately
                if exp and (exp - now > 120):
                    return acc_tok

            # Refresh token if expired or about to expire
            if ref_tok:
                try:
                    post_data = urllib.parse.urlencode({
                        "grant_type": "refresh_token",
                        "refresh_token": ref_tok,
                        "client_id": _OPENAI_CLIENT_ID
                    }).encode("utf-8")
                    req = urllib.request.Request(
                        "https://auth.openai.com/oauth/token",
                        data=post_data,
                        headers={"Content-Type": "application/x-www-form-urlencoded", "User-Agent": "codex-cli/0.155.0"},
                        method="POST"
                    )
                    with urllib.request.urlopen(req, timeout=6) as resp:
                        if resp.status == 200:
                            new_data = json.loads(resp.read().decode("utf-8"))
                            new_acc = new_data.get("access_token")
                            new_ref = new_data.get("refresh_token") or ref_tok
                            if new_acc:
                                toks["access_token"] = new_acc
                                toks["refresh_token"] = new_ref
                                d["tokens"] = toks
                                d["last_refresh"] = time.time()
                                auth_f.write_text(json.dumps(d, indent=2, ensure_ascii=False), encoding="utf-8")
                                logger.info(f"🔄 [OpenAIAccountPool] {email} OAuth 토큰 자동 갱신 성공")
                                return new_acc
                except Exception as re:
                    logger.debug(f"OpenAI token refresh failed for {email}: {re}")

            return acc_tok
        except Exception as e:
            logger.error(f"Error reading OpenAI token for {email}: {e}")
            return None

    def get_accounts(self) -> List[Dict[str, Any]]:
        """Returns all registered OpenAI accounts with updated quotas and status."""
        now = time.time()
        accounts = self._load_pool()

        for a in accounts:
            email = a.get("email", "")
            cd = a.get("cooldown_until", 0)
            if cd > 0 and now >= cd:
                a["cooldown_until"] = 0
                a["status"] = "healthy"
            elif cd > 0:
                a["status"] = "cooldown"
            else:
                a["status"] = "healthy"

            # Check usage cache
            cached = _LIVE_USAGE_CACHE.get(email)
            if cached and (now - cached[0] < 300.0):
                lq = cached[1]
                a["five_hour_remaining_pct"] = lq.get("window_5h", {}).get("remain_pct", 100)
                a["weekly_remaining_pct"] = lq.get("window_weekly", {}).get("remain_pct", 100)
                a["reset_5h"] = lq.get("window_5h", {}).get("reset_in", "한도 가용")
                a["reset_weekly"] = lq.get("window_weekly", {}).get("reset_in", "한도 가용")
            else:
                # Background prefetch
                tok = self.get_valid_token(email)
                if tok:
                    def _fetch_bg(em=email, t=tok):
                        u = self.fetch_live_usage(t)
                        if u:
                            _LIVE_USAGE_CACHE[em] = (time.time(), u)
                    threading.Thread(target=_fetch_bg, daemon=True).start()

        return accounts

    def iter_healthy_sessions(self, min_plan: str = "free"):
        """
        Yields healthy OpenAI sessions on demand one by one.
        Eliminates upfront multi-account token refresh latency.
        """
        now = time.time()
        accounts = self._load_pool()

        plan_rank = {"pro": 0, "plus": 1, "free": 2, "developer": 3}
        sorted_accs = sorted(
            accounts,
            key=lambda a: (
                0 if a.get("is_active") else 1,
                1 if a.get("cooldown_until", 0) > now else 0,
                plan_rank.get(str(a.get("plan", "free")).lower(), 2),
                a.get("exhausted_count", 0)
            )
        )

        for a in sorted_accs:
            email = a.get("email")
            if not email:
                continue
            if a.get("cooldown_until", 0) > now:
                continue

            a_plan = str(a.get("plan", "free")).lower()
            if min_plan == "plus" and a_plan not in ["plus", "pro", "team"]:
                continue

            tok = self.get_valid_token(email)
            if tok:
                acc_dir = self.sessions_dir / email
                yield {
                    "email": email,
                    "access_token": tok,
                    "account_id": a.get("account_id"),
                    "plan": a.get("plan", "Plus"),
                    "is_active": a.get("is_active", False),
                    "account_dir": str(acc_dir) if acc_dir.exists() else str(PIX_CODEX_DIR),
                    "account": a
                }

    def get_healthy_sessions(self, min_plan: str = "free", limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Returns list of healthy OpenAI sessions with valid tokens and active status.
        Prioritizes Plus/Pro accounts if requested, followed by Free accounts.
        Excludes accounts on cooldown.
        """
        sessions = []
        for sess in self.iter_healthy_sessions(min_plan=min_plan):
            sessions.append(sess)
            if limit and len(sessions) >= limit:
                break
        return sessions

    def get_healthy_chatgpt_web_sessions(self) -> List[Dict[str, Any]]:
        """Returns accounts with valid cookies_chatgpt.json for web-based quota expansion."""
        now = time.time()
        accounts = self._load_pool()
        sessions = []

        for a in accounts:
            email = a.get("email")
            if not email:
                continue
            if a.get("web_cooldown_until", 0) > now:
                continue

            cookie_f = self.sessions_dir / email / "cookies_chatgpt.json"
            if cookie_f.exists():
                try:
                    c_data = json.loads(cookie_f.read_text(encoding="utf-8"))
                    sessions.append({
                        "email": email,
                        "cookie_file": str(cookie_f),
                        "plan": a.get("plan", "Plus"),
                        "is_active": a.get("is_active", False),
                        "account": a
                    })
                except Exception:
                    pass

        return sessions

    def report_exhaustion(self, email: str, cooldown_seconds: int = 180):
        """Marks account on cooldown when 429/Rate Limit occurs and auto-rotates."""
        now = time.time()
        accounts = self._load_pool()
        for a in accounts:
            if a.get("email") == email:
                a["cooldown_until"] = now + cooldown_seconds
                a["exhausted_count"] = a.get("exhausted_count", 0) + 1
                logger.warning(f"⚠️ [OpenAIAccountPool] {email} 5시간 쿼터 한도 도달 -> {cooldown_seconds}초 쿨다운 적용")
        self._save_pool(accounts)

    def switch_active_account(self, email: str) -> bool:
        """Sets the specified email as active and others as inactive."""
        accounts = self._load_pool()
        found = False
        for a in accounts:
            is_target = (a.get("email", "").lower() == email.lower() or a.get("account_id") == email)
            a["is_active"] = is_target
            if is_target:
                found = True
        if found:
            self._save_pool(accounts)
            logger.info(f"🔄 [OpenAIAccountPool] 활성 계정 변경: {email}")
        return found

    def add_account(self, email: str, plan: str = "Plus", auth_data: Dict[str, Any] = None) -> Dict[str, Any]:
        """Registers a new OpenAI account in the pool."""
        accounts = self._load_pool()
        for a in accounts:
            if a["email"].lower() == email.lower():
                a["plan"] = plan
                self._save_pool(accounts)
                return a

        acc_dir = self.sessions_dir / email
        acc_dir.mkdir(parents=True, exist_ok=True)
        if auth_data:
            (acc_dir / "auth.json").write_text(json.dumps(auth_data, indent=2, ensure_ascii=False), encoding="utf-8")

        new_acc = {
            "account_id": f"acc_{email.split('@')[0]}",
            "email": email,
            "name": email.split("@")[0],
            "plan": plan,
            "engine_type": "codex",
            "is_active": len(accounts) == 0,
            "has_auth": (acc_dir / "auth.json").exists(),
            "has_cookies": (acc_dir / "cookies_chatgpt.json").exists(),
            "five_hour_remaining_pct": 100,
            "weekly_remaining_pct": 100,
            "cooldown_until": 0,
            "exhausted_count": 0,
            "created_at": time.time()
        }
        accounts.append(new_acc)
        self._save_pool(accounts)
        logger.info(f"✨ [OpenAIAccountPool] 신규 계정 등록 완료: {email} ({plan})")
        return new_acc

    def remove_account(self, email: str) -> bool:
        """Removes an account from the pool."""
        accounts = self._load_pool()
        init_len = len(accounts)
        accounts = [a for a in accounts if a.get("email", "").lower() != email.lower() and a.get("account_id") != email]
        if len(accounts) < init_len:
            if accounts and not any(a.get("is_active") for a in accounts):
                accounts[0]["is_active"] = True
            self._save_pool(accounts)
            logger.info(f"🗑️ [OpenAIAccountPool] 계정 삭제 완료: {email}")
            return True
        return False


# Singleton Instance
openai_account_pool = OpenAIAccountPool()
