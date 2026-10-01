"""
[Harness v2 & Hermes Bot Mode API Router]
Exposes endpoints for:
- Synthetic Self-Play Creative Simulation
- 0.5-Second Modular Delta Re-Rendering
- Real-time Multi-Bot Group Chat SSE Stream
- Asset Vault Search & Registration
- Closed-Loop Self-Evolution Engine
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Body, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
import json
import asyncio
import os

from app import database, models
from app.agent.hermes_core.synthetic_self_play import SyntheticSelfPlayEngine
from app.agent.hermes_core.bot_crew_bus import BotCrewBus, BOT_ROSTER
from app.services.harness_delta_renderer import HarnessDeltaRenderer
from app.services.harness_evolution_engine import HarnessEvolutionEngine

router = APIRouter(prefix="/harness", tags=["harness"])

# 1. Models
class SelfPlayReq(BaseModel):
    topic: str
    channel_id: Optional[int] = None
    source_evidence: Optional[List[str]] = None
    model_name: Optional[str] = "gemini-3.8-flash"

class DeltaPatchReq(BaseModel):
    project_id: str
    target_scene_id: int
    patched_scene_data: Dict[str, Any]
    all_scene_chunks: List[str]
    master_audio_path: Optional[str] = None
    final_output_mp4: str
    ass_path: Optional[str] = None
    channel_title: Optional[str] = "Default"

class BotDialogueReq(BaseModel):
    project_id: str
    sender_bot: str
    role_title: str
    avatar_emoji: str
    message: str
    payload: Optional[Dict[str, Any]] = None

class EvolveReq(BaseModel):
    channel_id: int
    steering_history: List[Dict[str, Any]]

# 2. Endpoints

@router.post("/self-play/simulate")
async def run_synthetic_self_play(
    req: SelfPlayReq,
    db: Session = Depends(database.get_db)
):
    """
    [Synthetic Self-Play Arena]
    백그라운드에서 150개 가설 분기 및 내부 난상토론, 가상 시청자 이탈률 테스트를 거쳐
    최정예 3대 차별화 테이크(Take A, B, C)를 압축 도출합니다.
    """
    channel_dna = {}
    if req.channel_id:
        ch = db.query(models.BrandChannel).filter(models.BrandChannel.id == req.channel_id).first()
        if ch:
            channel_dna = {
                "tone": ch.style_signature.get("persona", {}).get("tone_style") if ch.style_signature else "도파민 후킹",
                "forbidden_words": ch.style_signature.get("persona", {}).get("forbidden_words", []) if ch.style_signature else []
            }

    takes = await SyntheticSelfPlayEngine.simulate_creative_takes(
        topic=req.topic,
        channel_dna=channel_dna,
        source_evidence=req.source_evidence,
        model_name=req.model_name
    )
    return {"success": True, "topic": req.topic, "takes": takes}

@router.post("/delta-render/patch")
async def patch_scene_delta(req: DeltaPatchReq):
    """
    [0.5-Second Modular Delta Re-Renderer]
    대표님의 대화형 잡도리 지시 시, 변경된 씬 1개만 국소 인코딩 후 
    나머지 캐시 씬들과 무손실 Concat 결합하여 1초 내 비디오 갱신
    """
    try:
        updated_mp4 = await HarnessDeltaRenderer.hot_patch_and_merge(
            project_id=req.project_id,
            target_scene_id=req.target_scene_id,
            patched_scene_data=req.patched_scene_data,
            all_scene_chunks=req.all_scene_chunks,
            master_audio_path=req.master_audio_path,
            final_output_mp4=req.final_output_mp4,
            ass_path=req.ass_path,
            channel_title=req.channel_title or "Default"
        )
        return {"success": True, "final_video_path": updated_mp4}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delta render failed: {str(e)}")

@router.get("/bot-crew/roster")
def get_bot_roster():
    """8대 봇 크루 목록 및 상태 반환"""
    return {"success": True, "roster": BOT_ROSTER}

@router.get("/bot-crew/history")
def get_bot_dialogue_history(limit: int = 50):
    """최근 봇 대화 기록 조회"""
    return {"success": True, "history": BotCrewBus.get_recent_history(limit)}

@router.post("/bot-crew/dispatch")
async def dispatch_bot_dialogue(req: BotDialogueReq):
    """봇 크루 단체 채팅방에 메시지 전송 및 브로드캐스트"""
    event = await BotCrewBus.broadcast_bot_dialogue(
        project_id=req.project_id,
        sender_bot=req.sender_bot,
        role_title=req.role_title,
        avatar_emoji=req.avatar_emoji,
        message=req.message,
        action_payload=req.payload
    )
    return {"success": True, "event": event}

@router.get("/bot-crew/stream")
async def stream_bot_crew_chat(request: Request):
    """워룸 실시간 다자간 봇 단체 대화 SSE 스트림"""
    queue: asyncio.Queue = asyncio.Queue()
    BotCrewBus.register_listener(queue)

    async def event_generator():
        try:
            # First send recent history
            history = BotCrewBus.get_recent_history(20)
            for h in history:
                yield f"data: {json.dumps(h, ensure_ascii=False)}\n\n"

            while True:
                if await request.is_disconnected():
                    break
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
                except asyncio.TimeoutError:
                    yield ": ping\n\n"
        finally:
            BotCrewBus.unregister_listener(queue)

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.post("/evolve")
def evolve_channel(req: EvolveReq):
    """
    [Closed-Loop Evolve]
    대표님의 잡도리 내역(Delta)을 분석하여 채널 프리셋(DNA) 자동 진화
    """
    res = HarnessEvolutionEngine.evolve_from_user_steering(req.channel_id, req.steering_history)
    return {"success": True, "evolution": res}

@router.get("/asset-vault/search")
def search_asset_vault(
    keyword: Optional[str] = None,
    channel_id: Optional[int] = None,
    limit: int = 20,
    db: Session = Depends(database.get_db)
):
    """
    [Asset Vault] 고유지율 B컷 영상 소스 검색 ($0 재활용)
    """
    query = db.query(models.AssetVaultItem)
    if channel_id:
        query = query.filter((models.AssetVaultItem.channel_id == channel_id) | (models.AssetVaultItem.channel_id == None))
    if keyword:
        query = query.filter(
            models.AssetVaultItem.keywords.like(f"%{keyword}%") | 
            models.AssetVaultItem.ai_description.like(f"%{keyword}%")
        )
    items = query.order_by(models.AssetVaultItem.visual_score.desc()).limit(limit).all()
    return {
        "success": True, 
        "count": len(items), 
        "items": [
            {
                "asset_id": it.asset_id,
                "local_path": it.local_path,
                "duration_sec": it.duration_sec,
                "resolution": it.resolution,
                "visual_score": it.visual_score,
                "keywords": it.keywords,
                "performance_rating": it.performance_rating,
                "total_reuse_count": it.total_reuse_count
            } for it in items
        ]
    }
