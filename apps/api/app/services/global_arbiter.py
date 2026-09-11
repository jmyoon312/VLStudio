"""
[Tier 1 Sovereign Factory] Global Interlock Arbiter
Governs all shared physical and network resources across all Channel Directors:
- GPU/FFmpeg concurrency semaphore (default 2)
- Proxy/LTE network interval jittering (5-10s random backoff)
- Daily API budget guard & circuit breaker
- Global emergency kill-switch
"""

import asyncio
import logging
import random
import time
from typing import Dict, Optional
from datetime import datetime

logger = logging.getLogger("global_arbiter")

class GlobalArbiter:
    _instance: Optional["GlobalArbiter"] = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._init_state()
        return cls._instance

    def _init_state(self):
        self._gpu_semaphore: Optional[asyncio.Semaphore] = None
        self._gpu_limit: int = 2
        self._last_network_access: Dict[str, float] = {} # proxy_key -> timestamp
        self._is_kill_switch_active: bool = False
        self._daily_budget_used: float = 0.0
        self._daily_budget_limit: float = 50.0
        self._last_budget_reset_day: int = datetime.now().day
        logger.info("🛡️ [GlobalArbiter] Tier 1 Global Interlock Arbiter initialized.")

    def _get_gpu_semaphore(self) -> asyncio.Semaphore:
        if self._gpu_semaphore is None:
            from app.database import SessionLocal
            from app import models
            limit = 2
            try:
                with SessionLocal() as db:
                    cfg = db.query(models.GlobalSwarmConfig).first()
                    if cfg and getattr(cfg, "gpu_concurrency_limit", None):
                        limit = max(1, int(cfg.gpu_concurrency_limit))
            except Exception as e:
                logger.debug(f"[GlobalArbiter] Could not read gpu_concurrency_limit: {e}")
            self._gpu_limit = limit
            self._gpu_semaphore = asyncio.Semaphore(self._gpu_limit)
        return self._gpu_semaphore

    async def acquire_gpu(self, channel_title: str = "Unknown") -> bool:
        """Acquires a slot in the GPU semaphore. Returns True when acquired."""
        if self.is_kill_switch_active():
            logger.warning(f"🚨 [GlobalArbiter] GPU acquire rejected: Kill-Switch active for {channel_title}")
            return False
        
        sem = self._get_gpu_semaphore()
        logger.info(f"⏳ [GlobalArbiter] Channel '{channel_title}' waiting for GPU rendering slot...")
        await sem.acquire()
        logger.info(f"🟢 [GlobalArbiter] Channel '{channel_title}' acquired GPU slot (Limit: {self._gpu_limit})")
        return True

    def release_gpu(self, channel_title: str = "Unknown"):
        """Releases the held GPU slot."""
        if self._gpu_semaphore:
            self._gpu_semaphore.release()
            logger.info(f"⚪ [GlobalArbiter] Channel '{channel_title}' released GPU slot.")

    async def wait_network_jitter(self, proxy_or_channel_key: str, min_seconds: int = 3, max_seconds: int = 8):
        """Enforces anti-detection jitter interval between successive calls on the same network node."""
        now = time.time()
        last_time = self._last_network_access.get(proxy_or_channel_key, 0.0)
        elapsed = now - last_time
        
        required_interval = random.uniform(min_seconds, max_seconds)
        if elapsed < required_interval:
            wait_time = required_interval - elapsed
            logger.info(f"⏱️ [GlobalArbiter] Network Jitter: waiting {wait_time:.2f}s for node '{proxy_or_channel_key}'")
            await asyncio.sleep(wait_time)
            
        self._last_network_access[proxy_or_channel_key] = time.time()

    def is_kill_switch_active(self) -> bool:
        """Checks DB and memory kill-switch."""
        from app.database import SessionLocal
        from app import models
        try:
            with SessionLocal() as db:
                cfg = db.query(models.GlobalSwarmConfig).first()
                if cfg:
                    self._is_kill_switch_active = bool(cfg.global_kill_switch)
        except Exception:
            pass
        return self._is_kill_switch_active

    def set_kill_switch(self, active: bool) -> bool:
        """Activates or deactivates the emergency kill-switch globally."""
        from app.database import SessionLocal
        from app import models
        self._is_kill_switch_active = active
        try:
            with SessionLocal() as db:
                cfg = db.query(models.GlobalSwarmConfig).first()
                if not cfg:
                    cfg = models.GlobalSwarmConfig(id=1, global_kill_switch=active)
                    db.add(cfg)
                else:
                    cfg.global_kill_switch = active
                db.commit()
                logger.warning(f"🚨 [GlobalArbiter] Global Kill-Switch set to: {active}")
                return True
        except Exception as e:
            logger.error(f"[GlobalArbiter] Failed to persist kill-switch: {e}")
            return False

    def record_api_cost(self, cost_usd: float) -> bool:
        """Records API usage and checks if daily budget is exceeded."""
        today = datetime.now().day
        if today != self._last_budget_reset_day:
            self._daily_budget_used = 0.0
            self._last_budget_reset_day = today
            
        self._daily_budget_used += cost_usd
        if self._daily_budget_used >= self._daily_budget_limit:
            logger.warning(f"💸 [GlobalArbiter] Daily budget exceeded: ${self._daily_budget_used:.2f} >= ${self._daily_budget_limit:.2f}")
            return False
        return True

    def get_status(self) -> Dict:
        """Returns the real-time HUD status of the arbiter."""
        from app.database import SessionLocal
        from app import models
        subagent_slots = 3
        try:
            with SessionLocal() as db:
                from app import crud
                s = crud.get_settings(db)
                subagent_slots = getattr(s, "hermes_max_subagents", 3) or 3
        except Exception:
            pass

        return {
            "gpu_limit": self._gpu_limit,
            "gpu_in_use": (self._gpu_limit - self._get_gpu_semaphore()._value) if self._gpu_semaphore else 0,
            "kill_switch_active": self.is_kill_switch_active(),
            "daily_budget_used": round(self._daily_budget_used, 2),
            "daily_budget_limit": self._daily_budget_limit,
            "subagent_max_slots": subagent_slots,
            "active_network_nodes": len(self._last_network_access)
        }

global_arbiter = GlobalArbiter()
