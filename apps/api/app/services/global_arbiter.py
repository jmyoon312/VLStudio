"""
[Tier 1 Sovereign Factory] Global Interlock Arbiter
Governs all shared physical and network resources across all Channel Directors:
- GPU/FFmpeg concurrency semaphore (default 2 slots for GTX 1060 3GB)
- Hardware VRAM inspection & automatic CPU int8 fallback
- Proxy/LTE network interval jittering (3-8s random backoff)
- Zero Limit API Budget tracking (10 paid accounts in OmniRoute pool - Never block)
- Global emergency kill-switch
"""

import asyncio
import logging
import random
import time
from typing import Dict, Any, Optional
from datetime import datetime
from contextlib import asynccontextmanager

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
        self._daily_budget_limit: float = 999999.0  # 🎯 Zero Limit: 10 Paid accounts in OmniRoute
        self._last_budget_reset_day: int = datetime.now().day
        logger.info("🛡️ [GlobalArbiter] Tier 1 Global Interlock Arbiter initialized (GTX 1060 3GB / 2-Slot Lock).")

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

    @asynccontextmanager
    async def gpu_lock(self, channel_title: str = "Unknown"):
        """
        Async context manager for GPU slot acquisition.
        Usage:
            async with global_arbiter.gpu_lock("Sports Shorts"):
                await render_video(...)
        """
        acquired = await self.acquire_gpu(channel_title)
        if not acquired:
            raise RuntimeError(f"GlobalArbiter: Failed to acquire GPU lock (Kill-Switch active)")
        try:
            yield
        finally:
            self.release_gpu(channel_title)

    def get_optimal_device(self, required_vram_mb: int = 1200) -> Dict[str, Any]:
        """
        [GTX 1060 3GB Safeguard]
        Inspects CUDA availability and available VRAM.
        If VRAM is insufficient (< required_vram_mb) or CUDA unavailable,
        seamlessly fallbacks to CPU int8 mode to prevent CUDA OOM crashes.
        """
        try:
            import torch
            if torch.cuda.is_available():
                device_name = torch.cuda.get_device_name(0)
                total_mem = torch.cuda.get_device_properties(0).total_memory / (1024 * 1024)
                allocated_mem = torch.cuda.memory_allocated(0) / (1024 * 1024)
                free_mem = total_mem - allocated_mem
                
                if free_mem >= required_vram_mb:
                    return {
                        "device": "cuda:0",
                        "quantization": "fp16" if free_mem > 2000 else "int8",
                        "gpu_name": device_name,
                        "free_vram_mb": round(free_mem, 1),
                        "fallback": False
                    }
                else:
                    logger.warning(
                        f"⚠️ [GlobalArbiter] GTX 1060 3GB VRAM low ({free_mem:.1f}MB < {required_vram_mb}MB). "
                        "Fallback to CPU int8 mode to prevent OOM crash."
                    )
                    return {
                        "device": "cpu",
                        "quantization": "int8",
                        "gpu_name": device_name,
                        "free_vram_mb": round(free_mem, 1),
                        "fallback": True,
                        "reason": "VRAM near capacity"
                    }
        except ImportError:
            pass
        except Exception as e:
            logger.debug(f"[GlobalArbiter] PyTorch VRAM inspection skipped: {e}")

        return {
            "device": "cpu",
            "quantization": "int8",
            "gpu_name": "CPU Fallback",
            "free_vram_mb": 0,
            "fallback": True,
            "reason": "CUDA unavailable or PyTorch not loaded"
        }

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

    def record_api_cost(
        self,
        cost_usd: float = 0.0,
        provider: Optional[str] = None,
        model: Optional[str] = None,
        tokens_in: int = 0,
        tokens_out: int = 0,
        channel_title: Optional[str] = None
    ) -> bool:
        """
        [Zero Limit Policy]
        Records API usage for statistics and dashboard charts.
        Always returns True because the user has prepared 10 paid accounts in OmniRoute.
        """
        today = datetime.now().day
        if today != self._last_budget_reset_day:
            self._daily_budget_used = 0.0
            self._last_budget_reset_day = today
            
        self._daily_budget_used += cost_usd
        return True

    def get_status(self) -> Dict:
        """Returns the real-time HUD status of the arbiter."""
        from app.database import SessionLocal
        subagent_slots = 3
        try:
            with SessionLocal() as db:
                from app import crud
                s = crud.get_settings(db)
                subagent_slots = getattr(s, "hermes_max_subagents", 3) or 3
        except Exception:
            pass

        device_info = self.get_optimal_device()

        return {
            "gpu_limit": self._gpu_limit,
            "gpu_in_use": (self._gpu_limit - self._get_gpu_semaphore()._value) if self._gpu_semaphore else 0,
            "optimal_device": device_info.get("device", "cuda:0"),
            "quantization": device_info.get("quantization", "int8"),
            "gpu_fallback": device_info.get("fallback", False),
            "free_vram_mb": device_info.get("free_vram_mb", 0),
            "kill_switch_active": self.is_kill_switch_active(),
            "daily_budget_used": round(self._daily_budget_used, 2),
            "daily_budget_limit": "UNLIMITED (10 Paid Accounts)",
            "subagent_max_slots": subagent_slots,
            "active_network_nodes": len(self._last_network_access)
        }

global_arbiter = GlobalArbiter()
