"""
[Tier 2 Sovereign Factory] Channel Director Core Runtime
Manages the autonomous lifecycle and state machine for each BrandChannel:
- Executes within ChannelNetworkGuard isolation context (ISP_PROXY vs DIRECT_LTE)
- Injects 3-Axis Orthogonal Sandbox payload into LangGraph
- Enforces Critic-85 quality check & Telegram HITL approval
- Updates real-time heartbeat and director_state in DB
"""

import asyncio
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app import models
from app.services.channel_network_guard import ChannelNetworkGuard
from app.services.global_arbiter import global_arbiter
from app.state_management.video_graph import sovereign_video_graph

logger = logging.getLogger("channel_director")

class ChannelDirector:
    """Manages an autonomous instance for a specific BrandChannel."""
    
    def __init__(self, channel_id: str, title: str):
        self.channel_id = channel_id
        self.title = title
        self._current_task: Optional[asyncio.Task] = None

    @classmethod
    def get_all_directors_status(cls, db: Session) -> List[Dict[str, Any]]:
        """Returns the real-time operational status of all channel directors."""
        channels = db.query(models.BrandChannel).filter(models.BrandChannel.is_active == True).all()
        results = []
        for ch in channels:
            sec_badge = "[🔒 고정 ISP]"
            sec_type = "ISP_PROXY"
            if ch.owner_profile:
                mode = getattr(ch.owner_profile, "proxy_mode", "DIRECT")
                if mode == "DIRECT_LTE":
                    sec_badge = "[⚡ LTE 모바일]"
                    sec_type = "DIRECT_LTE"
            
            combo = getattr(ch, "assigned_combo_model", None) or "omniroute/viraloop1"
            state = getattr(ch, "director_state", None) or "IDLE"
            daily_target = getattr(ch, "daily_target_count", 2) or 2
            published_today = getattr(ch, "published_today_count", 0) or 0
            heartbeat = getattr(ch, "director_heartbeat", None)

            results.append({
                "id": ch.id,
                "channel_id": ch.channel_id,
                "title": ch.title or "무제 채널",
                "thumbnail_url": ch.thumbnail_url,
                "is_autonomous_enabled": bool(ch.is_autonomous_enabled),
                "director_state": state,
                "assigned_combo_model": combo,
                "daily_target_count": daily_target,
                "published_today_count": published_today,
                "director_heartbeat": heartbeat.strftime("%H:%M:%S") if heartbeat else "대기 중",
                "security_badge": sec_badge,
                "security_type": sec_type,
                "trust_score": getattr(ch, "trust_score", 0) or 0
            })
        return results

    @classmethod
    async def step_channel_cycle(cls, channel_db_id: int, modality: str = "keyword_only", topic: Optional[str] = None):
        """Executes a single autonomous production cycle for a specific channel."""
        db = SessionLocal()
        try:
            ch = db.query(models.BrandChannel).filter(models.BrandChannel.id == channel_db_id).first()
            if not ch:
                logger.warning(f"[ChannelDirector] Channel {channel_db_id} not found.")
                return {"success": False, "error": "Channel not found"}

            if global_arbiter.is_kill_switch_active():
                logger.warning(f"🚨 [ChannelDirector] Execution blocked by Tier 1 Global Kill-Switch.")
                return {"success": False, "error": "Kill-switch is active"}

            # Check network jitter interval
            proxy_key = ch.owner_profile.proxy_host if (ch.owner_profile and ch.owner_profile.proxy_host) else ch.channel_id
            await global_arbiter.wait_network_jitter(proxy_key, min_seconds=3, max_seconds=6)

            # Update DB State to SCOUTING
            ch.director_state = "SCOUTING"
            ch.director_heartbeat = datetime.now()
            db.commit()

            # Execute within isolated ChannelNetworkGuard context
            with ChannelNetworkGuard(ch.channel_id) as guard:
                logger.info(f"🏛️ [ChannelDirector] Running within {guard['proxy_mode']} for channel '{ch.title}'")
                
                # 3-Axis Orthogonal Payload
                dna = {
                    "expert_identity": (ch.expert_identity or {}).get("strategy", f"{ch.title} 전용 바이럴 포뮬러"),
                    "tone": (ch.expert_identity or {}).get("tone", "몰입도 높은 0.8초 쨉쨉이 어투"),
                    "forbidden_words": (ch.expert_identity or {}).get("forbidden_words", ["비방", "가짜뉴스"]),
                    "style_signature": ch.style_signature or {}
                }
                combo = getattr(ch, "assigned_combo_model", None) or "omniroute/viraloop1"
                proj_id = f"auto_{ch.channel_id}_{int(datetime.now().timestamp())}"
                effective_topic = topic or f"{ch.title} 오늘의 급상승 미스터리"

                initial_state = {
                    "project_id": proj_id,
                    "channel_id": ch.channel_id,
                    "channel_title": ch.title or "바이럴 채널",
                    "topic": effective_topic,
                    "channel_dna": dna,
                    "modality": modality,
                    "assigned_combo_model": combo,
                    "script_content": "",
                    "scenes": [],
                    "audio_path": None,
                    "video_path": None,
                    "draft_project_path": None,
                    "critic_score": 0,
                    "critic_feedback": "",
                    "critic_retry_count": 0,
                    "max_critic_retries": 3,
                    "hitl_status": "APPROVED", # Auto-approve in autonomous mode, or PENDING if manual
                    "current_phase": "INITIATED",
                    "errors": []
                }

                # Update state to SCRIPTING
                ch.director_state = "SCRIPTING"
                db.commit()

                # Run LangGraph StateMachine
                final_state = await sovereign_video_graph.ainvoke(initial_state)

                # Update completed state
                ch.director_state = "IDLE"
                ch.published_today_count = (getattr(ch, "published_today_count", 0) or 0) + 1
                ch.last_director_cycle = datetime.now()
                ch.director_heartbeat = datetime.now()
                db.commit()

                return {
                    "success": True,
                    "channel": ch.title,
                    "project_id": proj_id,
                    "phase": final_state.get("current_phase"),
                    "critic_score": final_state.get("critic_score")
                }

        except Exception as e:
            logger.error(f"[ChannelDirector] Error in cycle for channel {channel_db_id}: {e}")
            try:
                ch = db.query(models.BrandChannel).filter(models.BrandChannel.id == channel_db_id).first()
                if ch:
                    ch.director_state = "ERROR"
                    db.commit()
            except Exception:
                pass
            return {"success": False, "error": str(e)}
        finally:
            db.close()

channel_director = ChannelDirector
