import logging
import os
import re
import asyncio
import math
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
import urllib.parse
import httpx
from pydantic import BaseModel
from fastapi import APIRouter, Depends, Query, HTTPException, BackgroundTasks, Response
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_, func, String

from .. import models, database
from ..services.discovery_scraper import discovery_scraper, COMMUNITY_SOURCES, NAVER_NEWS_SECTIONS as NAVER_SECTIONS, collector_telemetry
from ..services.scout_alpha_worker import scout_alpha_worker
from ..services.channel_director import channel_director
from ..services.free_media_scraper import free_media_scraper
from ..services.viral_radar_engine import viral_radar_worker, viral_radar_telemetry
from ..services.article_body_extractor import article_body_extractor

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/viral", tags=["viral_intelligence"])


def _article_to_dict(art: models.ViralArticle, include_comments: bool = True) -> Dict[str, Any]:
    d = {
        "id": art.id,
        "source_type": art.source_type,
        "community_name": art.community_name,
        "category": art.category,
        "title": art.title,
        "url": art.url,
        "author": art.author,
        "views": art.views or 0,
        "likes": art.likes or 0,
        "comments_count": art.comments_count or 0,
        "content_text": art.content_text,
        "images": art.images or [],
        "created_at_source": art.created_at_source,
        "scraped_at": art.scraped_at.isoformat() if art.scraped_at else None,
        "analysis_summary": art.analysis_summary,
        "suggested_title": art.suggested_title,
        "viral_score": art.viral_score or 0.0,
        "target_form_factors": art.target_form_factors or [],
        "structured_script": art.structured_script,
        "status": art.status,
        "claimed_by_channel_id": art.claimed_by_channel_id,
        "claimed_at": art.claimed_at.isoformat() if art.claimed_at else None,
        # 🌐 5-D 인텔리전스 메트릭 & 테마/토픽 분류
        "search_traffic": art.search_traffic,
        "velocity_score": art.velocity_score or art.viral_score or 0.0,
        "cluster_count": art.cluster_count or 1,
        "cluster_keywords": art.cluster_keywords or [],
        "topic_category": getattr(art, "topic_category", None) or "일반",
        "media_type": getattr(art, "media_type", None) or "text_story",
        "entity_tags": getattr(art, "entity_tags", None) or art.cluster_keywords or [],
        "psychological_trigger": art.psychological_trigger or "호기심/금기",
        "retention_probability": art.retention_probability or round(max(70.0, (art.viral_score or 82.0) - 1.5), 1),
        "lifespan_phase": art.lifespan_phase or "surge",
        "golden_time_hours": art.golden_time_hours if art.golden_time_hours is not None else 24.0,
        "media_file_path": None,
        "video_duration": 0,
        "has_transcript": False,
        "char_count": len(art.content_text or ""),
    }

    struct = art.structured_script if isinstance(art.structured_script, dict) else {}
    hook_l1 = struct.get("hook_headline_line1") or struct.get("headline_line1")
    hook_l2 = struct.get("hook_headline_line2") or struct.get("headline_line2")

    # Stale boilerplate detection
    stale_patterns = ["실시간 조회수 폭발", "믿기 힘든 실제 상황", "네티즌 발칵 뒤집힌 실화", "#쇼츠", "모두를 울컥하게 만든"]
    is_stale = any(pat in (hook_l1 or "") or pat in (hook_l2 or "") or pat in (art.suggested_title or "") for pat in stale_patterns)

    clean_tit = re.sub(r'^\[.*?\]\s*', '', art.title or '').strip()
    if (not hook_l1 or is_stale) and clean_tit:
        # Dynamic contextual hook based on clean title and top comments
        top_cmt = (art.comments[0].text if art.comments and len(art.comments) > 0 else "")[:30]
        if top_cmt and len(top_cmt) > 5 and not any(skip in top_cmt for skip in ["삭제", "광고", "http"]):
            hook_l1 = f'"{top_cmt.strip()}..."'
            hook_l2 = clean_tit[:22]
        else:
            hook_l1 = clean_tit[:20]
            hook_l2 = "화제의 실시간 이슈 전말"
        hook_line = f"{hook_l1} {hook_l2}".strip()
    else:
        hook_line = f"{hook_l1} {hook_l2}".strip() if (hook_l1 or hook_l2) else (clean_tit[:40] if clean_tit else "")

    # Clean images & ensure videos are separated and preserved
    raw_images = art.images or []
    clean_images = []
    extracted_videos = []
    for im in raw_images:
        if any(v_ext in im for v_ext in [".mp4.thumb", ".thumb.webp", ".thumb."]):
            v_url = im.replace("image.fmkorea.com", "mediak5jvqbd.fmkorea.com").replace(".thumb.webp", "") + "?d"
            if v_url not in extracted_videos:
                extracted_videos.append(v_url)
        else:
            clean_images.append(im)

    resp_text = art.content_text or ""
    for ev in extracted_videos:
        if ev not in resp_text:
            resp_text = f"[동영상: {ev}]\n\n" + resp_text

    is_news = (art.source_type == "news") or ("naver" in (art.community_name or ""))
    base_score = float(art.viral_score or 82.0)
    gunlimbo_score = round(min(99.5, max(75.0, base_score + (6.0 if is_news else 1.0))), 1)
    ssul_score = round(min(99.5, max(75.0, base_score + (6.0 if not is_news else -4.0))), 1)
    classic_score = round(min(95.0, max(70.0, base_score - 2.0)), 1)
    dopamine_index = round(min(99.8, max(80.0, base_score * 1.05)), 1)
    recommended_ff = struct.get("suggested_form_factor") or ("gunlimbo" if gunlimbo_score >= ssul_score else "ssul")

    d["content_text"] = resp_text
    d["images"] = clean_images
    d["extracted_videos"] = extracted_videos

    # Dynamic classification fallback if not populated in DB
    if d.get("topic_category") in [None, "", "일반"] or not d.get("entity_tags"):
        calc_top, calc_med, calc_tags, calc_cross, calc_series = discovery_scraper.classify_topic_and_entities(
            art.title or "",
            art.content_text or "",
            art.category or "",
            clean_images + extracted_videos
        )
        d["topic_category"] = calc_top
        d["entity_tags"] = calc_tags
        d["cluster_keywords"] = calc_tags
        d["cross_topics"] = calc_cross
        d["series_key"] = calc_series
    else:
        d["cross_topics"] = getattr(art, "cross_topics", []) or []
        d["series_key"] = getattr(art, "series_key", None)

    # Accurate media_type override based on actual extracted videos / clean images
    if extracted_videos:
        d["media_type"] = "video_clip"
    elif len(clean_images) >= 3:
        d["media_type"] = "image_pack"
    elif not d.get("media_type") or d["media_type"] == "text_story":
        d["media_type"] = "text_story"

    d["hook_line"] = hook_line
    d["hook_headline_line1"] = hook_l1
    d["hook_headline_line2"] = hook_l2
    d["why_viral"] = struct.get("why_viral") or f"네티즌들의 뜨거운 반응과 높은 화제성을 보유한 {art.category or '이슈'} 콘텐츠"
    d["gunlimbo_score"] = gunlimbo_score
    d["ssul_score"] = ssul_score
    d["classic_score"] = classic_score
    d["dopamine_index"] = dopamine_index
    d["recommended_form_factor"] = recommended_ff
    d["target_form_factor"] = recommended_ff
    d["structured_script"] = struct

    if include_comments:
        sorted_cmts = sorted(
            art.comments or [],
            key=lambda c: (1 if c.is_best else 0, c.likes or 0, -(c.order_idx or 0)),
            reverse=True
        )
        d["comments"] = [
            {
                "id": c.id,
                "author": c.author,
                "text": c.text,
                "likes": c.likes or 0,
                "is_best": bool(c.is_best),
                "order_idx": c.order_idx or 0,
            }
            for c in sorted_cmts
        ]
    return d


def _video_to_article_dict(v: models.Video, is_script_lab: bool = False) -> Dict[str, Any]:
    first_sentence = ""
    text_content = v.transcript if is_script_lab else (v.description or "")
    if text_content:
        lines = [line.strip() for line in text_content.replace("\r", "\n").split("\n") if line.strip()]
        first_sentence = lines[0] if lines else ""

    raw_score = float(v.viral_score or 0.0)
    if raw_score > 100.0:
        score = min(99.0, max(75.0, 70.0 + (math.log10(max(1.0, raw_score)) * 4.2)))
    elif raw_score > 0:
        score = raw_score
    else:
        score = 88.5 if is_script_lab else 84.0

    raw_vel = float(v.velocity_score or 0.0)
    if raw_vel > 100.0:
        vel = min(99.0, max(70.0, 65.0 + (math.log10(max(1.0, raw_vel)) * 4.2)))
    elif raw_vel > 0:
        vel = raw_vel
    else:
        vel = 82.0

    return {
        "id": v.id,
        "source_type": "script_lab" if is_script_lab else "video_vault",
        "community_name": "대본분석실" if is_script_lab else "영상보관함",
        "category": "롱폼/스토리" if is_script_lab else "쇼츠/영상",
        "title": v.title or "무제 영상",
        "url": v.url or (f"https://www.youtube.com/watch?v={v.video_id}" if v.video_id else ""),
        "author": f"Channel #{v.channel_id}" if v.channel_id else "YouTube",
        "views": v.view_count or 0,
        "likes": int((v.view_count or 0) * 0.04),
        "comments_count": int((v.view_count or 0) * 0.005),
        "content_text": text_content,
        "images": [v.thumbnail_path] if v.thumbnail_path else [],
        "scraped_at": v.downloaded_at.isoformat() if v.downloaded_at else None,
        "analysis_summary": f"[대본 원천: {len(v.transcript or '')}자] {first_sentence[:120]}" if is_script_lab else f"[미디어 자산 보유: {os.path.basename(v.file_path or '')}] {first_sentence[:120]}",
        "suggested_title": v.title,
        "viral_score": round(score, 1),
        "target_form_factors": ["longform", "classic"] if is_script_lab else ["classic", "insta"],
        "structured_script": None,
        "status": "analyzed" if (v.transcript or v.review_status == "REVIEWED") else "collected",
        "claimed_by_channel_id": v.channel_id,
        "claimed_at": None,
        "search_traffic": None,
        "velocity_score": round(vel, 1),
        "cluster_count": 1,
        "cluster_keywords": [],
        "psychological_trigger": "호기심/금기" if is_script_lab else "시각충격/경이",
        "retention_probability": 88.0 if is_script_lab else 84.5,
        "lifespan_phase": "steady",
        "golden_time_hours": 72.0,
        "media_file_path": v.file_path,
        "video_duration": v.duration or 0,
        "has_transcript": bool(v.transcript),
        "char_count": len(text_content or ""),
        "comments": []
    }


