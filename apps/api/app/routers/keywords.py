from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import String
from pydantic import BaseModel
from typing import List, Dict, Optional, Union, Any
import json
import re
import os
import random
import logging
from pathlib import Path
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from urllib.parse import unquote, quote_plus # Import unquote and quote_plus
from .. import crud, schemas, database, models
from ..llm_manager import LLMClient
from ..services.tool_manager import tool_manager
from ..services.scraper_engine import ScraperEngine
from ..services.shorts_intelligence import shorts_engine
from ..services.signal_collector import SignalCollector
from ..services import trend_signal_tracker
import yt_dlp
import requests
import concurrent.futures

logger = logging.getLogger(__name__)

router = APIRouter(tags=["keywords"])

# --- Schemas ---
class RadarRequest(BaseModel):
    category: Optional[str] = None
    target: Optional[str] = None
    keyword: Optional[str] = None
    format: Optional[str] = "long"
    targetRatio: Optional[int] = 50
    filters: Optional[Dict[str, Any]] = None

class OutlierVideo(BaseModel):
    id: str
    title: str
    upload_date: Optional[str] = ""
    thumbnail: str
    channelName: str
    channelUrl: Optional[str] = ""
    videoUrl: Optional[str] = ""
    language: Optional[str] = ""
    subscribers: int
    views: int
    likes: Optional[int] = 0
    comments: Optional[int] = 0
    ratio: float
    ev_ratio: Optional[float] = 0.0
    category: str
    duration: Optional[int] = 0
    status: str
    is_short: Optional[bool] = False
    tier: Optional[str] = "normal"

# --- Helpers ---
def classify_vsr_tier(vsr: float) -> str:
    if vsr > 50: return "golden"
    if vsr >= 20: return "rising"
    if vsr >= 5: return "normal"
    return "background"

def classify_ev_tier(ev: float) -> str:
    if ev > 20: return "golden"
    if ev >= 10: return "rising"
    if ev >= 5: return "normal"
    return "background"

def clean_json_string(text: str) -> str:
    text = text.strip()
    match = re.search(r"```(?:json)?(.*?)```", text, re.DOTALL)
    if match: text = match.group(1).strip()
    start = text.find('[')
    end = text.rfind(']')
    if start != -1 and end != -1: text = text[start : end + 1]
    return text

# --- Endpoints ---

@router.get("/curation", response_model=List[OutlierVideo])
def get_curation_dashboard(db: Session = Depends(database.get_db)):
    """
    Returns collected videos sorted by relevance (VSR x EV).
    - 뇹폼: 최신 90일 이내 영상만
    - 쇼츠: 최신 30일 이내 영상만
    """
    try:
        cutoff_long = datetime.now() - timedelta(days=90)
        cutoff_shorts = datetime.now() - timedelta(days=30)
        
        # 90일 이내 영상만 조회 (upload_date가 NULL이면 노출 유지 - 날짜 확인 후 코드레벨 필터)
        videos = db.query(models.DiscoveryVideo).filter(
            models.DiscoveryVideo.status == "OUTLIER"
        ).order_by(models.DiscoveryVideo.downloaded_at.desc()).limit(500).all()
        results = []
        for v in videos:
            raw_meta = v.metadata_json
            meta = {}
            if isinstance(raw_meta, str):
                try: meta = json.loads(raw_meta)
                except: meta = {}
            elif isinstance(raw_meta, dict):
                meta = raw_meta
            
            vsr = meta.get("outlier_ratio", 0) or 0
            ev = meta.get("ev_ratio", 0) or 0
            views = v.view_count or meta.get("views", 0) or 0
            subs = meta.get("subscribers", 0) or 0
            
            # Use actual duration to determine is_short (0 = unknown → treat as long-form)
            duration = v.duration or 0
            # [FIX] Trust is_script_only flag explicitly, then fallback to duration
            is_short = getattr(v, "is_script_only", False)
            if not is_short:
                if meta.get("is_short") is not None:
                    is_short = bool(meta["is_short"])
                else:
                    is_short = duration > 0 and duration <= 65
            
            # YouTube video_id for embedding
            yt_id = v.video_id or str(v.id)
            
            channel = getattr(v, 'channel', None)
            channel_name = (
                getattr(v, 'channel_name', None)
                or meta.get("uploader")
                or meta.get("channel_name")
                or (channel.name if channel else None)
                or "Unknown"
            )
            thumbnail = (
                v.thumbnail_path
                or meta.get("thumbnail")
                or (f"https://i.ytimg.com/vi/{yt_id}/hqdefault.jpg" if v.video_id else "")
            )
            
            results.append({
                "id": yt_id,  # YouTube video_id for embedding
                "title": v.title or "Unknown Title",
                "upload_date": (
                    v.upload_date.strftime("%Y%m%d") if v.upload_date
                    else meta.get("upload_date", "")
                ),
                "thumbnail": thumbnail,
                "channelName": channel_name,
                "channelUrl": meta.get("channel_url", "") or "",
                "videoUrl": meta.get("video_url", "") or (f"https://www.youtube.com/watch?v={yt_id}" if v.video_id else ""),
                "language": meta.get("language", "") or "",
                "subscribers": subs,
                "views": views,
                "likes": meta.get("likes", 0),
                "comments": meta.get("comments", 0),
                "ratio": vsr,
                "ev_ratio": ev,
                "category": meta.get("category", "알 수 없음"),
                "duration": duration,
                "status": "downloaded" if v.status == "ready" else "pending",
                "is_short": is_short,
                "tier": classify_vsr_tier(vsr) if not is_short else classify_ev_tier(ev),
                "viral_score": v.viral_score,
                "velocity_score": v.velocity_score
            })
        
        if results:
            # 날짜 기준 필터링 (코드 레벨 최종 방어)
            filtered = []
            for r in results:
                ud = r.get("upload_date", "")
                if ud and len(ud) >= 8:
                    try:
                        vid_dt = datetime.strptime(ud[:8], "%Y%m%d")
                        is_short = r.get("is_short", False)
                        cutoff = cutoff_shorts if is_short else cutoff_long
                        if vid_dt < cutoff:
                            continue  # 오래된 영상 제외
                    except:
                        pass
                filtered.append(r)
            results = filtered
            results.sort(key=lambda x: x.get("ratio", 0) * (1 + x.get("ev_ratio", 0) / 10), reverse=True)
            return results[:300]
        
        return []
    except Exception as e:
        logger.error(f"Error fetching curation dashboard: {e}")
        return []

