"""
Hermes Skills Auto-Loader & Sovereign Form Factor Pinner.
=========================================================
Ported & adapted from Nous Research Hermes Agent v0.21.4:
- skills.auto_load
- skill_preprocessing.py

Dynamically pins:
1. Exact 4-Form Factor Production Bible (Classic, Insta, Gunlimbo, Ssul)
2. Channel DNA Blueprint (BrandChannel expert_identity, style_signature, taboos)
3. Active Worker Persona (Scout, Writer, Critic, Voice, Visual, Cutter)
Prevents cross-format contamination (0% noise) and eliminates ~40% prompt token bloat.
"""

import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("skills_auto_loader")

FORM_FACTOR_SKILLS: Dict[str, str] = {
    "classic": """### [Auto-Pinned Skill: 1. 클래식 폼팩터 제작 규칙]
- **화면 규격**: 9:16 (1080x1920) 풀스크린 시네마틱 비주얼.
- **자막 연출**: 화면 하단 25% 지점 중앙 정렬, 2~3줄 가독성 굵은 고딕, 텍스트 스트로크(외곽선) 및 부드러운 드롭 섀도우.
- **오디오 연출**: 내레이션 음성 기준 BGM 볼륨 -18dB 더킹(Ducking), 전환 구간 효과음([효과음: 쾅], [효과음: 슈슉]) 마킹.
- **타임라인 원칙**: 3계층(비디오 B-roll 트랙 / 자막 캡션 트랙 / 효과음·BGM 오디오 트랙) 엄격 분리.""",

    "insta": """### [Auto-Pinned Skill: 2. 인스타 릴스 폼팩터 제작 규칙]
- **프로필 상단바**: 상단 10% 안전 영역에 채널 프로필 사진, 유저네임, 팔로우 유도 버튼 배치.
- **베스트 댓글 카드**: 0~3초 구간에 호기심을 유발하는 시청자 질문/베댓 팝업 카드 노출.
- **세이프존 준수**: 우측 하단 좋아요/댓글/공유 아이콘 영역(우측 120px)에 핵심 텍스트 배치 금지.
- **인게이지먼트 훅**: 영상 종료 3초 전 '당신의 생각은 댓글로!' 인터랙션 유도 자막 필수.""",

    "gunlimbo": """### [Auto-Pinned Skill: 3. 군림보 폼팩터 제작 규칙]
- **0초 줌인 훅**: 첫 1초 프레임에서 피사체/텍스트가 120% 스케일로 돌진하는 초고속 줌인 연출.
- **상하단 훅 밴드**: 화면 최상단과 최하단에 옐로우/레드 고대비 굵은 텍스트 바 배치 (예: '⚠️ 역대급 충격 사건').
- **스피치 케이던스**: 분당 180~200 WPM의 빠른 호흡, 불필요한 숨소리/무음 구간 0초 컷팅.
- **마이크로 컷편집**: 1.5~2.5초 단위의 짧은 화면 전환으로 시청자 이탈 완벽 차단.""",

    "ssul": """### [Auto-Pinned Skill: 4. 썰형 폼팩터 제작 규칙]
- **커뮤니티 헤더바**: 상단에 디시/에펨코/레딧 스타일의 게시판명, 작성일자, 조회수 메타 헤더 렌더링.
- **페페 밈 & 감정 오버레이**: 썰의 분위기(황당, 분노, 슬픔, 사이다)에 맞춘 페페(Pepe) 밈 스티커 동적 배치.
- **누적 자막 모드**: 한 문장씩 쌓여 올라가는 누적 스크롤 자막 방식으로 텍스트 몰입감 극대화.
- **화법**: 친근하고 날카로운 온라인 구어체(음슴체, 반말/존댓말 혼용 썰 스타일) 적용."""
}


