"""
Semantic Sourcing Search Engine for ViraLoop Studio.
Transcedes fixed 5-tag limitations by providing:
1. 4-Axis Orthogonal Facets Querying (relationship, trope, personality, era)
2. Natural Language Semantic & Nuance Matching (Text Relevance Scoring)
3. Emotion Vector Similarity (multi-emotion weights)
4. Power Cast & Character Keyword Hybrid Search
"""

import re
import math
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger("semantic_sourcing_search")

# Extended Emotion Lexicon for Multi-Nuance Semantic Matching
NUANCE_LEXICON = {
    "슬픔/비극": ["눈물", "오열", "먹먹", "슬픔", "비극", "이별", "죽음", "가족", "희생", "마지막", "떠나", "후회", "아픔", "그리움"],
    "사이다/참교육": ["사이다", "참교육", "응징", "통쾌", "정의", "복수", "반격", "각성", "선넘", "체포", "부패", "갑질", "응벌"],
    "레전드/코믹": ["코믹", "웃음", "폭소", "개그", "애드리브", "빵터", "케미", "티키타카", "황당", "엽기", "꿀잼", "유쾌", "장난"],
    "소름/반전": ["반전", "소름", "충격", "경악", "비밀", "진실", "스릴", "숨겨진", "배신", "음모", "의혹", "트릭", "미스터리"],
    "도파민/액션": ["도파민", "액션", "질주", "추격", "격투", "타격", "폭발", "대결", "싸움", "전쟁", "스피드", "긴장", "탈출"],
    "힐링/공감": ["힐링", "따뜻", "위로", "음식", "요리", "자연", "휴식", "평온", "마음", "감성", "공감", "일상", "친구"]
}