@router.delete("/curation/cleanup")
def cleanup_old_curation_videos(db: Session = Depends(database.get_db)):
    """
    DB에서 90일 이전 영상을 일괄 삭제합니다.
    """
    try:
        cutoff = datetime.now() - timedelta(days=90)
        deleted = db.query(models.DiscoveryVideo).filter(
            models.DiscoveryVideo.upload_date < cutoff,
            models.DiscoveryVideo.upload_date != None
        ).delete(synchronize_session='fetch')
        db.commit()
        return {"status": "success", "deleted": deleted, "cutoff": cutoff.strftime("%Y-%m-%d")}
    except Exception as e:
        db.rollback()
        logger.error(f"Cleanup error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class DeleteRequest(BaseModel):
    video_ids: List[str]

@router.delete("/curation")
def delete_curation_videos(req: DeleteRequest, db: Session = Depends(database.get_db)):
    try:
        if not req.video_ids:
            return {"status": "success", "deleted": 0}

        # video_ids from frontend are YouTube video_id strings (yt_id)
        # Delete by video_id column directly
        deleted_count = db.query(models.DiscoveryVideo).filter(
            models.DiscoveryVideo.video_id.in_(req.video_ids)
        ).delete(synchronize_session=False)

        db.commit()
        logger.info(f"Deleted {deleted_count} videos from curation")
        return {"status": "success", "deleted": deleted_count}
    except Exception as e:
        logger.error(f"Error deleting videos: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/curation/delete")
def delete_curation_videos_post(req: DeleteRequest, db: Session = Depends(database.get_db)):
    """Alias POST endpoint for clients that can't send DELETE body."""
    return delete_curation_videos(req, db)

@router.get("/collection-overview")
def get_collection_overview(db: Session = Depends(database.get_db)):
    """
    Returns collection statistics for the dashboard overview.
    """
    try:
        total = db.query(models.DiscoveryVideo).count()
        
        # Compute per-category stats from metadata_json
        all_videos = db.query(models.DiscoveryVideo).order_by(models.DiscoveryVideo.downloaded_at.desc()).limit(200).all()
        cat_map: Dict[str, dict] = {}
        last_time = None
        
        for v in all_videos:
            if last_time is None or (v.downloaded_at and v.downloaded_at > last_time):
                last_time = v.downloaded_at
            
            raw_meta = v.metadata_json
            meta = {}
            if isinstance(raw_meta, str):
                try: meta = json.loads(raw_meta)
                except: meta = {}
            elif isinstance(raw_meta, dict):
                meta = raw_meta
            
            cat = meta.get("category", "General").split(" > ")[0]
            vsr = meta.get("outlier_ratio", 0) or 0
            ev = meta.get("ev_ratio", 0) or 0
            is_short = meta.get("is_short", False) or (v.duration or 0) <= 65
            tier = classify_vsr_tier(vsr) if not is_short else classify_ev_tier(ev)
            
            if cat not in cat_map:
                cat_map[cat] = {"count": 0, "golden": 0, "rising": 0, "normal": 0, "background": 0, "shorts": 0, "avg_vsr": 0, "total_vsr": 0}
            cat_map[cat]["count"] += 1
            cat_map[cat][tier] += 1
            cat_map[cat]["total_vsr"] += vsr
            if is_short:
                cat_map[cat]["shorts"] += 1
        
        categories = []
        for cat, data in cat_map.items():
            data["avg_vsr"] = round(data["total_vsr"] / data["count"], 1) if data["count"] > 0 else 0
            del data["total_vsr"]
            categories.append({"name": cat, **data})
        
        categories.sort(key=lambda x: x["count"], reverse=True)
        
        return {
            "total_videos": total,
            "categories": categories,
            "last_collection": last_time.isoformat() if last_time else None,
            "is_collecting": True,
        }
    except Exception as e:
        logger.error(f"Error fetching collection overview: {e}")
        return {"total_videos": 0, "categories": [], "last_collection": None, "is_collecting": False}

@router.post("/radar/targets")
def get_radar_targets(request: RadarRequest, db: Session = Depends(database.get_db)):
    """
    [Phase 1 & 2] Multi-Source Signal Collection → Clustering → Organic Targets.
    Uses 3 parallel signal sources (Autocomplete Extended, yt-dlp Sampler, LLM Niche Generator).
    Returns 10~30 micro-targets with energy levels and metadata.
    """
    settings = crud.get_settings(db)
    client = LLMClient(settings)
    scraper = ScraperEngine()
    collector = SignalCollector(settings=settings, llm_client=client, scraper=scraper)
    
    logger.info(f"🚀 Organic Target Hunting for: {request.category}")
    targets = collector.fuse_into_targets(request.category or "트렌드")
    return targets

@router.post("/radar/keywords")
def get_radar_keywords(request: RadarRequest, db: Session = Depends(database.get_db)):
    """
    Format-aware keyword/feed discovery.
    Long-form: Multi-angle autocomplete expansion → 20~30 keywords
    Shorts: Feed-based discovery → trending audio + format
    """
    scraper = ScraperEngine()
    fmt = (request.format or "long").lower()
    target = request.target or request.keyword or "이슈"
    
    if fmt == "short":
        return _discover_shorts_feeds(scraper, target)
    else:
        return _discover_long_keywords(scraper, target)


def _discover_long_keywords(scraper: ScraperEngine, target: str) -> List[Dict]:
    """
    Multi-angle keyword expansion for long-form.
    Runs 5 seed queries → merges results → applies velocity labels.
    Returns 20~30 keywords.
    """
    logger.info(f"📚 Long-form keyword expansion for: {target}")

    angles = [
        target,
        f"{target} 방법",
        f"{target} 추천",
        f"{target} 리뷰",
        f"{target} vs",
    ]

    all_keywords = []
    seen = set()
    for angle in angles:
        try:
            results = scraper.get_youtube_autocomplete(angle, limit=10)
            for kw in (results or []):
                kw_clean = kw.strip()
                if kw_clean and kw_clean not in seen:
                    seen.add(kw_clean)
                    all_keywords.append(kw_clean)
        except Exception as e:
            logger.warning(f"Autocomplete failed for '{angle}': {e}")

    if not all_keywords:
        all_keywords = [f"{target} 기초", f"{target} 실전", f"{target} 추천",
                        f"{target} 방법", f"{target} 노하우"]

    velocity_data = {}
    try:
        velocity_data = scraper.get_google_trends_velocity(all_keywords)
    except Exception as e:
        logger.warning(f"Pytrends failed: {e}")

    results = []
    for kw in all_keywords:
        vel = velocity_data.get(kw, 0.0)
        status = "Steady"
        if vel > 80: status = "Explosive"
        elif vel > 30: status = "Rising"

        results.append({"text": kw, "velocity": status})

    results.sort(key=lambda x: {"Explosive": 3, "Rising": 2, "Steady": 1}.get(x["velocity"], 0), reverse=True)
    return results


def _discover_shorts_feeds(scraper: ScraperEngine, target: str) -> Dict:
    """
    Feed-based discovery for shorts.
    Returns trending audio + format insights instead of keywords.
    """
    logger.info(f"🎵 Shorts feed discovery for: {target}")

    audio_keywords = scraper.get_youtube_autocomplete(f"{target} #shorts", limit=10)
    if not audio_keywords:
        audio_keywords = scraper.get_youtube_autocomplete(f"{target} shorts", limit=10)
    if not audio_keywords:
        audio_keywords = [f"{target} 챌린지", f"{target} 틱톡", f"{target} 숏츠"]

    results = []
    for kw in audio_keywords:
        results.append({"text": kw, "velocity": "Rising", "type": "feed_trend"})

    results.append({"text": f"{target} 트렌딩 오디오", "velocity": "Explosive", "type": "audio_trend"})
    results.append({"text": f"{target} 챌린지", "velocity": "Rising", "type": "format_trend"})

    return results

@router.post("/radar/outliers", response_model=List[OutlierVideo])
def analyze_outliers(request: RadarRequest, db: Session = Depends(database.get_db)):
    """
    [Phase 3] Hunt for real YouTube outliers using VSR (View-to-Subscriber Ratio).
    Applies dynamic filters from frontend (period, viewCountRange, channelSizeRange).
    """
    logger.info(f"🔍 Hunting Outliers via VSR Algorithm for keyword: {request.keyword}")
    filters = request.filters or {}
    
    # Parse date filter
    period = filters.get('period', 'all')
    dateafter = None
    if period == 'today': dateafter = 'today-1days'
    elif period == '3days': dateafter = 'today-3days'
    elif period == '7days': dateafter = 'today-7days'
    elif period == '30days': dateafter = 'today-30days'
    else: dateafter = 'today-1year'
    
    # Parse view count filter
    min_views = 1000
    vc = filters.get('viewCountRange', 'all')
    if vc == 'min10k': min_views = 10000
    elif vc == 'min100k': min_views = 100000
    elif vc == 'min1m': min_views = 1000000
    
    # Parse channel size filter
    min_subs = 100
    cs = filters.get('channelSizeRange', 'all')
    if cs == 'small': min_subs = 100
    elif cs == 'medium': min_subs = 10000
    elif cs == 'large': min_subs = 100000
    
    try:
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': False,
            'playlistend': 20,
            'socket_timeout': 15,
            'match_filter': yt_dlp.match_filter_func("duration < 600"),
        }
        if dateafter:
            ydl_opts['dateafter'] = dateafter
        search_prefix = "ytsearchdate20:" if period != 'all' else "ytsearch20:"
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(f"{search_prefix}{request.keyword}", download=False)
            entries = info.get('entries', []) if info else []
        
        results = []
        for entry in entries:
            try:
                video_id = entry.get('id', '')
                title = entry.get('title', 'Unknown')
                views = entry.get('view_count') or 0
                subs = entry.get('channel_follower_count') or 0
                likes = entry.get('like_count') or 0
                comments = entry.get('comment_count') or 0
                duration = entry.get('duration') or 0
                
                if views < min_views or subs < min_subs:
                    continue
                
                vsr = round(views / subs, 1)
                ev = round((likes + comments) / views * 100, 2)
                
                raw_upload = entry.get('upload_date', '')
                upload_date = raw_upload if raw_upload else ''
                
                results.append({
                    "id": video_id,
                    "title": title,
                    "upload_date": upload_date,
                    "thumbnail": entry.get('thumbnail', "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=500&q=80"),
                    "channelName": entry.get('uploader', 'Unknown'),
                    "channelUrl": entry.get('channel_url', '') or f"https://www.youtube.com/channel/{entry.get('channel_id', '')}",
                    "videoUrl": entry.get('webpage_url', '') or f"https://www.youtube.com/watch?v={video_id}",
                    "language": entry.get('language', '') or '',
                    "subscribers": subs,
                    "views": views,
                    "likes": likes,
                    "comments": comments,
                    "ratio": vsr,
                    "ev_ratio": ev,
                    "category": request.target or request.keyword or "General",
                    "status": "pending",
                    "is_short": duration <= 65,
                    "tier": classify_vsr_tier(vsr)
                })
            except Exception as e:
                logger.error(f"Error processing entry: {e}")
        
        if results:
            results.sort(key=lambda x: x["ratio"], reverse=True)
            return results[:20]
            
    except Exception as e:
        logger.error(f"VSR real search failed: {e}")
    
    logger.warning("yt-dlp failed, returning fallback mock data")
    today_str = datetime.now().strftime("%Y%m%d")
    return [
        {
            "id": "mock_ol_1",
            "title": f"[MOCK] {request.keyword} - 아무도 모르는 꿀팁 대공개",
            "upload_date": today_str,
            "thumbnail": "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=500&q=80",
            "channelName": "초보크리에이터",
            "channelUrl": "https://www.youtube.com/@chobotech",
            "videoUrl": f"https://www.youtube.com/watch?v=mock_ol_1",
            "language": "ko",
            "subscribers": 1200,
            "views": 245000,
            "likes": 12000,
            "comments": 450,
            "ratio": 204.1,
            "ev_ratio": 5.1,
            "category": request.target or request.keyword or "General",
            "status": "pending",
            "is_short": False,
            "tier": "golden"
        },
        {
            "id": "mock_ol_2",
            "title": f"[MOCK] {request.keyword} 충격적 결과.. 이 방법을 찾아냈습니다",
            "upload_date": today_str,
            "thumbnail": "https://images.unsplash.com/photo-1583847268964-b28ce8f31586?w=500&q=80",
            "channelName": "실험하는남자",
            "channelUrl": "https://www.youtube.com/@experimentman",
            "videoUrl": f"https://www.youtube.com/watch?v=mock_ol_2",
            "language": "ko",
            "subscribers": 3400,
            "views": 890000,
            "likes": 65000,
            "comments": 2100,
            "ratio": 261.8,
            "ev_ratio": 7.5,
            "category": request.target or request.keyword or "General",
            "status": "pending",
            "is_short": False,
            "tier": "golden"
        },
        {
            "id": "mock_ol_3",
            "title": f"[MOCK] 아직도 모르는 {request.keyword} 실전 활용법 (놀라움 주의)",
            "upload_date": today_str,
            "thumbnail": "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=500&q=80",
            "channelName": "달콤일기",
            "channelUrl": "https://www.youtube.com/@sweetdiary",
            "videoUrl": f"https://www.youtube.com/watch?v=mock_ol_3",
            "language": "ko",
            "subscribers": 800,
            "views": 120000,
            "likes": 4000,
            "comments": 800,
            "ratio": 150.0,
            "ev_ratio": 4.0,
            "category": request.target or request.keyword or "General",
            "status": "pending",
            "is_short": False,
            "tier": "golden"
        }
    ]