class HermesSkillsAutoLoader:
    """
    Intelligently discovers and pins relevant skills to the agent prompt context.
    """

    def resolve_form_factor(self, text: str, default: str = "classic") -> str:
        """Detects form factor from prompt or context."""
        t = (text or "").lower()
        if any(w in t for w in ["군림보", "gunlimbo", "훅밴드", "0초줌"]):
            return "gunlimbo"
        elif any(w in t for w in ["인스타", "insta", "릴스", "베댓", "프로필"]):
            return "insta"
        elif any(w in t for w in ["썰", "ssul", "커뮤니티", "페페", "음슴체"]):
            return "ssul"
        elif any(w in t for w in ["클래식", "classic", "시네마틱", "기본"]):
            return "classic"
        return default

    def get_form_factor_skill(self, form_factor: str) -> str:
        """Returns the isolated skill instructions for the target form factor."""
        key = form_factor.lower().strip()
        return FORM_FACTOR_SKILLS.get(key, FORM_FACTOR_SKILLS["classic"])

    def get_channel_dna_skill(self, channel_id: Optional[int], db_session=None) -> Optional[str]:
        """
        Dynamically extracts and packages Channel DNA as a pinned Sovereign Skill.
        """
        if not channel_id:
            return None

        # 1. Check if pre-synthesized SKILL.md exists in 08_Intelligence
        try:
            from app.services.channel_dna_skill_fabric import channel_dna_skill_fabric
            cached_skill = channel_dna_skill_fabric.load_channel_skill(channel_id)
            if cached_skill:
                logger.info(f"📂 [SkillsAutoLoader] Loaded pre-synthesized skill for channel {channel_id}")
                return cached_skill
        except Exception as err:
            logger.debug(f"Pre-synthesized skill check bypassed: {err}")

        try:
            from app.database import SessionLocal
            from app.models import Channel

            session = db_session or SessionLocal()
            try:
                ch = session.query(Channel).filter(Channel.id == channel_id).first()
                if not ch:
                    return None

                # Auto-synthesize and persist to 08_Intelligence on demand
                try:
                    from app.services.channel_dna_skill_fabric import channel_dna_skill_fabric
                    return channel_dna_skill_fabric.synthesize_channel_skill(ch)
                except Exception:
                    pass

                ch_title = getattr(ch, "name", None) or getattr(ch, "title", None) or f"Channel_{ch.id}"
                identity = getattr(ch, "expert_identity", None) or getattr(ch, "channel_identity", None) or ch_title
                tone = getattr(ch, "content_tone", None) or "전문적이고 흡입력 있는 어조"
                taboos = getattr(ch, "negative_keywords", None) or "저품질 어휘, 비속어, 과장 허위사실"
                persona = getattr(ch, "persona_target", None) or "2030 스마트 숏폼 소비자"

                return f"""### [Auto-Pinned Skill: 채널 주권 DNA - {ch_title}]
- **채널 정체성**: {identity}
- **톤앤매너**: {tone}
- **타겟 오디언스**: {persona}
- **금기어 및 주의사항**: {taboos}
- **채널 주권 격리**: 타 채널의 어휘나 문맥을 절대 침범하지 않으며 오직 본 채널의 DNA만을 계승함."""
            finally:
                if not db_session:
                    session.close()
        except Exception as e:
            logger.warning(f"Failed to auto-load channel DNA for channel {channel_id}: {e}")
            return None

    def auto_load_prompt_skills(
        self,
        user_message: str,
        form_factor: Optional[str] = None,
        channel_id: Optional[int] = None,
        db_session=None
    ) -> str:
        """
        Main entry point for Hermes skills.auto_load.
        Returns combined pinned skills block.
        """
        target_ff = form_factor or self.resolve_form_factor(user_message)
        ff_skill = self.get_form_factor_skill(target_ff)
        dna_skill = self.get_channel_dna_skill(channel_id, db_session)

        pinned_parts = [
            "## 📌 [Hermes skills.auto_load] 작업 맞춤형 고정 스킬",
            ff_skill
        ]
        if dna_skill:
            pinned_parts.append(dna_skill)

        pinned_parts.append(
            "- **작업 준수 사항**: 위 고정된 스킬 가이드라인에 100% 일치하도록 대본, 씬 지시문, 컷 타임코드를 생성하십시오."
        )

        return "\n\n".join(pinned_parts)


skills_auto_loader = HermesSkillsAutoLoader()
