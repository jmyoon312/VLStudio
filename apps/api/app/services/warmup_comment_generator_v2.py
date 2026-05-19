"""
Warmup Comment Generator v2 (Intelligence Edition)
Generates DNA-driven search queries and comments using LLMs (Gemini/Groq/etc.)
"""

import logging
import random
import json
from typing import Optional, List
from app.llm_manager import LLMClient
from app.schemas.dna import ChannelDNA

logger = logging.getLogger("WarmupIntelligence")

class WarmupIntelligenceGenerator:
    def __init__(self, settings):
        self.llm = LLMClient(settings)
        self.default_model = getattr(settings, "default_model", "groq/llama-3.3-70b-versatile")

    def generate_dna_search_queries(self, dna: ChannelDNA, count: int = 5) -> List[str]:
        """
        Generates search queries based on the channel's micro-niche.
        """
        niche = dna.positioning.micro_niche
        macro = dna.positioning.macro_category
        
        prompt = f"""
        당신은 유튜브 알고리즘을 연구하는 전문가입니다.
        다음 채널 DNA 정보를 바탕으로, 이 분야에 관심 있는 실제 유저가 유튜브에서 검색할 만한 검색어 {count}개를 생성하세요.
        
        [채널 DNA]
        - 대분류: {macro}
        - 소분류(니치): {niche}
        - 타겟 페르소나: {dna.target_audience_avatar}
        
        [지침]
        - 너무 일반적인 단어보다는 구체적인 'Long-tail' 검색어를 포함하세요.
        - 한국어와 영어 검색어를 적절히 섞어주세요.
        - 출력은 오직 JSON 리스트 형식으로만 하세요. 예: ["검색어1", "검색어2"]
        """
        
        try:
            response = self.llm.generate_content(prompt, self.default_model)
            # JSON 파싱 시도
            start = response.find("[")
            end = response.rfind("]") + 1
            if start != -1 and end != -1:
                queries = json.loads(response[start:end])
                logger.info(f"✅ Generated {len(queries)} DNA-driven queries for {niche}")
                return queries
        except Exception as e:
            logger.error(f"❌ Failed to generate DNA queries: {e}")
        
        # Fallback to general terms if AI fails
        return ["shorts", "trending shorts", niche, macro]

    def generate_dna_comment(self, dna: ChannelDNA, video_title: str, video_category: str = "general") -> str:
        """
        Generates a contextual comment based on the video title and channel persona.
        """
        persona = dna.target_audience_avatar
        tone = dna.script.tone_and_manner
        prohibited = ", ".join(dna.script.prohibited_words)
        
        prompt = f"""
        당신은 유튜브 시청자입니다. 다음 페르소나와 어조를 유지하며 영상에 댓글을 작성하세요.
        
        [당신의 페르소나]
        - 특성: {persona}
        - 어조 및 스타일: {tone}
        
        [영상 정보]
        - 제목: {video_title}
        - 카테고리: {video_category}
        
        [지침]
        - 너무 기계적이지 않게, 실제 사람처럼 자연스럽게 작성하세요.
        - 금지어({prohibited})는 절대 사용하지 마세요.
        - 이모지를 적절히 사용하여 감정을 표현하세요.
        - 오직 댓글 내용만 출력하세요.
        """
        
        try:
            comment = self.llm.generate_content(prompt, self.default_model)
            # 따옴표 등 제거
            clean_comment = comment.strip().strip('"').strip("'")
            logger.info(f"✅ Generated DNA-driven comment for: {video_title[:20]}...")
            return clean_comment
        except Exception as e:
            logger.error(f"❌ Failed to generate DNA comment: {e}")
            return "영상 잘 봤습니다! 👍" # Simple fallback

# Singleton-like access could be managed here
_generator = None

def get_intelligence_generator(settings):
    global _generator
    if _generator is None:
        _generator = WarmupIntelligenceGenerator(settings)
    return _generator
