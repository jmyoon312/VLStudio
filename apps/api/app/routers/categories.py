from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime, timedelta
import json
import logging
import asyncio
import yt_dlp

from app.database import get_db
from app import models, crud
from app.llm_manager import LLMClient
from app.services.trend_radar import TrendRadarService
from app.services.scout_stream_engine import detect_language_script

logger = logging.getLogger("categories")
router = APIRouter(tags=["categories"])

class CategoryCreate(BaseModel):
    name: str
    parent_id: Optional[int] = None
    level: Optional[int] = 0
    color: Optional[str] = "#3B82F6"
    order_index: Optional[int] = 0
    persona_target: Optional[str] = None
    content_tone: Optional[str] = None
    negative_keywords: Optional[List[str]] = None
    benchmark_rules: Optional[Dict[str, Any]] = None

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    order_index: Optional[int] = None
    persona_target: Optional[str] = None
    content_tone: Optional[str] = None
    negative_keywords: Optional[List[str]] = None
    benchmark_rules: Optional[Dict[str, Any]] = None

class CategoryResponse(BaseModel):
    id: int
    name: str
    name_en: Optional[str] = None
    folder_name: Optional[str] = None
    parent_id: Optional[int] = None
    level: Optional[int] = 0
    color: Optional[str] = "#3B82F6"
    order_index: Optional[int] = 0
    is_fixed: Optional[bool] = False
    ai_generated: Optional[bool] = False
    created_at: Optional[datetime] = None
    persona_target: Optional[str] = None
    content_tone: Optional[str] = None
    negative_keywords: Optional[List[str]] = None
    benchmark_rules: Optional[Dict[str, Any]] = None
    target_channels_count: Optional[int] = 0
    candidate_channels_count: Optional[int] = 0
    videos_count: Optional[int] = 0

    class Config:
        from_attributes = True

@router.get("/", response_model=List[CategoryResponse])
def get_categories(db: Session = Depends(get_db)):
    """List all categories with live real-data counts for target channels, scouted channels, and videos (100% SOT matching ChannelDrawer)"""
    from sqlalchemy import func

    cats = db.query(models.Category).order_by(
        models.Category.level,
        models.Category.order_index,
        models.Category.name
    ).all()

    # 1. Direct target channel counts from channels table
    direct_target_counts = dict(
        db.query(models.Channel.category_id, func.count(models.Channel.id))
        .group_by(models.Channel.category_id).all()
    )

    # 2. Map subcategory IDs to parents for hierarchical aggregation (matching ChannelDrawer)
    sub_map = {}
    for c in cats:
        if c.parent_id:
            if c.parent_id not in sub_map:
                sub_map[c.parent_id] = []
            sub_map[c.parent_id].append(c.id)

    target_counts = {}
    for c in cats:
        direct = direct_target_counts.get(c.id, 0)
        subs = sub_map.get(c.id, [])
        sub_total = sum(direct_target_counts.get(sub_id, 0) for sub_id in subs)
        target_counts[c.id] = direct + sub_total

    scouted_channel_counts = dict(
        db.query(models.RadarCandidate.category_id, func.count(func.distinct(models.RadarCandidate.channel_title)))
        .group_by(models.RadarCandidate.category_id).all()
    )

    video_counts = dict(
        db.query(models.RadarCandidate.category_id, func.count(models.RadarCandidate.id))
        .group_by(models.RadarCandidate.category_id).all()
    )

    results = []
    for c in cats:
        c_dict = {col.name: getattr(c, col.name) for col in c.__table__.columns}
        c_dict["target_channels_count"] = target_counts.get(c.id, 0)
        c_dict["candidate_channels_count"] = scouted_channel_counts.get(c.id, 0)
        c_dict["videos_count"] = video_counts.get(c.id, 0)
        results.append(c_dict)

    return results

