import os
import re
import json
import logging
import asyncio
from datetime import datetime
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session

from .. import models, database, crud
from ..agent.brain_router import PluggableBrainRouter
from .global_arbiter import global_arbiter

logger = logging.getLogger(__name__)

SCOUT_ALPHA_SYSTEM_PROMPT = """너는 유튜브 쇼츠 및 바이럴 미디어 최고의 분석 에이전트 'Scout-Alpha'이다.
대한민국 31대 커뮤니티 및 네이버 랭킹 뉴스에서 수집된 글을 분석하여, 유튜브 쇼츠(군림보 스타일, 썰형 스타일 등)로 폭발적인 조회수를 낼 수 있는 바이럴 요소를 극대화 분석하라.

반드시 아래 JSON 규격으로만 응답하라. 마크다운 따옴표나 기타 설명 없이 순수 JSON만 출력해야 한다:
{
  "viral_score": 88.5,
  "hook_headline_line1": "첫 번째 줄 후킹 헤드라인 (짧고 강렬하게)",
  "hook_headline_line2": "두 번째 줄 반전/사건 요약",
  "suggested_title": "군림보/썰형 최적화 유튜브 쇼츠 제목",
  "analysis_summary": "핵심 논란 및 대중의 감정(분노/경악/호기심)을 자극하는 바이럴 원인 2~3줄 요약",
  "target_form_factors": ["gunlimbo", "ssul"],
  "scenes": [
    {
      "scene_index": 1,
      "duration_sec": 3.5,
      "hook_jab_text": "첫 3초 후킹 밴드 텍스트",
      "visual_prompt": "실사/이미지 검색용 상세 키워드 또는 비주얼 묘사",
      "narration": "0초 켄번스 줌인과 함께 터져나오는 긴박한 나레이션 대사",
      "coupang_product_keyword": "관련 상품/키워드 (있을 경우만)"
    },
    {
      "scene_index": 2,
      "duration_sec": 5.0,
      "hook_jab_text": "사건 전개",
      "visual_prompt": "관련 증거 사진/상황 묘사",
      "narration": "구체적인 사건 발단과 전개 대사",
      "coupang_product_keyword": ""
    },
    {
      "scene_index": 3,
      "duration_sec": 5.5,
      "hook_jab_text": "네티즌 충격 반응",
      "visual_prompt": "네티즌 댓글 말풍선 및 반응",
      "narration": "실제 베스트 댓글을 녹여낸 폭발적인 여론 반응 대사",
      "coupang_product_keyword": ""
    },
    {
      "scene_index": 4,
      "duration_sec": 4.0,
      "hook_jab_text": "여러분 생각은?",
      "visual_prompt": "생각할 거리를 던지는 마무리 장면",
      "narration": "댓글 참여를 유도하는 강력한 클로징 대사",
      "coupang_product_keyword": ""
    }
  ]
}
"""