class SemanticSourcingSearchService:
    """Performs multi-dimensional search over SourcingAsset entries in viral_loop.db."""

    @classmethod
    def calculate_semantic_score(cls, asset_meta: Dict[str, Any], query_text: str) -> float:
        """
        Calculates a 0~100 relevance score between a free-form natural language query
        and an asset's rich metadata (title, summary, reason, tags, facets, people, emotions).
        """
        if not query_text or not query_text.strip():
            return float(asset_meta.get("score", 85.0))

        tokens = [t.lower() for t in re.findall(r'[a-zA-Z0-9가-힣]+', query_text) if len(t) > 1]
        if not tokens:
            return float(asset_meta.get("score", 85.0))

        # Build comprehensive corpus
        facets = asset_meta.get("facets", {})
        facet_text = f"{facets.get('relationship', '')} {facets.get('trope', '')} {facets.get('personality', '')} {facets.get('era', '')}"
        
        corpus = (
            f"{asset_meta.get('title', '')} "
            f"{asset_meta.get('original_title', '')} "
            f"{asset_meta.get('reason', '')} "
            f"{' '.join(asset_meta.get('genres', []))} "
            f"{' '.join(asset_meta.get('people', []))} "
            f"{' '.join(asset_meta.get('tags', []))} "
            f"{' '.join(asset_meta.get('emotions', []))} "
            f"{facet_text} "
            f"{asset_meta.get('hook_text', '')}"
        ).lower()

        # Token match scoring
        matched_tokens = 0
        weight_sum = 0.0

        for t in tokens:
            if t in corpus:
                matched_tokens += 1
                # Higher weight for title and cast matches
                if t in asset_meta.get("title", "").lower() or any(t in p.lower() for p in asset_meta.get("people", [])):
                    weight_sum += 35.0
                elif any(t in e.lower() for e in asset_meta.get("emotions", [])):
                    weight_sum += 25.0
                elif t in facet_text.lower():
                    weight_sum += 20.0
                else:
                    weight_sum += 15.0

        # Nuance semantic bonus: check if query tokens touch related emotion synonyms
        for nuance_cat, keywords in NUANCE_LEXICON.items():
            query_has_nuance = any(k in query_text for k in keywords)
            asset_has_nuance = any(k in corpus for k in keywords)
            if query_has_nuance and asset_has_nuance:
                weight_sum += 15.0
                break

        # Base popularity weight (0~20)
        base_pop = float(asset_meta.get("score", 80.0)) * 0.2
        final_score = min(100.0, weight_sum + base_pop)
        
        # Penalize if 0 tokens matched
        if matched_tokens == 0:
            final_score = max(10.0, base_pop - 10.0)

        return round(final_score, 1)

    _cache_items: Optional[List[Dict[str, Any]]] = None
    _cache_timestamp: float = 0.0
    CACHE_TTL: float = 120.0  # 2 minutes TTL

    @classmethod
    def invalidate_cache(cls):
        """Invalidate the in-memory cache to force a fresh DB reload."""
        cls._cache_items = None
        cls._cache_timestamp = 0.0

    @classmethod
    def _get_base_items(cls, db_session) -> List[Dict[str, Any]]:
        """Fetch and pre-process base catalog items with caching."""
        import time
        from app.models import SourcingAsset

        now = time.time()
        if cls._cache_items is not None and (now - cls._cache_timestamp) < cls.CACHE_TTL:
            return cls._cache_items

        records = db_session.query(SourcingAsset).filter(
            SourcingAsset.asset_type.in_(["curated_work", "video_clip", "stream_slice"])
        ).order_by(SourcingAsset.vision_score.desc()).all()

        items = []
        for r in records:
            meta = r.meta_info_json or {}
            facets = meta.get("facets", {})
            emotions = meta.get("emotions", [])
            people = meta.get("people", [])
            
            # Sanitize poster_url: ensure fake TMDB urls are stripped
            poster = r.thumbnail_path or meta.get("poster_url")
            if poster and "image.tmdb.org/t/p/w342/" in str(poster):
                sub = str(poster).replace("https://image.tmdb.org/t/p/w342/", "").replace("http://image.tmdb.org/t/p/w342/", "")
                if sub.startswith(("kr-", "us-", "jp-", "cn-", "uk-")) or "-" in sub:
                    poster = None

            items.append({
                "id": r.id,
                "title": r.title,
                "category_major": r.category_major,
                "category_mid": r.category_mid,
                "category_minor": r.category_minor,
                "summary": r.summary,
                "source_url": r.source_url,
                "thumbnail_path": poster,
                "clean_zone_score": r.clean_zone_score,
                "vision_score": r.vision_score,
                "script_draft": r.script_draft or meta.get("hook_text"),
                "linked_preset_id": r.linked_preset_id,
                "status": r.status,
                "meta": meta,
                "emotions": emotions,
                "facets": facets,
                "people": people,
                "base_score": float(r.vision_score or meta.get("score", 85.0))
            })

        cls._cache_items = items
        cls._cache_timestamp = now
        return items

    @classmethod
    def search_curated_assets(
        cls,
        db_session,
        query: Optional[str] = None,
        emotion: Optional[str] = None,
        major_cat: Optional[str] = None,
        facet_relationship: Optional[str] = None,
        facet_trope: Optional[str] = None,
        facet_personality: Optional[str] = None,
        facet_era: Optional[str] = None,
        lead_person: Optional[str] = None,
        min_score: float = 0.0,
        limit: int = 60
    ) -> List[Dict[str, Any]]:
        """
        Ultra-fast in-memory cached multi-dimensional search over SourcingAssets.
        Responds in sub-millisecond speeds for UI responsiveness.
        """
        all_items = cls._get_base_items(db_session)
        has_query = bool(query and query.strip())
        
        filtered = []
        for it in all_items:
            # 1. Category filter
            if major_cat and major_cat != "all" and it["category_major"] != major_cat:
                continue

            # 2. Emotion filter
            if emotion and emotion != "all":
                if not any(emotion in e for e in it["emotions"]):
                    continue

            # 3. 4-Axis Facets filters
            facets = it["facets"]
            if facet_relationship and facet_relationship != "all":
                if facets.get("relationship") != facet_relationship:
                    continue

            if facet_trope and facet_trope != "all":
                if facets.get("trope") != facet_trope:
                    continue

            if facet_personality and facet_personality != "all":
                if facets.get("personality") != facet_personality:
                    continue

            if facet_era and facet_era != "all":
                if facets.get("era") != facet_era:
                    continue

            # 4. Cast/Person filter
            if lead_person and lead_person != "all":
                if not any(lead_person in p for p in it["people"]):
                    continue

            # 5. Score calculation (fast path if no free-text query)
            if has_query:
                score = cls.calculate_semantic_score(it["meta"], query)
            else:
                score = it["base_score"]

            if score < min_score:
                continue

            item_copy = dict(it)
            item_copy["score"] = score
            item_copy["relevance_score"] = score
            filtered.append(item_copy)

        # Sort: query mode -> relevance desc; browse mode -> base_score desc
        filtered.sort(key=lambda x: x["relevance_score"], reverse=True)
        return filtered[:limit]