@router.get("/sources")
def get_sources():
    """List all supported Pixeling 3 Tabs, Google Trends, YouTube Shorts, Video Vault, and Script Lab."""
    trends = [
        {"code": "google_trends", "name": "구글 트렌드 (실시간 급상승)", "category": "실시간 트렌드", "type": "google_trends"},
        {"code": "youtube_shorts", "name": "유튜브 급상승 쇼츠", "category": "쇼츠 레이더", "type": "youtube_shorts"},
    ]
    media_tracks = [
        {"code": "video_vault", "name": "영상 보관함 (다운로드 완료 영상)", "category": "영상 원천", "type": "video_vault"},
        {"code": "script_lab", "name": "대본 분석실 (유튜브 정밀 대본/자막)", "category": "대본 원천", "type": "script_lab"},
    ]

    domestic_communities = []
    global_communities = []
    for k, v in COMMUNITY_SOURCES.items():
        item = {
            "code": k,
            "name": v["name"],
            "category": v.get("category", "유머"),
            "region": v.get("region", "domestic"),
            "type": "community"
        }
        if v.get("region") == "global":
            global_communities.append(item)
        else:
            domestic_communities.append(item)

    news = [
        {"code": s["code"], "name": s.get("label", s.get("category", "")), "category": s.get("category", "뉴스"), "sid1": s.get("sid1", "100"), "type": "news"}
        for s in NAVER_SECTIONS
    ]

    reddit_topics = [
        {"code": "all", "name": "전체 토픽", "topic": "all"},
        {"code": "humor", "name": "유머 (r/memes, r/funny)", "topic": "humor"},
        {"code": "interesting", "name": "신기함 (r/interestingasfuck)", "topic": "interesting"},
        {"code": "issue", "name": "이슈/뉴스 (r/worldnews)", "topic": "issue"},
        {"code": "tech", "name": "테크/AI (r/technology, r/ChatGPT)", "topic": "tech"},
        {"code": "life", "name": "라이프 (r/LifeProTips)", "topic": "life"},
        {"code": "game_sports", "name": "게임/스포츠 (r/gaming)", "topic": "game_sports"},
        {"code": "entertainment", "name": "연예/영화 (r/movies)", "topic": "entertainment"},
        {"code": "politics", "name": "정치 (r/politics)", "topic": "politics"},
    ]

    return {
        "trends": trends,
        "media_tracks": media_tracks,
        "domestic_communities": domestic_communities,
        "global_communities": global_communities,
        "communities": domestic_communities + global_communities,
        "news": news,
        "reddit_topics": reddit_topics,
        "total": len(trends) + len(media_tracks) + len(domestic_communities) + len(global_communities) + len(news) + len(reddit_topics)
    }


@router.get("/hud-stats")
def get_hud_stats(db: Session = Depends(database.get_db)):
    """Return real-time Pulse Quant HUD stats across all sources and production readiness."""
    total_articles = db.query(models.ViralArticle).count()
    surge_count = db.query(models.ViralArticle).filter(
        or_(models.ViralArticle.velocity_score >= 90.0, models.ViralArticle.lifespan_phase == "surge")
    ).count()
    cluster_count = db.query(models.ViralArticle).filter(models.ViralArticle.cluster_count >= 2).count()
    golden_urgent_count = db.query(models.ViralArticle).filter(models.ViralArticle.golden_time_hours <= 12.0).count()

    google_count = db.query(models.ViralArticle).filter(models.ViralArticle.source_type == "google_trends").count()
    youtube_count = db.query(models.ViralArticle).filter(models.ViralArticle.source_type == "youtube_shorts").count()
    news_count = db.query(models.ViralArticle).filter(models.ViralArticle.source_type == "news").count()
    reddit_count = db.query(models.ViralArticle).filter(models.ViralArticle.source_type == "reddit").count()
    community_count = db.query(models.ViralArticle).filter(models.ViralArticle.source_type == "community").count()

    video_vault_count = db.query(models.Video).filter(models.Video.file_path.isnot(None), models.Video.file_path != "").count()
    script_lab_count = db.query(models.Video).filter(models.Video.transcript.isnot(None), models.Video.transcript != "").count()

    total_combined = total_articles + video_vault_count + script_lab_count

    return {
        "total_articles": total_combined,
        "raw_article_count": total_articles,
        "surge_count": surge_count,
        "cluster_count": cluster_count,
        "golden_urgent_count": golden_urgent_count,
        "source_breakdown": {
            "google_trends": google_count,
            "youtube_shorts": youtube_count,
            "news": news_count,
            "community": community_count,
            "reddit": reddit_count,
            "video_vault": video_vault_count,
            "script_lab": script_lab_count,
        },
        "form_factor_readiness": {
            "classic": youtube_count + video_vault_count,
            "insta": int((total_articles + video_vault_count) * 0.42),
            "gunlimbo": news_count + community_count,
            "ssul": community_count + reddit_count + int(news_count * 0.35),
            "longform": script_lab_count,
        }
    }


class ClaimBatchPayload(BaseModel):
    article_ids: List[int]
    channel_id: str


@router.get("/topic-clusters")
def get_topic_clusters(db: Session = Depends(database.get_db)):
    """
    Returns live topic clusters, entity tag statistics, media type counts,
    and registered brand channels for one-click channel routing.
    """
    articles = db.query(models.ViralArticle).order_by(desc(models.ViralArticle.id)).limit(600).all()
    
    # 15 Standard Killer Topic Categories Definition
    topics_def = [
        {"key": "스포츠", "label": "스포츠 (테니스/축구/야구)", "icon": "🎾", "keywords": ["테니스", "축구", "야구", "농구", "골프", "e스포츠"]},
        {"key": "자동차/교통", "label": "자동차/교통 (블박/사고)", "icon": "🚗", "keywords": ["블랙박스", "교통사고", "과실비율", "보복운전", "전기차"]},
        {"key": "참교육/사이다", "label": "참교육/사이다 (갑질격파)", "icon": "🥊", "keywords": ["참교육", "사이다", "갑질폭로", "악플러고소", "진상퇴치"]},
        {"key": "생활/정보", "label": "생활/정보 (지원금/꿀팁)", "icon": "💰", "keywords": ["정부지원금", "세금/환급", "생활꿀팁", "가성비추천", "다이어트"]},
        {"key": "유머/썰", "label": "유머/썰 (레전드/네이트판)", "icon": "🔥", "keywords": ["레전드썰", "카톡대화", "직장생활", "연애/결혼", "폭소/반전"]},
        {"key": "사건/사고", "label": "사건/사고 (수사/재판)", "icon": "⚖️", "keywords": ["사기/피싱", "학폭/폭행", "재판/수사", "경찰/검찰", "음주운전"]},
        {"key": "IT/테크", "label": "IT/테크 (AI/엔비디아)", "icon": "💻", "keywords": ["AI/인공지능", "엔비디아/반도체", "스마트폰", "로봇/신기술"]},
        {"key": "미스터리/심리", "label": "미스터리/심리 (미제/괴담)", "icon": "🕵️", "keywords": ["미스터리", "미제사건", "심리실험", "소시오패스", "도시괴담"]},
        {"key": "역사/전쟁/비화", "label": "역사/전쟁/비화 (비하인드)", "icon": "⚔️", "keywords": ["세계대전", "조선왕조", "역사비화", "전술/무기", "비극적사건"]},
        {"key": "과학/우주/경이", "label": "과학/우주/경이 (자연/우주)", "icon": "🚀", "keywords": ["블랙홀", "우주탐사", "심해생물", "양자역학", "지구경이"]},
        {"key": "산업현장/달인", "label": "산업현장/달인 (특수공구)", "icon": "🛠️", "keywords": ["공장달인", "특수기계", "장인기술", "극한직업", "현장스피드"]},
        {"key": "연예/방송", "label": "연예/방송 (아이돌/드라마)", "icon": "🎬", "keywords": ["아이돌", "드라마", "예능/토크", "영화/배우"]},
        {"key": "경제/재테크", "label": "경제/재테크 (코인/주식)", "icon": "📈", "keywords": ["비트코인/코인", "주식/증시", "부동산/청약", "금리/환율"]},
        {"key": "해외화제", "label": "해외화제 (기상천외실화)", "icon": "🌍", "keywords": ["기상천외실화"]},
        {"key": "반려동물", "label": "반려동물 (강아지/고양이)", "icon": "🐾", "keywords": ["강아지", "고양이", "동물구출"]},
    ]

    cluster_stats = {t["key"]: {"count": 0, "video_count": 0, "entities": {}} for t in topics_def}
    cross_stats = {}
    media_counts = {"video_clip": 0, "image_pack": 0, "text_story": 0}

    for art in articles:
        top_cat = getattr(art, "topic_category", None)
        med_type = getattr(art, "media_type", None)
        raw_tags = getattr(art, "entity_tags", None) or art.cluster_keywords or []
        
        # On-the-fly categorization if empty
        if not top_cat or top_cat == "일반" or not raw_tags:
            top_cat, med_type, raw_tags, _, _ = discovery_scraper.classify_topic_and_entities(
                art.title or "", art.content_text or "", art.category or "", art.images or []
            )

        tags = []
        if isinstance(raw_tags, str):
            try:
                import json
                parsed = json.loads(raw_tags)
                tags = parsed if isinstance(parsed, list) else [raw_tags]
            except Exception:
                tags = [raw_tags]
        elif isinstance(raw_tags, (list, tuple)):
            for tg in raw_tags:
                if isinstance(tg, str):
                    tags.append(tg)
                elif isinstance(tg, list):
                    tags.extend([str(x) for x in tg if isinstance(x, str)])

        if top_cat in cluster_stats:
            cluster_stats[top_cat]["count"] += 1
            if med_type == "video_clip":
                cluster_stats[top_cat]["video_count"] += 1
            for tag in tags:
                cluster_stats[top_cat]["entities"][tag] = cluster_stats[top_cat]["entities"].get(tag, 0) + 1

        raw_cross = getattr(art, "cross_topics", None) or []
        cr_list = []
        if isinstance(raw_cross, str):
            try:
                import json
                parsed = json.loads(raw_cross)
                cr_list = parsed if isinstance(parsed, list) else [raw_cross]
            except Exception:
                cr_list = [raw_cross]
        elif isinstance(raw_cross, (list, tuple)):
            for cr in raw_cross:
                if isinstance(cr, str):
                    cr_list.append(cr)
                elif isinstance(cr, list):
                    cr_list.extend([str(x) for x in cr if isinstance(x, str)])

        for cr in cr_list:
            if isinstance(cr, str) and cr:
                cross_stats[cr] = cross_stats.get(cr, 0) + 1

        if med_type in media_counts:
            media_counts[med_type] += 1
        else:
            media_counts["text_story"] += 1

    # Channels
    channels = db.query(models.BrandChannel).all()
    channel_list = [
        {
            "id": str(ch.id),
            "channel_id": ch.channel_id,
            "title": ch.title,
            "target_topics": ch.target_topics or [],
            "thumbnail_url": ch.thumbnail_url,
        }
        for ch in channels
    ]

    clusters_result = []
    for t in topics_def:
        k = t["key"]
        st = cluster_stats[k]
        sorted_entities = sorted(st["entities"].items(), key=lambda x: x[1], reverse=True)
        top_ents = [{"name": ent[0], "count": ent[1]} for ent in sorted_entities[:6]]
        clusters_result.append({
            "key": k,
            "label": t["label"],
            "icon": t["icon"],
            "count": st["count"],
            "video_count": st["video_count"],
            "top_entities": top_ents,
        })

    cross_synergies = [
        {"label": k, "count": v}
        for k, v in sorted(cross_stats.items(), key=lambda x: x[1], reverse=True)[:8]
    ]

    return {
        "clusters": clusters_result,
        "cross_synergies": cross_synergies,
        "media_counts": media_counts,
        "channels": channel_list,
        "total_analyzed": len(articles),
    }


