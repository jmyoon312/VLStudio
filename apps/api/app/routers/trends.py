from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from .. import models, database

router = APIRouter(tags=["trends"])

@router.get("/trends")
def get_trends(
    category: Optional[str] = Query(None, description="Filter by category"),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(database.get_db)
):
    query = db.query(models.Trend).order_by(models.Trend.updated_at.desc())
    if category:
        query = query.filter(models.Trend.category.ilike(f"%{category}%"))
    trends = query.limit(limit).all()
    results = []
    for t in trends:
        keywords = t.related_keywords_json or []
        results.append({
            "id": t.id,
            "keyword": t.keyword,
            "category": t.category,
            "micro_topic": t.micro_topic,
            "keyword_count": len(keywords) if isinstance(keywords, list) else 0,
            "top_keywords": [
                {"ko": k.get("ko",""), "en": k.get("en",""), "score": k.get("viral_score",0), "velocity": k.get("velocity","")}
                for k in (keywords[:5] if isinstance(keywords, list) else [])
            ],
            "updated_at": str(t.updated_at) if t.updated_at else None
        })
    return results

@router.get("/trends/categories")
def get_trend_categories(db: Session = Depends(database.get_db)):
    results = db.query(models.Trend.category).distinct().all()
    return [r[0] for r in results if r[0]]
