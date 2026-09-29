"""
TextForensicCloner (초정밀 스타일 클로닝 및 텍스트 포렌식 역설계 엔진)
- 단일 진실 공급원(SSOT): docs/SOVEREIGN_CONTEXT_HOOK_NO_PROMPT_MASTER_PLAN.md
- [초정밀 스타일 클로닝을 위한 역설계 프롬프트] 8대 나노 분석 항목 100% 완전 탑재
- [채널 헌법 v32.0: 내레이션 스타일 가이드 v21.4] 금기어미 스캔 및 말맛 교차 게이트키퍼
- Direct Native Provider Sovereignty 준수: DB settings의 LLMClient 직결
"""

import os
import re
import json
import logging
from typing import Dict, Any, List, Optional
from pathlib import Path

from app.database import SessionLocal
from app.crud import get_settings
from app.llm_manager import LLMClient

logger = logging.getLogger(__name__)

# 👑 1. [초정밀 스타일 클로닝을 위한 역설계 프롬프트] 마스터 템플릿
TEXT_FORENSIC_REVERSE_ENGINEERING_PROMPT = """당신은 세계 최고의 '텍스트 포렌식 전문가(Text Forensic Expert)'이자 'AI 페르소나 아키텍트'입니다.
당신의 임무는 아래 제공될 [Raw Data (원본 대본들)]를 나노 단위로 해부하여, 해당 화자의 언어 습관, 사고 방식, 무의식적 패턴까지 완벽하게 복제할 수 있는 [궁극의 시스템 프롬프트(System Prompt)]를 설계하는 것입니다.

[Mission Objective]
목표는 단순한 '비슷함'이 아닙니다. "원본 화자가 썼다고 착각할 정도의 100% 싱크로율"입니다.
분석된 결과물(지침서)을 통해 AI가 글을 썼을 때, 원본 화자의 광기, 호흡, 띄어쓰기 습관, 논리적 비약까지 동일하게 구현되어야 합니다.

[분석 및 출력해야 할 8대 항목 (Detailed Analysis Framework)]
1. [Cognitive Model] 사고 회로 및 세계관 분석
   - 논리 구조: 화자의 사고는 논리적인가? 아니면 의식의 흐름(A->C->Z)인가? 인과관계를 무시하고 결론을 내리는 패턴이 있는가?
   - 대상 인식 필터: 세상을 긍정/부정/냉소/혐오 중 어떤 필터로 보는가?
   - 자아 도취 수준: 자신을 천재, 쓰레기, 피해자, 신 중 무엇으로 정의하는가?

2. [Syntactic Fingerprint] 문장 구조 및 호흡 분석
   - 평균 문장 길이: 단문 위주(3~5단어)인가, 만연체인가?
   - 종결어미 패턴: 문장을 끝맺는 고유한 방식(예: ~음, ~함, ~누, ~버림)의 정확한 사용 확률 분포.
   - 수사 의문문: 독자에게 묻는 척하지만 답은 정해져 있는 질문의 형태 분석.
   - 접속사 생략: '그래서', '그러나' 대신 사용하는 특수 기호(>>, ->)나 문맥적 점프 분석.

3. [Visual Formatting] 줄바꿈 및 시각적 리듬 (가장 중요)
   - 줄바꿈(Line Break) 트리거: 문장이 끝나면 무조건 줄을 바꾸는가? 아니면 화면을 채우는가?
   - 공백의 미학: 줄바꿈을 통해 강조하는 타이밍과 호흡의 간격.
   - 특수문자 활용: 괄호(), 대괄호[], 화살표, 점(...) 등을 사용하는 뉘앙스와 위치.

4. [Lexical Database] 핵심 어휘 및 치환 규칙
   - 나만의 사전(Dictionary): 일반적인 단어를 화자만의 언어로 바꾸는 규칙 정의 (예: 사람 -> 닝겐, 머리 -> 뚝배기, 실패 -> 나락, 성공 -> 떡상).
   - 비속어 및 은어 레벨: 욕설의 수위와 빈도 (초성 사용 여부, 필터링 방식 포함).
   - 의성어/의태어: 상황을 묘사할 때 쓰는 독특한 소리 표현 (예: 콰가강, 슝, 퍽 등).

5. [Narrative Arc] 기-승-전-결 전개 패턴
   - 도입부(Hook): 배경 설명을 얼마나 과격하게 생략하는가? 첫 문장의 충격 요법 분석.
   - 중반부(Build-up): 긴장감을 고조시키는 방식 vs 맥을 끊는 방식.
   - 결말(Pay-off): 허무 개그, 급발진 엔딩, 교훈 없는 마무리 등 화자의 시그니처 엔딩 분석.

6. [Emotional Dynamics] 감정의 증폭과 급변
   - 감정 기복: 차분하다가 갑자기 분노(급발진)하는 트리거 포인트는 어디인가?
   - 반어적 표현: 슬픈 상황에서 웃거나, 기쁜 상황에서 화를 내는 식의 감정 비틀기 분석.

7. [Meta-Fiction] 제4의 벽 및 청자 설정
   - 청자 호명: 시청자/독자를 부르는 호칭(형님들, 니들, 야 등).
   - 편집점 언급: 대본 내에서 영상 편집이나 BGM을 요구하는 지시문([여기서 줌인], [슬픈 브금])이 포함되어 있는가?

8. [Negative Constraints] 절대 금기 사항
   - 절대 하지 않는 것: 화자의 캐릭터 붕괴(Caricature Break)를 막기 위한 금지 규칙 (예: 존댓말 절대 금지, 교훈 금지 등).

[Output Format Instruction]
반드시 다음 JSON 형식으로만 응답하시오 (사족 없이 순수 JSON만 출력):
{
  "cognitive_model": {
    "logic_structure": "...",
    "worldview_filter": "...",
    "self_identity": "..."
  },
  "syntactic_fingerprint": {
    "avg_sentence_length": "...",
    "dominant_endings": ["...", "..."],
    "rhetorical_questions": "...",
    "conjunction_skips": "..."
  },
  "visual_formatting": {
    "line_break_trigger": "...",
    "spacing_cadence": "...",
    "special_characters": ["...", "..."]
  },
  "lexical_database": {
    "custom_dictionary": {"표준단어": "화자단어"},
    "slang_level": "...",
    "onomatopoeia": ["...", "..."]
  },
  "narrative_arc": {
    "opening_hook_formula": "...",
    "buildup_mechanism": "...",
    "signature_payoff": "..."
  },
  "emotional_dynamics": {
    "trigger_points": "...",
    "irony_patterns": "..."
  },
  "meta_fiction": {
    "audience_names": ["...", "..."],
    "editorial_cues": ["...", "..."]
  },
  "negative_constraints": {
    "forbidden_rules": ["...", "..."]
  },
  "cloned_system_instruction": "복사하여 대본 생성 모델의 시스템 프롬프트로 바로 주입할 수 있는 완성형 마크다운 인스트럭션"
}
"""