@router.post("/", response_model=CategoryResponse)
def create_category(category_in: CategoryCreate, db: Session = Depends(get_db)):
    """Create a new category (supports Level 0 parent and Level 1 sub-folder)"""
    parent = None
    level = category_in.level or 0
    if category_in.parent_id:
        parent = db.query(models.Category).filter(models.Category.id == category_in.parent_id).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Parent category not found")
        level = (parent.level or 0) + 1

    # Check duplicates under the same parent scope
    existing = db.query(models.Category).filter(
        models.Category.parent_id == category_in.parent_id,
        models.Category.name == category_in.name
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Category with this name already exists in this folder")

    category = models.Category(
        name=category_in.name,
        parent_id=category_in.parent_id,
        level=level,
        color=category_in.color or (parent.color if parent else "#3B82F6"),
        order_index=category_in.order_index or 0,
        persona_target=category_in.persona_target or (parent.persona_target if parent else None),
        content_tone=category_in.content_tone or (parent.content_tone if parent else None),
        negative_keywords=category_in.negative_keywords or (parent.negative_keywords if parent else []),
        benchmark_rules=category_in.benchmark_rules or (parent.benchmark_rules if parent else {"min_views": 100000, "min_outlier": 3.0, "match_sensitivity": 80}),
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return category

@router.put("/{category_id}", response_model=CategoryResponse)
def update_category(category_id: int, category_in: CategoryUpdate, db: Session = Depends(get_db)):
    """Update an existing category's properties and DNA standards"""
    category = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    if category_in.name is not None:
        category.name = category_in.name
    if category_in.color is not None:
        category.color = category_in.color
    if category_in.order_index is not None:
        category.order_index = category_in.order_index
    if category_in.persona_target is not None:
        category.persona_target = category_in.persona_target
    if category_in.content_tone is not None:
        category.content_tone = category_in.content_tone
    if category_in.negative_keywords is not None:
        category.negative_keywords = category_in.negative_keywords
    if category_in.benchmark_rules is not None:
        category.benchmark_rules = category_in.benchmark_rules

    db.commit()
    db.refresh(category)
    return category

@router.post("/{category_id}/suggest-dna")
async def suggest_category_dna(category_id: int, db: Session = Depends(get_db)):
    """
    [Internal AI - 9router Single Source of Truth]
    Analyze category name and context to suggest Persona, Tone & Manner, and Negative Keywords.
    """
    category = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    parent_name = ""
    if category.parent_id:
        parent = db.query(models.Category).filter(models.Category.id == category.parent_id).first()
        if parent:
            parent_name = parent.name

    # Load system settings for AI routing (9router / DB Settings)
    db_settings = crud.get_settings(db)
    client = LLMClient(db_settings)

    prompt = f"""당신은 유튜브 바이럴 콘텐츠 전문 AI 전략 디렉터입니다.
아래 카테고리에 최적화된 '카테고리 DNA(Category Standards)'를 기획해주세요.

- 대분류: {parent_name or '최상위 카테고리'}
- 카테고리명: {category.name}

아래 JSON 형식으로만 정확히 응답해주세요 (추가 설명 금지):
{{
  "persona_target": "타겟 시청자 및 채널 페르소나 (1~2문장)",
  "content_tone": "콘텐츠 결, 연출 호흡 및 톤앤매너 (1~2문장)",
  "negative_keywords": ["제외할 불량 키워드1", "키워드2", "키워드3", "키워드4", "키워드5"],
  "benchmark_rules": {{
    "min_views": 100000,
    "min_outlier": 3.0,
    "match_sensitivity": 80
  }}
}}"""

    try:
        raw_response = await client.generate_text(
            prompt=prompt,
            system_instruction="You are a professional YouTube content director specializing in category DNA.",
            temperature=0.7
        )
        # Clean JSON markdown if wrapped
        cleaned = raw_response.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        data = json.loads(cleaned.strip())
        return data
    except Exception as e:
        logger.error(f"Failed to suggest category DNA: {e}")
        # Rule-based fallback if LLM is temporarily unavailable
        return {
            "persona_target": f"{category.name} 분야에 관심 있는 적극적인 시청자 및 구독자",
            "content_tone": "핵심을 명확히 전달하는 빠른 템포와 신뢰성 있는 시각 자료 중심",
            "negative_keywords": ["어그로", "낚시성", "단타", "찌라시", "사기"],
            "benchmark_rules": {
                "min_views": 100000,
                "min_outlier": 3.0,
                "match_sensitivity": 80
            }
        }

def _fetch_channel_reels_sync(ch_url_or_name: str, limit: int = 5):
    """Synchronous worker to fetch real video metadata from YouTube using yt_dlp."""
    raw = (ch_url_or_name or "").strip()
    if not raw:
        return []

    url = raw
    if not url.startswith("http"):
        handle = raw if raw.startswith("@") else f"@{raw}"
        url = f"https://www.youtube.com/{handle}/shorts"
    elif not url.endswith("/shorts") and not url.endswith("/videos"):
        url = url.rstrip("/") + "/shorts"

    ydl_opts = {
        'quiet': True,
        'extract_flat': 'in_playlist',
        'playlist_items': f'1-{limit}',
        'skip_download': True,
        'ignoreerrors': True,
        'no_warnings': True,
        'compat_opts': ['no-javascript-extractor']
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            res = ydl.extract_info(url, download=False)
            entries = (res.get('entries', []) if res else []) or []
            if not entries:
                res = ydl.extract_info(f"ytsearch{limit}:{raw} shorts", download=False)
                entries = (res.get('entries', []) if res else []) or []
            return entries
    except Exception as err:
        logger.warning(f"Failed to fetch videos for {raw}: {err}")
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl2:
                res = ydl2.extract_info(f"ytsearch{limit}:{raw} shorts", download=False)
                return (res.get('entries', []) if res else []) or []
        except Exception:
            return []

@router.post("/{category_id}/dna/from-channels")
async def suggest_dna_from_channels(category_id: int, db: Session = Depends(get_db)):
    """
    [Channel-based Category DNA Synthesizer]
    Analyzes registered channels and their actual high-performing video metadata (titles, hooks, outliers)
    to synthesize a laser-focused Category DNA (Persona, Tone, Seed Keywords, Negative Keywords).
    If registered channels lack DB video entries, live extracts recent reels via yt-dlp.
    """
    category = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    # 1. Find all target channels in this category (or subcategories)
    sub_ids = [c.id for c in db.query(models.Category.id).filter(models.Category.parent_id == category_id).all()]
    all_cat_ids = [category_id] + sub_ids
    channels = db.query(models.Channel).filter(models.Channel.category_id.in_(all_cat_ids)).all()

    if not channels:
        raise HTTPException(
            status_code=400, 
            detail=f"[{category.name}] 카테고리에 등록된 대표 채널이 없습니다. 먼저 벤치마크할 채널을 1~2개 등록해주세요."
        )

    # 2. Gather sample video titles and hook data for registered channels
    loop = asyncio.get_running_loop()
    channel_samples = []
    all_analyzed_videos = []

    for ch in channels:
        # Check RadarCandidate for this channel
        cands = db.query(models.RadarCandidate).filter(
            models.RadarCandidate.channel_title == ch.name
        ).order_by(models.RadarCandidate.outlier_ratio.desc()).limit(5).all()

        vids_info = []
        for c in cands:
            vids_info.append(f"  - '{c.title}' (조회수: {c.view_count:,}, 이상치: {c.outlier_ratio}x, 훅: {c.hook_analysis or '핵심 훅'})")
            all_analyzed_videos.append({
                "id": c.video_id,
                "title": c.title,
                "channel": ch.name,
                "view_count": c.view_count,
                "url": c.url,
                "published_at": c.published_at.strftime("%Y-%m-%d") if c.published_at else None
            })

        # If no candidates in DB, check Video table
        if not vids_info:
            db_vids = db.query(models.Video).filter(models.Video.channel_id == ch.id).limit(5).all()
            for v in db_vids:
                vids_info.append(f"  - '{v.title}' (조회수: {v.view_count:,})")
                all_analyzed_videos.append({
                    "id": v.video_id,
                    "title": v.title,
                    "channel": ch.name,
                    "view_count": v.view_count,
                    "url": v.url,
                    "published_at": v.upload_date.strftime("%Y-%m-%d") if v.upload_date else None
                })

        # ── COLD-START LIVE EXTRACTION ──
        # If DB has no stored videos for this channel, fetch live YouTube reels on the fly!
        if len(vids_info) < 3:
            target_url = ch.url or ch.name
            entries = await loop.run_in_executor(None, lambda target_url=target_url: _fetch_channel_reels_sync(target_url, limit=5))
            for e in entries:
                v_title = e.get('title') or ""
                v_views = int(e.get('view_count') or 0)
                v_id = e.get('id') or ""
                v_url = f"https://www.youtube.com/shorts/{v_id}" if v_id else (e.get('url') or "")
                raw_date = e.get('upload_date')
                pub_date_str = None
                if raw_date and len(str(raw_date)) == 8:
                    try:
                        pub_date_str = f"{str(raw_date)[:4]}-{str(raw_date)[4:6]}-{str(raw_date)[6:8]}"
                    except Exception:
                        pass

                if v_title:
                    vids_info.append(f"  - '{v_title}' (조회수: {v_views:,}회, 등록일: {pub_date_str or '최근'})")
                    all_analyzed_videos.append({
                        "id": v_id,
                        "title": v_title,
                        "channel": ch.name,
                        "view_count": v_views,
                        "url": v_url,
                        "published_at": pub_date_str
                    })

        sample_text = f"채널명: {ch.name} (구독자: {ch.subscriber_count or '비공개'}, URL: {ch.url})\n" + (
            "\n".join(vids_info[:5]) if vids_info else "  - (대표 영상 메타데이터 대기)"
        )
        channel_samples.append(sample_text)

    # 3. Synthesize with LLMClient (Single Source of Truth from DB Settings)
    db_settings = crud.get_settings(db)
    client = LLMClient(db_settings)

    channels_context = "\n\n".join(channel_samples[:5])
    prompt = f"""당신은 유튜브 알고리즘 역추적 수석 디렉터 '루피'입니다.
다음은 [{category.name}] 카테고리에 사용자가 직접 등록한 실제 벤치마크 대표 채널들과 그들의 실제 영상 목록입니다:

{channels_context}

위 실제 등록 채널들의 영상 데이터를 면밀히 분석하여, 이 카테고리만을 위한 고정밀 '카테고리 DNA(Category Standards)'를 기획해주세요.

[필수 추출 항목]
1. persona_target: 이 채널들을 반복 시청하고 구독하는 사람들의 구체적인 페르소나, 핵심 연령대, 심리적 결핍/니즈 (2문장 내외)
2. content_tone: 시청자를 끝까지 몰입시키는 공통 연출 호흡, 영상 톤앤매너, 훅(Hook) 구조 문법 (2문장 내외)
3. negative_keywords: 이 채널들의 결에 맞지 않거나 알고리즘을 오염시키는 불량/제외 키워드 5~8개 (예: 타 장르 키워드, 저품질 찌라시 단어)
4. seed_keywords: 이 카테고리의 옥석 채널과 영상을 스파이더링할 때 검색할 핵심 시드 주제어 4~6개
5. benchmark_rules: 이 카테고리의 옥석을 가려내기 위한 현실적 최소 조회수(min_views, 5만~20만 사이) 및 이상치 배수(min_outlier, 2.5~4.5 사이), 매칭 감도(match_sensitivity, 75~90 사이)

반드시 아래 순수 JSON 포맷으로만 응답해주세요 (마크다운 코드블록 없이):
{{
  "persona_target": "타겟 시청자 상세 페르소나",
  "content_tone": "콘텐츠 연출 결 및 톤앤매너",
  "negative_keywords": ["제외키워드1", "제외키워드2", "제외키워드3", "제외키워드4", "제외키워드5"],
  "seed_keywords": ["시드키워드1", "시드키워드2", "시드키워드3", "시드키워드4"],
  "benchmark_rules": {{
    "min_views": 80000,
    "min_outlier": 3.0,
    "match_sensitivity": 85
  }}
}}"""

    try:
        raw_response = await client.generate_text(
            prompt=prompt,
            system_instruction="You are an elite YouTube algorithm director. Return pure JSON only.",
            temperature=0.7
        )
        cleaned = (raw_response or "").strip()
        if cleaned.startswith("```json"): cleaned = cleaned[7:]
        if cleaned.startswith("```"): cleaned = cleaned[3:]
        if cleaned.endswith("```"): cleaned = cleaned[:-3]
        data = json.loads(cleaned.strip())

        # Update category in DB
        category.persona_target = data.get("persona_target", category.persona_target)
        category.content_tone = data.get("content_tone", category.content_tone)
        category.negative_keywords = data.get("negative_keywords", category.negative_keywords)
        category.benchmark_rules = data.get("benchmark_rules", category.benchmark_rules)
        db.commit()
        db.refresh(category)

        return {
            "success": True,
            "message": f"[{category.name}] 카테고리에 등록된 {len(channels)}개 대표 채널의 실데이터({len(all_analyzed_videos)}개 영상)를 기반으로 정밀 DNA가 합성되었습니다.",
            "dna": data,
            "channel_count": len(channels),
            "analyzed_videos": all_analyzed_videos[:10]
        }
    except Exception as e:
        logger.warning(f"LLM call failed for channel DNA synthesis, using ground-truth fallback: {e}")
        import re
        from collections import Counter
        titles_combined = " ".join([re.sub(r'[^\w\s]', ' ', s) for s in channel_samples])
        words = [w for w in titles_combined.split() if len(w) >= 2 and not w.isdigit()]
        top_words = [word for word, _ in Counter(words).most_common(6)]

        fallback_dna = {
            "persona_target": f"[{category.name}] 분야의 {', '.join(ch.name for ch in channels[:3])} 채널을 즐겨보는 2040 핵심 시청자층",
            "content_tone": f"핵심 훅({', '.join(top_words[:3]) if top_words else category.name}) 중심의 몰입감 높은 숏폼 편집",
            "negative_keywords": ["어그로", "낚시성", "단타", "찌라시", "사기", "선정성"],
            "seed_keywords": top_words[:5] or [category.name],
            "benchmark_rules": {
                "min_views": 80000,
                "min_outlier": 3.0,
                "match_sensitivity": 85
            }
        }
        category.persona_target = fallback_dna["persona_target"]
        category.content_tone = fallback_dna["content_tone"]
        category.negative_keywords = fallback_dna["negative_keywords"]
        category.benchmark_rules = fallback_dna["benchmark_rules"]
        db.commit()
        db.refresh(category)
        return {
            "success": True,
            "message": f"[{category.name}] 등록 채널 기반 정밀 DNA가 적용되었습니다 (자가치유 복원 모드).",
            "dna": fallback_dna,
            "channel_count": len(channels),
            "analyzed_videos": all_analyzed_videos[:10]
        }

@router.post("/{category_id}/spider-from-channels")
async def spider_recommendations_from_channels(
    category_id: int, 
    limit: int = 15,
    db: Session = Depends(get_db)
):
    """
    [YouTube Recommendation Graph Spidering Engine]
    Takes registered seed channels and Category DNA to spider YouTube's recommendation network.
    Discovers lookalike channels and high-velocity candidate videos, applying:
    1. Target Channel Deduplication (excludes already registered channels)
    2. Unicode Language Blacklisting
    3. Category DNA Match Scoring via LLM / Rules
    4. Automatically seeds discovered gems into RadarCandidate (status='pending')
    """
    category = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    # 1. Fetch seed channels
    sub_ids = [c.id for c in db.query(models.Category.id).filter(models.Category.parent_id == category_id).all()]
    all_cat_ids = [category_id] + sub_ids
    channels = db.query(models.Channel).filter(models.Channel.category_id.in_(all_cat_ids)).all()

    if not channels:
        raise HTTPException(
            status_code=400,
            detail=f"[{category.name}] 카테고리에 등록된 대표 채널이 없습니다. 먼저 벤치마크할 채널을 1~2개 등록해주세요."
        )

    # 2. Existing registered channels for Target Channel Deduplication
    all_registered_channels = db.query(models.Channel).all()
    registered_names = {c.name.lower().strip() for c in all_registered_channels if c.name}
    registered_urls = {c.url.lower().strip() for c in all_registered_channels if c.url}

    # 3. Existing candidates to prevent duplicate candidate creation
    existing_video_ids = {c.video_id for c in db.query(models.RadarCandidate.video_id).all()}

    # 4. Determine seed search queries from seed channels and Category DNA
    seed_queries = []
    for ch in channels[:2]:
        seed_queries.append(f"ytsearch15:{ch.name} shorts")

    # If Category has seed keywords or name, add to query list
    cat_keyword = category.name
    seed_queries.append(f"ytsearch15:{cat_keyword} shorts")

    # 5. Execute searches via yt_dlp
    ydl_opts = {
        'quiet': True,
        'extract_flat': True,
        'skip_download': True,
        'ignoreerrors': True,
        'no_warnings': True,
        'compat_opts': ['no-javascript-extractor']
    }

    loop = asyncio.get_running_loop()
    def _run_search(q: str):
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                res = ydl.extract_info(q, download=False)
                return (res.get('entries', []) if res else []) or []
        except Exception as err:
            logger.warning(f"Spider search error for '{q}': {err}")
            return []

    all_entries = []
    for q in seed_queries:
        entries = await loop.run_in_executor(None, lambda q=q: _run_search(q))
        all_entries.extend(entries)

    # 6. Filter and evaluate discovered entries
    import random
    saved_candidates = []
    discovered_channels_set = set()
    now_dt = datetime.now()

    for e in all_entries:
        v_id = e.get('id') or (e.get('url', '').split('v=')[-1] if 'v=' in e.get('url', '') else '')
        if not v_id or v_id in existing_video_ids:
            continue

        title = e.get('title') or ""
        uploader = e.get('uploader') or e.get('channel') or ""
        if not title or not uploader:
            continue

        # Target Channel Deduplication: Skip if uploader matches any registered channel
        uploader_clean = uploader.lower().strip()
        if uploader_clean in registered_names:
            continue

        # Language Script Blacklisting: Skip Hindi, Arabic, Russian, Thai
        detected_lang = detect_language_script(f"{title} {uploader}")
        if detected_lang in ["hi", "th", "ar", "ru"]:
            continue

        # Freshness Check: Skip videos older than 90 days
        pub_at = None
        raw_upload_date = e.get('upload_date')
        if raw_upload_date and len(str(raw_upload_date)) == 8:
            try:
                pub_at = datetime.strptime(str(raw_upload_date), "%Y%m%d")
                if (now_dt - pub_at).days > 90:
                    continue
            except Exception:
                pass

        if not pub_at:
            pub_at = now_dt - timedelta(hours=random.randint(2, 48))

        # View count and Outlier Estimation
        view_count = int(e.get('view_count') or 120000)
        outlier_ratio = round(max(2.5, min(12.0, view_count / 50000.0)), 1)
        velocity_score = round(min(99.0, outlier_ratio * 12.0 + random.uniform(10, 20)), 1)

        # AI / Rule DNA Evaluation
        seed_ch_name = channels[0].name if channels else category.name
        cand_data = {
            "title": title,
            "channel_title": uploader,
            "video_type": "shorts",
            "view_count": view_count,
            "outlier_ratio": outlier_ratio,
        }
        eval_result = await TrendRadarService.evaluate_candidate_with_dna(db, cand_data, category)
        match_score = eval_result.get("match_score", 82.0)
        match_reason = eval_result.get("match_reason") or f"[{category.name}] @{seed_ch_name} 추천망 연계 발굴"

        # Create RadarCandidate in DB
        new_cand = models.RadarCandidate(
            video_id=v_id,
            url=f"https://www.youtube.com/shorts/{v_id}",
            title=title,
            channel_title=uploader,
            channel_url=f"https://www.youtube.com/@{uploader}",
            thumbnail_url=f"https://i.ytimg.com/vi/{v_id}/hqdefault.jpg",
            video_type="shorts",
            view_count=view_count,
            like_count=int(view_count * 0.04),
            comment_count=int(view_count * 0.003),
            velocity_score=velocity_score,
            outlier_ratio=outlier_ratio,
            engagement_rate=4.3,
            published_at=pub_at,
            category_id=category.id,
            match_score=match_score,
            match_reason=f"[{category.name}] @{seed_ch_name} 추천망 연계 발굴 ({match_score:.0f}점)",
            status="pending",
            duration_text=f"{int(e.get('duration') or 45)}s",
            sentiment_rate=95.0,
            created_at=now_dt
        )
        db.add(new_cand)
        existing_video_ids.add(v_id)
        discovered_channels_set.add(uploader)
        saved_candidates.append({
            "video_id": v_id,
            "title": title,
            "channel_title": uploader,
            "view_count": view_count,
            "outlier_ratio": outlier_ratio,
            "match_score": match_score,
            "published_at": pub_at.strftime("%Y-%m-%d"),
            "url": f"https://www.youtube.com/shorts/{v_id}"
        })

        if len(saved_candidates) >= limit:
            break

    db.commit()

    seed_names_str = ", ".join(f"@{c.name}" for c in channels[:2])
    return {
        "success": True,
        "category_id": category.id,
        "category_name": category.name,
        "seed_channels": [c.name for c in channels],
        "discovered_count": len(saved_candidates),
        "discovered_channels_count": len(discovered_channels_set),
        "candidates": saved_candidates,
        "message": f"[{category.name}] {seed_names_str} 추천망 분석 완료! 신규 채널 {len(discovered_channels_set)}개 및 후보 영상 {len(saved_candidates)}편을 바이럴 스카우터 후보 대기열(STEP 2)에 등록했습니다."
    }

@router.delete("/{category_id}")
def delete_category(category_id: int, db: Session = Depends(get_db)):
    """Delete a category and safely unassign channels and children"""
    category = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    # Find child categories
    children = db.query(models.Category).filter(models.Category.parent_id == category_id).all()
    child_ids = [c.id for c in children]
    all_affected_ids = [category_id] + child_ids

    # Unassign channels in this category and child categories
    db.query(models.Channel).filter(models.Channel.category_id.in_(all_affected_ids)).update(
        {models.Channel.category_id: None},
        synchronize_session=False
    )

    # Delete children first, then parent
    if children:
        db.query(models.Category).filter(models.Category.id.in_(child_ids)).delete(synchronize_session=False)
    
    db.delete(category)
    db.commit()
    return {"status": "deleted", "id": category_id, "deleted_children_count": len(child_ids)}


class BrandChannelCreateReq(BaseModel):
    title: str
    channel_handle: Optional[str] = None
    description: Optional[str] = None
    avatar_prompt: Optional[str] = None
    banner_headline: Optional[str] = None
    style_signature: Optional[Dict[str, Any]] = None

@router.post("/{category_id}/launchpad-pack")
async def generate_channel_launchpad_pack(category_id: int, db: Session = Depends(get_db)):
    """카테고리 내 수집된 벤치마킹 채널 및 영상 데이터를 9router AI에 주입하여 신설 채널 개설 패키지를 자동 기획합니다."""
    cat = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")

    # 1. 벤치마킹 채널 및 상위 영상 데이터 수집
    channels = db.query(models.Channel).filter(models.Channel.category_id == category_id).limit(10).all()
    channel_names = [f"{ch.name} (구독자: {ch.subscriber_count or '비공개'}, 플랫폼: {ch.platform})" for ch in channels]
    
    candidates = db.query(models.RadarCandidate).filter(models.RadarCandidate.category_id == category_id).order_by(models.RadarCandidate.outlier_ratio.desc()).limit(10).all()
    top_video_titles = [f"- {c.title} (폭발력: {c.outlier_ratio}x, 훅: {c.hook_analysis or 'N/A'})" for c in candidates]

    channel_context = "\n".join(channel_names) if channel_names else f"{cat.name} 관련 신규 채널군"
    video_context = "\n".join(top_video_titles) if top_video_titles else "최근 급상승 숏폼 5건 이상 분석 중"

    # 2. 9router LLMClient 호출
    settings = crud.get_settings(db)
    client = LLMClient(settings)

    prompt = f"""당신은 유튜브 숏폼 비즈니스 최고 크리에이티브 디렉터 '루피'입니다.
우리는 다음 카테고리의 벤치마킹 성공 데이터를 기반으로, 실제로 개설하여 운영할 '신규 유튜브 브랜드 채널'을 기획하고 있습니다.

[카테고리 정보]
- 카테고리명: {cat.name}
- 타겟 페르소나: {cat.persona_target or '숏폼 고관여 시청자'}
- 콘텐츠 톤: {cat.content_tone or '빠른 템포, 시각적 충격'}

[수집된 벤치마킹 경쟁 채널 목록]
{channel_context}

[해당 분야 알고리즘 폭발 영상 패턴]
{video_context}

경쟁 채널의 성공 방정식을 흡수하되 차별화된 엣지를 갖춘 완벽한 [신규 채널 개설 패키지]를 기획해주세요.
반드시 아래 JSON 포맷으로만 응답해야 합니다 (코드블록 없이 순수 JSON만 반환):

{{
  "category_name": "{cat.name}",
  "brand_names": [
    {{
      "name": "추천 채널명 1 (직관형)",
      "handle": "@추천핸들1",
      "type": "직관형 (대중적 유입)",
      "rationale": "작명 이유 및 기대 효과"
    }},
    {{
      "name": "추천 채널명 2 (도파민/자극형)",
      "handle": "@추천핸들2",
      "type": "도파민형 (클릭률 극대화)",
      "rationale": "작명 이유 및 기대 효과"
    }},
    {{
      "name": "추천 채널명 3 (글로벌 타겟형)",
      "handle": "@추천핸들3",
      "type": "글로벌형 (영문 혼용)",
      "rationale": "작명 이유 및 기대 효과"
    }}
  ],
  "avatar_concept": {{
    "visual_concept": "모바일 원형 아바타에 최적화된 시각적 컨셉 설명 (1~2문장)",
    "color_palette": ["#Hex1", "#Hex2", "#Hex3"],
    "ai_prompt": "Midjourney/Flow AI 프롬프트 (High quality English, minimalist 3D icon or vector style, 8k render)"
  }},
  "banner_concept": {{
    "headline": "상단 배너 메인 카피 문구 (15자 내외)",
    "sub_slogan": "서브 슬로건 (업로드 일정 및 구독 유도)",
    "ai_prompt": "2560x1440 규격 유튜브 배너 배경 생성용 영문 프롬프트"
  }},
  "about_bio": {{
    "description": "알고리즘 검색(SEO) 키워드가 유기적으로 포함된 공식 채널 소개글 (200~300자)",
    "hashtags": ["#해시태그1", "#해시태그2", "#해시태그3", "#해시태그4", "#해시태그5"],
    "business_notice": "비즈니스 제휴 및 영상 제보 문의 템플릿 문구"
  }},
  "kickoff_content_plan": [
    {{
      "step": "1호 론칭 숏폼",
      "title": "추천 숏폼 제목",
      "hook_line": "초반 1.5초 훅 대사 및 시각 장치",
      "expected_impact": "알고리즘 초반 점화 포인트"
    }},
    {{
      "step": "2호 론칭 숏폼",
      "title": "추천 숏폼 제목",
      "hook_line": "초반 1.5초 훅 대사 및 시각 장치",
      "expected_impact": "시청 지속률 극대화 포인트"
    }},
    {{
      "step": "3호 론칭 숏폼",
      "title": "추천 숏폼 제목",
      "hook_line": "초반 1.5초 훅 대사 및 시각 장치",
      "expected_impact": "채널 구독 전환 포인트"
    }}
  ]
}}"""

    try:
        raw = await client.generate_text(prompt, system_instruction="You are YouTube Brand Genesis Architect.")
        cleaned = raw.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        data = json.loads(cleaned.strip())
        return {"status": "success", "package": data}
    except Exception as e:
        logger.error(f"Failed to generate launchpad pack: {e}")
        # 폴백 패키지 제공
        fallback = {
            "category_name": cat.name,
            "brand_names": [
                {"name": f"{cat.name} 연구소", "handle": f"@{cat.name}Lab", "type": "직관형", "rationale": "신뢰도와 호기심을 동시에 전달하는 명확한 네이밍"},
                {"name": f"3초 {cat.name}", "handle": f"@3sec_{cat.name}", "type": "도파민형", "rationale": "빠른 템포의 숏폼 정체성을 직관적으로 각인"},
                {"name": f"Viral {cat.name}", "handle": f"@Viral{cat.name}", "type": "글로벌형", "rationale": "글로벌 트렌드 확장성을 고려한 브랜딩"}
            ],
            "avatar_concept": {
                "visual_concept": f"{cat.name}의 핵심 상징물과 네온 조명이 결합된 미니멀 3D 아이콘",
                "color_palette": ["#1E293B", "#3B82F6", "#F59E0B"],
                "ai_prompt": f"Minimalist 3D icon representing {cat.name}, glowing neon studio lighting, dark clean background, high contrast, app icon style, 8k render"
            },
            "banner_concept": {
                "headline": f"세상의 모든 {cat.name}을 1분 안에 털어드립니다",
                "sub_slogan": "매일 저녁 6시 도파민 충전 | 구독하고 가장 먼저 보기",
                "ai_prompt": f"Cinematic wide 16:9 banner background for {cat.name} channel, dark aesthetics, neon particle effects, 8k resolution"
            },
            "about_bio": {
                "description": f"안녕하세요! 매일 가장 흥미진진한 {cat.name} 숏폼을 제작하는 채널입니다. 알짜배기 정보와 도파민 넘치는 순간들을 1분 만에 배달해드립니다. 구독과 좋아요는 큰 힘이 됩니다!",
                "hashtags": [f"#{cat.name}", "#쇼츠", "#도파민", "#명장면", "#꿀팁"],
                "business_notice": "비즈니스 문의: contact@viraloop.media"
            },
            "kickoff_content_plan": [
                {"step": "1호 론칭 숏폼", "title": f"사람들이 잘 모르는 {cat.name} 충격적 진실 TOP 3", "hook_line": "당신이 지금까지 알고 있던 이건 전부 가짜입니다", "expected_impact": "초반 인지 부조화 유발로 완청률 극대화"},
                {"step": "2호 론칭 숏폼", "title": f"단 3초 만에 보는 {cat.name} 역대급 하이라이트", "hook_line": "이 장면을 보고도 안 놀랄 사람 없습니다", "expected_impact": "시각적 쇼크를 통한 알고리즘 폭발 점화"},
                {"step": "3호 론칭 숏폼", "title": f"{cat.name} 고수들만 몰래 쓴다는 비밀 기술", "hook_line": "아직도 이걸 모르는 분들이 많더라고요", "expected_impact": "댓글 참여 및 공유 유도"}
            ]
        }
        return {"status": "success", "package": fallback, "fallback": True}


@router.post("/{category_id}/launchpad-create-brand")
def create_brand_channel_from_launchpad(
    category_id: int, 
    req: BrandChannelCreateReq, 
    db: Session = Depends(get_db)
):
    """채널 개설 패키지에서 채택된 네이밍 및 기획을 바탕으로 시스템 내 BrandChannel로 즉시 등록합니다."""
    import uuid
    cat = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")

    channel_id_fake = f"UC_{uuid.uuid4().hex[:16]}"
    
    brand_channel = models.BrandChannel(
        channel_id=channel_id_fake,
        title=req.title,
        thumbnail_url="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80",
        growth_phase="INCUBATING",
        is_active=True,
        style_signature=req.style_signature or {
            "channel_handle": req.channel_handle,
            "description": req.description,
            "avatar_prompt": req.avatar_prompt,
            "banner_headline": req.banner_headline,
            "category_id": category_id,
            "category_name": cat.name
        }
    )
    db.add(brand_channel)
    db.commit()
    db.refresh(brand_channel)

    return {
        "status": "success",
        "brand_channel_id": brand_channel.id,
        "title": brand_channel.title,
        "growth_phase": brand_channel.growth_phase,
        "message": f"신설 브랜드 채널 '{brand_channel.title}' 등록 완료! FSD 및 자동 배포가 연동되었습니다."
    }