class ScoutAlphaWorker:
    """Scout-Alpha: Automated viral intelligence & script synthesis worker.
    Uses Single Source of Truth DB settings / OmniRoute gateway. Zero hardcoding.
    """

    def __init__(self):
        self.brain_router = PluggableBrainRouter()

    def _get_active_model_name(self, db: Session) -> str:
        settings = crud.get_settings(db)
        if not settings:
            return "viraloop1"
        # Respect user configured model in settings
        return getattr(settings, "script_analysis_model", None) or getattr(settings, "default_llm_model", None) or "viraloop1"

    async def analyze_article(self, article_id: int, db: Session) -> models.ViralArticle:
        """Analyze a ViralArticle and generate structured synthesis."""
        article = db.query(models.ViralArticle).filter(models.ViralArticle.id == article_id).first()
        if not article:
            raise ValueError(f"Article {article_id} not found")

        # Auto deep-fetch full content and comments if not already present
        if not article.comments or len(article.content_text or "") <= len(article.title) + 10:
            try:
                from .discovery_scraper import discovery_scraper
                details = await discovery_scraper.fetch_article_details(article.url)
                if details.get("content_text") and len(details["content_text"]) > len(article.content_text or ""):
                    article.content_text = details["content_text"]
                if details.get("images") and not article.images:
                    article.images = details["images"]
                for cmt in details.get("comments", []):
                    c_rec = models.ViralArticleComment(
                        article_id=article.id,
                        author=cmt.get("author", "익명"),
                        text=cmt.get("text", ""),
                        likes=cmt.get("likes", 0),
                        is_best=cmt.get("is_best", False),
                        order_idx=cmt.get("order_idx", 0),
                    )
                    db.add(c_rec)
                db.commit()
                db.refresh(article)
            except Exception as df_err:
                logger.debug(f"[ScoutAlpha] Deep detail prefetch notice: {df_err}")

        # Load top comments
        comments_text = "\n".join([f"- [{c.author}]: {c.text}" for c in article.comments[:5]]) if article.comments else "(댓글 수집 대기 중)"

        user_prompt = f"""=== 바이럴 원본 정보 ===
- 출처: {article.community_name} ({article.category})
- 원본 제목: {article.title}
- 원본 URL: {article.url}
- 조회수: {article.views} | 추천/좋아요: {article.likes} | 댓글수: {article.comments_count}
- 본문 내용:
{article.content_text[:2000]}

=== 베스트 댓글 ===
{comments_text}

위 기사/썰을 분석하여 군림보 스타일 및 썰형 쇼츠에 최적화된 바이럴 분석과 4개 씬 대본 초안을 JSON으로 생성해라.
"""

        model_name = self._get_active_model_name(db)
        logger.info(f"🧠 [ScoutAlpha] Analyzing article #{article_id} with model: {model_name}")

        llm = self.brain_router._create_langchain_model("omniroute", model_name, None)
        if not llm:
            llm = self.brain_router.get_active_llm()

        try:
            from langchain_core.messages import SystemMessage, HumanMessage
            response = await asyncio.to_thread(
                llm.invoke,
                [
                    SystemMessage(content=SCOUT_ALPHA_SYSTEM_PROMPT),
                    HumanMessage(content=user_prompt)
                ]
            )
            raw_text = response.content if hasattr(response, "content") else str(response)

            # Clean json
            clean_json = raw_text.strip()
            if "```json" in clean_json:
                clean_json = clean_json.split("```json", 1)[1].split("```", 1)[0].strip()
            elif "```" in clean_json:
                clean_json = clean_json.split("```", 1)[1].split("```", 1)[0].strip()

            parsed = json.loads(clean_json)

            # Record cost metrics if available
            global_arbiter.record_api_cost(
                provider="omniroute",
                model=model_name,
                tokens_in=len(user_prompt) // 2,
                tokens_out=len(raw_text) // 2,
                channel_title=f"Article_{article_id}"
            )

            # Update article model
            article.viral_score = float(parsed.get("viral_score") or article.viral_score or 75.0)
            article.suggested_title = parsed.get("suggested_title") or article.title
            article.analysis_summary = parsed.get("analysis_summary") or ""
            article.target_form_factors = parsed.get("target_form_factors") or ["gunlimbo", "ssul"]
            article.structured_script = {
                "headline_line1": parsed.get("hook_headline_line1", ""),
                "headline_line2": parsed.get("hook_headline_line2", ""),
                "scenes": parsed.get("scenes", [])
            }
            article.status = "analyzed"
            article.analyzed_at = datetime.now()

            db.commit()
            db.refresh(article)
            logger.info(f"✅ [ScoutAlpha] Article #{article_id} successfully analyzed! Viral Score: {article.viral_score}")
            return article

        except Exception as e:
            logger.error(f"[ScoutAlpha] Analysis failed for article #{article_id}: {e}")
            # Fallback heuristic
            article.analysis_summary = f"분석 오류: {e}"
            article.suggested_title = article.title
            article.status = "analyzed"
            article.analyzed_at = datetime.now()
            db.commit()
            return article


scout_alpha_worker = ScoutAlphaWorker()