SERIES_METADATA: Dict[str, Dict[str, str]] = {
    "series_tennis_highlights": {"title": "테니스 미친 랠리 & 하이라이트", "topic": "스포츠", "icon": "🎾", "suggested_omnibus_title": "[테니스] 보고도 안 믿기는 역대급 랠리 TOP 3"},
    "series_football_highlights": {"title": "축구 원더골 & 슈퍼세이브", "topic": "스포츠", "icon": "⚽", "suggested_omnibus_title": "[축구] 관중석 뒤집어놓은 미친 원더골 모음"},
    "series_축구_highlights": {"title": "축구 원더골 & 슈퍼세이브", "topic": "스포츠", "icon": "⚽", "suggested_omnibus_title": "[축구] 관중석 뒤집어놓은 미친 원더골 모음"},
    "series_baseball_highlights": {"title": "야구 호수비 & 끝내기 홈런", "topic": "스포츠", "icon": "⚾", "suggested_omnibus_title": "[야구] 탄성 터져나온 역대급 호수비 모음"},
    "series_야구_highlights": {"title": "야구 호수비 & 끝내기 홈런", "topic": "스포츠", "icon": "⚾", "suggested_omnibus_title": "[야구] 탄성 터져나온 역대급 호수비 모음"},
    "series_dashcam_accident": {"title": "블랙박스 급발진 & 황당 사고", "topic": "자동차/교통", "icon": "🚗", "suggested_omnibus_title": "[블박] 한문철 변호사도 경악한 레전드 사고 3선"},
    "series_justice_served": {"title": "진상·악플러 참교육 사이다", "topic": "참교육/사이다", "icon": "🥊", "suggested_omnibus_title": "[참교육] 갑질 진상 참교육당하고 무릎꿇은 사이다 실화"},
    "series_unsolved_mystery": {"title": "미스터리 실종 & 심리 미제사건", "topic": "미스터리/심리", "icon": "🕵️", "suggested_omnibus_title": "[미스터리] 아직도 안 풀린 소름 돋는 미제사건 모음"},
    "series_master_craftsman": {"title": "산업현장 달인 & 신의 손 기술", "topic": "산업현장/달인", "icon": "🛠️", "suggested_omnibus_title": "[달인] 0.1초 만에 척척 해내는 산업현장 신의 손들"},
    "series_satisfying_craft": {"title": "산업현장 달인 & 특수 공구 기술", "topic": "산업현장/달인", "icon": "🛠️", "suggested_omnibus_title": "[달인] 0.1초 만에 척척 해내는 산업현장 신의 손들"},
    "series_space_wonders": {"title": "우주 블랙홀 & 지구의 경이", "topic": "과학/우주/경이", "icon": "🚀", "suggested_omnibus_title": "[우주경이] 보면 볼수록 경이로운 우주와 심해의 신비"},
    "series_nature_wonders": {"title": "대자연의 경이 & 야생의 세계", "topic": "과학/우주/경이", "icon": "🌿", "suggested_omnibus_title": "[자연경이] 상상을 초월하는 대자연의 경이로운 순간들"},
    "series_history_war": {"title": "역사를 바꾼 전설의 전투 비화", "topic": "역사/전쟁/비화", "icon": "⚔️", "suggested_omnibus_title": "[역사비화] 교과서에 안 나오는 세계사 반전 실화 3선"},
    "series_history_untold": {"title": "역사를 바꾼 전설의 비화 & 야담", "topic": "역사/전쟁/비화", "icon": "⚔️", "suggested_omnibus_title": "[역사비화] 교과서에 안 나오는 세계사 반전 실화 3선"},
}


@router.get("/series-packs")
def get_series_packs(
    min_count: int = Query(2, ge=2, le=20),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(database.get_db)
):
    """
    Groups articles by series_key (e.g. series_tennis_highlights, series_dashcam_accident)
    having at least min_count clips/articles, ready for 3-clip omnibus short-form packaging.
    """
    series_keys = (
        db.query(models.ViralArticle.series_key, func.count(models.ViralArticle.id).label("cnt"))
        .filter(models.ViralArticle.series_key.isnot(None))
        .group_by(models.ViralArticle.series_key)
        .having(func.count(models.ViralArticle.id) >= min_count)
        .order_by(desc("cnt"))
        .limit(limit)
        .all()
    )

    packs = []
    for row in series_keys:
        s_key = row[0]
        cnt = row[1]
        articles = (
            db.query(models.ViralArticle)
            .filter(models.ViralArticle.series_key == s_key)
            .order_by(desc(models.ViralArticle.viral_score))
            .limit(6)
            .all()
        )
        if not articles:
            continue

        meta = SERIES_METADATA.get(s_key, {
            "title": s_key.replace("series_", "").replace("_", " ").title(),
            "topic": articles[0].topic_category or "일반",
            "icon": "🎬",
            "suggested_omnibus_title": f"[{articles[0].topic_category}] 화제의 클립 3연타 모음"
        })

        video_count = sum(1 for a in articles if (getattr(a, "media_type", None) == "video_clip" or any(".mp4" in (im or "") or "thumb" in (im or "") for im in (a.images or []))))
        avg_score = round(sum((a.viral_score or 80.0) for a in articles) / len(articles), 1)

        packs.append({
            "series_key": s_key,
            "title": meta["title"],
            "topic": meta["topic"],
            "icon": meta["icon"],
            "count": cnt,
            "video_count": video_count,
            "avg_viral_score": avg_score,
            "suggested_omnibus_title": meta["suggested_omnibus_title"],
            "articles": [_article_to_dict(a, include_comments=False) for a in articles[:4]],
        })

    return {
        "series_packs": packs,
        "total_packs": len(packs)
    }


class StitchSeriesRequest(BaseModel):
    series_key: str
    article_ids: List[int]
    target_form_factor: Optional[str] = "classic"  # "classic" | "gunlimbo" | "ssul" | "instastory"
    target_channel_id: Optional[str] = None
    custom_title: Optional[str] = None


