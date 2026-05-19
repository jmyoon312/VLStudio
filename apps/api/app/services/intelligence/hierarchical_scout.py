import logging
import asyncio
import json
import re
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models import CategoryTree, ScoutCandidate, Settings, SovereignInterest
from app.services.tool_manager import tool_manager
from app.services.intelligence.youtube_scout_v2 import YouTubeScoutV2

logger = logging.getLogger(__name__)

class HierarchicalScout:
    """
    Sovereign Hierarchical Scouting Engine.
    Performs recursive scanning through the CategoryTree and identifies Rising Stars.
    """
    def __init__(self, settings, llm_client=None):
        self.settings = settings
        self.llm_client = llm_client

    def _get_agent_model(self) -> str:
        """Centralized model resolution"""
        model_name = getattr(self.settings, "openclaw_model", self.settings.default_model)
        provider = getattr(self.settings, "openclaw_preferred_provider", "auto")
        if provider == "openrouter" and not model_name.startswith("openrouter/"):
            return f"openrouter/{model_name}"
        return model_name

    async def run_scan_mission(self, db: Session, target_category_id: Optional[int] = None):
        """
        Executes a hierarchical scanning mission.
        If no category provided, it scans the most 'stale' top-level category.
        """
        logger.info("📡 [Hierarchical Scout] Starting scan mission...")
        
        # 1. Select category or Interest to scan
        if target_category_id:
            category = db.query(CategoryTree).filter(CategoryTree.id == target_category_id).first()
        else:
            # Check for prioritized Master Interests first
            top_interest = db.query(SovereignInterest).filter(SovereignInterest.is_active == True).order_by(SovereignInterest.priority.desc()).first()
            if top_interest:
                logger.info(f"🎯 [Hierarchical Scout] Focusing on Master Interest: {top_interest.name}")
                # Find or create a matching category for this interest
                category = db.query(CategoryTree).filter(CategoryTree.name.ilike(f"%{top_interest.name}%")).first()
            
            if not category:
                # Fallback to stale category
                category = db.query(CategoryTree).order_by(CategoryTree.last_scanned_at.asc().nullsfirst()).first()
        
        if not category:
            logger.warning("No target category or interest found to scan.")
            return []

        logger.info(f"🔍 [Hierarchical Scout] Scanning Category: {category.name} (Level {category.level})")

        # 2. Sequential Recursive Scanning (Down the tree)
        candidates = await self._scan_category(category, db)
        
        # 3. Mark as scanned
        category.last_scanned_at = datetime.now()
        db.commit()
        
        return candidates

    async def _scan_category(self, category: CategoryTree, db: Session) -> List[Dict[str, Any]]:
        """Scans a specific category and potentially its children"""
        
        # Determine keywords based on category names (KR + EN)
        search_query = f"{category.name} {category.name_en or ''} 인기 유튜버 급상승"
        
        # 1. Discover potential candidates via Web/YouTube Search
        raw_results = await self._search_candidates(search_query, db)
        
        # 2. Deep Analysis & Sovereign Scoring
        ranked_candidates = await self._analyze_and_score(raw_results, category, db)
        
        # 3. Save to DB
        await self._persist_candidates(ranked_candidates, category, db)
        
        # 4. AI-Driven Sub-category Expansion (If level < 2)
        if category.level < 2 and len(ranked_candidates) > 3:
            await self._expand_sub_categories(category, ranked_candidates, db)
            
        return ranked_candidates

    async def _search_candidates(self, query: str, db: Session) -> List[Dict[str, Any]]:
        """Web search for potential channel candidates"""
        logger.info(f"🌐 Searching for: {query}")
        search_results = await asyncio.to_thread(tool_manager.search, query, db=db, settings=self.settings)
        
        candidates = []
        for res in search_results.get("results", []):
            url = res.get("channel_url") or res.get("url", "")
            is_valid = any(x in url for x in ["youtube.com/@", "youtube.com/channel/", "youtube.com/c/"])
            if is_valid:
                candidates.append({
                    "url": url,
                    "name": res.get("channel") or res.get("title", "").replace(" - YouTube", ""),
                    "snippet": res.get("content", "")
                })
        return candidates[:15] # Top 15 for analysis

    async def _analyze_and_score(self, candidates: List[Dict[str, Any]], category: CategoryTree, db: Session) -> List[Dict[str, Any]]:
        """AI-powered Sovereign Scoring"""
        if not candidates: return []
        
        model_name = self._get_agent_model()
        prompt = f"""
        너는 유튜브 성장 전략 전문가이자 트렌드 분석가야. 
        현재 카테고리: **{category.name} ({category.name_en})**
        
        다음 후보 채널들의 데이터를 기반으로 **'Sovereign Score'**를 산출해줘.
        
        [평가 항목]
        1. subscriber_growth_7d: 최근 7일간의 구독자 증가율 추정값 (0.0 ~ 2.0 이상)
        2. quality_score: 영상의 편집 및 기획 품질 (0-100)
        3. engagement_score: 시청자 반응 및 댓글 활성도 (0-100)
        4. recreatability_score: ViraLoop 에이전트가 이 형식을 재창조하기 쉬운 정도 (0-100)
        
        [Rising Star 판별]
        구독자 대비 조회수가 압도적으로 높거나, 채널 생성일 대비 성장이 가파른 경우 'is_rising_star'를 true로 설정해.
        
        후보군:
        {json.dumps(candidates, ensure_ascii=False)}
        
        [응답 양식 (JSON List)]
        [
            {{
                "url": "채널 URL",
                "name": "채널명",
                "subscriber_growth_7d": float,
                "quality_score": int,
                "engagement_score": int,
                "recreatability_score": int,
                "total_sovereign_score": int (위 항목의 가중 평균),
                "is_rising_star": boolean,
                "ai_reasoning": "왜 이 채널이 추천되는지에 대한 1줄 요약"
            }}
        ]
        """
        try:
            resp = await asyncio.to_thread(self.llm_client.generate_content, prompt, model_name=model_name)
            match = re.search(r'\[.*\]', resp, re.DOTALL)
            if not match: return []
            
            scored_data = json.loads(match.group(0))
            
            # [ENHANCED] Data Verification & Scraping Fallback
            for candidate in scored_data:
                # If metrics look like NaN or missing, try scraping
                if candidate.get("subscriber_growth_7d") is None or candidate.get("total_sovereign_score", 0) == 0:
                    logger.info(f"🛡️ [Hierarchical Scout] NaN detected for {candidate['name']}. Triggering Scraper Fallback...")
                    meta = await asyncio.to_thread(YouTubeScoutV2.fetch_channel_metadata, candidate['url'])
                    if meta:
                        candidate['is_ai_estimated'] = False # We have real data now
                        # AI can use this real meta to re-evaluate or just use default values
                    else:
                        candidate['is_ai_estimated'] = True
                else:
                    candidate['is_ai_estimated'] = True # LLM estimated
                
                # Final numeric safety check
                safe_metrics = YouTubeScoutV2.resolve_nan_metrics(candidate)
                candidate.update(safe_metrics)
                
            return scored_data
        except Exception as e:
            logger.error(f"Failed to score candidates: {e}")
            return []

    async def _persist_candidates(self, ranked_candidates: List[Dict[str, Any]], category: CategoryTree, db: Session):
        """Save results to ScoutCandidate table"""
        for r in ranked_candidates:
            existing = db.query(ScoutCandidate).filter(ScoutCandidate.channel_url == r['url']).first()
            if existing:
                existing.channel_name = r['name']
                existing.subscriber_growth_7d = r['subscriber_growth_7d']
                existing.quality_score = r['quality_score']
                existing.engagement_score = r['engagement_score']
                existing.recreatability_score = r['recreatability_score']
                existing.total_sovereign_score = r['total_sovereign_score']
                existing.is_rising_star = r['is_rising_star']
                existing.is_ai_estimated = r.get('is_ai_estimated', True)
                existing.ai_reasoning = r['ai_reasoning']
                existing.category_id = category.id
                existing.status = "PENDING"
            else:
                candidate = ScoutCandidate(
                    channel_url=r['url'],
                    channel_name=r['name'],
                    category_id=category.id,
                    subscriber_growth_7d=r.get('subscriber_growth_7d', 0),
                    quality_score=r.get('quality_score', 0),
                    engagement_score=r.get('engagement_score', 0),
                    recreatability_score=r.get('recreatability_score', 0),
                    total_sovereign_score=r.get('total_sovereign_score', 0),
                    is_rising_star=r.get('is_rising_star', False),
                    is_ai_estimated=True, # Explicitly mark as AI estimated if coming from this flow
                    ai_reasoning=r.get('ai_reasoning', ''),
                    status="PENDING"
                )
                db.add(candidate)
        db.commit()

    async def _expand_sub_categories(self, parent_category: CategoryTree, candidates: List[Dict[str, Any]], db: Session):
        """AI-driven niche sub-category generation"""
        model_name = self._get_agent_model()
        prompt = f"""
        현재 부모 카테고리: **{parent_category.name}**
        위의 후보 채널들을 분석했을 때, 이 카테고리 내에서 현재 가장 뜨겁게 부상하고 있는 마이크로 니치(Micro-Niche) 소분류 3개를 제안해줘.
        
        [조건]
        1. 한국어 이름과 영어 이름을 모두 제공해.
        2. 기존에 없던 참신하고 구체적인 니치여야 해. (예: 'AI 요리법', '디지털 장생 술' 등)
        
        [응답 양식 (JSON List)]
        [
            {{"name": "니치명", "name_en": "Niche Name EN"}}
        ]
        """
        try:
            resp = await asyncio.to_thread(self.llm_client.generate_content, prompt, model_name=model_name)
            match = re.search(r'\[.*\]', resp, re.DOTALL)
            if match:
                new_niches = json.loads(match.group(0))
                for n in new_niches:
                    # Check if already exists
                    existing = db.query(CategoryTree).filter(CategoryTree.name == n['name']).first()
                    if not existing:
                        new_cat = CategoryTree(
                            name=n['name'],
                            name_en=n['name_en'],
                            parent_id=parent_category.id,
                            level=parent_category.level + 1,
                            ai_generated=True
                        )
                        db.add(new_cat)
                        logger.info(f"✨ AI Created new Sub-category: {n['name']}")
                db.commit()
        except Exception as e:
            logger.error(f"Failed to expand sub-categories: {e}")
