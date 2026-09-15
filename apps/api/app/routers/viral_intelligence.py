import logging
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import desc

from .. import models, database
from ..services.discovery_scraper import discovery_scraper, COMMUNITY_SOURCES, NAVER_SECTIONS
from ..services.scout_alpha_worker import scout_alpha_worker
from ..services.channel_director import channel_director
from ..services.free_media_scraper import free_media_scraper

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/viral", tags=["viral_intelligence"])


def _article_to_dict(art: models.ViralArticle, include_comments: bool = False) -> Dict[str, Any]:
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
        "scraped_at": art.scraped_at.isoformat() if art.scraped_at else None,
        "analysis_summary": art.analysis_summary,
        "suggested_title": art.suggested_title,
        "viral_score": art.viral_score or 0.0,
        "target_form_factors": art.target_form_factors or [],
        "structured_script": art.structured_script,
        "status": art.status,
        "claimed_by_channel_id": art.claimed_by_channel_id,
        "claimed_at": art.claimed_at.isoformat() if art.claimed_at else None,
    }
    if include_comments:
        d["comments"] = [
            {
                "id": c.id,
                "author": c.author,
                "text": c.text,
                "likes": c.likes,
                "is_best": c.is_best,
                "order_idx": c.order_idx,
            }
            for c in (art.comments or [])
        ]
    return d


@router.get("/sources")
def get_sources():
    """List all 31 supported communities and 6 Naver News sections."""
    communities = [
        {"code": k, "name": v["name"], "category": v.get("category", "유머"), "type": "community"}
        for k, v in COMMUNITY_SOURCES.items()
    ]
    news = [
        {"code": v["code"], "name": v["name"], "category": v["category"], "sid1": k, "type": "news"}
        for k, v in NAVER_SECTIONS.items()
    ]
    return {
        "communities": communities,
        "news": news,
        "total": len(communities) + len(news)
    }


@router.get("/articles")
def list_articles(
    source_type: Optional[str] = Query(None),
    community_name: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    sort_by: str = Query("viral_score", pattern="^(viral_score|views|likes|recent)$"),
    page: int = Query(1, ge=1),
    limit: int = Query(30, ge=1, le=100),
    search: Optional[str] = Query(None),
    db: Session = Depends(database.get_db),
):
    query = db.query(models.ViralArticle)

    if source_type and source_type != "all":
        query = query.filter(models.ViralArticle.source_type == source_type)
    if community_name and community_name != "all":
        query = query.filter(models.ViralArticle.community_name == community_name)
    if category and category != "all":
        query = query.filter(models.ViralArticle.category == category)
    if status and status != "all":
        query = query.filter(models.ViralArticle.status == status)
    if search:
        query = query.filter(models.ViralArticle.title.ilike(f"%{search}%"))

    # Sorting
    if sort_by == "views":
        query = query.order_by(desc(models.ViralArticle.views))
    elif sort_by == "likes":
        query = query.order_by(desc(models.ViralArticle.likes))
    elif sort_by == "recent":
        query = query.order_by(desc(models.ViralArticle.id))
    else:
        query = query.order_by(desc(models.ViralArticle.viral_score), desc(models.ViralArticle.id))

    total = query.count()
    items = query.offset((page - 1) * limit).limit(limit).all()

    return {
        "articles": [_article_to_dict(a) for a in items],
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
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(database.get_db)
):
    """Trigger real-time harvest of 31 communities or specific source."""
    if source_code:
        if source_code.startswith("naver_"):
            sid_map = {v["code"]: k for k, v in NAVER_SECTIONS.items()}
            sid = sid_map.get(source_code)
            articles = await discovery_scraper.scrape_naver_news_ranking(sid1=sid, max_articles=15)
        else:
            articles = await discovery_scraper.scrape_community(source_code, max_articles=15)

        for a in articles:
            discovery_scraper.sync_upsert_article(db, a)
        return {"message": f"Scraped {len(articles)} articles from {source_code}", "count": len(articles)}
    else:
        # Run full cycle
        res = await discovery_scraper.run_full_scrape_cycle(max_per_source=10)
        return res


@router.post("/articles/{article_id}/analyze")
async def analyze_article(article_id: int, db: Session = Depends(database.get_db)):
    """Trigger Scout-Alpha LLM viral analysis on an article."""
    try:
        updated = await scout_alpha_worker.analyze_article(article_id, db)
        return _article_to_dict(updated, include_comments=True)
    except Exception as e:
        logger.error(f"Analysis endpoint error: {e}")
        raise HTTPException(500, str(e))


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
        "top_viral": [_article_to_dict(a) for a in top_viral]
    }
