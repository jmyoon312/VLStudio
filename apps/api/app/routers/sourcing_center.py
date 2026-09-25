"""
Sourcing Center API Router
원천 영상 보관소 조회/등록, 대-중-소 카테고리 트리, 프리셋별 자율 수집 캠페인 제어 API
"""

from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from app.services.universal_sourcing_service import UniversalVideoSourcingService
from app.database import SessionLocal
from app.models import SourcingAsset, SourcingCampaign

router = APIRouter(prefix="/api/sourcing-center", tags=["sourcing_center"])


class ScoutCandidatesRequest(BaseModel):
    query: Optional[str] = None
    preset_id: Optional[str] = None
    limit: Optional[int] = 3


class IngestAssetRequest(BaseModel):
    candidate_data: Dict[str, Any]
    custom_category: Optional[Dict[str, str]] = None


class UpdateCampaignRequest(BaseModel):
    is_active: Optional[bool] = None
    interval_hours: Optional[int] = None
    quota_per_run: Optional[int] = None
    auto_download: Optional[bool] = None
    search_keywords: Optional[List[str]] = None


class RenderToQueueRequest(BaseModel):
    asset_ids: List[str]
    preset_id: str


@router.get("/assets")
def get_sourcing_assets(
    major: Optional[str] = Query(None),
    mid: Optional[str] = Query(None),
    preset_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None)
):
    """소싱 센터에 누적된 원천 영상 목록 및 3단계 카테고리 트리 반환"""
    try:
        data = UniversalVideoSourcingService.list_sourcing_assets(
            major=major,
            mid=mid,
            preset_id=preset_id,
            status=status
        )
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/assets")
def ingest_sourcing_asset(req: IngestAssetRequest):
    """대화창 또는 외부에서 후보 영상을 소싱 센터에 영구 자산으로 입고"""
    try:
        asset = UniversalVideoSourcingService.download_and_ingest_asset(
            req.candidate_data,
            custom_category=req.custom_category
        )
        return {
            "success": True,
            "asset_id": asset.id,
            "title": asset.title,
            "category_major": asset.category_major,
            "category_mid": asset.category_mid,
            "category_minor": asset.category_minor,
            "message": f"'{asset.title}' 영상이 소싱 센터에 성공적으로 저장되었습니다."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/assets/{asset_id}")
def delete_sourcing_asset(asset_id: str):
    """소싱 센터 에셋 삭제"""
    db = SessionLocal()
    try:
        asset = db.query(SourcingAsset).filter(SourcingAsset.id == asset_id).first()
        if not asset:
            raise HTTPException(status_code=404, detail="Asset not found")
        db.delete(asset)
        db.commit()
        return {"success": True, "message": "에셋이 삭제되었습니다."}
    finally:
        db.close()


@router.post("/scout-candidates")
def scout_candidates(req: ScoutCandidatesRequest):
    """대화창에서 특정 프리셋/키워드에 어울리는 고화질 원천 영상 후보 탐색"""
    try:
        candidates = UniversalVideoSourcingService.scout_candidate_videos(
            query=req.query,
            preset_id=req.preset_id,
            limit=req.limit or 3
        )
        return {"success": True, "candidates": candidates}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/campaigns")
def get_campaigns():
    """프리셋별 자동 수집 캠페인 목록 조회"""
    try:
        data = UniversalVideoSourcingService.list_or_init_campaigns()
        return {"success": True, "items": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/campaigns/{preset_id}")
def update_campaign(preset_id: str, req: UpdateCampaignRequest):
    """프리셋별 자동 수집 캠페인 규칙 갱신"""
    db = SessionLocal()
    try:
        camp = db.query(SourcingCampaign).filter(SourcingCampaign.preset_id == preset_id).first()
        if not camp:
            raise HTTPException(status_code=404, detail="Campaign not found")

        if req.is_active is not None:
            camp.is_active = req.is_active
        if req.interval_hours is not None:
            camp.interval_hours = req.interval_hours
        if req.quota_per_run is not None:
            camp.quota_per_run = req.quota_per_run
        if req.auto_download is not None:
            camp.auto_download = req.auto_download
        if req.search_keywords is not None:
            camp.search_keywords = req.search_keywords

        db.commit()
        return {"success": True, "message": "수집 설정이 성공적으로 갱신되었습니다."}
    finally:
        db.close()


@router.post("/campaigns/{preset_id}/run-now")
def run_campaign_now(preset_id: str, background_tasks: BackgroundTasks):
    """프리셋 자동 수집 즉시 1회 가동"""
    try:
        # 동기 즉시 실행
        res = UniversalVideoSourcingService.run_campaign_once(preset_id)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/assets/render-to-queue")
def render_assets_to_queue(req: RenderToQueueRequest):
    """선택한 소싱 에셋들을 프리셋 스타일로 일괄 렌더링 큐에 등록"""
    db = SessionLocal()
    try:
        assets = db.query(SourcingAsset).filter(SourcingAsset.id.in_(req.asset_ids)).all()
        if not assets:
            raise HTTPException(status_code=404, detail="No matching assets found")

        # 각 에셋의 status를 in_progress로 변경
        for a in assets:
            a.status = "in_progress"
        db.commit()

        return {
            "success": True,
            "queued_count": len(assets),
            "message": f"{len(assets)}개의 원천 영상이 렌더링 대기열로 성공적으로 발송되었습니다."
        }
    finally:
        db.close()