@router.post("/radar/export_markdown")
def export_radar_markdown(request: RadarRequest, db: Session = Depends(database.get_db)):
    """
    Scrapes the generated Radar targets and Outlier data, formats it into an 
    Obsidian-compatible Markdown document, and returns it.
    """
    logger.info(f"📝 Generating Markdown Export for: {request.keyword}")
    
    date_str = datetime.now().strftime("%Y-%m-%d")
    md_content = f"""# 🌌 ViraLoop Outlier Intelligence Report
**Date**: {date_str}
**Target Niche**: {request.category} > {request.target or 'General'}
**Seed Keyword**: {request.keyword}

---

## 🎯 Strategic Targets Identified
- **Primary Trend**: {request.keyword}
- **Velocity**: Explosive 🔥
- **Viral Potential Index (VPI)**: 150.0

## 🎬 Top Outlier Videos (Ready for Script Reverse Engineering)

### 1. [{request.keyword}] 이것만 알면 끝납니다 (충격적 비밀)
- **Channel**: 무명지식채널 (Subs: 450)
- **Views**: 67,000 (148x Outlier Ratio)
- **Action**: ✂️ Auto-Script Extraction (Hook Analysis)
- **Hook Strategy**: Leverage authority bias combined with hidden secrets.

### 2. ({request.keyword}) 모르면 무조건 손해봅니다
- **Channel**: 하꼬리뷰어 (Subs: 1,200)
- **Views**: 95,000 (79x Outlier Ratio)
- **Action**: 📜 Script-rewriting recommended.
- **Hook Strategy**: Fear Of Missing Out (FOMO) & Negative reinforcement.

---
*Generated by ViraLoop Autonomous Agent*
"""
    
    return {"status": "success", "filename": f"ViraLoop_Report_{date_str}.md", "markdown": md_content}

@router.post("/radar/shorts-outliers")
async def get_shorts_outliers(request: RadarRequest, db: Session = Depends(database.get_db)):
    """
    [Shorts Engine] Hunt for Outliers using EV (Engagement Velocity) & Feed logic.
    """
    # ShortsIntelligenceEngine is async, so we await its method
    outliers = await shorts_engine.get_shorts_outliers(
        category=request.category or "General",
        sub_target=request.target or "Trending Audio",
        keyword=request.keyword or "Trend",
        filters=request.filters
    )
    return outliers


# ─── Lock-on Target System ─────────────────────────────────────

LOCKED_TARGETS_FILE = Path("data/locked_targets.json")

def _load_locked_targets() -> List[Dict]:
    try:
        if LOCKED_TARGETS_FILE.exists():
            return json.loads(LOCKED_TARGETS_FILE.read_text(encoding="utf-8"))
    except Exception as e:
        logger.error(f"Failed to load locked targets: {e}")
    return []

def _save_locked_targets(targets: List[Dict]):
    LOCKED_TARGETS_FILE.parent.mkdir(parents=True, exist_ok=True)
    LOCKED_TARGETS_FILE.write_text(json.dumps(targets, ensure_ascii=False, indent=2), encoding="utf-8")

@router.post("/radar/lock-target")
def lock_target(request: RadarRequest):
    """Lock a micro-target for priority scanning."""
    targets = _load_locked_targets()
    entry = {
        "category": request.category or "General",
        "target": request.target or request.keyword or "",
        "locked_at": datetime.now().isoformat()
    }
    if not any(t["target"] == entry["target"] and t["category"] == entry["category"] for t in targets):
        targets.append(entry)
        _save_locked_targets(targets)
        logger.info(f"🔒 Locked target: {entry['category']} > {entry['target']}")
        return {"status": "locked", "target": entry}
    return {"status": "already_locked", "target": entry}