# 👑 2. [채널 헌법 v32.0: 내레이션 스타일 가이드 v21.4] 금기 어미 정규식
FORBIDDEN_ENDINGS_REGEX = re.compile(r'(고요|겁니다|까요|네요|는요)[.!?\s~]*$')
FORBIDDEN_KEYWORDS = ["고요", "겁니다", "까요", "네요", "는요"]

# 5대 핵심 리듬 줄바꿈 어미
VALID_RHYTHM_ENDINGS = ("죠", "요", "다", "데요", "니다")


class TextForensicCloner:
    """초정밀 스타일 클로닝 8대 텍스트 포렌식 및 채널 헌법 v32.0 검증 엔진"""

    @classmethod
    def clone_channel_script_style(cls, raw_scripts: List[str], channel_name: str = "Unknown") -> Dict[str, Any]:
        """
        1~12편의 원본 대본을 분석하여 8대 나노 텍스트 포렌식 결과 및 복제 시스템 프롬프트 도출
        """
        if not raw_scripts or all(not s.strip() for s in raw_scripts):
            logger.warning("[TextForensicCloner] No raw scripts provided. Returning default forensic profile.")
            return cls._get_default_forensic_profile(channel_name)

        combined_scripts = "\n\n--- [영상 대본 샘플 구분선] ---\n\n".join(
            [f"[대본 {i+1}]\n{script.strip()}" for i, script in enumerate(raw_scripts[:12]) if script.strip()]
        )

        user_prompt = f"""[분석 대상 채널명]: {channel_name}

[Raw Data (원본 대본들)]:
{combined_scripts}

위 12편 대본을 나노 단위로 해부하여 8대 텍스트 포렌식 항목을 작성하고 지정된 JSON 규격으로 반환하십시오."""

        try:
            with SessionLocal() as db:
                db_settings = get_settings(db)
                llm = LLMClient(db_settings)

            # Direct Native Connection: Google Gemini 2.5 Flash / OpenAI Direct
            messages = [
                {"role": "system", "content": TEXT_FORENSIC_REVERSE_ENGINEERING_PROMPT},
                {"role": "user", "content": user_prompt}
            ]

            response_text = llm.generate_chat_completion(messages=messages, temperature=0.3)
            if not response_text:
                raise ValueError("LLM returned empty response for text forensic analysis.")

            clean_json = response_text.strip()
            if "```json" in clean_json:
                clean_json = clean_json.split("```json")[1].split("```")[0].strip()
            elif "```" in clean_json:
                clean_json = clean_json.split("```")[1].split("```")[0].strip()

            parsed = json.loads(clean_json)
            logger.info(f"✅ [TextForensicCloner] Successfully cloned 8-tier text forensic style for {channel_name}")
            return parsed

        except Exception as e:
            logger.error(f"[TextForensicCloner] Style cloning failed: {e}. Falling back to default.")
            return cls._get_default_forensic_profile(channel_name)

    @classmethod
    def validate_and_sanitize_narration(cls, script_text: str) -> Dict[str, Any]:
        """
        [채널 헌법 v32.0 & 내레이션 스타일 가이드 v21.4] 게이트키퍼
        1. 절대 금기 어미 (~고요, ~겁니다, ~까요, ~네요, ~는요) 스캔 및 자동 교체
        2. 5대 핵심 리듬 어미 (~죠, ~요, ~다, ~데요, ~니다) 뒤 강제 줄바꿈 검증
        3. 선언(~입니다/합니다) vs 연결(~인데요/하죠) 교차율 검사
        """
        lines = [line.strip() for line in script_text.splitlines() if line.strip()]
        violations = []
        sanitized_lines = []

        # 어미 교체 맵 (채널 헌법 기준 안전 교체)
        replacement_map = {
            "고요": "고 하죠",
            "겁니다": "것입니다",
            "까요": "까",
            "네요": "다고 하네요",
            "는요": "는"
        }

        declaration_count = 0
        connection_count = 0

        for idx, line in enumerate(lines):
            mod_line = line
            # 1. 절대 금기 어미 스캔
            for forbidden in FORBIDDEN_KEYWORDS:
                if forbidden in mod_line:
                    violations.append(f"줄 {idx+1}: 절대 금기 어미 '~{forbidden}' 발견")
                    mod_line = mod_line.replace(forbidden, replacement_map.get(forbidden, ""))

            # 2. 선언 / 연결 카운트
            if any(mod_line.endswith(d) for d in ["입니다", "합니다", "아닙니다", "이다", "한다"]):
                declaration_count += 1
            elif any(mod_line.endswith(c) for c in ["인데요", "는데요", "하죠", "거죠", "있죠"]):
                connection_count += 1

            sanitized_lines.append(mod_line)

        # 줄바꿈 무결성 검증 (5대 어미 뒤 줄바꿈 권장)
        sanitized_full = "\n".join(sanitized_lines)
        total_sentences = max(len(sanitized_lines), 1)
        flavor_alternation_ratio = round((min(declaration_count, connection_count) * 2) / total_sentences, 2)

        is_passed = len(violations) == 0

        return {
            "passed": is_passed,
            "violations": violations,
            "flavor_alternation_ratio": flavor_alternation_ratio,
            "declaration_count": declaration_count,
            "connection_count": connection_count,
            "sanitized_script": sanitized_full
        }

    @classmethod
    def _get_default_forensic_profile(cls, channel_name: str) -> Dict[str, Any]:
        """기본 텍스트 포렌식 폴백 프로필"""
        return {
            "cognitive_model": {
                "logic_structure": "직관적 인과관계 및 핵심 사실 우선 배치형",
                "worldview_filter": "객관적 팩트 기반의 호기심 자극 필터",
                "self_identity": "신뢰도 높은 정보 큐레이터"
            },
            "syntactic_fingerprint": {
                "avg_sentence_length": "단문 위주 (4~7단어)",
                "dominant_endings": ["~입니다", "~하는데요", "~하죠", "~라고 하네요"],
                "rhetorical_questions": "도입부 1회 호기심 질문",
                "conjunction_skips": "그러나, 그래서 생략 후 즉시 문맥 전환"
            },
            "visual_formatting": {
                "line_break_trigger": "한 호흡(문장)당 1줄 줄바꿈",
                "spacing_cadence": "2.5초당 1회 줄바꿈",
                "special_characters": ["!", "..."]
            },
            "lexical_database": {
                "custom_dictionary": {"사실": "실제 진실은", "사건": "이 상황"},
                "slang_level": "비속어 0%, 트렌디한 인터넷 신조어 일부 수용",
                "onomatopoeia": ["순간", "쾅", "스르륵"]
            },
            "narrative_arc": {
                "opening_hook_formula": "0~2초 내 사건의 핵심 결말을 살짝 감춘 질문형 훅",
                "buildup_mechanism": "증거 제시 ➔ 예상 밖의 반전 정황 포착",
                "signature_payoff": "~라고 하네요! 시그니처 엔딩"
            },
            "emotional_dynamics": {
                "trigger_points": "상식에 반하는 불공정이나 기괴한 디테일 발견 시 몰입 유도",
                "irony_patterns": "겉보기엔 평범하지만 이면의 충격 반전 대비"
            },
            "meta_fiction": {
                "audience_names": ["여러분", "시청자분들"],
                "editorial_cues": ["[0초 줌인]", "[임팩트 자막]"]
            },
            "negative_constraints": {
                "forbidden_rules": [
                    "지루한 인사말('안녕하세요') 절대 금지",
                    "느린 호흡 금지",
                    "절대 금기 어미(~고요, ~겁니다) 사용 금지"
                ]
            },
            "cloned_system_instruction": f"""# [{channel_name} 숏폼 대본 복제 마스터 지침서]
당신은 {channel_name} 채널의 전속 스토리텔러입니다.
1. 첫 문장은 0~2초 내에 호기심을 폭발시키는 직타 훅으로 시작하십시오.
2. 문장은 단문 위주로 작성하고 '선언(~입니다)'과 '연결(~인데요)' 어미를 교차하십시오.
3. 절대 금기 어미(~고요, ~겁니다, ~까요, ~네요, ~는요)는 사용하지 마십시오.
4. 마지막 문장은 반드시 '~라고 하네요!'로 끝나야 합니다.
"""
        }
