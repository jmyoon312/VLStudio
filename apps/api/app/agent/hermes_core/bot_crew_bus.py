"""
[Hermes Bot Crew Multi-Agent Coordination Bus]
Implements canonical memory per bot and real-time SSE multi-bot group chat broadcasting.
"""
import time
import asyncio
import logging
import json
from datetime import datetime
from typing import Dict, Any, List, Optional
from collections import defaultdict
from app.database import SessionLocal
from app import models

logger = logging.getLogger("bot_crew_bus")

BOT_ROSTER = [
    {"name": "Loopie-CP", "role": "총괄 프로듀서", "avatar": "🦁", "model": "Google Gemini 3.8 Flash"},
    {"name": "Scout-Alpha", "role": "트렌드 & 에셋 소싱", "avatar": "🔍", "model": "Google Gemini 3.8 Flash"},
    {"name": "Style-Designer", "role": "프리셋 스타일 디자인", "avatar": "🎨", "model": "Claude 3.7 Sonnet"},
    {"name": "Writer-Pro", "role": "9-Wave 쨉쨉이 대본 집필", "avatar": "✍️", "model": "DeepSeek R1 / OpenAI GPT-4o"},
    {"name": "Critic-85", "role": "적대적 품질 검증관", "avatar": "⚖️", "model": "Google Gemini 3.8 Flash"},
    {"name": "Smart-Cutter", "role": "0.5초 델타 절삭 & 키네틱 자막", "avatar": "🎬", "model": "FFmpeg Native Core"},
    {"name": "CapCut-Assembler", "role": "타임라인 No-ZIP 조립", "avatar": "📦", "model": "CapCut Native Bridge"},
    {"name": "Queue-Deployer", "role": "보안망 무인 송출", "avatar": "🚀", "model": "WorkQueue Stealth Engine"}
]

class BotCrewBus:
    _listeners: List[asyncio.Queue] = []
    _history: List[Dict[str, Any]] = []

    @classmethod
    def register_listener(cls, queue: asyncio.Queue):
        if queue not in cls._listeners:
            cls._listeners.append(queue)
            logger.info(f"🔌 [Bot Crew Bus] Listener registered. Active listeners: {len(cls._listeners)}")

    @classmethod
    def unregister_listener(cls, queue: asyncio.Queue):
        if queue in cls._listeners:
            cls._listeners.remove(queue)
            logger.info(f"🔌 [Bot Crew Bus] Listener unregistered. Active listeners: {len(cls._listeners)}")

    @classmethod
    async def broadcast_bot_dialogue(
        cls, 
        project_id: str,
        sender_bot: str, 
        role_title: str, 
        avatar_emoji: str, 
        message: str, 
        action_payload: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """워룸 단체 채팅방에 봇들의 티키타카 대화 브로드캐스트"""
        event_data = {
            "project_id": project_id,
            "sender": sender_bot,
            "role": role_title,
            "avatar": avatar_emoji,
            "message": message,
            "payload": action_payload or {},
            "timestamp": int(time.time() * 1000)
        }
        cls._history.append(event_data)
        if len(cls._history) > 100:
            cls._history.pop(0)

        for q in list(cls._listeners):
            try:
                q.put_nowait(event_data)
            except Exception:
                pass
        logger.info(f"📢 [Bot Crew Bus] {avatar_emoji} {sender_bot}: {message[:40]}...")
        return event_data

    @classmethod
    def get_recent_history(cls, limit: int = 50) -> List[Dict[str, Any]]:
        return cls._history[-limit:]

    @classmethod
    def save_canonical_memory(cls, bot_name: str, key: str, value: Any, memory_type: str = "taste_pattern", channel_id: Optional[int] = None):
        """봇별 영구 장기 기억 저장 (SQLite viral_loop.db 동기화)"""
        try:
            with SessionLocal() as db:
                rec = db.query(models.BotCanonicalMemory).filter(
                    models.BotCanonicalMemory.bot_name == bot_name,
                    models.BotCanonicalMemory.key == key,
                    models.BotCanonicalMemory.channel_id == channel_id
                ).first()
                if not rec:
                    rec = models.BotCanonicalMemory(
                        bot_name=bot_name,
                        channel_id=channel_id,
                        memory_type=memory_type,
                        key=key,
                        value=value
                    )
                    db.add(rec)
                else:
                    rec.value = value
                    rec.updated_at = datetime.utcnow()
                db.commit()
                logger.info(f"💾 [Canonical Memory] Saved '{key}' for bot '{bot_name}'")
        except Exception as e:
            logger.debug(f"[Canonical Memory] Save note: {e}")

    @classmethod
    def load_canonical_memory(cls, bot_name: str, key: str, channel_id: Optional[int] = None) -> Optional[Any]:
        """봇별 영구 장기 기억 로드"""
        try:
            with SessionLocal() as db:
                rec = db.query(models.BotCanonicalMemory).filter(
                    models.BotCanonicalMemory.bot_name == bot_name,
                    models.BotCanonicalMemory.key == key,
                    models.BotCanonicalMemory.channel_id == channel_id
                ).first()
                if rec:
                    return rec.value
        except Exception as e:
            logger.debug(f"[Canonical Memory] Load note: {e}")
        return None
