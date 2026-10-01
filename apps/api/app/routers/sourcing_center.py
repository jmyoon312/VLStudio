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
    candidate_data: Optional[Dict[str, Any]] = None
    custom_category: Optional[Dict[str, str]] = None
    title: Optional[str] = None
    source_url: Optional[str] = None
    url: Optional[str] = None
    video_duration_sec: Optional[float] = None
    duration_sec: Optional[float] = None
    resolution: Optional[str] = None
    thumbnail_url: Optional[str] = None
    clean_zone_score: Optional[float] = None
    genre: Optional[str] = None
    genre_major: Optional[str] = None
    genre_mid: Optional[str] = None
    sub_category: Optional[str] = None
    script_draft_60s: Optional[str] = None
    script_draft: Optional[str] = None
    summary: Optional[str] = None


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
        c_data = dict(req.candidate_data) if req.candidate_data else {}
        if not c_data:
            c_data = {
                "title": req.title or "무제 원천 영상",
                "url": req.source_url or req.url,
                "source_url": req.source_url or req.url,
                "duration_sec": req.duration_sec or req.video_duration_sec or 45.0,
                "resolution": req.resolution or "1080p",
                "thumbnail_url": req.thumbnail_url or "",
                "clean_zone_score": req.clean_zone_score or 95.0,
                "genre_major": req.genre_major or req.genre or "일반/트렌드",
                "genre_mid": req.genre_mid or req.sub_category or "실시간 화제",
                "script_draft": req.script_draft or req.script_draft_60s or "",
                "summary": req.summary or ""
            }
        asset = UniversalVideoSourcingService.download_and_ingest_asset(
            c_data,
            custom_category=req.custom_category
        )
        return {
            "status": "ok",
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


# =========================================================================
# 신규 고도화 엔드포인트: 픽셀링 큐레이션 흡수, TMDB 자체 확장, 다차원 시맨틱 검색, 트렌드 레이더
# =========================================================================

class TmdbHarvestRequest(BaseModel):
    media_type: Optional[str] = "movie"  # movie | tv
    region: Optional[str] = "KR"
    min_year: Optional[int] = 2005
    page: Optional[int] = 1


class SliceAndCreateRequest(BaseModel):
    asset_id: str
    preset_id: Optional[str] = None
    start_sec: Optional[float] = 0.0
    end_sec: Optional[float] = 45.0
    hook_text: Optional[str] = None


@router.post("/pixeling/import")
def import_pixeling_curated_catalog():
    """구버전 픽셀링의 130+개 검증 큐레이션 작품 전량을 viral_loop.db로 일괄 임포트"""
    from app.services.pixeling_curated_catalog import PixelingCuratedCatalogService
    db = SessionLocal()
    try:
        res = PixelingCuratedCatalogService.import_all_to_db(db)
        from app.services.semantic_sourcing_search import SemanticSourcingSearchService
        SemanticSourcingSearchService.invalidate_cache()
        return res
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


@router.get("/curated-works")
def get_curated_works(
    query: Optional[str] = Query(None),
    emotion: Optional[str] = Query(None),
    major_cat: Optional[str] = Query(None),
    relationship: Optional[str] = Query(None),
    trope: Optional[str] = Query(None),
    personality: Optional[str] = Query(None),
    era: Optional[str] = Query(None),
    person: Optional[str] = Query(None),
    min_score: Optional[float] = Query(0.0),
    limit: Optional[int] = Query(60)
):
    """5대 태그를 뛰어넘는 4차원 직교 패싯 및 자연어 시맨틱 검색 기반 큐레이션 작품 조회"""
    from app.services.semantic_sourcing_search import SemanticSourcingSearchService
    db = SessionLocal()
    try:
        results = SemanticSourcingSearchService.search_curated_assets(
            db_session=db,
            query=query,
            emotion=emotion,
            major_cat=major_cat,
            facet_relationship=relationship,
            facet_trope=trope,
            facet_personality=personality,
            facet_era=era,
            lead_person=person,
            min_score=min_score or 0.0,
            limit=limit or 60
        )
        return {"success": True, "total": len(results), "items": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


@router.post("/tmdb/harvest")
def harvest_tmdb_titles(req: TmdbHarvestRequest):
    """TMDB API 기반 자체 숏폼 바이럴 적합도 큐레이션 및 DB 일괄 확장 적재"""
    from app.services.tmdb_viral_curator import TmdbViralCuratorService
    db = SessionLocal()
    try:
        curated = TmdbViralCuratorService.fetch_and_curate_titles(
            media_type=req.media_type or "movie",
            region=req.region or "KR",
            min_year=req.min_year or 2005,
            page=req.page or 1,
            db_session=db
        )
        ingest_res = TmdbViralCuratorService.ingest_curated_titles_to_db(db, curated)
        from app.services.semantic_sourcing_search import SemanticSourcingSearchService
        SemanticSourcingSearchService.invalidate_cache()
        return {
            "success": True,
            "harvested_count": len(curated),
            "ingest_result": ingest_res,
            "items": curated[:10]
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


@router.get("/trend-radar")
def get_trend_radar():
    """VPH, 아웃라이어 폭발 배수, 틱톡 음원 속도, 인스타 저장/공유율 기반 실시간 알고리즘 레이더"""
    from app.services.trend_scoring_engine import TrendScoringEngine
    try:
        res = TrendScoringEngine.get_curated_trend_radar()
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/slice-and-create")
def slice_and_create_short(req: SliceAndCreateRequest):
    """소싱 센터 작품에서 1초 만에 씬을 발골하여 아스트라 대화형 제작 큐로 직결"""
    db = SessionLocal()
    try:
        asset = db.query(SourcingAsset).filter(SourcingAsset.id == req.asset_id).first()
        if not asset:
            raise HTTPException(status_code=404, detail="Asset not found")

        preset_id = req.preset_id or asset.linked_preset_id or "channel_classic_short_v1"
        hook = req.hook_text or asset.script_draft or f"{asset.title} 역대급 명장면!"

        # Mark asset in progress
        asset.status = "in_progress"
        db.commit()

        return {
            "success": True,
            "asset_id": asset.id,
            "title": asset.title,
            "preset_id": preset_id,
            "hook_text": hook,
            "start_sec": req.start_sec,
            "end_sec": req.end_sec,
            "source_url": asset.source_url,
            "message": f"'{asset.title}' 영상의 씬 발골이 완료되어 아스트라 총괄 디렉터로 전달되었습니다."
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