@router.post("/series-packs/stitch")
def stitch_series_pack(
    req: StitchSeriesRequest,
    db: Session = Depends(database.get_db)
):
    """
    Sequences 2 to 4 viral clips from a Series Pack into a high-retention Omnibus Short-Form project.
    Generates unified TOP 3 countdown hook, synchronized timecoded scenes, and hands off to Sovereign Studio.
    """
    if not req.article_ids or len(req.article_ids) < 2:
        raise HTTPException(400, "최소 2개 이상의 클립/소재를 선택해야 옴니버스 제작이 가능합니다.")

    articles = (
        db.query(models.ViralArticle)
        .filter(models.ViralArticle.id.in_(req.article_ids))
        .all()
    )
    if not articles:
        raise HTTPException(404, "선택한 소재를 찾을 수 없습니다.")

    # Maintain user selection order
    id_map = {a.id: a for a in articles}
    ordered_articles = [id_map[aid] for aid in req.article_ids if aid in id_map]
    if len(ordered_articles) < 2:
        ordered_articles = articles

    meta = SERIES_METADATA.get(req.series_key, {
        "title": req.series_key.replace("series_", "").replace("_", " ").title(),
        "topic": ordered_articles[0].topic_category or "일반",
        "icon": "🎬",
        "suggested_omnibus_title": f"[{ordered_articles[0].topic_category}] 레전드 순간 TOP {len(ordered_articles)}"
    })

    topic_name = meta.get("topic") or ordered_articles[0].topic_category or "화제의"
    omnibus_title = req.custom_title or meta.get("suggested_omnibus_title") or f"[{topic_name}] 레전드 순간 TOP {len(ordered_articles)}"

    # Construct 3-Scene Countdown Structure (TOP 3 -> TOP 2 -> TOP 1)
    scenes = []
    current_time = 0.0
    full_script_lines = []

    # 1. Opening Hook (0 ~ 3.5s)
    intro_dur = 3.5
    intro_hook = f"절대 눈 뗄 수 없는 {topic_name} 레전드 순간 TOP {len(ordered_articles)}! 바로 시작합니다."
    first_img = (ordered_articles[0].images or [None])[0] if ordered_articles[0].images else None
    scenes.append({
        "scene_index": 0,
        "badge": "INTRO HOOK",
        "badge_color": "#FF0055",
        "headline": f"{meta.get('icon', '🔥')} {topic_name} TOP {len(ordered_articles)}",
        "start_sec": current_time,
        "end_sec": round(current_time + intro_dur, 2),
        "duration_sec": intro_dur,
        "narration": intro_hook,
        "media_url": first_img,
        "article_id": ordered_articles[0].id,
        "article_title": ordered_articles[0].title
    })
    full_script_lines.append(f"[00:00 - INTRO] {intro_hook}")
    current_time += intro_dur

    # 2. Sequential Clips in Countdown Order (e.g. 3위 -> 2위 -> 1위)
    num_clips = len(ordered_articles)
    for idx, art in enumerate(ordered_articles):
        rank = num_clips - idx
        rank_badge = f"TOP {rank}" if rank > 0 else "BONUS"
        clip_dur = 15.0 if idx == 0 else (16.0 if idx == 1 else 17.5)  # Escalating tension
        
        clean_t = re.sub(r'\[.*?\]', '', art.title).strip()
        body_snippet = (art.analysis_summary or art.content_text or "").replace('\n', ' ').strip()
        if len(body_snippet) > 80:
            body_snippet = body_snippet[:77] + "..."

        if rank == 1:
            transition = f"대망의 1위! {clean_t}. {body_snippet}"
        elif rank == 2:
            transition = f"이어서 2위! {clean_t}. {body_snippet}"
        else:
            transition = f"{rank}위! {clean_t}. {body_snippet}"

        media_url = art.images[0] if (art.images and len(art.images) > 0) else None

        scenes.append({
            "scene_index": idx + 1,
            "badge": rank_badge,
            "badge_color": "#FFDD00" if rank == 1 else ("#00E5FF" if rank == 2 else "#A855F7"),
            "headline": clean_t[:30],
            "start_sec": round(current_time, 2),
            "end_sec": round(current_time + clip_dur, 2),
            "duration_sec": clip_dur,
            "narration": transition,
            "media_url": media_url,
            "article_id": art.id,
            "article_title": art.title
        })
        m_start = int(current_time) // 60
        s_start = int(current_time) % 60
        full_script_lines.append(f"[{m_start:02d}:{s_start:02d} - {rank_badge}] {transition}")
        current_time += clip_dur

    # 3. Call-To-Action Outro (3.5s)
    outro_dur = 3.5
    outro_text = "여러분의 원픽은 몇 위였나요? 댓글로 투표해주세요! 구독과 좋아요는 큰 힘이 됩니다."
    scenes.append({
        "scene_index": len(scenes),
        "badge": "VOTE NOW",
        "badge_color": "#10B981",
        "headline": "댓글로 원픽을 남겨주세요!",
        "start_sec": round(current_time, 2),
        "end_sec": round(current_time + outro_dur, 2),
        "duration_sec": outro_dur,
        "narration": outro_text,
        "media_url": None,
        "article_id": None,
        "article_title": "Outro & Engagement"
    })
    m_start = int(current_time) // 60
    s_start = int(current_time) % 60
    full_script_lines.append(f"[{m_start:02d}:{s_start:02d} - OUTRO] {outro_text}")
    current_time += outro_dur

    # Update articles status & form factor
    target_ff = req.target_form_factor or "classic"
    for art in ordered_articles:
        art.status = "approved"
        cur_ffs = art.target_form_factors or []
        if target_ff not in cur_ffs:
            cur_ffs.append(target_ff)
        art.target_form_factors = cur_ffs
        if req.target_channel_id:
            art.claimed_by_channel_id = str(req.target_channel_id)
            art.claimed_at = datetime.now()

    db.commit()

    stitch_id = f"stitch_{int(datetime.now().timestamp())}_{req.series_key}"
    redirect_url = f"/shorts-editor/{target_ff}?article_id={ordered_articles[0].id}&stitch_series={req.series_key}"

    return {
        "success": True,
        "stitch_id": stitch_id,
        "series_key": req.series_key,
        "title": omnibus_title,
        "target_form_factor": target_ff,
        "channel_id": req.target_channel_id,
        "total_duration_sec": round(current_time, 2),
        "scene_count": len(scenes),
        "scenes": scenes,
        "full_script": "\n\n".join(full_script_lines),
        "article_ids": [a.id for a in ordered_articles],
        "redirect_url": redirect_url,
        "message": f"'{omnibus_title}' 옴니버스 쇼츠 프로젝트(총 {len(scenes)}개 씬, {round(current_time, 1)}초)가 성공적으로 패키징되었습니다."
    }


class ExportCapcutSeriesRequest(BaseModel):
    series_key: str
    article_ids: List[int]
    target_channel_id: Optional[str] = None
    custom_title: Optional[str] = None


@router.post("/series-packs/export-capcut")
def export_series_pack_to_capcut(
    req: ExportCapcutSeriesRequest,
    db: Session = Depends(database.get_db)
):
    """
    Directly packages the 3-clip omnibus series into a native CapCut PC project:
    - Generates 9:16 vertical canvas (1080x1920)
    - Sequential video tracks with smooth pacing
    - Countdown badges & synchronized subtitle text tracks (INTRO -> TOP 3 -> TOP 2 -> TOP 1 -> OUTRO)
    - Writes draft_content.json into local CapCut folder (%LOCALAPPDATA%/CapCut/.../draft/{next_num})
    - Automatically registers the project in root_meta_info.json so it shows in CapCut PC instantly.
    """
    from ..services.capcut_generator import CapCutGenerator
    from ..services.capcut_registry_manager import CapCutRegistryManager
    from .capcut_remote import get_default_capcut_path, get_next_project_number

    # 1. First stitch the series into structured timeline
    stitch_req = StitchSeriesRequest(
        series_key=req.series_key,
        article_ids=req.article_ids,
        target_form_factor="classic",
        target_channel_id=req.target_channel_id,
        custom_title=req.custom_title
    )
    stitched = stitch_series_pack(stitch_req, db)
    scenes = stitched.get("scenes") or []
    omnibus_title = stitched.get("title") or "Omnibus Series"

    # 2. Get CapCut draft root directory & next project folder
    base_path = get_default_capcut_path()
    if not os.path.exists(base_path):
        os.makedirs(base_path, exist_ok=True)

    num_info = get_next_project_number()
    folder_name = num_info.get("folderName") or "0901"
    target_folder = os.path.join(base_path, folder_name)
    os.makedirs(target_folder, exist_ok=True)

    # 3. Build CapCut draft using CapCutGenerator
    generator = CapCutGenerator(project_name=omnibus_title)

    for sc in scenes:
        badge = sc.get("badge") or ""
        narration = sc.get("narration") or ""
        headline = sc.get("headline") or ""
        start_sec = float(sc.get("start_sec") or 0.0)
        dur_sec = float(sc.get("duration_sec") or 4.0)

        full_text = f"[{badge}] {headline}\n{narration}" if badge else f"{headline}\n{narration}"
        generator.add_text_segment(full_text, start_sec, dur_sec)

    # Save draft_content.json
    draft_file = os.path.join(target_folder, "draft_content.json")
    generator.save_project(draft_file)

    # 4. Register in root_meta_info.json
    duration_ms = generator._to_ms(stitched.get("total_duration_sec") or 55.0)
    reg_mgr = CapCutRegistryManager()
    reg_success = reg_mgr.register_project(
        project_name=omnibus_title,
        folder_name=folder_name,
        draft_id=generator.project_id,
        duration_ms=duration_ms
    )

    return {
        "success": True,
        "project_name": omnibus_title,
        "folder_name": folder_name,
        "folder_path": target_folder,
        "draft_id": generator.project_id,
        "duration_sec": stitched.get("total_duration_sec"),
        "registered_in_capcut": reg_success,
        "scenes_count": len(scenes),
        "message": f"CapCut PC 프로젝트 '{omnibus_title}' (폴더: {folder_name})가 성공적으로 생성 및 등록되었습니다. CapCut을 실행하면 바로 확인하실 수 있습니다."
    }


# ── 🏛️ Tier 2 Sovereign Channel Director AI Dispatch Endpoints ────────────────
@router.post("/director/dispatch")
async def run_director_dispatch_endpoint(score_threshold: float = Query(25.0, ge=10.0, le=90.0)):
    """
    Tier 2 Sovereign Channel Director:
    Scans unassigned high-viral articles, calculates 3D affinity (+50 topic, +30 cross, +25 entity tags, +20 DNA),
    claims best-matching articles for active channels, and automatically advances them through SCRIPTING & EVALUATING.
    """
    res = await channel_director.run_dispatch_cycle(score_threshold=score_threshold)
    return {
        "success": True,
        **res
    }


