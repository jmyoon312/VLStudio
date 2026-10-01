"""
Model Cooldown & Credential Health Manager.
===========================================
Ported & adapted from Nous Research Hermes Agent v0.21.5:
- credential_pool_model_cooldowns.py

Provides zero-downtime multi-provider resilience for:
1. HTTP 429 RateLimit (TPM / RPM quota exhaustion)
2. HTTP 403 Forbidden / Temporary Quota Lockdown
3. HTTP 503 / 504 Provider Outages
Automatically applies exponential backoff cooldowns and routes to healthy accounts or fallback models.
"""

import time
import logging
import threading
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger("model_cooldown_manager")

class ModelCooldownManager:
    """
    Thread-safe Cooldown & Health Pool tracking for LLM providers, models, and accounts.
    Eliminates hardcoded model strings by dynamically resolving candidates from DB Settings.
    """

    def __init__(self):
        self._lock = threading.Lock()
        # key: "{provider}:{model}" or "{provider}:{model}:{account_id}"
        # value: {"cooldown_until": float, "consecutive_errors": int, "last_error": str, "error_code": int}
        self._cooldowns: Dict[str, Dict[str, Any]] = {}
        self._dynamic_ladders: Dict[str, Dict[str, str]] = {}

    def register_fallback(self, provider: str, primary_model: str, fallback_model: str):
        """Registers a dynamic fallback mapping at runtime."""
        with self._lock:
            prov = (provider or "").strip().lower()
            ladder = self._dynamic_ladders.setdefault(prov, {})
            ladder[primary_model.strip()] = fallback_model.strip()

    def _make_key(self, provider: str, model: str, account_id: Optional[str] = None) -> str:
        prov = (provider or "auto").strip().lower()
        mod = (model or "default").strip().lower()
        if account_id:
            return f"{prov}:{mod}:{account_id.strip()}"
        return f"{prov}:{mod}"

    def is_available(self, provider: str, model: str, account_id: Optional[str] = None) -> bool:
        """Checks if the provider/model/account is currently healthy and not on cooldown."""
        with self._lock:
            now = time.time()
            # 1. Check specific account key if provided
            if account_id:
                spec_key = self._make_key(provider, model, account_id)
                if spec_key in self._cooldowns:
                    entry = self._cooldowns[spec_key]
                    if now < entry["cooldown_until"]:
                        return False
                    else:
                        # Cooldown expired, clear specific
                        self._cooldowns.pop(spec_key, None)

            # 2. Check general model key
            gen_key = self._make_key(provider, model)
            if gen_key in self._cooldowns:
                entry = self._cooldowns[gen_key]
                if now < entry["cooldown_until"]:
                    return False
                else:
                    # Cooldown expired, clear general
                    self._cooldowns.pop(gen_key, None)

            return True

    def mark_cooldown(
        self,
        provider: str,
        model: str,
        account_id: Optional[str] = None,
        error_code: int = 429,
        reason: str = ""
    ) -> float:
        """
        Puts a model/account into temporary cooldown with exponential backoff.
        Base cooldown: 60s for 429, 120s for 403, 30s for 503.
        Doubles on consecutive errors, capped at 600s.
        """
        with self._lock:
            key = self._make_key(provider, model, account_id)
            now = time.time()

            existing = self._cooldowns.get(key, {"consecutive_errors": 0})
            consecutive = existing.get("consecutive_errors", 0) + 1

            if error_code == 429:
                base_duration = 60.0
            elif error_code == 403:
                base_duration = 120.0
            elif error_code in [503, 504]:
                base_duration = 30.0
            else:
                base_duration = 45.0

            # Exponential backoff: base * (2 ^ (consecutive - 1)), max 600s
            duration = min(base_duration * (2 ** (consecutive - 1)), 600.0)
            cooldown_until = now + duration

            self._cooldowns[key] = {
                "cooldown_until": cooldown_until,
                "consecutive_errors": consecutive,
                "last_error": reason[:100],
                "error_code": error_code,
                "provider": provider,
                "model": model,
                "account_id": account_id
            }

            logger.warning(
                f"⏳ [ModelCooldown] '{key}' on cooldown for {int(duration)}s (Error {error_code}: {reason[:40]})"
            )
            return duration

    def mark_healthy(self, provider: str, model: str, account_id: Optional[str] = None):
        """Immediately restores a model/account to healthy status."""
        with self._lock:
            key = self._make_key(provider, model, account_id)
            self._cooldowns.pop(key, None)
            gen_key = self._make_key(provider, model)
            self._cooldowns.pop(gen_key, None)

    def get_healthy_fallback_model(
        self,
        provider: str,
        current_model: str,
        candidate_models: Optional[List[str]] = None
    ) -> Optional[str]:
        """
        Dynamically finds a healthy fallback model from candidate list or dynamic ladder.
        Guarantees zero hardcoded model strings.
        """
        prov = (provider or "").lower()

        # 1. Check explicit candidate models list first
        if candidate_models:
            for candidate in candidate_models:
                if candidate != current_model and self.is_available(provider, candidate):
                    logger.info(f"🔀 [ModelCooldown] Routing from '{current_model}' -> candidate fallback '{candidate}'")
                    return candidate

        # 2. Check dynamically registered ladder
        with self._lock:
            ladder = self._dynamic_ladders.get(prov, {})
            candidate = ladder.get(current_model)

            while candidate:
                if self.is_available(provider, candidate):
                    logger.info(f"🔀 [ModelCooldown] Routing from '{current_model}' -> ladder fallback '{candidate}'")
                    return candidate
                candidate = ladder.get(candidate)

        return None

    def get_cooldown_status(self) -> List[Dict[str, Any]]:
        """Returns list of currently active cooldowns."""
        with self._lock:
            now = time.time()
            active = []
            for k, v in list(self._cooldowns.items()):
                remaining = v["cooldown_until"] - now
                if remaining > 0:
                    active.append({
                        "key": k,
                        "provider": v.get("provider"),
                        "model": v.get("model"),
                        "account_id": v.get("account_id"),
                        "remaining_seconds": round(remaining, 1),
                        "consecutive_errors": v.get("consecutive_errors"),
                        "last_error": v.get("last_error")
                    })
                else:
                    self._cooldowns.pop(k, None)
            return active


model_cooldown_manager = ModelCooldownManager()
