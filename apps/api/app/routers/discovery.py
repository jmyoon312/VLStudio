import logging
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import func, case, and_
from sqlalchemy.orm import Session, joinedload
from .. import models, database

logger = logging.getLogger(__name__)
router = APIRouter(tags=["discovery"])


def _to_dict(obj, keys=None):
    if not obj:
        return None
    d = {}
    for c in obj.__table__.columns:
        if keys and c.name not in keys:
            continue
        val = getattr(obj, c.name)
        if isinstance(val, datetime):
            val = val.isoformat()
        d[c.name] = val
    return d


@router.get("/discovery/channels")
def discovery_channels(
    time_range: str = Query("24h", pattern="^(24h|7d|30d)$"),
    format: str = Query("all", pattern="^(all|shorts|long)$"),
    category: Optional[str] = Query(None),
    exclude_large: bool = Query(True),
    sort_by: str = Query("views", pattern="^(views|velocity|subscribers|uploads)$"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    search: Optional[str] = Query(None),
    watchlist_only: bool = Query(False),
    db: Session = Depends(database.get_db),
):
    hours_map = {"24h": 24, "7d": 168, "30d": 720}
    window_hours = hours_map[time_range]
    since = datetime.now() - timedelta(hours=window_hours)
    prev_since = since - timedelta(hours=window_hours)

    videos_q = db.query(
        models.DiscoveryVideo.channel_id,
        func.count(models.DiscoveryVideo.id).label("video_count"),
        func.sum(models.DiscoveryVideo.view_count).label("total_views"),
        func.avg(models.DiscoveryVideo.viral_score).label("avg_viral"),
        func.avg(models.DiscoveryVideo.velocity_score).label("avg_velocity"),
        func.sum(case((models.DiscoveryVideo.duration <= 65, 1), else_=0)).label("shorts_count"),
    ).filter(
        models.DiscoveryVideo.channel_id.isnot(None),
        models.DiscoveryVideo.downloaded_at >= since,
    )

    prev_videos_q = db.query(
        models.DiscoveryVideo.channel_id,
        func.sum(models.DiscoveryVideo.view_count).label("prev_views"),
    ).filter(
        models.DiscoveryVideo.channel_id.isnot(None),
        models.DiscoveryVideo.downloaded_at >= prev_since,
        models.DiscoveryVideo.downloaded_at < since,
    )

    if format == "shorts":
        videos_q = videos_q.filter(models.DiscoveryVideo.duration <= 65)
        prev_videos_q = prev_videos_q.filter(models.DiscoveryVideo.duration <= 65)
    elif format == "long":
        videos_q = videos_q.filter(models.DiscoveryVideo.duration > 65)
        prev_videos_q = prev_videos_q.filter(models.DiscoveryVideo.duration > 65)

    videos_q = videos_q.group_by(models.DiscoveryVideo.channel_id)
    prev_videos_q = prev_videos_q.group_by(models.DiscoveryVideo.channel_id)

    video_stats = {r.channel_id: r for r in videos_q.all()}
    prev_stats = {r.channel_id: r.prev_views for r in prev_videos_q.all()}

    channels_q = db.query(models.DiscoveryChannel).filter(
        models.DiscoveryChannel.id.in_(list(video_stats.keys())) if video_stats else False
    )
    if exclude_large:
        channels_q = channels_q.filter(
            models.DiscoveryChannel.subscriber_count < 100000
        )
    if category:
        channels_q = channels_q.join(models.CategoryTree).filter(
            models.CategoryTree.name == category
        )
    if search:
        channels_q = channels_q.filter(models.DiscoveryChannel.name.ilike(f"%{search}%"))
    if watchlist_only:
        watchlist_ids = [w.channel_id for w in db.query(models.DiscoveryWatchlist.channel_id).all()]
        channels_q = channels_q.filter(models.DiscoveryChannel.id.in_(watchlist_ids))

    channels = channels_q.all()

    # Build ranked list
    results = []
    for ch in channels:
        s = video_stats.get(ch.id)
        if not s:
            continue
        prev_views = prev_stats.get(ch.id, 0) or 0
        views_24h = s.total_views or 0
        views_change = views_24h - prev_views
        velocity_pct = round((views_change / prev_views) * 100, 1) if prev_views > 0 else 0.0
        uploads_weekly = round((s.video_count or 0) / max(window_hours / 168, 1), 1)
        shorts_pct = round((s.shorts_count or 0) / max(s.video_count or 1, 1) * 100, 1)
        content_format = "shorts" if shorts_pct >= 70 else "long" if shorts_pct <= 30 else "mixed"

        ch_dict = _to_dict(ch, keys=["id", "name", "url", "thumbnail_path", "subscriber_count", "platform_id", "created_at", "updated_at", "category_id"])
        ch_dict["category_name"] = ch.category.name if ch.category else None
        ch_dict["views_24h"] = views_24h
        ch_dict["views_change"] = views_change
        ch_dict["velocity_pct"] = velocity_pct
        ch_dict["upload_frequency"] = uploads_weekly
        ch_dict["shorts_pct"] = shorts_pct
        ch_dict["content_format"] = content_format
        ch_dict["avg_viral"] = round(s.avg_viral or 0, 1)
        ch_dict["avg_velocity"] = round(s.avg_velocity or 0, 1)
        ch_dict["video_count_24h"] = s.video_count or 0
        results.append(ch_dict)

    # Sort
    sort_key_map = {
        "views": "views_24h",
        "velocity": "velocity_pct",
        "subscribers": "subscriber_count",
        "uploads": "upload_frequency",
    }
    results.sort(key=lambda x: x.get(sort_key_map[sort_by]) or 0, reverse=True)

    # Assign rank
    for i, r in enumerate(results):
        r["rank"] = i + 1
        r["trend"] = "up" if r["velocity_pct"] > 10 else "down" if r["velocity_pct"] < -10 else "steady"

    total = len(results)
    start = (page - 1) * limit
    paged = results[start: start + limit]

    return {"channels": paged, "total": total, "page": page, "limit": limit}


@router.get("/discovery/channels/{channel_id}")
def discovery_channel_detail(channel_id: int, db: Session = Depends(database.get_db)):
    channel = db.query(models.DiscoveryChannel).options(joinedload(models.DiscoveryChannel.category)).filter(models.DiscoveryChannel.id == channel_id).first()
    if not channel:
        return {"error": "Channel not found"}

    ch_dict = _to_dict(channel)
    if channel.category:
        ch_dict["category_name"] = channel.category.name

    # Top videos by view_count
    top_videos = db.query(models.DiscoveryVideo).filter(
        models.DiscoveryVideo.channel_id == channel_id
    ).order_by(models.DiscoveryVideo.view_count.desc()).limit(5).all()

    # Latest videos
    latest_videos = db.query(models.DiscoveryVideo).filter(
        models.DiscoveryVideo.channel_id == channel_id
    ).order_by(models.DiscoveryVideo.downloaded_at.desc()).limit(10).all()

    # Upload frequency (last 7 days)
    week_ago = datetime.now() - timedelta(days=7)
    weekly_count = db.query(models.DiscoveryVideo).filter(
        models.DiscoveryVideo.channel_id == channel_id,
        models.DiscoveryVideo.downloaded_at >= week_ago,
    ).count()
    ch_dict["uploads_per_week"] = round(weekly_count / 1.0, 1)

    # Format mix
    total_videos = db.query(models.DiscoveryVideo).filter(models.DiscoveryVideo.channel_id == channel_id).count()
    shorts_count = db.query(models.DiscoveryVideo).filter(
        models.DiscoveryVideo.channel_id == channel_id,
        models.DiscoveryVideo.duration <= 65,
    ).count()
    ch_dict["shorts_pct"] = round(shorts_count / max(total_videos, 1) * 100, 1)

    def _v_to_dict(v):
        meta = v.metadata_json or {}
        return {
            "id": v.id,
            "title": v.title,
            "video_id": v.video_id,
            "url": v.url,
            "thumbnail_path": v.thumbnail_path,
            "view_count": v.view_count,
            "duration": v.duration,
            "upload_date": v.upload_date.isoformat() if v.upload_date else None,
            "downloaded_at": v.downloaded_at.isoformat() if v.downloaded_at else None,
            "viral_score": v.viral_score,
            "velocity_score": v.velocity_score,
            "is_short": v.duration <= 65,
            "embed_url": meta.get("embed_url"),
        }

    return {
        "channel": ch_dict,
        "top_videos": [_v_to_dict(v) for v in top_videos],
        "latest_videos": [_v_to_dict(v) for v in latest_videos],
    }


@router.get("/discovery/rapid-acceleration")
def discovery_rapid_acceleration(
    min_views: int = Query(50000),
    min_velocity: float = Query(50.0),
    db: Session = Depends(database.get_db),
):
    """채널 중 24h 조회수가 급격히 증가한 '급가속' 채널 탐지"""
    since = datetime.now() - timedelta(hours=24)
    prev_since = since - timedelta(hours=24)

    current = db.query(
        models.DiscoveryVideo.channel_id,
        func.sum(models.DiscoveryVideo.view_count).label("cur_views"),
        func.count(models.DiscoveryVideo.id).label("cnt"),
    ).filter(
        models.DiscoveryVideo.channel_id.isnot(None),
        models.DiscoveryVideo.downloaded_at >= since,
    ).group_by(models.DiscoveryVideo.channel_id).all()

    previous = db.query(
        models.DiscoveryVideo.channel_id,
        func.sum(models.DiscoveryVideo.view_count).label("prev_views"),
    ).filter(
        models.DiscoveryVideo.channel_id.isnot(None),
        models.DiscoveryVideo.downloaded_at >= prev_since,
        models.DiscoveryVideo.downloaded_at < since,
    ).group_by(models.DiscoveryVideo.channel_id).all()

    prev_map = {r.channel_id: r.prev_views for r in previous}
    results = []
    for r in current:
        cur = r.cur_views or 0
        prev = prev_map.get(r.channel_id, 0) or 0
        if cur < min_views:
            continue
        growth_pct = round((cur - prev) / max(prev, 1) * 100, 1)
        if growth_pct < min_velocity:
            continue
        ch = db.query(models.DiscoveryChannel).filter(models.DiscoveryChannel.id == r.channel_id).first()
        if not ch:
            continue
        results.append({
            "channel_id": ch.id,
            "channel_name": ch.name,
            "channel_url": ch.url,
            "thumbnail_path": ch.thumbnail_path,
            "subscriber_count": ch.subscriber_count,
            "views_24h": cur,
            "views_change": cur - prev,
            "growth_pct": growth_pct,
        })

    results.sort(key=lambda x: x["growth_pct"], reverse=True)
    return {"channels": results[:30], "total": len(results)}


@router.get("/discovery/categories")
def discovery_categories(db: Session = Depends(database.get_db)):
    """Returns categories with channel counts"""
    cats = db.query(models.CategoryTree).all()
    result = []
    for cat in cats:
        count = db.query(models.DiscoveryChannel).filter(
            models.DiscoveryChannel.category_id == cat.id,
            models.DiscoveryChannel.subscriber_count < 100000,
        ).count()
        if count > 0:
            result.append({
                "id": cat.id,
                "name": cat.name,
                "name_en": cat.name_en,
                "level": cat.level,
                "channel_count": count,
            })
    return {"categories": result}


# ═══════════════════════════════════════════════════════════════
# [NEW] 인기 영상 랭킹 (Hot Videos)
# ═══════════════════════════════════════════════════════════════

@router.get("/discovery/hot-videos")
def discovery_hot_videos(
    time_range: str = Query("24h", pattern="^(24h|7d|30d)$"),
    format: str = Query("all", pattern="^(all|shorts|long)$"),
    category: Optional[str] = Query(None),
    exclude_large: bool = Query(True),
    sort_by: str = Query("views", pattern="^(views|velocity|viral|acceleration)$"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    min_views: int = Query(1000),
    db: Session = Depends(database.get_db),
):
    hours_map = {"24h": 24, "7d": 168, "30d": 720}
    window_hours = hours_map[time_range]
    since = datetime.now() - timedelta(hours=window_hours)

    q = db.query(
        models.DiscoveryVideo.id,
        models.DiscoveryVideo.title,
        models.DiscoveryVideo.video_id,
        models.DiscoveryVideo.url,
        models.DiscoveryVideo.thumbnail_path,
        models.DiscoveryVideo.view_count,
        models.DiscoveryVideo.duration,
        models.DiscoveryVideo.upload_date,
        models.DiscoveryVideo.downloaded_at,
        models.DiscoveryVideo.viral_score,
        models.DiscoveryVideo.velocity_score,
        models.DiscoveryVideo.channel_id,
        models.DiscoveryVideo.metadata_json,
        models.DiscoveryVideo.description,
        models.DiscoveryChannel.name.label("channel_title"),
        models.DiscoveryChannel.subscriber_count,
    ).outerjoin(
        models.DiscoveryChannel, models.DiscoveryVideo.channel_id == models.DiscoveryChannel.id
    ).filter(
        models.DiscoveryVideo.view_count >= min_views,
    ).filter(
        (models.DiscoveryVideo.upload_date >= since) | (models.DiscoveryVideo.downloaded_at >= since)
    )

    if format == "shorts":
        q = q.filter(models.DiscoveryVideo.duration <= 65)
    elif format == "long":
        q = q.filter(models.DiscoveryVideo.duration > 65)

    if category:
        q = q.join(models.CategoryTree).filter(
            models.CategoryTree.name == category
        )

    if exclude_large:
        q = q.filter(
            (models.DiscoveryChannel.subscriber_count < 100000) | (models.DiscoveryChannel.subscriber_count.is_(None))
        )

    videos = q.all()

    # Compute acceleration score: (views per hour in recent window) / (avg views per hour since upload)
    now = datetime.now()
    results = []
    for v in videos:
        base_date = v.upload_date or v.downloaded_at or now
        age_hours = max((now - base_date).total_seconds() / 3600, 1)
        views_per_hour = (v.view_count or 0) / age_hours

        recent_hours = min(window_hours, age_hours)
        recent_views = v.view_count or 0  # we use total views as proxy; actual recent would need VideoHistory
        recent_rate = recent_views / max(recent_hours, 1)

        # Velocity acceleration ratio: how much faster recent rate vs lifetime average
        accel_ratio = round(recent_rate / max(views_per_hour, 1), 2)

        # Composite viral score
        composite_viral = round(
            (v.viral_score or 0) * 0.4 + (v.velocity_score or 0) * 0.3 + min(accel_ratio * 10, 50) * 0.3,
            1
        )

        meta = v.metadata_json or {}
        channel_title = getattr(v, "channel_title", None)
        subscriber_count = getattr(v, "subscriber_count", None)
        cid = v.channel_id
        results.append({
            "id": v.id,
            "title": v.title,
            "video_id": v.video_id,
            "url": v.url or f"https://www.youtube.com/watch?v={v.video_id}",
            "thumbnail_path": v.thumbnail_path,
            "view_count": v.view_count,
            "duration": v.duration,
            "upload_date": v.upload_date.isoformat() if v.upload_date else None,
            "downloaded_at": v.downloaded_at.isoformat() if v.downloaded_at else None,
            "viral_score": v.viral_score or 0,
            "velocity_score": v.velocity_score or 0,
            "is_short": v.duration <= 65,
            "views_per_hour": round(views_per_hour, 1),
            "acceleration_ratio": accel_ratio,
            "composite_viral": composite_viral,
            "embed_url": meta.get("embed_url"),
            "description": (v.description or "")[:200] if v.description else None,
            "tags": meta.get("tags", [])[:5] if isinstance(meta.get("tags"), list) else [],
            "channel_id": cid,
            "channel_title": channel_title,
            "subscriber_count": subscriber_count,
            "youtube_url": f"https://www.youtube.com/watch?v={v.video_id}",
            "channel_url": f"https://www.youtube.com/channel/{cid}" if cid else None,
        })

    # Sort
    sort_map = {
        "views": lambda x: x["view_count"] or 0,
        "velocity": lambda x: x["views_per_hour"] or 0,
        "viral": lambda x: x["composite_viral"] or 0,
        "acceleration": lambda x: x["acceleration_ratio"] or 0,
    }
    results.sort(key=sort_map[sort_by], reverse=True)

    # Assign acceleration badges
    for r in results:
        if r["acceleration_ratio"] >= 3.0:
            r["accel_badge"] = "폭발적 증가"
        elif r["acceleration_ratio"] >= 2.0:
            r["accel_badge"] = "급가속"
        elif r["acceleration_ratio"] >= 1.5:
            r["accel_badge"] = "가속 중"
        else:
            r["accel_badge"] = None

    total = len(results)
    start = (page - 1) * limit
    paged = results[start: start + limit]

    return {"videos": paged, "total": total, "page": page, "limit": limit}


# ═══════════════════════════════════════════════════════════════
# [NEW] 신인 채널 탐지 (Rookies)
# ═══════════════════════════════════════════════════════════════

@router.get("/discovery/rookies")
def discovery_rookies(
    time_range: str = Query("7d", pattern="^(24h|7d|30d)$"),
    format: str = Query("all", pattern="^(all|shorts|long)$"),
    category: Optional[str] = Query(None),
    max_subscribers: int = Query(50000),
    sort_by: str = Query("velocity", pattern="^(velocity|views|subscribers|uploads|sustain)$"),
    min_growth_rate: float = Query(0.0),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    watchlist_only: bool = Query(False),
    db: Session = Depends(database.get_db),
):
    """
    신규 채널 탐지: 처음 발견된 지 90일 이내 & 구독자 < max_subscribers 인 채널 중
    최근 성장 속도가 빠른 채널을 랭킹
    """
    # Step 1: Find channels where our first video detection is recent
    first_seen = db.query(
        models.DiscoveryVideo.channel_id,
        func.min(models.DiscoveryVideo.downloaded_at).label("first_seen_at"),
        func.count(models.DiscoveryVideo.id).label("total_videos"),
        func.sum(models.DiscoveryVideo.view_count).label("total_views"),
    ).filter(
        models.DiscoveryVideo.channel_id.isnot(None),
    ).group_by(models.DiscoveryVideo.channel_id).having(
        func.min(models.DiscoveryVideo.downloaded_at) >= datetime.now() - timedelta(days=90)
    ).subquery()

    hours_map = {"24h": 24, "7d": 168, "30d": 720}
    window_hours = hours_map[time_range]
    since = datetime.now() - timedelta(hours=window_hours)

    # Step 2: Recent stats for those channels
    recent_stats = db.query(
        models.DiscoveryVideo.channel_id,
        func.count(models.DiscoveryVideo.id).label("recent_count"),
        func.sum(models.DiscoveryVideo.view_count).label("recent_views"),
        func.avg(models.DiscoveryVideo.viral_score).label("avg_viral"),
        func.avg(models.DiscoveryVideo.velocity_score).label("avg_velocity"),
        func.sum(case((models.DiscoveryVideo.duration <= 65, 1), else_=0)).label("recent_shorts"),
    ).filter(
        models.DiscoveryVideo.channel_id.isnot(None),
        models.DiscoveryVideo.downloaded_at >= since,
    ).group_by(models.DiscoveryVideo.channel_id).subquery()

    # Step 3: Join channels with first_seen and recent_stats
    q = db.query(models.DiscoveryChannel).join(
        first_seen, models.DiscoveryChannel.id == first_seen.c.channel_id
    ).outerjoin(
        recent_stats, models.DiscoveryChannel.id == recent_stats.c.channel_id
    ).filter(
        models.DiscoveryChannel.subscriber_count < max_subscribers,
        models.DiscoveryChannel.subscriber_count > 0,
    )

    if category:
        q = q.join(models.CategoryTree).filter(models.CategoryTree.name == category)

    if watchlist_only:
        watchlist_ids = [w.channel_id for w in db.query(models.DiscoveryWatchlist.channel_id).all()]
        q = q.filter(models.DiscoveryChannel.id.in_(watchlist_ids))

    if format == "shorts":
        q = q.filter(models.DiscoveryChannel.id.in_(
            db.query(models.DiscoveryVideo.channel_id).filter(
                models.DiscoveryVideo.duration <= 65,
                models.DiscoveryVideo.downloaded_at >= since,
            ).group_by(models.DiscoveryVideo.channel_id).subquery()
        ))
    elif format == "long":
        q = q.filter(models.DiscoveryChannel.id.in_(
            db.query(models.DiscoveryVideo.channel_id).filter(
                models.DiscoveryVideo.duration > 65,
                models.DiscoveryVideo.downloaded_at >= since,
            ).group_by(models.DiscoveryVideo.channel_id).subquery()
        ))

    channels = q.all()

    now = datetime.now()
    results = []
    for ch in channels:
        fs = db.query(first_seen).filter(first_seen.c.channel_id == ch.id).first()
        rc = db.query(recent_stats).filter(recent_stats.c.channel_id == ch.id).first()

        if not fs:
            continue

        days_since_first_seen = max((now - fs.first_seen_at).days, 1)
        total_views = fs.total_views or 0
        growth_velocity = round(total_views / days_since_first_seen, 1)

        recent_views = rc.recent_views if rc else 0
        recent_count = rc.recent_count if rc else 0
        recent_shorts = rc.recent_shorts if rc else 0
        shorts_pct = round(recent_shorts / max(recent_count, 1) * 100, 1)

        # Sustain score: how consistent the upload is
        uploads_per_week = round(recent_count / max(window_hours / 168, 1), 1)
        sustain_score = round(
            min(uploads_per_week / max(days_since_first_seen / 7, 1), 10) * 10,
            1
        ) if days_since_first_seen > 0 else 0

        avg_viral = round(rc.avg_viral or 0, 1) if rc else 0
        avg_velocity = round(rc.avg_velocity or 0, 1) if rc else 0

        ch_dict = _to_dict(ch, keys=["id", "name", "url", "thumbnail_path", "subscriber_count", "platform_id", "created_at", "category_id"])
        ch_dict["category_name"] = ch.category.name if ch.category else None
        ch_dict["first_seen_at"] = fs.first_seen_at.isoformat()
        ch_dict["channel_age_days"] = days_since_first_seen
        ch_dict["total_videos"] = fs.total_videos or 0
        ch_dict["total_views"] = total_views
        ch_dict["growth_velocity"] = growth_velocity
        ch_dict["recent_views"] = recent_views
        ch_dict["recent_videos"] = recent_count
        ch_dict["shorts_pct"] = shorts_pct
        ch_dict["uploads_per_week"] = uploads_per_week
        ch_dict["sustain_score"] = sustain_score
        ch_dict["avg_viral"] = avg_viral
        ch_dict["avg_velocity"] = avg_velocity

        if growth_velocity < min_growth_rate:
            continue

        results.append(ch_dict)

    sort_key_map = {
        "velocity": "growth_velocity",
        "views": "total_views",
        "subscribers": "subscriber_count",
        "uploads": "uploads_per_week",
        "sustain": "sustain_score",
    }
    results.sort(key=lambda x: x.get(sort_key_map[sort_by]) or 0, reverse=True)

    for i, r in enumerate(results):
        r["rank"] = i + 1
        # Trend arrow
        if r["growth_velocity"] > 1000:
            r["growth_trend"] = "rocket"
        elif r["growth_velocity"] > 500:
            r["growth_trend"] = "fast"
        elif r["growth_velocity"] > 100:
            r["growth_trend"] = "steady"
        else:
            r["growth_trend"] = "slow"

    total = len(results)
    start = (page - 1) * limit
    paged = results[start: start + limit]

    return {"channels": paged, "total": total, "page": page, "limit": limit}


# ═══════════════════════════════════════════════════════════════
# [NEW] 관심 채널 (Watchlist) CRUD
# ═══════════════════════════════════════════════════════════════

@router.get("/discovery/watchlist")
def get_watchlist(
    sort_by: str = Query("recent", pattern="^(recent|views|velocity|subscribers)$"),
    db: Session = Depends(database.get_db),
):
    entries = db.query(models.DiscoveryWatchlist).options(
        joinedload(models.DiscoveryWatchlist.channel)
    ).order_by(
        models.DiscoveryWatchlist.added_at.desc()
    ).all()

    from datetime import datetime, timedelta

    results = []
    for e in entries:
        ch = e.channel
        if not ch:
            continue

        # Latest 24h stats
        since = datetime.now() - timedelta(hours=24)
        stats = db.query(
            func.sum(models.DiscoveryVideo.view_count).label("views_24h"),
            func.count(models.DiscoveryVideo.id).label("videos_24h"),
            func.avg(models.DiscoveryVideo.viral_score).label("avg_viral"),
        ).filter(
            models.DiscoveryVideo.channel_id == ch.id,
            models.DiscoveryVideo.downloaded_at >= since,
        ).first()

        results.append({
            "id": e.id,
            "channel_id": ch.id,
            "channel_name": ch.name,
            "channel_url": ch.url,
            "thumbnail_path": ch.thumbnail_path,
            "subscriber_count": ch.subscriber_count,
            "category_name": ch.category.name if ch.category else None,
            "views_24h": stats.views_24h or 0 if stats else 0,
            "videos_24h": stats.videos_24h or 0 if stats else 0,
            "avg_viral": round(stats.avg_viral or 0, 1) if stats else 0,
            "notes": e.notes,
            "added_at": e.added_at.isoformat() if e.added_at else None,
        })

    sort_map = {
        "recent": lambda x: x.get("added_at") or "",
        "views": lambda x: x["views_24h"] or 0,
        "velocity": lambda x: (x["views_24h"] or 0) / max(x["videos_24h"] or 1, 1),
        "subscribers": lambda x: x["subscriber_count"] or 0,
    }
    results.sort(key=sort_map[sort_by], reverse=(sort_by != "recent"))

    return {"channels": results, "total": len(results)}


@router.post("/discovery/watchlist/{channel_id}")
def add_to_watchlist(
    channel_id: int,
    notes: Optional[str] = Query(None),
    db: Session = Depends(database.get_db),
):
    ch = db.query(models.DiscoveryChannel).filter(models.DiscoveryChannel.id == channel_id).first()
    if not ch:
        raise HTTPException(404, "Channel not found")

    existing = db.query(models.DiscoveryWatchlist).filter(
        models.DiscoveryWatchlist.channel_id == channel_id
    ).first()
    if existing:
        return {"message": "Already in watchlist", "id": existing.id}

    entry = models.DiscoveryWatchlist(channel_id=channel_id, notes=notes)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return {"message": "Added to watchlist", "id": entry.id}


@router.delete("/discovery/watchlist/{channel_id}")
def remove_from_watchlist(
    channel_id: int,
    db: Session = Depends(database.get_db),
):
    entry = db.query(models.DiscoveryWatchlist).filter(
        models.DiscoveryWatchlist.channel_id == channel_id
    ).first()
    if not entry:
        raise HTTPException(404, "Not in watchlist")

    db.delete(entry)
    db.commit()
    return {"message": "Removed from watchlist"}


@router.get("/discovery/watchlist/check/{channel_id}")
def check_watchlist(
    channel_id: int,
    db: Session = Depends(database.get_db),
):
    entry = db.query(models.DiscoveryWatchlist).filter(
        models.DiscoveryWatchlist.channel_id == channel_id
    ).first()
    return {"in_watchlist": entry is not None}
