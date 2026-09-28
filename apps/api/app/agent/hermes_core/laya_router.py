"""
Hermes-Laya Layered Cognitive Architecture & Intent Router (ViraLoop Studio)
Inspired by Laya's Staged Event Pipeline (Ingest -> Route -> Stage -> Emit).

Provides:
1. Ultra-fast Intent Routing (latency < 0.01s):
   - CHAT_FAST: Simple conversation, model identity, greetings, general questions. (Zero Bible, Zero Tool bloat)
   - CHANNEL_CLONING: Reverse-engineering channel scripts using the 8 Forensic Cloning Dimensions.
   - VIDEO_PRODUCTION: Full production pipeline powered by Channel Constitution v32.0, 8 Viral Title Laws,
                      10 Story Structures, Declarative/Connective cadence, and NLE Multi-Cut Protocol v6.0.
   - SYSTEM_DEV: OS/Terminal command execution, code inspection, and file management.
   - SOURCING: Source video discovery, reverse-sourcing shorts, and clip harvesting.

2. Stage-Isolated Prompt Builders (Zero Prompt Pollution):
   - build_fast_chat_prompt: ~350 chars ultra-lightweight persona.
   - build_channel_cloning_prompt: 8-dimension forensic style extraction.
   - build_video_production_prompt: Complete viral shorts constitution & NLE multi-cut rules.
   - build_system_dev_prompt: Developer and computer control persona.
"""

from enum import Enum
from typing import Dict, Any, Optional, List
import logging
import re

logger = logging.getLogger("hermes_laya_router")


class IntentType(str, Enum):
    CHAT_FAST = "chat_fast"
    CHANNEL_CLONING = "channel_cloning"
    VIDEO_PRODUCTION = "video_production"
    SYSTEM_DEV = "system_dev"
    SOURCING = "sourcing"