@router.post("/director/advance/{article_id}")
def advance_article_lifecycle_endpoint(article_id: int, db: Session = Depends(database.get_db)):
    """
    Manually advances a specific viral article through SCRIPTING and Critic-85 quality audit.
    """
    try:
        res = channel_director.advance_article_lifecycle(article_id, db)
        return {"success": True, **res}
    except Exception as e:
        raise HTTPException(400, str(e))


@router.get("/spike-radar")
def get_spike_radar(
    hours: int = Query(24, ge=1, le=72),
    limit: int = Query(12, ge=1, le=30),
    db: Session = Depends(database.get_db)
):
    """
    Surfaces real-time surging tags and cross-synergies weighted by velocity_score and recentness.
    """
    cutoff = datetime.now() - timedelta(hours=hours)
    spiking_articles = (
        db.query(models.ViralArticle)
        .filter(
            models.ViralArticle.scraped_at >= cutoff,
            or_(models.ViralArticle.velocity_score >= 85.0, models.ViralArticle.viral_score >= 85.0)
        )
        .order_by(desc(models.ViralArticle.velocity_score))
        .limit(200)
        .all()
    )

    tag_stats = {}
    for art in spiking_articles:
        raw_tags = getattr(art, "entity_tags", None) or art.cluster_keywords or []
        tags = []
        if isinstance(raw_tags, str):
            try:
                import json
                parsed = json.loads(raw_tags)
                tags = parsed if isinstance(parsed, list) else [raw_tags]
            except Exception:
                tags = [raw_tags]
        elif isinstance(raw_tags, (list, tuple)):
            for tg in raw_tags:
                if isinstance(tg, str):
                    tags.append(tg)
                elif isinstance(tg, list):
                    tags.extend([str(x) for x in tg if isinstance(x, str)])

        raw_cross = getattr(art, "cross_topics", None) or []
        cross_topics = []
        if isinstance(raw_cross, str):
            try:
                import json
                parsed = json.loads(raw_cross)
                cross_topics = parsed if isinstance(parsed, list) else [raw_cross]
            except Exception:
                cross_topics = [raw_cross]
        elif isinstance(raw_cross, (list, tuple)):
            for cr in raw_cross:
                if isinstance(cr, str):
                    cross_topics.append(cr)
                elif isinstance(cr, list):
                    cross_topics.extend([str(x) for x in cr if isinstance(x, str)])

        combined_tags = [t for t in (tags + cross_topics) if isinstance(t, str)]
        
        vel = float(art.velocity_score or art.viral_score or 80.0)
        top = getattr(art, "topic_category", "일반")
        
        for t in combined_tags:
            if not t or len(t) < 2:
                continue
            if t not in tag_stats:
                tag_stats[t] = {
                    "tag": t,
                    "topic": top,
                    "count": 0,
                    "velocity_sum": 0.0,
                    "sample_title": art.title or "",
                    "is_video": (getattr(art, "media_type", None) == "video_clip")
                }
            tag_stats[t]["count"] += 1
            tag_stats[t]["velocity_sum"] += vel
            if getattr(art, "media_type", None) == "video_clip":
                tag_stats[t]["is_video"] = True

    results = []
    for t, data in tag_stats.items():
        if data["count"] < 1:
            continue
        avg_vel = data["velocity_sum"] / data["count"]
        # Velocity score weighting with frequency bonus
        spike_score = round(min(99.9, avg_vel + (math.log2(data["count"] + 1) * 2.5)), 1)
        results.append({
            "tag": data["tag"],
            "topic": data["topic"],
            "count": data["count"],
            "spike_score": spike_score,
            "sample_title": data["sample_title"],
            "is_video": data["is_video"]
        })

    results.sort(key=lambda x: x["spike_score"], reverse=True)
    return {
        "spikes": results[:limit],
        "total_analyzed": len(spiking_articles)
    }


@router.post("/claim-batch")
def claim_articles_for_channel(payload: ClaimBatchPayload, db: Session = Depends(database.get_db)):
    """Assigns multiple articles to a specific BrandChannel."""
    if not payload.article_ids:
        raise HTTPException(status_code=400, detail="선택된 기사가 없습니다.")
    
    updated = db.query(models.ViralArticle).filter(
        models.ViralArticle.id.in_(payload.article_ids)
    ).update({
        "claimed_by_channel_id": payload.channel_id,
        "claimed_at": datetime.now(),
        "status": "claimed"
    }, synchronize_session=False)
    
    db.commit()
    return {"success": True, "claimed_count": updated, "channel_id": payload.channel_id}


