from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import logging

from app.database import get_db
from app import models
from app.services.sns_trend_service import (
    sns_trend_service,
    sns_patrol_worker,
    is_forbidden_south_southeast_asian,
    clean_handle
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/sns-trend", tags=["sns_trend"])

class SnsSearchRequest(BaseModel):
    platform: str = "ALL"  # ALL | TIKTOK | INSTAGRAM
    query: Optional[str] = ""
    country: Optional[str] = "KR"  # KR | US | JP | TW | VN | ALL
    category: Optional[str] = "trending"  # trending | meme | challenge | tips | drama | mukbang | tech | knowledge
    search_type: Optional[str] = "TRENDING"  # TRENDING | HASHTAG | CREATOR
    sort_order: Optional[str] = "popular"    # popular | latest
    limit: Optional[int] = 36
    force_refresh: bool = False
    max_per_creator: Optional[int] = 1

class SnsBatchHarvestRequest(BaseModel):
    platform: str = "ALL"  # ALL | TIKTOK | INSTAGRAM
    country: str = "KR"
    categories: Optional[List[str]] = None
    limit: int = 100  # 100, 200, 500

class SnsOriginalFinderRequest(BaseModel):
    reference_url: str
    title: Optional[str] = ""
    description: Optional[str] = ""
    limit: Optional[int] = 8

class SnsDownloadRequest(BaseModel):
    urls: List[str]
    category_id: Optional[int] = None

class SnsPatrolConfigRequest(BaseModel):
    auto_download: Optional[bool] = None
    interval_seconds: Optional[int] = None


@router.post("/search")
def search_sns_trend(request: SnsSearchRequest, db: Session = Depends(get_db)):
    """
    TikTok & Instagram Reels 하이브리드 고속 바이럴 수집 (Database-First)
    8대 카테고리 & 6대 국가 크리에이터 풀 및 퀀트 지표(Outlier, Velocity) 자동 연산
    """
    try:
        items = sns_trend_service.search_sns_videos(
            platform=request.platform,
            query=request.query or "",
            country=request.country or "KR",
            category=request.category or "trending",
            search_type=request.search_type or "TRENDING",
            sort_order=request.sort_order or "popular",
            limit=request.limit or 36,
            force_refresh=request.force_refresh,
            max_per_creator=request.max_per_creator,
            db=db
        )
        return {
            "status": "success",
            "platform": request.platform.upper(),
            "country": request.country,
            "category": request.category,
            "count": len(items),
            "items": items
        }
    except Exception as e:
        logger.error(f"[SnsTrendRouter] Search failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/batch-harvest")
def batch_harvest(request: SnsBatchHarvestRequest, db: Session = Depends(get_db)):
    """
    [대량 일괄 수집 엔진 - 100 / 200 / 500편]
    선택된 국가와 복수 카테고리에서 대량의 바이럴 숏폼 영상 및 메타데이터를 일괄 하베스팅
    요청 수량(100, 200, 500편)을 100% 충족하도록 버퍼링 및 자동 보충 메커니즘 가동
    """
    try:
        import math
        all_items: List[Dict[str, Any]] = []
        seen_ids = set()
        seen_creators = set()
        cats = request.categories or ["trending", "meme", "challenge", "tips", "drama", "mukbang", "tech", "knowledge"]
        per_cat = max(12, math.ceil((request.limit * 1.25) / len(cats)))
        from concurrent.futures import ThreadPoolExecutor

        def fetch_cat_batch(cat: str):
            from app.database import SessionLocal
            cat_db = SessionLocal()
            try:
                return sns_trend_service.search_sns_videos(
                    platform=request.platform,
                    country=request.country,
                    category=cat,
                    limit=per_cat,
                    max_per_creator=1,
                    db=cat_db
                )
            finally:
                cat_db.close()

        with ThreadPoolExecutor(max_workers=min(6, len(cats))) as executor:
            cat_results = list(executor.map(fetch_cat_batch, cats))

        for batch in cat_results:
            for it in batch:
                if not it:
                    continue
                if is_forbidden_south_southeast_asian(
                    title=it.get('title', ''),
                    creator_handle=it.get('creator_handle', ''),
                    creator_name=it.get('creator_name', ''),
                    video_url=it.get('video_url', ''),
                    description=it.get('reason', ''),
                    target_country=request.country or "KR"
                ):
                    continue

                c_handle = clean_handle(it.get('creator_handle') or it.get('creator_name') or '')
                if c_handle and c_handle not in ["unknown", "creator"]:
                    if c_handle in seen_creators:
                        continue
                    seen_creators.add(c_handle)

                if it['id'] not in seen_ids and (it.get('duration_sec') or 0) <= 90.0:
                    seen_ids.add(it['id'])
                    all_items.append(it)
                if len(all_items) >= request.limit:
                    break
            if len(all_items) >= request.limit:
                break

        # 요청 수량에 미달할 경우 다각도 바이럴 보충 쿼리로 100% 정량 충족
        if len(all_items) < request.limit:
            country_code = (request.country or "KR").upper()
            REPLENISH_KEYWORDS = {
                "KR": [
                    "인기 쇼츠", "바이럴 숏폼", "실시간 트렌드", "챌린지 댄스", "유머 레전드",
                    "생활 꿀팁", "1분 지식", "먹방 ASMR", "IT 테크", "쇼츠 드라마",
                    "숏폼 릴스", "웃긴 영상", "킬링타임", "감동 실화", "반전 결말",
                    "신박한 꿀팁", "직장인 공감", "꿀잼 숏폼", "화제의 영상", "인기 급상승"
                ],
                "US": [
                    "viral shorts", "trending reels", "tiktok dance", "comedy sketch",
                    "life hacks", "quick facts", "food asmr", "tech review",
                    "drama story", "daily vlog", "meme compilation", "satisfying video",
                    "mind blowing facts", "challenge shorts"
                ],
                "JP": [
                    "人気 トレンド", "バズる ショート", "ダンス チャレンジ", "面白い ミーム",
                    "ライフハック", "豆知識 雑学", "グルメ モッパン", "ショートドラマ", "話題の動画"
                ],
                "TW": [
                    "發燒 爆紅", "熱門 短影音", "搞笑 迷因", "生活 實用",
                    "美食 吃播", "科技 數碼", "短劇 故事", "精選 推薦"
                ],
                "VN": [
                    "thịnh hành viral", "video ngắn hot", "hài hước", "mẹo vặt",
                    "kiến thức thú vị", "ẩm thực review", "xu hướng mới"
                ],
                "ALL": [
                    "viral trending shorts", "popular reels", "comedy funny", "dance challenge",
                    "life hacks", "quick facts", "satisfying asmr", "mega hit shorts"
                ]
            }
            kw_list = REPLENISH_KEYWORDS.get(country_code, REPLENISH_KEYWORDS["KR"])
            for kw in kw_list:
                if len(all_items) >= request.limit:
                    break
                needed = request.limit - len(all_items)
                fetch_qty = min(36, needed + 6)
                extra_items = sns_trend_service.search_sns_videos(
                    platform=request.platform,
                    query=kw,
                    country=request.country,
                    category="trending",
                    limit=fetch_qty,
                    max_per_creator=1,
                    db=db
                )
                for it in extra_items:
                    if not it:
                        continue
                    if is_forbidden_south_southeast_asian(
                        title=it.get('title', ''),
                        creator_handle=it.get('creator_handle', ''),
                        creator_name=it.get('creator_name', ''),
                        video_url=it.get('video_url', ''),
                        description=it.get('reason', ''),
                        target_country=request.country or "KR"
                    ):
                        continue

                    c_handle = clean_handle(it.get('creator_handle') or it.get('creator_name') or '')
                    if c_handle and c_handle not in ["unknown", "creator"]:
                        if c_handle in seen_creators:
                            continue
                        seen_creators.add(c_handle)

                    if it['id'] not in seen_ids and (it.get('duration_sec') or 0) <= 90.0:
                        seen_ids.add(it['id'])
                        all_items.append(it)
                    if len(all_items) >= request.limit:
                        break

        final_batch = all_items[:request.limit]

        return {
            "status": "success",
            "platform": request.platform,
            "country": request.country,
            "requested_limit": request.limit,
            "harvested_count": len(final_batch),
            "items": final_batch
        }
    except Exception as e:
        logger.error(f"[SnsTrendRouter] Batch harvest failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/telemetry")
def get_patrol_telemetry():
    """
    SNS 관제 레이더 실시간 텔레메트리 및 탐지 피드 (바이럴 스카우트 HUD 직결)
    """
    return sns_patrol_worker.get_telemetry()


@router.post("/patrol/start")
def start_patrol_worker():
    """
    SNS 자율 관제 순찰 레이더 워커 가동
    """
    sns_patrol_worker.start()
    return {"status": "success", "is_running": True, "message": "SNS 자율 관제 순찰 레이더가 가동되었습니다."}


@router.post("/patrol/stop")
def stop_patrol_worker():
    """
    SNS 자율 관제 순찰 레이더 워커 일시정지
    """
    sns_patrol_worker.stop()
    return {"status": "success", "is_running": False, "message": "SNS 자율 관제 순찰 레이더가 일시정지되었습니다."}


@router.post("/patrol/trigger")
def trigger_patrol_now(
    country: str = Query("KR"),
    category: str = Query("trending"),
    limit: int = Query(36)
):
    """
    지정 국가/카테고리 즉시 강제 순찰 발진
    """
    res = sns_patrol_worker.trigger_patrol_now(country=country, category=category, limit=limit)
    return res


@router.post("/patrol/config")
def update_patrol_config(config: SnsPatrolConfigRequest):
    """
    자율 순찰 레이더 설정 변경 (자동 입고 토글, 순찰 주기)
    """
    if config.auto_download is not None:
        sns_patrol_worker.auto_download = config.auto_download
    if config.interval_seconds is not None:
        sns_patrol_worker.interval_seconds = max(60, config.interval_seconds)
    return {
        "status": "success",
        "auto_download": sns_patrol_worker.auto_download,
        "interval_seconds": sns_patrol_worker.interval_seconds
    }


@router.post("/find-original")
def find_original_by_reference(request: SnsOriginalFinderRequest, db: Session = Depends(get_db)):
    """
    [픽셀링 원작자 정보로 원본 찾기 1:1 역공학 이식]
    레퍼런스 영상 설명/제목의 핸들을 추출하여 원작 채널의 유사 길이/이전 업로드 원조 영상을 채점 발굴
    """
    try:
        res = sns_trend_service.find_original_by_reference(
            reference_url=request.reference_url,
            title=request.title or "",
            description=request.description or "",
            limit=request.limit or 8,
            db=db
        )
        return res
    except Exception as e:
        logger.error(f"[SnsTrendRouter] Original Finder failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/download")
def download_to_gallery(request: SnsDownloadRequest, db: Session = Depends(get_db)):
    """
    선택된 SNS 영상들을 07_Downloads로 다운로드하고 viral_loop.db videos 테이블에 등록하여
    영상 보관함(/gallery)으로 즉시 입고
    """
    if not request.urls:
        raise HTTPException(status_code=400, detail="urls cannot be empty")

    try:
        results = sns_trend_service.download_to_gallery(
            urls=request.urls,
            category_id=request.category_id,
            db=db
        )
        success_count = sum(1 for r in results if r.get("status") == "success")
        return {
            "status": "success",
            "total": len(request.urls),
            "success_count": success_count,
            "results": results
        }
    except Exception as e:
        logger.error(f"[SnsTrendRouter] Download to gallery failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/popular-presets")
def get_popular_presets():
    """
    TikTok & Instagram 추천 트렌드 키워드/해시태그 프리셋
    """
    return {
        "categories": [
            {"id": "trending", "label": "🔥 실시간 급상승", "icon": "Flame"},
            {"id": "meme", "label": "😂 밈/코미디", "icon": "Laugh"},
            {"id": "challenge", "label": "💃 챌린지/댄스", "icon": "Music"},
            {"id": "tips", "label": "💡 꿀팁/라이프", "icon": "Lightbulb"},
            {"id": "drama", "label": "🎬 쇼츠드라마", "icon": "Film"},
            {"id": "mukbang", "label": "🍜 먹방/푸드", "icon": "Utensils"},
            {"id": "tech", "label": "🤖 AI/테크", "icon": "Cpu"},
            {"id": "knowledge", "label": "📚 지식/정보", "icon": "BookOpen"}
        ],
        "countries": [
            {"code": "ALL", "name": "글로벌 통합", "flag": "🌐"},
            {"code": "KR", "name": "대한민국", "flag": "🇰🇷"},
            {"code": "US", "name": "미국/북미", "flag": "🇺🇸"},
            {"code": "JP", "name": "일본", "flag": "🇯🇵"},
            {"code": "TW", "name": "대만/중화", "flag": "🇹🇼"},
            {"code": "VN", "name": "베트남/동남아", "flag": "🇻🇳"}
        ],
        "tiktok": [
            {"label": "🔥 실시간 트렌딩", "query": "trending", "type": "TRENDING"},
            {"label": "#fyp", "query": "fyp", "type": "HASHTAG"},
            {"label": "#챌린지", "query": "challenge", "type": "HASHTAG"},
            {"label": "#꿀팁", "query": "tips", "type": "HASHTAG"},
            {"label": "#유머/썰", "query": "comedy", "type": "HASHTAG"},
            {"label": "#먹방", "query": "mukbang", "type": "HASHTAG"},
            {"label": "#숏드라마", "query": "drama", "type": "HASHTAG"},
            {"label": "#AI영상", "query": "aivideo", "type": "HASHTAG"}
        ],
        "instagram": [
            {"label": "🔥 릴스 급상승", "query": "reels", "type": "TRENDING"},
            {"label": "#reelsinstagram", "query": "reelsinstagram", "type": "HASHTAG"},
            {"label": "#viral", "query": "viral", "type": "HASHTAG"},
            {"label": "#일상", "query": "daily", "type": "HASHTAG"},
            {"label": "#인사이트", "query": "business", "type": "HASHTAG"},
            {"label": "#밈/유머", "query": "meme", "type": "HASHTAG"},
            {"label": "#패션/뷰티", "query": "style", "type": "HASHTAG"}
        ]
    }