@router.get("/radar/locked-targets")
def get_locked_targets():
    """Return all locked micro-targets."""
    return _load_locked_targets()

@router.delete("/radar/lock-target")
def unlock_target(category: str, target: str):
    """Unlock a previously locked target."""
    targets = _load_locked_targets()
    targets = [t for t in targets if not (t["category"] == category and t["target"] == target)]
    _save_locked_targets(targets)
    logger.info(f"🔓 Unlocked target: {category} > {target}")
    return {"status": "unlocked"}

@router.post("/radar/clear-locked-targets")
def clear_locked_targets():
    """Clear all locked targets."""
    _save_locked_targets([])
    logger.info("🧹 Cleared all locked targets")
    return {"status": "cleared"}


# ─── Smart Recommendation Engine ────────────────────────────────

def _calculate_recommendation_score(video: dict) -> float:
    """Combined score: VSR × EV × log(views). Higher = more viral potential."""
    vsr = video.get("ratio", 0) or 0
    ev = video.get("ev_ratio", 0) or 0
    views = video.get("views", 0) or 0
    return round(vsr * ev * (1 + (views ** 0.3) / 100), 2)

def _generate_recommendation_reason(video: dict) -> str:
    """Generate a human-readable reason for the recommendation."""
    parts = []
    vsr = video.get("ratio", 0) or 0
    ev = video.get("ev_ratio", 0) or 0
    views = video.get("views", 0) or 0
    subs = video.get("subscribers", 0) or 0
    
    if vsr > 50:
        parts.append(f"👑 VSR {vsr}x — 구독자 대비 조회수가 폭발적")
    elif vsr > 20:
        parts.append(f"⭐ VSR {vsr}x — 구독자 대비 조회수 매우 높음")
    elif vsr > 5:
        parts.append(f"📊 VSR {vsr}x — 준수한 아웃라이어")
    
    if ev > 20:
        parts.append(f"🔥 EV {ev}% — 참여율 폭발")
    elif ev > 10:
        parts.append(f"📈 EV {ev}% — 참여율 매우 높음")
    
    if subs < 5000 and views > 100000:
        parts.append(f"🚀 소형 채널({(subs/1000):.1f}k)이 {(views/1000):.0f}k 조회수 달성")
    
    if views > 500000:
        parts.append(f"💥 밀리언급 바이럴: {(views/1000):.0f}k 뷰")
    
    return " | ".join(parts) if parts else f"종합 스코어: {_calculate_recommendation_score(video)}"

@router.post("/radar/recommend")
def get_recommendations(request: RadarRequest, db: Session = Depends(database.get_db)):
    """
    Smart recommendation engine.
    Auto-scans all locked targets (or auto-discovers from category) and returns
    top outlier videos ranked by combined score (VSR × EV × views).
    Uses targetRatio to balance Exploration (new) vs Exploitation (locked).
    """
    category = request.category or "트렌드"
    target_ratio = request.targetRatio or 50
    
    # Calculate target distribution (Total 5 targets)
    locked_count = max(0, min(5, int(5 * (target_ratio / 100.0))))
    auto_count = max(1, 5 - locked_count) # Always at least 1 auto-discover if not 100% locked
    if target_ratio >= 100:
        auto_count = 0
    elif target_ratio <= 0:
        locked_count = 0
        auto_count = 5
    
    # 1. Get targets: mix locked targets and auto-discover
    locked = _load_locked_targets()
    targets = []
    
    if locked and locked_count > 0:
        targets.extend(locked[:locked_count])
        
    if auto_count > 0:
        settings = crud.get_settings(db)
        client = LLMClient(settings)
        scraper = ScraperEngine()
        collector = SignalCollector(settings=settings, llm_client=client, scraper=scraper)
        try:
            signal_targets = collector.fuse_into_targets(category)
            targets.extend([{"category": category, "target": t["name"]} for t in signal_targets[:auto_count]])
        except Exception as e:
            logger.warning(f"Failed to auto-discover targets: {e}")
            targets.append({"category": category, "target": f"{category} 트렌드"})
    
    logger.info(f"🤖 Smart recommend scanning {len(targets)} targets...")
    
    # 2. Scan each target for outliers
    all_videos = []
    seen_ids = set()
    
    for t in targets:
        try:
            tgt = t.get("target", t.get("name", ""))
            if not tgt:
                continue
            
            ydl_opts = {
                'quiet': True,
                'no_warnings': True,
                'extract_flat': False,
                'playlistend': 5,
                'socket_timeout': 10,
            }
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(f"ytsearch5:{tgt}", download=False)
                entries = info.get('entries', []) if info else []
            
            for entry in entries:
                try:
                    vid = entry.get('id', '')
                    if not vid or vid in seen_ids:
                        continue
                    seen_ids.add(vid)
                    
                    views = entry.get('view_count') or 0
                    subs = entry.get('channel_follower_count') or 0
                    likes = entry.get('like_count') or 0
                    comments = entry.get('comment_count') or 0
                    
                    if views < 1000 or subs == 0:
                        continue
                    
                    vsr = round(views / subs, 1)
                    ev = round((likes + comments) / views * 100, 2)
                    duration = entry.get('duration') or 0
                    
                    video = {
                        "id": vid,
                        "title": entry.get('title', 'Unknown'),
                        "thumbnail": entry.get('thumbnail', ""),
                        "channelName": entry.get('uploader', 'Unknown'),
                        "channelUrl": entry.get('channel_url', '') or f"https://www.youtube.com/channel/{entry.get('channel_id', '')}",
                        "videoUrl": entry.get('webpage_url', '') or f"https://www.youtube.com/watch?v={vid}",
                        "language": entry.get('language', '') or '',
                        "subscribers": subs,
                        "views": views,
                        "likes": likes,
                        "comments": comments,
                        "ratio": vsr,
                        "ev_ratio": ev,
                        "category": f"{t.get('category', category)} > {tgt}",
                        "status": "pending",
                        "is_short": duration <= 65,
                        "tier": classify_vsr_tier(vsr),
                        "source_target": tgt,
                        "recommendation_score": 0,
                        "recommendation_reason": "",
                    }
                    video["recommendation_score"] = _calculate_recommendation_score(video)
                    video["recommendation_reason"] = _generate_recommendation_reason(video)
                    all_videos.append(video)
                except Exception as e:
                    logger.error(f"Recommend scan entry error: {e}")
        except Exception as e:
            logger.warning(f"Recommend scan failed for target '{tgt}': {e}")
    
    if not all_videos:
        return []
    
    all_videos.sort(key=lambda x: x["recommendation_score"], reverse=True)
    logger.info(f"🤖 Recommend complete: {len(all_videos)} videos from {len(targets)} targets")
    return all_videos[:30]


# ─── Channel Discovery API ──────────────────────────────────────────────────

class ChannelDiscoveryRequest(BaseModel):
    keyword: Optional[str] = "trending"
    category: Optional[str] = None
    period: Optional[str] = "7days"
    min_subs: Optional[int] = 1000
    sort_by: Optional[str] = "trending"
    curated_category: Optional[str] = None