@router.get("/articles")
async def list_articles(
    tab: Optional[str] = Query(None),                 # community | news | reddit | google_trends | youtube_shorts | video_vault | script_lab | all
    source_type: Optional[str] = Query(None),
    region: Optional[str] = Query(None),             # all | domestic | global
    community_name: Optional[str] = Query(None),     # specific community code
    category: Optional[str] = Query(None),           # news/community category
    topic: Optional[str] = Query(None),              # reddit topic
    topic_category: Optional[str] = Query(None),     # 15대 대주제 (스포츠, 자동차/교통, 생활/정보 등)
    entity_tag: Optional[str] = Query(None),         # 세부 엔티티 태그 (테니스, 축구, 블랙박스 등)
    cross_topic: Optional[str] = Query(None),        # 2D 크로스 시너지 태그 (스포츠 × 참교육 등)
    series_key: Optional[str] = Query(None),         # 시리즈 팩 식별 키 (series_tennis_highlights 등)
    media_type: Optional[str] = Query(None),         # all | video_clip | image_pack | text_story
    claimed_by_channel_id: Optional[str] = Query(None), # 채널 ID 또는 unclaimed
    status: Optional[str] = Query(None),             # all | collected | analyzed | scripted | longform | archived
    length: Optional[str] = Query(None),             # all | short (<500) | standard (500~1500) | long (>1500)
    time_range: Optional[str] = Query(None),         # all | 1d | 3d | 7d | 30d
    psychological_trigger: Optional[str] = Query(None),
    curated_only: bool = Query(False),
    min_score: float = Query(0.0, ge=0.0, le=100.0),
    sort_by: str = Query("viral_score"),             # viral_score | velocity | comments | views | likes | cluster_count | recent
    page: int = Query(1, ge=1),
    limit: int = Query(30, ge=1, le=100),
    search: Optional[str] = Query(None),
    db: Session = Depends(database.get_db),
):
    effective_tab = tab or source_type or "all"

    # 1) Video Vault Track (영상 보관함)
    if effective_tab == "video_vault":
        q = db.query(models.Video).filter(models.Video.file_path.isnot(None), models.Video.file_path != "")
        if search:
            q = q.filter(models.Video.title.ilike(f"%{search}%"))
        if time_range and time_range != "all":
            days = {"1d": 1, "3d": 3, "7d": 7, "30d": 30}.get(time_range, 30)
            cutoff = datetime.now() - timedelta(days=days)
            q = q.filter(models.Video.downloaded_at >= cutoff)
        if sort_by == "views":
            q = q.order_by(desc(models.Video.view_count))
        elif sort_by == "velocity":
            q = q.order_by(desc(models.Video.velocity_score), desc(models.Video.viral_score))
        elif sort_by == "recent":
            q = q.order_by(desc(models.Video.downloaded_at), desc(models.Video.id))
        else:
            q = q.order_by(desc(models.Video.viral_score), desc(models.Video.id))
        total = q.count()
        items = q.offset((page - 1) * limit).limit(limit).all()
        return {
            "articles": [_video_to_article_dict(v, is_script_lab=False) for v in items],
            "total": total,
            "page": page,
            "limit": limit
        }

    # 2) Script Lab Track (대본 분석실)
    if effective_tab == "script_lab":
        q = db.query(models.Video).filter(models.Video.transcript.isnot(None), models.Video.transcript != "")
        if search:
            q = q.filter(or_(models.Video.title.ilike(f"%{search}%"), models.Video.transcript.ilike(f"%{search}%")))
        if time_range and time_range != "all":
            days = {"1d": 1, "3d": 3, "7d": 7, "30d": 30}.get(time_range, 30)
            cutoff = datetime.now() - timedelta(days=days)
            q = q.filter(models.Video.downloaded_at >= cutoff)
        if length and length != "all":
            if length == "short":
                q = q.filter(func.length(models.Video.transcript) < 500)
            elif length == "standard":
                q = q.filter(func.length(models.Video.transcript) >= 500, func.length(models.Video.transcript) <= 1500)
            elif length == "long":
                q = q.filter(func.length(models.Video.transcript) > 1500)

        if sort_by == "views":
            q = q.order_by(desc(models.Video.view_count))
        elif sort_by == "velocity":
            q = q.order_by(desc(models.Video.velocity_score), desc(models.Video.viral_score))
        elif sort_by == "recent":
            q = q.order_by(desc(models.Video.id))
        else:
            q = q.order_by(desc(models.Video.viral_score), desc(models.Video.id))
        total = q.count()
        items = q.offset((page - 1) * limit).limit(limit).all()
        return {
            "articles": [_video_to_article_dict(v, is_script_lab=True) for v in items],
            "total": total,
            "page": page,
            "limit": limit
        }

    # 3) Text Articles (Community, News, Reddit, Google Trends, YouTube Shorts)
    query = db.query(models.ViralArticle)

    # Filter by Tab
    if effective_tab == "community":
        query = query.filter(models.ViralArticle.source_type == "community")
    elif effective_tab == "news":
        query = query.filter(models.ViralArticle.source_type == "news")
    elif effective_tab == "reddit":
        query = query.filter(models.ViralArticle.source_type == "reddit")
    elif effective_tab == "google_trends":
        query = query.filter(models.ViralArticle.source_type == "google_trends")
    elif effective_tab == "youtube_shorts":
        query = query.filter(models.ViralArticle.source_type == "youtube_shorts")
    elif effective_tab != "all" and effective_tab:
        query = query.filter(models.ViralArticle.source_type == effective_tab)

    # Filter by Community Region (domestic vs global)
    if region and region != "all" and effective_tab == "community":
        global_keys = [k for k, v in COMMUNITY_SOURCES.items() if v.get("region") == "global"]
        if region == "global":
            query = query.filter(models.ViralArticle.community_name.in_(global_keys))
        elif region == "domestic":
            query = query.filter(~models.ViralArticle.community_name.in_(global_keys))

    # Specific community platform filter
    if community_name and community_name != "all":
        query = query.filter(models.ViralArticle.community_name == community_name)

    # Category filter (news or community category)
    if category and category != "all":
        query = query.filter(models.ViralArticle.category == category)

    # Reddit Topic filter
    if topic and topic != "all":
        query = query.filter(models.ViralArticle.category == topic)

    # Status filter (Script Lab status bar parity)
    if status and status != "all":
        if status == "collected":
            query = query.filter(models.ViralArticle.status == "collected")
        elif status == "analyzed":
            query = query.filter(models.ViralArticle.status == "analyzed")
        elif status == "scripted":
            query = query.filter(models.ViralArticle.structured_script.isnot(None))
        elif status == "archived":
            query = query.filter(models.ViralArticle.status == "archived")
        else:
            query = query.filter(models.ViralArticle.status == status)

    # Length filter (<500, 500~1500, >1500)
    if length and length != "all":
        if length == "short":
            query = query.filter(func.length(func.coalesce(models.ViralArticle.content_text, "")) < 500)
        elif length == "standard":
            query = query.filter(
                func.length(func.coalesce(models.ViralArticle.content_text, "")) >= 500,
                func.length(func.coalesce(models.ViralArticle.content_text, "")) <= 1500
            )
        elif length == "long":
            query = query.filter(func.length(func.coalesce(models.ViralArticle.content_text, "")) > 1500)

    # Time range filter (1d, 3d, 7d, 30d)
    if time_range and time_range != "all":
        days = {"1d": 1, "3d": 3, "7d": 7, "30d": 30}.get(time_range, 30)
        cutoff = datetime.now() - timedelta(days=days)
        query = query.filter(models.ViralArticle.scraped_at >= cutoff)

    if psychological_trigger and psychological_trigger != "all":
        query = query.filter(models.ViralArticle.psychological_trigger == psychological_trigger)

    if search:
        s_term = f"%{search}%"
        query = query.filter(
            or_(
                models.ViralArticle.title.ilike(s_term),
                models.ViralArticle.content_text.ilike(s_term),
                models.ViralArticle.author.ilike(s_term),
                models.ViralArticle.psychological_trigger.ilike(s_term),
            )
        )

    if min_score > 0:
        query = query.filter(models.ViralArticle.viral_score >= min_score)

    # 10 Standard Topic Category Filter
    if topic_category and topic_category != "all":
        query = query.filter(models.ViralArticle.topic_category == topic_category)

    # Entity Tag Filter (e.g. "테니스", "축구", "블랙박스")
    if entity_tag and entity_tag != "all":
        e_term = f"%{entity_tag}%"
        query = query.filter(
            or_(
                models.ViralArticle.entity_tags.cast(String).ilike(e_term),
                models.ViralArticle.cluster_keywords.cast(String).ilike(e_term),
                models.ViralArticle.title.ilike(e_term),
            )
        )

    # 2D Cross Topic Synergy Filter (e.g. "스포츠 × 참교육", "자동차 × 과실비율")
    if cross_topic and cross_topic != "all":
        c_term = f"%{cross_topic}%"
        query = query.filter(models.ViralArticle.cross_topics.cast(String).ilike(c_term))

    # Series Pack Key Filter (e.g. "series_tennis_highlights")
    if series_key and series_key != "all":
        query = query.filter(models.ViralArticle.series_key == series_key)

    # Media Type Filter ("video_clip", "image_pack", "text_story")
    if media_type and media_type != "all":
        if media_type == "video_clip":
            query = query.filter(
                or_(
                    models.ViralArticle.media_type == "video_clip",
                    models.ViralArticle.images.cast(String).ilike("%thumb%"),
                    models.ViralArticle.images.cast(String).ilike("%.mp4%"),
                    models.ViralArticle.content_text.ilike("%[동영상:%"),
                )
            )
        elif media_type == "image_pack":
            query = query.filter(models.ViralArticle.media_type == "image_pack")
        elif media_type == "text_story":
            query = query.filter(
                or_(
                    models.ViralArticle.media_type == "text_story",
                    models.ViralArticle.media_type.is_(None),
                )
            )

    # Channel Claim Filter
    if claimed_by_channel_id and claimed_by_channel_id != "all":
        if claimed_by_channel_id == "unclaimed":
            query = query.filter(models.ViralArticle.claimed_by_channel_id.is_(None))
        else:
            query = query.filter(models.ViralArticle.claimed_by_channel_id == claimed_by_channel_id)

    if curated_only:
        query = query.filter(
            or_(
                models.ViralArticle.viral_score >= 80.0,
                models.ViralArticle.comments_count >= 10,
                models.ViralArticle.likes >= 15,
                models.ViralArticle.source_type.in_(["google_trends", "youtube_shorts"])
            )
        )

    # Sorting
    if sort_by == "velocity":
        query = query.order_by(desc(models.ViralArticle.velocity_score), desc(models.ViralArticle.viral_score))
    elif sort_by == "cluster_count":
        query = query.order_by(desc(models.ViralArticle.cluster_count), desc(models.ViralArticle.viral_score))
    elif sort_by == "comments":
        query = query.order_by(desc(models.ViralArticle.comments_count), desc(models.ViralArticle.viral_score))
    elif sort_by == "views":
        query = query.order_by(desc(models.ViralArticle.views))
    elif sort_by == "likes":
        query = query.order_by(desc(models.ViralArticle.likes))
    elif sort_by == "recent":
        query = query.order_by(desc(models.ViralArticle.scraped_at), desc(models.ViralArticle.id))
    else:  # viral_score default
        query = query.order_by(desc(models.ViralArticle.viral_score), desc(models.ViralArticle.id))

    total = query.count()

    # Self-heal on empty community filter: harvest initial articles on-the-fly
    if total == 0 and page == 1 and not search and community_name and community_name != "all" and community_name in COMMUNITY_SOURCES:
        try:
            logger.info(f"[ViralIntel] Auto-harvesting empty community '{community_name}'...")
            fresh_articles = await discovery_scraper.scrape_community(community_name, max_articles=8)
            for a in fresh_articles:
                discovery_scraper.sync_upsert_article(db, a)
            db.commit()
            total = query.count()
        except Exception as ex:
            logger.warning(f"[ViralIntel] Self-heal harvest failed for {community_name}: {ex}")

    items = query.offset((page - 1) * limit).limit(limit).all()

    return {
        "articles": [_article_to_dict(a, include_comments=True) for a in items],
        "total": total,
        "page": page,
        "limit": limit
    }


@router.get("/articles/{article_id}")
def get_article(article_id: int, db: Session = Depends(database.get_db)):
    art = db.query(models.ViralArticle).filter(models.ViralArticle.id == article_id).first()
    if not art:
        raise HTTPException(404, "Article not found")
    return _article_to_dict(art, include_comments=True)


@router.post("/scrape-now")
async def trigger_scrape_now(
    source_code: Optional[str] = Query(None),
    route: Optional[str] = Query(None),
    topic: Optional[str] = Query("all"),
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(database.get_db)
):
    """Trigger real-time harvest of multi-routes (Google Trends, YouTube Shorts, Reddit, News, Communities)."""
    target = source_code or route
    if target == "google_trends":
        articles = await discovery_scraper.scrape_google_trends(geo="KR")
        upserted = [discovery_scraper.sync_upsert_article(db, a) for a in articles]
        return {"message": f"구글 트렌드 급상승 {len(articles)}건 수집 완료", "count": len(articles)}

    elif target == "youtube_shorts":
        articles = await discovery_scraper.scrape_youtube_trending_shorts(max_items=15)
        upserted = [discovery_scraper.sync_upsert_article(db, a) for a in articles]
        return {"message": f"유튜브 급상승 쇼츠 {len(articles)}건 수집 완료", "count": len(articles)}

    elif target == "reddit" or (target and target.startswith("reddit_")):
        sub = target.replace("reddit_", "") if target.startswith("reddit_") else topic
        articles = await discovery_scraper.scrape_reddit_top(subreddit=sub, max_articles=15)
        upserted = [discovery_scraper.sync_upsert_article(db, a) for a in articles]
        return {"message": f"레딧 ({sub}) 인기글 {len(articles)}건 수집 완료", "count": len(articles)}

    elif source_code:
        if source_code.startswith("naver_"):
            sid_map = {s["code"]: s.get("sid1", "100") for s in NAVER_SECTIONS}
            sid = sid_map.get(source_code, 100)
            articles = await discovery_scraper.scrape_naver_news_ranking(sid1=sid, max_articles=15)
        else:
            articles = await discovery_scraper.scrape_community(source_code, max_articles=15)

        upserted = []
        for a in articles:
            saved = discovery_scraper.sync_upsert_article(db, a)
            upserted.append(saved)

        # Auto-analyze top article
        for a in upserted[:1]:
            if a.status != "analyzed":
                try:
                    await scout_alpha_worker.analyze_article(a.id, db)
                except Exception as err:
                    logger.debug(f"Auto analyze error: {err}")

        return {"message": f"Scraped {len(articles)} real articles from {source_code}", "count": len(articles)}

    else:
        active_routes = [route] if route and route != "all" else None
        res = await discovery_scraper.run_full_scrape_cycle(routes=active_routes, max_per_source=10)

        # Auto-analyze top 3 collected items in database
        top_un = db.query(models.ViralArticle).filter(models.ViralArticle.status == "collected").order_by(desc(models.ViralArticle.viral_score)).limit(3).all()
        for art in top_un:
            try:
                await scout_alpha_worker.analyze_article(art.id, db)
            except Exception as err:
                logger.debug(f"Auto analyze error: {err}")

        return res


