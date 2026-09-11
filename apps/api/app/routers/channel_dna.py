"""
채널 DNA 분석 및 원본 소스 피드백 라우터
(Channel DNA Benchmark & Sourcing Flywheel Router)
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from app.services.channel_dna_service import ChannelDNAService
from app.database import SessionLocal
from app import models

router = APIRouter(prefix="/api/channel-dna", tags=["channel-dna"])

class AnalyzeChannelRequest(BaseModel):
    channel_url: str
    sample_count: int = 12
    video_path: Optional[str] = None

class UpdateLayoutRequest(BaseModel):
    custom_layout: Dict[str, Any]

class FeedbackSourcesRequest(BaseModel):
    target_category_name: str = "아이돌 비하인드"

class CreateBrandChannelRequest(BaseModel):
    channel_name: str
    selected_layout: Dict[str, Any]

@router.post("/analyze")
def analyze_channel(req: AnalyzeChannelRequest):
    try:
        res = ChannelDNAService.analyze_channel(req.channel_url, req.sample_count, video_path=req.video_path)
        return {"success": True, "data": res}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/benchmarks")
def list_benchmarks():
    try:
        items = ChannelDNAService.list_benchmarks()
        return {"success": True, "items": items}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/benchmarks/{benchmark_id}")
def get_benchmark(benchmark_id: int):
    data = ChannelDNAService.get_benchmark(benchmark_id)
    if not data:
        raise HTTPException(status_code=404, detail="Benchmark not found")
    return {"success": True, "data": data}

@router.post("/benchmarks/{benchmark_id}/update-layout")
def update_layout(benchmark_id: int, req: UpdateLayoutRequest):
    ok = ChannelDNAService.update_custom_layout(benchmark_id, req.custom_layout)
    if not ok:
        raise HTTPException(status_code=404, detail="Benchmark not found")
    return {"success": True, "message": "Custom layout preset saved successfully"}

@router.post("/benchmarks/{benchmark_id}/feedback-sources")
def feedback_sources(benchmark_id: int, req: FeedbackSourcesRequest):
    registered = ChannelDNAService.feedback_sources_to_channels(benchmark_id, req.target_category_name)
    return {
        "success": True,
        "message": f"{len(registered)}개의 원천 채널이 정기 자동 수집 타겟으로 등록되었습니다.",
        "registered_channels": registered
    }

@router.post("/benchmarks/{benchmark_id}/create-brand-channel")
def create_brand_channel(benchmark_id: int, req: CreateBrandChannelRequest):
    db = SessionLocal()
    try:
        import uuid
        channel_key = f"UC_CUSTOM_{uuid.uuid4().hex[:8].upper()}"
        brand = models.BrandChannel(
            channel_id=channel_key,
            title=req.channel_name,
            thumbnail_url="",
            is_autonomous_enabled=True,
            style_signature=req.selected_layout,
            expert_identity={"template_blueprint": req.selected_layout},
            assigned_combo_model="omniroute/viraloop-story",
            director_state="IDLE"
        )
        db.add(brand)
        db.commit()
        db.refresh(brand)
        return {
            "success": True,
            "message": f"브랜드 채널 '{req.channel_name}'이(가) 성공적으로 생성되어 AI 사령탑에 배속되었습니다.",
            "channel_id": brand.channel_id,
            "brand_id": brand.id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

# -------------------------------------------------------------
# 템플릿 관리자 API (Template Manager & Brand Channel Binding)
# -------------------------------------------------------------

class SaveTemplateRequest(BaseModel):
    name: str
    layout: Dict[str, Any]
    description: Optional[str] = ""

class ApplyTemplateRequest(BaseModel):
    channel_id: int
    layout: Dict[str, Any]

@router.get("/templates")
def list_templates():
    try:
        items = ChannelDNAService.list_templates()
        return {"success": True, "items": items}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/templates")
def save_template(req: SaveTemplateRequest):
    try:
        saved = ChannelDNAService.save_template(req.name, req.layout, req.description)
        return {"success": True, "message": f"템플릿 '{req.name}'이(가) 저장되었습니다.", "template": saved}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/templates/{template_id}")
def delete_template(template_id: str):
    try:
        ok = ChannelDNAService.delete_template(template_id)
        if not ok:
            raise HTTPException(status_code=404, detail="Template not found or cannot delete system template")
        return {"success": True, "message": "템플릿이 성공적으로 삭제되었습니다."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/templates/apply-to-channel")
def apply_template_to_channel(req: ApplyTemplateRequest):
    try:
        ok = ChannelDNAService.apply_template_to_brand_channel(req.channel_id, req.layout)
        if not ok:
            raise HTTPException(status_code=404, detail="Brand channel not found")
        return {"success": True, "message": "해당 브랜드 채널의 기본 제작 템플릿으로 성공적으로 적용되었습니다."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/brand-channels")
def get_brand_channels():
    """
    템플릿 바인딩용 활성 브랜드 채널 목록 반환
    """
    db = SessionLocal()
    try:
        channels = db.query(models.BrandChannel).all()
        return {
            "success": True,
            "items": [
                {
                    "id": ch.id,
                    "channel_id": ch.channel_id,
                    "title": ch.title,
                    "thumbnail_url": ch.thumbnail_url,
                    "assigned_combo_model": ch.assigned_combo_model,
                    "director_state": ch.director_state
                }
                for ch in channels
            ]
        }
    finally:
        db.close()