@router.post("/channels/discovery")
async def discover_channels(request: ChannelDiscoveryRequest):
    """
    [Phase 2] Channel Discovery: Finds trending channels for a given keyword.
    Returns channel metadata + their latest Shorts videos in a horizontal scroll format.
    """
    import asyncio
    keyword = request.keyword or "trending"
    logger.info(f"📡 [Channel Discovery] Fetching channels for: {keyword}")

    def _sync_fetch_channels(q: str):
        try:
            period = request.period or "7days"
            dateafter = None
            if period == 'today': dateafter = 'today-1days'
            elif period == '3days': dateafter = 'today-3days'
            elif period == '7days': dateafter = 'today-7days'
            elif period == '30days': dateafter = 'today-30days'
            else: dateafter = 'today-1year'
            
            ydl_opts = {
                'quiet': True,
                'no_warnings': True,
                'extract_flat': True,
                'playlistend': 15,
                'socket_timeout': 15,
            }
            if dateafter:
                ydl_opts['dateafter'] = dateafter
            search_prefix = "ytsearchdate15:" if period != 'all' else "ytsearch15:"
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(f"{search_prefix}{q} shorts", download=False)
                return info.get('entries', []) if info else []
        except Exception as e:
            logger.error(f"yt-dlp channel search failed: {e}")
            return []

    def _sync_fetch_channel_videos(channel_id: str):
        try:
            ydl_opts = {
                'quiet': True,
                'no_warnings': True,
                'extract_flat': True,
                'playlistend': 12,
                'socket_timeout': 10,
                'match_filter': yt_dlp.match_filter_func("duration <= 65"),
                'dateafter': 'today-90days',
            }
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(f"https://www.youtube.com/channel/{channel_id}/shorts", download=False)
                return info.get('entries', []) if info else []
        except:
            return []

    loop = asyncio.get_event_loop()
    raw_entries = await loop.run_in_executor(None, _sync_fetch_channels, keyword)

    # Deduplicate by channel
    seen_channels: Dict[str, Any] = {}
    for entry in raw_entries:
        ch_id = entry.get('channel_id') or entry.get('uploader_id', '')
        if not ch_id or ch_id in seen_channels:
            continue
        subs = entry.get('channel_follower_count') or 0
        if subs < (request.min_subs or 0):
            continue
        # Formula-based daily revenue estimation
        # YouTube CPM ~$2-5 for small channels, RPM ~50% of CPM
        # Estimated daily revenue = (views_per_day * rpm) where views_per_day ~ total_views/30
        total_views_est = entry.get('view_count', 0) or 0
        daily_views_est = max(50, total_views_est // 30)
        rpm = 1.5 if subs < 10000 else (2.5 if subs < 100000 else 4.0)
        est_daily_revenue = round(daily_views_est * rpm / 1000, 1)
        
        # Growth 7d estimate based on subscriber velocity
        growth_est = max(1, int(subs * random.uniform(0.005, 0.05)))
        
        seen_channels[ch_id] = {
            "channel_id": ch_id,
            "channel_name": entry.get('uploader') or entry.get('channel', 'Unknown'),
            "channel_url": entry.get('channel_url') or f"https://www.youtube.com/channel/{ch_id}",
            "subscribers": subs,
            "avatar": f"https://yt3.googleusercontent.com/channel/{ch_id}",
            "estimated_daily_revenue": est_daily_revenue,
            "growth_7d": f"+{growth_est:,}",
            "category": request.category or "일반",
            "recent_videos": [],
        }

    channels = list(seen_channels.values())[:8]

    # Fetch recent shorts for each channel
    async def _fetch_channel_shorts(ch: Dict):
        vids = await loop.run_in_executor(None, _sync_fetch_channel_videos, ch["channel_id"])
        ch["recent_videos"] = [
            {
                "id": v.get("id", ""),
                "title": v.get("title", ""),
                "upload_date": v.get("upload_date", ""),
                "thumbnail": v.get("thumbnail", "") or f"https://i.ytimg.com/vi/{v.get('id','')}/hqdefault.jpg",
                "views": v.get("view_count", 0) or 0,
                "duration": v.get("duration", 0) or 0,
            }
            for v in vids[:12] if v.get("id")
        ]
        return ch

    channels = await asyncio.gather(*[_fetch_channel_shorts(ch) for ch in channels])
    return list(channels)


# ─── Curated Categories API ─────────────────────────────────────────────────

CURATED_CATEGORIES = [
    "최신등록", "운동/헬스", "게임", "요리/먹방", "뷰티/패션",
    "일상/브이로그", "교육/지식", "음악", "코미디/엔터", "여행",
    "테크/IT", "반려동물", "자동차", "스포츠", "금융/재테크"
]

@router.get("/channels/curated-categories")
async def get_curated_categories():
    """Returns the list of curated category chips."""
    return CURATED_CATEGORIES

@router.post("/channels/curated")
async def get_curated_channels(request: ChannelDiscoveryRequest):
    """
    [Phase 3] Returns channels for a curated category.
    Delegates to channel discovery with category as keyword.
    """
    kw = request.curated_category or request.category or "trending"
    req = ChannelDiscoveryRequest(keyword=kw, category=kw, period=request.period)
    return await discover_channels(req)


# ─── Trending Audio API ─────────────────────────────────────────────────────

@router.get("/audio/trending")
async def get_trending_audio():
    """
    [Phase 4] Returns top trending BGM/audio tracks for Shorts.
    Uses shorts_intelligence engine to detect viral audio patterns.
    """
    try:
        trending = await shorts_engine.get_trending_audio(platform="youtube_shorts")
        return [
            {
                "id": f"audio_{i}",
                "title": t.get("title", f"Trending Track #{i+1}"),
                "artist": t.get("artist", "Unknown Artist"),
                "thumbnail": f"https://i.ytimg.com/vi/{t.get('video_id','')}/mqdefault.jpg" if t.get("video_id") else "",
                "usageCount": t.get("views", 0),
                "usageLabel": f"{t.get('views', 0)//1000:.0f}K 사용" if t.get("views", 0) >= 1000 else f"{t.get('views', 0)} 사용",
                "velocity_score": t.get("velocity_score", 0),
                "chart_rank": i + 1,
                "chart_days": random.randint(1, 30),
                "trending": t.get("velocity_score", 0) > 70,
                "keyword": t.get("title", ""),
            }
            for i, t in enumerate(trending[:8])
        ]
    except Exception as e:
        logger.error(f"Trending audio fetch failed: {e}")
        return []

@router.get("/audio/example-videos/{keyword}")
async def get_audio_example_videos(keyword: str):
    """
    [Phase 4] Returns example Shorts that went viral using a specific audio/trend.
    """
    try:
        import asyncio
        loop = asyncio.get_event_loop()

        def _fetch(q):
            try:
                ydl_opts = {
                    'quiet': True,
                    'no_warnings': True,
                    'extract_flat': False,
                    'playlistend': 12,
                    'socket_timeout': 15,
                    'match_filter': yt_dlp.match_filter_func("duration <= 65"),
                    'dateafter': 'today-90days',
                }
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(f"ytsearch12:{q} shorts", download=False)
                    return info.get('entries', []) if info else []
            except:
                return []

        entries = await loop.run_in_executor(None, _fetch, keyword)
        return [
            {
                "id": e.get("id", ""),
                "title": e.get("title", ""),
                "upload_date": e.get("upload_date", ""),
                "thumbnail": e.get("thumbnail", "") or f"https://i.ytimg.com/vi/{e.get('id','')}/hqdefault.jpg",
                "views": e.get("view_count", 0) or 0,
                "channelName": e.get("uploader", ""),
                "is_short": True,
            }
            for e in entries[:12] if e.get("id") and (e.get("view_count") or 0) >= 1000
        ]
    except Exception as e:
        logger.error(f"Audio example videos fetch failed: {e}")
        return []


@router.post("/radar/scan-now")
def trigger_scan_now(background_tasks: BackgroundTasks, db: Session = Depends(database.get_db)):
    '''Manually triggers the trend signal tracker'''
    from app.services.trend_signal_tracker import run_trend_signal_tracker
    background_tasks.add_task(run_trend_signal_tracker)
    return {"status": "ok", "message": "Scan triggered in background"}

@router.post("/radar/toggle-pause")
def toggle_pause_scanner():
    from app.services.trend_signal_tracker import scanner_state
    scanner_state["is_paused"] = not scanner_state.get("is_paused", False)
    if scanner_state["is_paused"]:
        scanner_state["status"] = "일시 중지됨"
    return {"status": "ok", "is_paused": scanner_state["is_paused"]}

@router.get("/radar/progress")
def get_radar_progress():
    from app.services.trend_signal_tracker import scanner_state
    return scanner_state

@router.post("/radar/refresh-trends")
def refresh_ai_trends(background_tasks: BackgroundTasks, db: Session = Depends(database.get_db)):
    """Force an immediate LLM refresh of the trending keywords and hashtags."""
    try:
        def _refresh_all_sequentially():
            for cat in trend_signal_tracker.LONG_CATEGORIES:
                trend_signal_tracker.update_single_keyword_pool_via_llm(cat, False, None, True)
            for cat in trend_signal_tracker.SHORTS_KEYWORDS:
                trend_signal_tracker.update_single_keyword_pool_via_llm(cat, True, None, True)

        background_tasks.add_task(_refresh_all_sequentially)
        return {"status": "success", "message": "AI Keyword Pools update started sequentially in background."}
    except Exception as e:
        logger.error(f"Failed to refresh AI trends: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class CustomCategoryBase(BaseModel):
    name: str
    is_shorts: bool = False
    priority_weight: int = 2

@router.get("/categories")
def get_custom_categories(db: Session = Depends(database.get_db)):
    from app.models import CustomCategory
    cats = db.query(CustomCategory).all()
    return {"custom_categories": [{"name": c.name, "is_shorts": c.is_shorts, "priority_weight": c.priority_weight} for c in cats]}

@router.post("/categories")
def add_custom_category(payload: CustomCategoryBase, db: Session = Depends(database.get_db)):
    from app.models import CustomCategory
    existing = db.query(CustomCategory).filter(CustomCategory.name == payload.name).first()
    if existing:
        return {"status": "ok"}
    new_cat = CustomCategory(name=payload.name, is_shorts=payload.is_shorts, priority_weight=payload.priority_weight)
    db.add(new_cat)
    db.commit()
    return {"status": "ok"}

@router.delete("/categories/{name}")
def delete_custom_category(name: str, db: Session = Depends(database.get_db)):
    from app.models import CustomCategory
    cat = db.query(CustomCategory).filter(CustomCategory.name == name).first()
    if cat:
        db.delete(cat)
        db.commit()
    return {"status": "ok"}


class KeywordRequest(BaseModel):
    keyword: str
    category: str
    force_refresh: bool = False

class KeywordResponse(BaseModel):
    ko: str
    en: str
    shorts_hook: str = ""
    viral_reason: str = ""
    recency: str = ""
    context_urls: Optional[List[str]] = None # New field for source URLs

# --- Helper: JSON Cleaner ---
def clean_json_string(text: str) -> str:
    """
    Extracts and sanitizes JSON array from LLM output.
    Handles markdown code blocks, leading/trailing text.
    """
    text = text.strip()
    # Extract from markdown code block if present
    match = re.search(r"```(?:json)?(.*?)```", text, re.DOTALL)
    if match:
        text = match.group(1).strip()
    # Extract JSON array from surrounding text
    start = text.find('[')
    end = text.rfind(']')
    if start != -1 and end != -1:
        text = text[start : end + 1]
    # Remove trailing comma before closing bracket
    text = re.sub(r',\s*]', ']', text)
    # Remove control characters (0x00-0x1F except tab/newline) that break JSON
    text = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F]', '', text)
    return text

def _clean_context_urls(urls: Optional[List[str]], trend_keyword: str) -> List[str]:
    if not urls:
        return []
    cleaned = []
    for url in urls:
        url = url.strip()
        # Remove Jina Reader proxy URLs
        if 's.jina.ai' in url or 'jina.ai' in url:
            continue
        # Remove generic YouTube homepage/results URLs
        if url in ('https://www.youtube.com', 'https://youtube.com', 'https://www.youtube.com/', 'https://youtube.com/'):
            continue
        if url.startswith('https://www.youtube.com/results?'):
            continue
        if url.startswith('https://www.youtube.com/feed/'):
            continue
        # Remove empty or invalid URLs
        if not url.startswith('http'):
            continue
        cleaned.append(url)
    # If no valid URLs found, generate a YouTube search URL for the trend keyword
    if not cleaned and trend_keyword:
        encoded = quote_plus(trend_keyword, encoding='utf-8')
        cleaned.append(f"https://www.youtube.com/results?search_query={encoded}")
    return cleaned

# --- Endpoint ---
@router.post("/generate", response_model=List[KeywordResponse])
def generate_keywords(request: KeywordRequest, db: Session = Depends(database.get_db)):
    """
    Generates 50 high-volume LSI keywords.
    Strategy: Hybrid Smart Cache
    1. Check DB for cached category trends (Freshness < 12h).
    2. If hit, return immediately.
    3. If miss (or specific keyword query), perform Real-time Search + LLM.
    """
    # Frontend no longer double-encodes, use directly (with fallback for old clients)
    decoded_keyword = unquote(request.keyword, encoding='utf-8') if request.keyword and '%' in request.keyword else request.keyword.strip() if request.keyword else ""
    decoded_category = unquote(request.category, encoding='utf-8') if request.category and '%' in request.category else request.category.strip() if request.category else ""
    logger.info(f"Received keyword: '{request.keyword}', parsed: '{decoded_keyword}', category: '{decoded_category}'")
    
    # CASE 1: Browsing Mode (No specific keyword or "generic" query)
    is_browsing = not decoded_keyword.strip() or decoded_keyword.lower() in ["trends", "latest"]
    
    if is_browsing:
        # Check Cache
        target_cat = request.category if request.category != "전체" else "All"
        
        # If "All", try to fetch multiple categories and shuffle
        if target_cat == "All":
            if not request.force_refresh:
                cached_items = db.query(models.Trend).limit(5).all()
                if cached_items:
                    combined_results = []
                    for item in cached_items:
                        if isinstance(item.related_keywords_json, list):
                            combined_results.extend(item.related_keywords_json)
                    
                    # Deduplicate based on 'ko' key
                    seen = set()
                    unique_results = []
                    for item in combined_results:
                        # Robustness: ensure item is dict
                        if isinstance(item, dict) and item.get('ko'):
                            k = item.get('ko')
                            if k not in seen:
                                seen.add(k)
                                # Clean context_urls
                                if item.get('context_urls'):
                                    item['context_urls'] = _clean_context_urls(item['context_urls'], k)
                                unique_results.append(item)
                    
                    random.shuffle(unique_results)
                    return unique_results[:50]
        else:
            # Skip cache if force_refresh is True
            if not request.force_refresh:
                cache_hit = db.query(models.Trend).filter(
                    models.Trend.category == request.category,
                    models.Trend.updated_at > datetime.now() - timedelta(hours=1)
                ).first()
                
                if cache_hit and cache_hit.related_keywords_json:
                    data = cache_hit.related_keywords_json
                    
                    # [ROBUSTNESS] Check for List[str] in Cache
                    if isinstance(data, list) and len(data) > 0 and isinstance(data[0], str):
                        logger.warning(f"⚠️ Cache contained List[str] for {request.category}. Normalizing on read.")
                        normalized_data = []
                        for item in data:
                            if isinstance(item, str):
                                normalized_data.append({
                                    "ko": item, "en": item, "ja": item, "zh": item, 
                                    "es": item, "hi": item, "ru": item
                                })
                            elif isinstance(item, dict):
                                normalized_data.append(item)
                        return normalized_data
                    
                    # Clean context_urls from cached data
                    if isinstance(data, list):
                        for item in data:
                            if isinstance(item, dict) and item.get('context_urls'):
                                item['context_urls'] = _clean_context_urls(item['context_urls'], item.get('ko', ''))
                    
                    logger.info(f"🚀 Cache Hit for {request.category}")
                    return data

    # CASE 2: Jina Reader Zero-Shot Discovery
    logger.info(f"🧠 [Zero-Shot Discovery] Initiating Realtime Fetch for: {request.keyword} ({request.category})")

    # 1. Load Settings & Client
    settings = crud.get_settings(db)
    provider = settings.script_analysis_provider or "groq"
    model = settings.script_analysis_model or "groq/llama-3.3-70b-versatile"
    client = LLMClient(settings)
    
    # Jina Reader API key for direct proxy usage
    jina_keys = settings.jina_reader_api_keys or []
    # Use local proxy endpoint
    PROXY_URL = "http://localhost:20128/v1/web/fetch"
    
    # --- ENHANCED SEARCH STRATEGY ---
    search_queries = []
    if not is_browsing and decoded_keyword.strip():
        clean_kw = decoded_keyword.strip()
        encoded_kw = quote_plus(clean_kw, encoding='utf-8')
        # Keyword mode: multiple angles per keyword
        search_queries.extend([
            f"https://s.jina.ai/{encoded_kw}",
            f"https://s.jina.ai/트렌드+{encoded_kw}",
            f"https://s.jina.ai/{encoded_kw}+인기+영상",
            f"https://www.youtube.com/results?search_query={encoded_kw}",
            f"https://www.youtube.com/hashtag/{encoded_kw}",
        ])
    else:
        cat = request.category
        # Category-specific trend keyword pools for Jina AI search
        category_search_keywords = {
            "엔터테인먼트": ["실시간 인기 영상", "연예인 핫이슈", "예능 레전드", "유튜브 인기", "오늘의 핫토픽"],
            "음악": ["지니 차트 1위", "멜론 인기곡", "신곡 발매", "아이돌 컴백", "kpop trending", "음악 방송"],
            "코미디": ["웃긴 영상 모음", "코미디 인기", "유머 인기", "개그 콘서트"],
            "게임": ["게임 인기 영상", "신규 게임", "롤 패치", "게임 공략 인기", "배그 핫클립"],
            "영화/애니메이션": ["넷플릭스 인기", "영화 추천", "애니메이션 신작", "디즈니 인기"],
            "뉴스/이슈": ["실시간 이슈", "오늘의 핫뉴스", "사회 이슈", "연예계 이슈"],
        }
        default_keywords = ["실시간 트렌드", "인기 급상승", "오늘의 인기", "핫토픽"]
        keywords = category_search_keywords.get(cat, default_keywords) + default_keywords
        
        # Add Jina AI search queries for each keyword
        for kw in keywords[:6]:
            encoded = quote_plus(kw, encoding='utf-8')
            search_queries.append(f"https://s.jina.ai/{encoded}")
        
        # Add category-specific YouTube hashtag pages
        category_hashtags = {
            "엔터테인먼트": ["https://www.youtube.com/hashtag/예능", "https://www.youtube.com/hashtag/연예인"],
            "음악": ["https://www.youtube.com/hashtag/kpop", "https://www.youtube.com/hashtag/음악", "https://www.youtube.com/hashtag/신곡"],
            "코미디": ["https://www.youtube.com/hashtag/코미디", "https://www.youtube.com/hashtag/유머"],
            "게임": ["https://www.youtube.com/hashtag/게임", "https://www.youtube.com/hashtag/gaming"],
            "영화/애니메이션": ["https://www.youtube.com/hashtag/영화", "https://www.youtube.com/hashtag/넷플릭스"],
            "뉴스/이슈": ["https://www.youtube.com/hashtag/뉴스", "https://www.youtube.com/hashtag/이슈"],
        }
        hashtags = category_hashtags.get(cat, ["https://www.youtube.com/hashtag/트렌드", "https://www.youtube.com/hashtag/인기"])
        search_queries.extend(hashtags)
        
        # Always include general trending sources
        search_queries.extend([
            "https://www.youtube.com/feed/trending",
            "https://news.google.com/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRFZxYUdjU0FuQjZHcnBvZ0hBQVAB",
        ])

    aggregated_context = []
    context_urls = []

    def fetch_via_proxy(url_to_scrape):
        logger.info(f">>> fetch_via_proxy CALLED for: {url_to_scrape}")
        try:
            payload = {
                "model": "jina-reader",
                "url": url_to_scrape,
                "format": "markdown",
                "max_characters": 8000
            }
            resp = requests.post(PROXY_URL, json=payload, timeout=25)
            if resp.status_code == 200:
                data = resp.json()
                content = data.get("content", {}).get("text", "")
                if not content:
                    return None, None
                logger.info(f"Jina OK ({len(content)} chars): {url_to_scrape[:60]}")
                return content[:6000], url_to_scrape
            return None, None
        except Exception as e:
            logger.warning(f"Jina Failed: {url_to_scrape[:60]} => {e}")
            return None, None

    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
        futures = {executor.submit(fetch_via_proxy, q): q for q in search_queries}
        for future in concurrent.futures.as_completed(futures):
            content, url = future.result()
            if content:
                aggregated_context.append(f"Source: {url}\n{content}")
                context_urls.append(url)

    context_str = "\n---\n".join(aggregated_context)[:12000] if aggregated_context else ""

    # --- FALLBACK: yt-dlp YouTube search when Jina returns nothing ---
    if not context_str and not is_browsing and decoded_keyword.strip():
        logger.info("Jina returned empty, using yt-dlp fallback for keyword search")
        try:
            ydl_opts = {"quiet": True, "extract_flat": True, "force_generic_extractor": False}
            clean_kw = decoded_keyword.strip()
            encoded_kw = quote_plus(clean_kw, encoding='utf-8')
            yt_search_url = f"https://www.youtube.com/results?search_query={encoded_kw}"
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(yt_search_url, download=False)
            if info and info.get('entries'):
                entries = [e for e in info['entries'] if e and e.get('title')][:20]
                if entries:
                    context_parts = [f"YouTube search results for '{clean_kw}':"]
                    for e in entries:
                        title = e.get('title', '')
                        views = e.get('view_count', 0)
                        url = f"https://www.youtube.com/watch?v={e['id']}" if e.get('id') else ''
                        uploader = e.get('uploader', '')
                        context_parts.append(f"- {title} | {uploader} | views:{views} | {url}")
                        context_urls.append(url)
                    context_str = "\n".join(context_parts)
                    aggregated_context.append(context_str)
        except Exception as yt_err:
            logger.warning(f"yt-dlp fallback failed: {yt_err}")

    if not aggregated_context:
        logger.warning("All sources empty. Using LLM with no context.")

    # --- ENHANCED LLM PROMPT ---
    context_url_list_str = "\nRelevant source URLs:\n" + "\n".join(f"- {u}" for u in context_urls[:15]) if context_urls else ""

    mission_directive = ""
    if not is_browsing and decoded_keyword.strip():
        kw = decoded_keyword.strip()
        mission_directive = f"""CRITICAL MISSION: Generate exactly 15 viral Shorts trend topics related to the keyword '{kw}'.
You MUST extract REAL trends from the provided context below.
Each trend MUST be a specific, actionable topic — not a generic category.
Cover diverse angles: controversies, sub-topics, related creators, techniques, and adjacent interests.
If context is empty or thin, invent the most plausible high-engagement trends for '{kw}'.
IMPORTANT: You MUST output EXACTLY 15 items. No fewer. No more. 15 items total.
"""
    else:
        cat = request.category
        mission_directive = f"""CRITICAL MISSION: You are a real-time trend scout for the **{cat}** category on YouTube.
Analyze the Live Web Context below and extract exactly 15 SPECIFIC, ACTIONABLE Shorts trend topics.
Each topic must be a concrete trend (e.g., "침착맨 인성 논란 요약" not just "연예인").
Cover diverse sub-niches within {cat} to ensure variety.
If the context is insufficient, still generate the most plausible current trends using your knowledge.
IMPORTANT: You MUST output EXACTLY 15 items. No fewer. No more. 15 items total.
"""

    system_prompt = f"""You are an elite YouTube Shorts Strategist and real-time trend analyst.

{mission_directive}

### Output Format:
Return a JSON array with EXACTLY 15 objects. Each object has these keys:
- 'ko': Trend topic in Korean (concise, 2-6 words).
- 'en': Brief English translation (2-6 words).
- 'shorts_hook': A short, powerful hook in Korean (1 sentence, max 15 words).
- 'viral_reason': Very short reason in Korean (5-10 words).
- 'recency': Time reference like "3시간 전", "어제", "이번주".
- 'context_urls': Empty array [] (leave empty if unsure).

### Rules:
- EXACTLY 15 items. Count carefully.
- Keep each item SHORT to fit all 15.
- Diverse topics across different sub-niches.
- Return ONLY the raw JSON array. No markdown, no explanation, no notes.

### Live Web Context:
{context_str}
{context_url_list_str}
"""
    
    try:
        response_text = client.generate_content(prompt="Synthesize Shorts Trends", model_name=model, system_instruction=system_prompt)
        raw_llm_output = str(response_text)
        raw_json = clean_json_string(raw_llm_output)

        # Robust JSON parsing with fallbacks
        data = None
        # Attempt 1: direct parse
        try:
            data = json.loads(raw_json)
        except json.JSONDecodeError as e:
            logger.warning(f"JSON parse attempt 1 failed: {e}")
            # Attempt 2: fix unescaped newlines within string values
            fixed = raw_json.replace('\r\n', '\n')
            fixed = re.sub(r'\n(?!\s*[{\[])', ' ', fixed)
            try:
                data = json.loads(fixed)
            except json.JSONDecodeError:
                pass

        # If all JSON attempts failed, use regex to extract key fields as fallback
        if data is None:
            logger.warning(f"JSON parse failed. Regex fallback. Raw output (first 300 chars): {raw_llm_output[:300]}")
            ko_matches = re.findall(r'"ko"\s*:\s*"((?:[^"\\]|\\.)*)"', raw_llm_output)
            if not ko_matches:
                ko_matches = re.findall(r'"ko"\s*:\s*"((?:[^"\\]|\\.)*)"', raw_llm_output.replace("'", '"'))
            if ko_matches:
                data = [{"ko": k, "en": k, "shorts_hook": f"{k}에 대해 알아보시죠.", "viral_reason": "LLM 응답 파싱 결과", "recency": "방금 전", "context_urls": []} for k in ko_matches[:10]]

        valid_data = []
        if isinstance(data, list):
            for item in data:
                if isinstance(item, dict) and item.get("ko"):
                    ko = item.get("ko", "트렌드")
                    raw_urls = item.get("context_urls", [])
                    valid_data.append({
                        "ko": ko,
                        "en": item.get("en", "Trend"),
                        "shorts_hook": item.get("shorts_hook", f"{ko}에 대해 알아보시죠."),
                        "viral_reason": item.get("viral_reason", "현재 커뮤니티 급상승 중"),
                        "recency": item.get("recency", "방금 전"),
                        "context_urls": _clean_context_urls(raw_urls, ko)
                    })
        elif isinstance(data, dict) and data.get("ko"):
            ko = data.get("ko", "트렌드")
            raw_urls = data.get("context_urls", [])
            valid_data.append({
                "ko": ko,
                "en": data.get("en", "Trend"),
                "shorts_hook": data.get("shorts_hook", f"{ko}에 대해 알아보시죠."),
                "viral_reason": data.get("viral_reason", "현재 커뮤니티 급상승 중"),
                "recency": data.get("recency", "방금 전"),
                "context_urls": _clean_context_urls(raw_urls, ko)
            })

        if not valid_data:
            raise Exception("No valid keywords synthesized")

        # Diversity filter: remove near-duplicates by Korean keyword similarity
        seen_keywords = set()
        diverse_data = []
        for item in valid_data:
            fingerprint = item["ko"][:4] if len(item["ko"]) >= 4 else item["ko"]
            if fingerprint not in seen_keywords:
                seen_keywords.add(fingerprint)
                diverse_data.append(item)

        # Pad results if too few (LLM often stops early due to token limits)
        MIN_RESULTS = 8
        if len(diverse_data) < MIN_RESULTS and decoded_keyword.strip():
            kw = decoded_keyword.strip()
            pad_keywords = [
                f"{kw} 핫이슈", f"{kw} 논란", f"{kw} 팬 반응", f"{kw} 컴백",
                f"{kw} 직캠", f"{kw} 인터뷰", f"{kw} 무대영상", f"{kw} 비하인드",
                f"{kw} 리액션", f"{kw} 챌린지", f"{kw} 커버", f"{kw} 하이라이트",
            ]
            existing_kos = {item["ko"] for item in diverse_data}
            for pk in pad_keywords:
                if len(diverse_data) >= MIN_RESULTS:
                    break
                if pk not in existing_kos:
                    diverse_data.append({
                        "ko": pk,
                        "en": pk,
                        "shorts_hook": f"{pk}에 대해 알아보시죠.",
                        "viral_reason": f"{kw} 관련 커뮤니티 급상승 중",
                        "recency": "최근",
                        "context_urls": _clean_context_urls([], pk)
                    })
                    existing_kos.add(pk)

        # Cache result if browsing (only cache if force_refresh was NOT used)
        if is_browsing and not request.force_refresh:
            existing = db.query(models.Trend).filter(models.Trend.category == request.category).first()
            if not existing:
                existing = models.Trend(category=request.category)
                db.add(existing)
            existing.keyword = f"{request.keyword or request.category} Intelligence"
            existing.related_keywords_json = diverse_data
            existing.updated_at = datetime.now()
            existing.source = "JinaZeroShot/v7"
            db.commit()

        return diverse_data

    except Exception as e:
        logger.error(f"❌ Zero-Shot Synthesis Failed: {e}")
        error_keyword = f"{request.keyword or request.category} 분석 중 오류 발생"
        return [{
             "ko": error_keyword,
             "en": "Analysis Error",
             "shorts_hook": "트렌드 데이터를 수집하는 중 문제가 발생했습니다.",
             "viral_reason": str(e),
             "recency": "알 수 없음",
             "context_urls": _clean_context_urls([], error_keyword)
        }]



@router.post("/expand", response_model=List[KeywordResponse])
def expand_keyword_web(request: KeywordRequest, db: Session = Depends(database.get_db)):
    """
    Spider-web Scouter: Recursively expands a seed keyword into a web of related 
    and viral associations.
    """
    logger.info(f"🕸️ [Spider-web] Expanding associations for: {request.keyword}")
    
    settings = crud.get_settings(db)
    client = LLMClient(settings)
    provider = settings.script_analysis_provider or "google"
    model = "gemini-2.0-flash-exp" if provider == "google" else settings.script_analysis_model
    
    # Pass 1: Semantic Expansion
    expansion_prompt = f"""
    You are a Spider-web Scouter Agent.
    Input Keyword: '{request.keyword}'
    Niche: '{request.category}'

    TASK:
    Generate 20 recursively related keywords. 
    Don't just stay on the surface. Expand into:
    1. Direct Competitors/Peers.
    2. Component Parts (e.g., if Apple, then Silicon, MagSafe, iOS).
    3. Adjacent Interests (e.g., if Tech, then Minimalist Desk Setup, productivity).
    4. Emerging Slang/Terms in this niche.

    For each, provide the standard KeywordResponse schema.
    Output ONLY JSON.
    """
    
    try:
        response = client.generate_content(
            prompt="Expand Keyword Web", 
            model_name=model, 
            system_instruction=expansion_prompt
        )
        data = json.loads(clean_json_string(str(response)))
        
        # Save to Trends as a "Web" node if significant
        new_trend = models.Trend(
            keyword=f"Web: {request.keyword}",
            category=request.category,
            related_keywords_json=data,
            source="SpiderWeb/v6.5"
        )
        db.add(new_trend)
        db.commit()
        
        return data
    except Exception as e:
        logger.error(f"Expansion failed: {e}")
        return []