@router.post("/articles/{article_id}/analyze")
async def analyze_article(article_id: int, db: Session = Depends(database.get_db)):
    """Trigger Scout-Alpha 1st-stage deep viral analysis on an article."""
    try:
        updated = await scout_alpha_worker.analyze_article(article_id, db)
        return _article_to_dict(updated, include_comments=True)
    except Exception as e:
        logger.error(f"Analysis endpoint error: {e}")
        raise HTTPException(500, str(e))


@router.post("/articles/{article_id}/fetch-details")
async def fetch_article_details(article_id: int, db: Session = Depends(database.get_db)):
    """Deep fetch genuine body text, clean images, and comments for an article on-demand."""
    art = db.query(models.ViralArticle).filter(models.ViralArticle.id == article_id).first()
    if not art:
        raise HTTPException(404, "Article not found")

    if art.url:
        try:
            body = ""
            imgs = []
            cmts = []
            created_at_src = None

            views_val = 0
            likes_val = 0
            cmts_val = 0

            # Special case: FMKorea requires Playwright bypass
            if (art.community_name == "fmkorea") or ("fmkorea.com" in (art.url or "")):
                p_res = await discovery_scraper.scrape_single_article_live(art.url)
                body = p_res.get("content_text", "")
                imgs = p_res.get("images", [])
                cmts = p_res.get("comments", [])
                created_at_src = p_res.get("created_at_source")
                views_val = p_res.get("views", 0)
                likes_val = p_res.get("likes", 0)
                cmts_val = p_res.get("comments_count", 0)
            else:
                # Other platforms: deep_extract_article_page with return_meta=True
                async with httpx.AsyncClient(timeout=14.0, follow_redirects=True) as client:
                    body, imgs, cmts, meta = await discovery_scraper.deep_extract_article_page(
                        client, art.url, art.community_name or "", return_meta=True
                    )
                    views_val = meta.get("views", 0)
                    likes_val = meta.get("likes", 0)
                    cmts_val = meta.get("comments_count", 0)
                    created_at_src = meta.get("created_at_source")

                    # Fallback to article_body_extractor if body is empty or too short
                    if not body or len(body.strip()) < 20:
                        ext_res = await article_body_extractor.extract_url(
                            client, art.url, source_code=art.community_name or "", title_hint=art.title
                        )
                        if ext_res.body_text and len(ext_res.body_text) > len(body or ""):
                            body = ext_res.body_text
                        if ext_res.images and not imgs:
                            imgs = ext_res.images
                        if ext_res.comments and not cmts:
                            cmts = ext_res.comments

            min_len = 10 if (imgs and len(imgs) > 0) else 25
            if body and len(body.strip()) >= min_len:
                art.content_text = body.strip()
            if imgs:
                # Deduplicate images preserving order
                seen_im = set()
                deduped = []
                for im in imgs:
                    if im not in seen_im:
                        seen_im.add(im)
                        deduped.append(im)
                art.images = deduped
            if created_at_src and not art.created_at_source:
                art.created_at_source = created_at_src

            # Synchronize live metrics
            if views_val and views_val > 0:
                art.views = views_val
            if likes_val and likes_val > 0:
                art.likes = likes_val
            if cmts_val and cmts_val > 0:
                art.comments_count = max(len(cmts or []), cmts_val)
            elif cmts:
                art.comments_count = max(art.comments_count or 0, len(cmts))

            # Always synchronize comments with live reality (wipe old/polluted comments)
            db.query(models.ViralArticleComment).filter(models.ViralArticleComment.article_id == art.id).delete()
            for idx, cmt in enumerate(cmts or []):
                c_rec = models.ViralArticleComment(
                    article_id=art.id,
                    author=cmt.get("author", "네티즌"),
                    text=cmt.get("text", ""),
                    likes=cmt.get("likes", 0),
                    is_best=cmt.get("is_best", False),
                    order_idx=idx
                )
                db.add(c_rec)

            db.commit()
            db.refresh(art)
        except Exception as e:
            logger.warning(f"Error fetching details for article {article_id}: {e}")
            db.rollback()

    try:
        updated = await asyncio.wait_for(scout_alpha_worker.analyze_article(article_id, db), timeout=7.0)
        return _article_to_dict(updated, include_comments=True)
    except Exception as ae:
        logger.info(f"ScoutAlpha analysis completed or deferred for #{article_id}: {ae}")
        db.refresh(art)
        return _article_to_dict(art, include_comments=True)


@router.post("/articles/{article_id}/claim")
def claim_article(
    article_id: int,
    channel_id: int = Query(...),
    db: Session = Depends(database.get_db)
):
    """Claim a viral article for a specific brand channel."""
    try:
        updated = channel_director.claim_article(article_id, channel_id, db)
        return _article_to_dict(updated)
    except Exception as e:
        raise HTTPException(400, str(e))


@router.post("/articles/{article_id}/unclaim")
def unclaim_article(article_id: int, db: Session = Depends(database.get_db)):
    """Release a claimed article back to the pool."""
    try:
        updated = channel_director.unclaim_article(article_id, db)
        return _article_to_dict(updated)
    except Exception as e:
        raise HTTPException(400, str(e))


@router.get("/media/search")
async def search_free_media(
    query: str = Query(..., min_length=1),
    limit: int = Query(15, ge=1, le=50),
    provider: str = Query("all", pattern="^(all|duckduckgo|naver)$"),
):
    """Zero-cost real photo search across DuckDuckGo and Naver."""
    results = await free_media_scraper.search(query, limit=limit, provider=provider)
    return {"results": results, "total": len(results)}


@router.post("/media/download")
async def download_free_media(
    url: str = Query(...),
    query_hint: str = Query("free_media"),
):
    """Download image, validate magic bytes, and cache locally."""
    try:
        dl_info = await free_media_scraper.download_image(url, query_hint=query_hint)
        return dl_info
    except Exception as e:
        raise HTTPException(500, f"Failed to download image: {e}")


@router.get("/stats")
def get_viral_stats(db: Session = Depends(database.get_db)):
    """Get system-wide viral radar statistics."""
    total_articles = db.query(models.ViralArticle).count()
    analyzed_articles = db.query(models.ViralArticle).filter(models.ViralArticle.status == "analyzed").count()
    claimed_articles = db.query(models.ViralArticle).filter(models.ViralArticle.status == "claimed").count()

    top_viral = db.query(models.ViralArticle).order_by(desc(models.ViralArticle.viral_score)).limit(5).all()

    return {
        "total_articles": total_articles,
        "analyzed_articles": analyzed_articles,
        "claimed_articles": claimed_articles,
        "collected_articles": total_articles - (analyzed_articles + claimed_articles),
        "top_viral": [_article_to_dict(a, include_comments=True) for a in top_viral]
    }


# ── 🌐 Live Autonomous Scraper Worker & Real-time Telemetry ──────────────

@router.on_event("startup")
def startup_viral_worker():
    """Auto-start autonomous viral radar worker on backend startup."""
    try:
        viral_radar_worker.start()
    except Exception as e:
        logger.warning(f"Failed to auto-start viral radar worker: {e}")


@router.get("/worker/telemetry")
def get_worker_telemetry():
    """Return genuine real-time scraper telemetry for the Quant Radar."""
    if not viral_radar_worker._running:
        try:
            viral_radar_worker.start()
        except Exception:
            pass
    return viral_radar_telemetry.get_summary()


@router.post("/worker/start")
def start_viral_worker():
    """Start the autonomous background harvesting loop."""
    viral_radar_worker.start()
    return {"success": True, "status": "running"}


@router.post("/worker/stop")
def stop_viral_worker():
    """Pause the autonomous background harvesting loop."""
    viral_radar_worker.stop()
    return {"success": True, "status": "stopped"}


# ═══════════════════════════════════════════════════════════════════════════════
# 🌐 IMAGE ANTI-HOTLINK BYPASS PROXY (Pixeling Architecture Mirror)
# ═══════════════════════════════════════════════════════════════════════════════
@router.get("/proxy-image")
async def proxy_image_endpoint(url: str = Query(...)):
    """
    Reverse-engineered anti-hotlinking image proxy (identical to Pixeling's /api/discovery/community-thumbnail).
    Bypasses ERR_BLOCKED_BY_ORB and HTTP 403 Forbidden on DCInside, Ruliweb, FMKorea, Naver News, etc.
    by streaming image binaries with custom origin Referer and CORS allow-all headers.
    """
    if not url or not url.startswith("http"):
        raise HTTPException(400, "Invalid image URL")

    parsed = urllib.parse.urlparse(url)
    domain = parsed.netloc.lower()

    referer = f"{parsed.scheme}://{parsed.netloc}/"
    if "dcinside" in domain:
        referer = "https://gall.dcinside.com/"
    elif "ruliweb" in domain:
        referer = "https://bbs.ruliweb.com/"
    elif "fmkorea" in domain:
        referer = "https://www.fmkorea.com/"
    elif "inven" in domain:
        referer = "https://www.inven.co.kr/"
    elif "naver" in domain:
        referer = "https://news.naver.com/"
    elif "daum" in domain:
        referer = "https://news.daum.net/"
    elif "redd.it" in domain or "reddit" in domain:
        referer = "https://www.reddit.com/"
    elif "arca" in domain:
        referer = "https://arca.live/"
    elif "theqoo" in domain:
        referer = "https://theqoo.net/"
    elif "dogdrip" in domain:
        referer = "https://www.dogdrip.net/"
    elif "boredpanda" in domain:
        referer = "https://www.boredpanda.com/"
    elif "odditycentral" in domain:
        referer = "https://www.odditycentral.com/"
    elif "ygosu" in domain:
        referer = "https://www.ygosu.com/"

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
        "Referer": referer,
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    }

    TRANSPARENT_PIXEL = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82'

    try:
        async with httpx.AsyncClient(timeout=4.0, follow_redirects=True, verify=False) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200 and len(resp.content) > 0:
                media_type = resp.headers.get("content-type", "image/jpeg")
                return Response(
                    content=resp.content,
                    media_type=media_type,
                    headers={
                        "Access-Control-Allow-Origin": "*",
                        "Cache-Control": "public, max-age=86400",
                    }
                )
    except Exception as e:
        logger.debug(f"[ProxyImage] Warning fetching {url}: {e}")

    # Fallback to transparent pixel on any error so browser never hangs or spams 502
    return Response(
        content=TRANSPARENT_PIXEL,
        media_type="image/png",
        headers={
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=3600",
        }
    )


