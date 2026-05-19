import logging
import json
from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models import StrategicBrief, ScoutCandidate, CategoryTree
from app.config import settings
from app.llm_manager import LLMClient

logger = logging.getLogger(__name__)

class SovereignStrategist:
    """
    [SOVEREIGN CORE] Autonomous Strategic Intelligence Service.
    Generates recursive, deep-dive strategic documents for the ViraLoop ecosystem.
    """
    def __init__(self, db: Session, llm_client: Optional[LLMClient] = None):
        self.db = db
        # Use provided client or initialize a new one with global settings
        self.llm = llm_client or LLMClient(settings)

    async def generate_deep_brief(self, category_id: int, niche: str = None) -> StrategicBrief:
        """
        [PRO-LEVEL] Generates a comprehensive strategic brief for a specific niche.
        Uses recursive intelligence to identify trends, competitor weaknesses, and ViraLoop application tactics.
        """
        logger.info(f"🚀 [Sovereign Strategist] Initiating Deep Analysis for Category {category_id}...")
        
        # 1. Gather Context
        candidates = self.db.query(ScoutCandidate).filter(ScoutCandidate.category_id == category_id).all()
        category = self.db.query(CategoryTree).filter(CategoryTree.id == category_id).first()
        
        context_data = []
        for c in candidates[:10]:
            context_data.append({
                "name": c.channel_name,
                "score": c.total_sovereign_score,
                "growth": c.subscriber_growth_7d,
                "reasoning": c.ai_reasoning
            })

        # 2. LLM Synthesis (Professional Strategic Tone)
        prompt = f"""
        당신은 ViraLoop의 'Sovereign Strategic Architect'입니다. 
        다음 데이터를 바탕으로 해당 카테고리에 대한 **심층 전략 보고서(Strategic Brief)**를 작성하십시오.
        
        카테고리: {category.name if category else 'Unknown'}
        니치 분야: {niche or 'General Trend'}
        분석 데이터 (Top Candidates):
        {json.dumps(context_data, ensure_ascii=False, indent=2)}
        
        보고서 요구사항:
        1. **시각적/구조적 전문성**: 단순한 텍스트가 아닌 기업용 전략 컨설팅 문서 수준의 구성을 갖출 것.
        2. **전략적 통찰**: 단순히 "무엇이 유행이다"가 아니라, "왜 유행하며 ViraLoop 시스템이 이를 어떻게 점령(Conquest)할 수 있는지"를 구체적으로 기술할 것.
        3. **재귀적 발전**: 보고서 마지막에 이 보고서에서 파생되어 추가로 연구해야 할 3가지 핵심 질문(Recursive Tasks)을 포함할 것.
        4. **ViraLoop 적용점**: 우리 시스템의 'Sovereign Claw' 엔진을 어떻게 활용하여 이 시장에 침투할지 명시할 것.
        
        형식 (JSON):
        {{
            "title": "전략 보고서 제목 (예: [Strategic Intel] ...)",
            "summary": "한 줄 요약",
            "content_markdown": "마크다운 형식의 심층 분석 본문 (패턴 분석, 시장 저항력, 점령 전략 등 포함)",
            "recommendations": ["전략적 권고 사항 1", "2", "3"],
            "recursive_tasks": ["추가 연구 과제 1", "2", "3"]
        }}
        """

        try:
            response = self.llm.generate_content(prompt, model_name="gemini-2.0-flash") # Using flash for high-speed intelligence
            # JSON Extraction
            import re
            match = re.search(r'\{.*\}', response, re.DOTALL)
            if not match:
                raise ValueError("LLM failed to return JSON")
            
            data = json.loads(match.group(0))
            
            # 3. Save to DB
            brief = StrategicBrief(
                title=data['title'],
                niche=niche or category.name,
                summary=data['summary'],
                content_markdown=data['content_markdown'],
                strategic_recommendations=data['recommendations'],
                raw_intelligence_json=data,
                category_id=category_id,
                source_candidates_json=[c.id for c in candidates[:10]],
                status="EVOLVING"
            )
            self.db.add(brief)
            self.db.commit()
            self.db.refresh(brief)
            
            logger.info(f"✅ [Sovereign Strategist] Strategic Brief generated: {brief.title}")
            return brief
            
        except Exception as e:
            logger.error(f"❌ [Sovereign Strategist] Strategic Brief generation failed: {e}")
            self.db.rollback()
            raise e

    async def get_evolving_reports(self, limit: int = 10) -> List[StrategicBrief]:
        """Returns the latest evolving strategic reports."""
        return self.db.query(StrategicBrief).order_by(StrategicBrief.updated_at.desc()).limit(limit).all()