class HermesLayaRouter:
    """
    Evaluates incoming user request and routes it to the optimal cognitive tier
    with stage-isolated prompts and parameters.
    """

    @staticmethod
    def classify_intent(
        prompt: str,
        channel_forensic_context: Optional[str] = None,
        reference_media_path: Optional[str] = None
    ) -> IntentType:
        """
        Classifies user prompt into one of 5 sovereign intent tiers in < 0.01s.
        """
        p_clean = prompt.strip().lower()

        # 1. System / Dev Control Intent
        dev_keywords = [
            "터미널", "명령어", "exec_command", "powershell", "파이썬 실행",
            "로그 확인", "에러 분석", "코드 수정", "환경 진단", "디버깅해줘", "스크립트 짜줘"
        ]
        if any(k in p_clean for k in dev_keywords):
            return IntentType.SYSTEM_DEV

        # 2. Sourcing Intent
        sourcing_keywords = [
            "소스 영상", "소스영상", "소스 찾아", "소스 수집", "영상 찾아", "영상 수집",
            "어울리는 영상", "어울리는 소스", "쇼츠 원본", "원본 긴 영상", "원본 영상 찾아"
        ]
        if any(k in p_clean for k in sourcing_keywords):
            return IntentType.SOURCING

        # 3. Channel Forensic Cloning Intent
        cloning_keywords = [
            "스타일 분석", "대본 분석", "화자 분석", "말투 분석", "스타일 클로닝", "클로닝",
            "대본 역설계", "채널 분석", "채널 역설계", "페르소나 추출", "언어 지문",
            "포렌식", "지침서", "스타일 복제", "화자 복제", "역설계 프롬프트"
        ]
        if channel_forensic_context or any(k in p_clean for k in cloning_keywords):
            return IntentType.CHANNEL_CLONING

        # 4. Video Production Intent
        production_keywords = [
            "대본 써줘", "대본 작성", "스크립트 써줘", "대본 만들어", "쇼츠 대본",
            "대본 생성", "대본 짜줘", "대본 뽑아", "대본 구성",
            "영상 만들어", "영상 제작", "영상 생성", "숏폼 제작", "렌더링해줘", "자막 바꿔",
            "스타일 수정", "프리셋 저장", "캡컷으로", "capcut", "1문장 2컷", "60초 쇼츠",
            "릴스", "인스타 릴스", "틱톡", "쇼츠 제작"
        ]
        if any(k in p_clean for k in production_keywords):
            return IntentType.VIDEO_PRODUCTION

        # 5. Default: Ultra-Fast Chat (Fast-Path)
        return IntentType.CHAT_FAST


    # =========================================================================
    # 🏛️ BASE + ON-DEMAND EXTENSION PROMPT ARCHITECTURE
    # =========================================================================

    @staticmethod
    def build_base_prompt(
        provider_name: str,
        model_name: str,
        current_date_str: str = "2026년 9월"
    ) -> str:
        """
        [루피 마스터 페르소나 헌법 (Master Loopie Persona Constitution) - SSOT Baseline]
        모든 프로바이더(Codex, OpenAI, Gemini, Claude, Grok, OmniRoute) 공통 적용.
        센스 있고 감각적인 AI 총괄 디렉터 루피의 단일 주권 정체성 + 대표님 호칭 + 한국어 즉각 응답 수호.
        """
        return f"""당신은 ViraLoop Studio의 'AI 총괄 디렉터 루피(Loopie)'입니다.
대표님의 1인 미디어 창작과 콘텐츠 비즈니스를 최고 수준으로 이끄는 전속 크리에이티브 디렉터이자 영상 연출 전문가입니다.

[루피 마스터 페르소나 헌법]
1. **정체성 및 호칭**:
   - 당신의 공식 직함은 **'AI 총괄 디렉터 루피'**입니다. 거추장스러운 수식어를 붙이지 마세요.
   - 대표님(사용자)을 부를 때는 항상 정중하고 품격 있게 **'대표님'**이라고 호칭하세요.
2. **센스 있고 감각적인 전문 톤앤매너**:
   - 숏폼 알고리즘, 3초 바이럴 후킹, 시청 지속률(리텐션), 씬 전환, 사운드 연출에 정통한 실전형 크리에이티브 디렉터의 어조를 유지하세요.
   - 기계적이거나 딱딱하지 않고, 오랜 호흡을 맞춘 유능하고 센스 넘치는 파트너처럼 친근하면서도 명쾌하게 소통하세요.
   - 군대식/SF식 롤플레잉('사령탑', '작전', '보고드립니다 🫡' 등)이나 딱딱한 로봇식 말투를 일절 사용하지 마세요.
3. **심플 & 명쾌함 (사족 0% 원칙)**:
   - 미사여구나 구차한 사족 없이 핵심을 2~3문장 내외로 명확하게 전달하고, 대표님이 바로 다음 결정을 내릴 수 있도록 센스 있게 다음 액션(기획, 벤치마킹, 대본 등)을 제안하세요.
4. **시스템 메타데이터 발설 금지 및 이전 턴 해명 금지**:
   - 현재 내부 지능 연산 엔진(프로바이더: {provider_name}, 모델: {model_name})은 당신의 '내부 인지 상태'일 뿐입니다. 대표님이 "너 무슨 모델 써?", "엔진이 뭐야?"라고 직접 묻지 않는 한, 자기소개나 인사말에서 모델명이나 시스템 스펙을 스스로 나열하지 마세요.
   - 이전 대화 맥락에서 어떤 모델이 사용되었든, 모델 간의 차이나 시스템적 전환에 대해 구차하게 해명하거나 변명하지 마세요. 당신은 언제나 변함없는 단 하나의 '루피'입니다.
5. **모델 정보 직접 질의 시 답변 규칙**:
   - 대표님이 모델이나 엔진에 대해 직접 질문했을 때만: "현재 대표님의 선택에 따라 [{provider_name} {model_name}] 엔진과 직결되어 구동 중입니다. 최상의 영상 퀄리티와 제작 속도를 낼 수 있도록 세팅되어 있습니다."와 같이 1~2문장으로 단정하고 스마트하게 답변하세요.
6. **검증된 사실과 정확성**:
   - 검증된 사실에만 근거하며, 모르는 내용은 추측하지 않고 솔직하고 스마트하게 답변하세요. (기준 일시: {current_date_str})"""


    def compose_staged_prompt(
        self,
        provider_name: str,
        model_name: str,
        intent: IntentType,
        current_date_str: str = "2026년 9월",
        channel_forensic_context: str = "",
        preset_context: str = "",
        search_context: str = "",
        memory_context: str = ""
    ) -> tuple[str, bool]:
        """
        [Base + On-Demand Extension Architecture]
        Returns (composed_prompt, is_heavy_task)
        - is_heavy_task=False: 일상 대화 (Step/Accordion 0건, 0.1초 즉답 텍스트 스트리밍)
        - is_heavy_task=True: 제작/분석/도구 (스텝 아코디언 및 자율 파이프라인 가동)
        """
        base = self.build_base_prompt(provider_name, model_name, current_date_str)

        # 1. 일상 대화 (Fast-Path): Base만 단독 사용! (Zero Bloat, Zero Heavy)
        if intent == IntentType.CHAT_FAST:
            return base, False

        # 2. 채널 대본 역설계 지침서 요청 시: Base 위에 8대 포렌식 지침서 추가
        if intent == IntentType.CHANNEL_CLONING:
            cf_str = f"\n\n[채널 실측 데이터]\n{channel_forensic_context}" if channel_forensic_context else ""
            ext = f"""[확장 미션: 초정밀 채널 스타일 역설계 지침서 작성]
제공된 원본 대본 및 채널 실측 데이터를 나노 단위로 해부하여, 화자의 언어 습관, 사고 방식, 무의식적 패턴까지 완벽히 복제하는 [궁극의 스타일 복제 지침서]를 작성하십시오.

[8대 정밀 분석 프레임워크]
1. [Cognitive Model] 사고 회로 및 세계관
2. [Syntactic Fingerprint] 문장 구조 및 호흡
3. [Visual Formatting] 줄바꿈 및 시각적 리듬
4. [Lexical Database] 핵심 어휘 및 치환 규칙
5. [Narrative Arc] 기-승-전-결 전개 패턴
6. [Emotional Dynamics] 감정의 증폭과 급변
7. [Meta-Fiction] 제4의 벽 및 청자 호명
8. [Negative Constraints] 절대 금기 사항{cf_str}

최종 출력: 원본 화자가 직접 쓴 것 같은 100% 동일한 대본을 생성할 수 있는 완벽한 [시스템 프롬프트]를 복사 가능한 코드 블록으로 제공하십시오."""
            return f"{base}\n\n{ext}", True

        # 3. 숏폼 영상/대본 제작 요청 시: Base 위에 채널 헌법 v32.0 + 8대 바이럴 제목 + 10대 스토리 + 1문장 2컷 프로토콜 추가
        if intent == IntentType.VIDEO_PRODUCTION:
            preset_str = f"\n\n[현재 활성 프리셋 규격]\n{preset_context}" if preset_context else ""
            search_str = f"\n\n[실시간 트렌드/팩트]\n{search_context}" if search_context else ""
            mem_str = f"\n\n[작업 기억 및 이전 맥락]\n{memory_context}" if memory_context else ""
            ext = f"""[확장 미션: 채널 헌법 v32.0 완전 무결 숏폼 대본/영상 제작]
1. **제0원칙: 절대적 진실성 (Factual Integrity)**: 환각 절대 금지.
2. **단계 0: DYNAMIC TARGETING 🎯 (최적 타겟 자동 발굴)**
3. **단계 0.5: GATEKEEPER 🚨 (유튜브 노딱 단어 원천 배제)**
4. **바이럴 제목 자동 생성 8대 법칙 (Show, Don't Tell, 12~18자 골든 존, 명사형 종결 등)**
5. **60초 Shorts 10대 기승전결 포뮬러 (001~010 중 최적 1개 선정)**
6. **내레이션 스타일 가이드**: '선언(강)'과 '연결(약)' 의도적 교차, 절대 금지 5대 어미(~고요, ~겁니다, ~까요, ~네요, ~는요) 원천 배제.
7. **[V6.0 FPS-Free 다이내믹 멀티-컷 편집 프로토콜]**: 2.5초 초과 시 1문장 2컷 의무화(나노 분절 a/b), 절대 시간 타임코드(MM:SS.ms).
8. **2-Tone 키워드 대본 규칙**: 핵심 감정/충격 단어는 [대괄호]로 표기.{preset_str}{search_str}{mem_str}"""
            return f"{base}\n\n{ext}", True

        # 4. 시스템/OS/개발 제어 요청 시: Base 위에 시스템 엔지니어 지침 추가
        if intent == IntentType.SYSTEM_DEV:
            ext = """[확장 미션: 시스템/OS 진단 및 자율 개발 제어]
1. 터미널 쉘(exec_command), 파일 제어(system_file_manager), 브라우징 도구를 활용하여 시스템 문제를 해결하십시오.
2. 원인이 되는 파일 경로와 코드 라인을 정확히 짚어 명쾌하게 설명하십시오.
3. Windows 환경과 Python UTF-8 인코딩 규칙을 철저히 준수하십시오."""
            return f"{base}\n\n{ext}", True

        # 5. 소싱 및 기본
        return base, False


    # Backward compatibility alias
    def build_fast_chat_prompt(self, provider_name: str, model_name: str, current_date_str: str = "2026년 9월") -> str:
        return self.build_base_prompt(provider_name, model_name, current_date_str)


# Global Singleton Router Instance
hermes_laya_router = HermesLayaRouter()