# ═══════════════════════════════════════════════════════════════════════════════
# 🛰️ REAL-TIME TELEMETRY & QUANT RADAR OBSERVABILITY
# ═══════════════════════════════════════════════════════════════════════════════
@router.get("/collector-telemetry")
def get_collector_telemetry_endpoint():
    """
    Returns platform-by-platform live telemetry:
    health (HEALTHY, DEGRADED, BLOCKED), last_attempt_at, last_success_at,
    total_collected, avg_body_length, image_success_rate, and error diagnostics.
    """
    return {
        "timestamp": datetime.now().isoformat(),
        "telemetry": collector_telemetry.get_all_telemetry()
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 🩺 SELF-HEALING & ON-DEMAND HARVESTING GATEWAY
# ═══════════════════════════════════════════════════════════════════════════════
@router.post("/self-heal/{platform_code}")
async def self_heal_platform_endpoint(platform_code: str, db: Session = Depends(database.get_db)):
    """
    Diagnose, unblock, and re-harvest articles from a failing or requested platform on demand.
    Saves new high-quality articles with deep body text and images directly to viral_loop.db.
    """
    try:
        results = await discovery_scraper.scrape_source(platform_code, limit=10)
        if not results:
            return {
                "success": False,
                "platform": platform_code,
                "message": f"[{platform_code}] 수집 결과가 없습니다. 소스 응답을 확인하세요.",
                "harvested_count": 0,
                "saved_count": 0,
            }

        saved_count = 0
        for item in results:
            url = item.get("url")
            if not url:
                continue
            existing = db.query(models.ViralArticle).filter(models.ViralArticle.url == url).first()
            if not existing:
                art = models.ViralArticle(
                    source_type=item.get("source_type", "community"),
                    community_name=item.get("community_name", platform_code),
                    category=item.get("category", "전체"),
                    title=item.get("title", ""),
                    url=url,
                    author=item.get("author", "익명"),
                    created_at_source=item.get("created_at_source"),
                    views=item.get("views", 0),
                    likes=item.get("likes", 0),
                    comments_count=item.get("comments_count", 0),
                    content_text=item.get("content_text", ""),
                    images=item.get("images", []),
                    viral_score=item.get("viral_score", 78.0),
                    velocity_score=item.get("velocity_score", 82.0),
                    search_traffic=item.get("search_traffic"),
                    psychological_trigger=item.get("psychological_trigger", "호기심/반전"),
                    retention_probability=item.get("retention_probability", 84.0),
                    lifespan_phase=item.get("lifespan_phase", "surge"),
                    analysis_summary=item.get("analysis_summary"),
                    suggested_title=item.get("suggested_title"),
                    target_form_factors=item.get("target_form_factors", []),
                    structured_script=item.get("structured_script"),
                    scraped_at=datetime.now(),
                    status="discovered",
                )
                db.add(art)
                db.flush()

                # Add real comments if extracted
                for cmt in item.get("comments", []):
                    c_rec = models.ViralArticleComment(
                        article_id=art.id,
                        author=cmt.get("author", "익명"),
                        text=cmt.get("text", ""),
                        likes=cmt.get("likes", 0),
                        is_best=cmt.get("is_best", False),
                        order_idx=cmt.get("order_idx", 0),
                    )
                    db.add(c_rec)

                saved_count += 1

        db.commit()
        return {
            "success": True,
            "platform": platform_code,
            "harvested_count": len(results),
            "saved_count": saved_count,
            "message": f"[{platform_code}] 자가치유 완료: {len(results)}건 수집, 신규 {saved_count}건 저장",
        }
    except Exception as e:
        logger.error(f"[SelfHeal] Failed for {platform_code}: {e}")
        return {"success": False, "platform": platform_code, "error": str(e)}


# ═══════════════════════════════════════════════════════════════════════════════
# 🎬 BATCH HANDOFF GATEWAY (Sovereign Studios: Gunlimbo / Ssul / Classic / Vault)
# Note: User strictly prohibited sending articles to script_lab!
# ═══════════════════════════════════════════════════════════════════════════════
class BatchHandoffRequest(BaseModel):
    article_ids: List[int]
    target_form_factor: str  # "gunlimbo" | "ssul" | "classic" | "gallery"
    channel_id: Optional[str] = None


@router.post("/batch-handoff")
def batch_handoff_endpoint(req: BatchHandoffRequest, db: Session = Depends(database.get_db)):
    """
    Hands off selected viral articles directly to dedicated form-factor studios:
    - gunlimbo: Gunlimbo Breaking News Studio (/shorts-editor/gunlimbo)
    - ssul: Ssul Studio (/shorts-editor/ssul)
    - classic: Classic Studio (/shorts-editor/classic)
    - gallery: Video Vault (/content-library)
    Strictly forbids routing to Script Lab (대본 분석실)!
    """
    if not req.article_ids:
        raise HTTPException(400, "선택된 소재가 없습니다.")

    articles = db.query(models.ViralArticle).filter(models.ViralArticle.id.in_(req.article_ids)).all()
    if not articles:
        raise HTTPException(404, "선택한 소재를 찾을 수 없습니다.")

    updated_articles = []
    for art in articles:
        art.status = "approved"
        if req.target_form_factor in ["gunlimbo", "ssul", "classic"]:
            cur_ffs = art.target_form_factors or []
            if req.target_form_factor not in cur_ffs:
                cur_ffs.append(req.target_form_factor)
            art.target_form_factors = cur_ffs
        if req.channel_id:
            art.claimed_by_channel_id = req.channel_id
            art.claimed_at = datetime.now()
        updated_articles.append(_article_to_dict(art, include_comments=True))

    db.commit()

    # Determine optimal routing target
    if len(req.article_ids) == 1 and req.target_form_factor in ["gunlimbo", "ssul", "classic"]:
        redirect_url = f"/shorts-editor/{req.target_form_factor}?article_id={req.article_ids[0]}"
    elif req.target_form_factor in ["gunlimbo", "ssul", "classic"]:
        redirect_url = f"/shorts-batch?form_factor={req.target_form_factor}&article_ids={','.join(map(str, req.article_ids))}"
    else:
        redirect_url = "/content-library"

    return {
        "success": True,
        "count": len(updated_articles),
        "target_form_factor": req.target_form_factor,
        "redirect_url": redirect_url,
        "articles": updated_articles,
        "message": f"총 {len(updated_articles)}건의 소재가 [{req.target_form_factor}] 제작 파이프라인으로 이관되었습니다.",
    }


# ── 🗑️ 수집 기사 맞춤 삭제 (기간별, 매체별, 전체 일괄 삭제) ─────────────────
class ArticleCleanupRequest(BaseModel):
    mode: str = "all"  # "all" | "platform" | "period" | "selected"
    platform: Optional[str] = None  # e.g. "fmkorea", "naver_news", "buzzfeed"
    older_than_hours: Optional[int] = None  # e.g. 24, 72, 168 (7일), 720 (30일)
    article_ids: Optional[List[int]] = None  # 체크박스 선택된 ID 목록
    keep_claimed: bool = False  # 채널에 할당된 기사 보존 여부


@router.delete("/articles/cleanup")
def cleanup_viral_articles(
    req: ArticleCleanupRequest,
    db: Session = Depends(database.get_db),
):
    query = db.query(models.ViralArticle)

    if req.keep_claimed:
        query = query.filter(models.ViralArticle.claimed_by_channel_id.is_(None))

    if req.mode == "selected":
        if not req.article_ids:
            raise HTTPException(status_code=400, detail="삭제할 기사 ID가 지정되지 않았습니다.")
        query = query.filter(models.ViralArticle.id.in_(req.article_ids))

    elif req.mode == "platform":
        if not req.platform or req.platform == "전체":
            raise HTTPException(status_code=400, detail="삭제할 대상 플랫폼/매체를 지정해주세요.")
        query = query.filter(
            or_(
                models.ViralArticle.community_name == req.platform,
                models.ViralArticle.source_type == req.platform
            )
        )

    elif req.mode == "period":
        if not req.older_than_hours or req.older_than_hours <= 0:
            raise HTTPException(status_code=400, detail="삭제 기준 경과 시간(시간 단위)을 지정해주세요.")
        cutoff_dt = datetime.now() - timedelta(hours=req.older_than_hours)
        query = query.filter(models.ViralArticle.scraped_at < cutoff_dt)

    elif req.mode == "all":
        # 전체 삭제
        pass

    else:
        raise HTTPException(status_code=400, detail=f"지원하지 않는 삭제 모드입니다: {req.mode}")

    deleted_count = query.delete(synchronize_session=False)
    db.commit()

    logger.info(f"[Cleanup] Deleted {deleted_count} viral articles (mode: {req.mode}, platform: {req.platform}, hours: {req.older_than_hours})")

    return {
        "success": True,
        "mode": req.mode,
        "deleted_count": deleted_count,
        "message": f"총 {deleted_count}건의 수집 기사가 성공적으로 삭제되었습니다."
    }

