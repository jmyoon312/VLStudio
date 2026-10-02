"""
[Deliberative Director]
Autonomous Deliberative Investigation & Open-Ended Strategy Synthesis Engine.
Executes:
1. 5-Aspect Deep Forensic Diagnosis (선행 정밀 진단)
2. Autonomous Intervention Level Discretion (Level 0 ~ Level 3 개입 수준 자율 판단)
3. Cognitive Triad Synthesis: [Source Deficiency] x [Comment Lore] x [Channel DNA]
4. Open-Ended Plus-Alpha Strategy Formulation (무제한 차별화 전략 자율 합성)
"""

import os
import sys
import json
import logging
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

# Strict Windows UTF-8 enforcement
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

logger = logging.getLogger("deliberative_director")


class ForensicDiagnosis(BaseModel):
    narrative_completeness: float = Field(0.8, description="0.0 ~ 1.0 서사 완결도")
    hook_strength: float = Field(0.7, description="0.0 ~ 1.0 첫 3초 후킹력")
    visual_fidelity: float = Field(0.8, description="0.0 ~ 1.0 영상미 및 화질")
    audience_heat: float = Field(0.5, description="0.0 ~ 1.0 댓글 반응/논쟁 온도")
    duplication_risk: float = Field(0.6, description="0.0 ~ 1.0 유튜브 중복 위험도")
    diagnosis_summary: str = ""


class StrategyPrescription(BaseModel):
    intervention_level: str = "level_2_point_lore"  # "level_0_zero" | "level_1_micro_hook" | "level_2_point_lore" | "level_3_full_reconstruction"
    strategy_name: str = "맞춤형 플러스 알파 전략"
    channel_alignment_reason: str = ""
    hook_angle: str = ""
    body_treatment: str = "preserve_original"  # "preserve_original" | "interleave_broll" | "expand_scenario"
    ending_treatment: str = ""
    reused_content_defense_score: int = 90
    expected_completion_rate_pct: int = 85


class DeliberativeDirector:
    """
    Autonomous Cognitive Director for ViraLoop Studio.
    Synthesizes creative plus-alpha strategies by fusing source forensics with Channel DNA.
    """

    def __init__(self, agent_model: Optional[str] = None):
        self.agent_model = agent_model

    def diagnose_source(
        self,
        duration_s: float = 30.0,
        has_video: bool = True,
        comment_insights: Optional[List[Dict[str, Any]]] = None,
        raw_script: Optional[str] = None
    ) -> ForensicDiagnosis:
        """
        Executes pre-flight forensic diagnosis on the input source.
        """
        comments = comment_insights or []
        high_like_comments = [c for c in comments if c.get("like_count", 0) > 1000]
        has_debunk = any(c.get("category") == "debunk" for c in comments)
        has_lore = any(c.get("category") == "lore" for c in comments)

        # 1. 서사 완결도: 영상이 길고 자체 완결적이면 완결도 높음
        completeness = 0.9 if duration_s > 25.0 and not has_lore else (0.5 if duration_s < 12.0 else 0.7)
        # 2. 첫 3초 훅: 짧은 영상은 훅이 강할 확률 높음
        hook = 0.85 if duration_s < 15.0 else 0.65
        # 3. 댓글 반응 열기: 1000개 이상 추천 댓글이 있으면 높음
        heat = min(1.0, 0.4 + (len(high_like_comments) * 0.15) + (0.2 if has_debunk else 0.0))
        # 4. 중복 위험도: 영상이 있고 대중적이면 중복 위험 높음
        dup_risk = 0.75 if has_video else 0.2

        summary = []
        if has_debunk:
            summary.append("댓글에 주작/법적 반론이 거세게 형성됨")
        if has_lore:
            summary.append("사건 이후 후일담에 대중의 호기심 집중")
        if duration_s < 15.0:
            summary.append("단편적 숏클립으로 시나리오 보강 가치 높음")
        if not summary:
            summary.append("원본 영상의 서사와 감정선이 자체 완결적임")

        return ForensicDiagnosis(
            narrative_completeness=completeness,
            hook_strength=hook,
            visual_fidelity=0.85 if has_video else 0.5,
            audience_heat=heat,
            duplication_risk=dup_risk,
            diagnosis_summary=" / ".join(summary)
        )

    def formulate_prescription(
        self,
        diagnosis: ForensicDiagnosis,
        channel_dna: Dict[str, Any],
        top_comments: List[Dict[str, Any]],
        preset_name: str = "기본 프리셋"
    ) -> StrategyPrescription:
        """
        Cognitive Triad Decision: [Source Deficiency] x [Comment Lore] x [Channel DNA]
        Discretely determines the minimal/optimal intervention level.
        """
        channel_name = channel_dna.get("name", "바이럴 채널")
        channel_tone = channel_dna.get("tone", "사이다 / 흥미 유발")
        expert_role = channel_dna.get("expert_identity", "사건 해설가")

        # 1. 자율 개입 수준 판단 (Minimal Intervention Law)
        # 완결도가 0.88 이상이고 댓글 논쟁이 미미(heat < 0.45)하면 Level 0 (손대지 마라!)
        if diagnosis.narrative_completeness >= 0.88 and diagnosis.audience_heat < 0.45 and diagnosis.duplication_risk < 0.4:
            return StrategyPrescription(
                intervention_level="level_0_zero",
                strategy_name="순수 원본 보존 & 템플릿 직결",
                channel_alignment_reason=f"[{channel_name}] 채널 톤에 완벽히 부합하며, 원본 자체의 몰입도가 극상이라 사족 배제.",
                hook_angle="원본의 자연스러운 첫 장면 유지",
                body_treatment="preserve_original",
                ending_treatment="내 커스텀 프리셋 자막/BGM 더킹만 깔끔하게 입히고 마무리",
                reused_content_defense_score=88,
                expected_completion_rate_pct=92
            )

        # 2. 첫 3초만 밋밋한 경우 ➔ Level 1 (0초 훅만 1초 당겨치기)
        if diagnosis.hook_strength < 0.6 and diagnosis.audience_heat < 0.55:
            return StrategyPrescription(
                intervention_level="level_1_micro_hook",
                strategy_name="도파민 결말 훅 역배치 (Micro Hook)",
                channel_alignment_reason=f"[{channel_name}] 시청자 이탈 방지를 위해 가장 극적인 2초를 0초 훅으로 전진 배치.",
                hook_angle="영상 결말의 충격 장면을 첫 0초에 1초 당겨치기",
                body_treatment="preserve_original",
                ending_treatment="원본 결말 유지",
                reused_content_defense_score=91,
                expected_completion_rate_pct=88
            )

        # 3. 댓글에 반론이나 후일담이 폭발한 경우 ➔ Level 2 (Point Lore 핀포인트 처방)
        debunk_comments = [c for c in top_comments if c.get("category") == "debunk"]
        lore_comments = [c for c in top_comments if c.get("category") == "lore"]

        if debunk_comments or lore_comments:
            lead_comment = (debunk_comments or lore_comments)[0].get("text", "")[:40]
            return StrategyPrescription(
                intervention_level="level_2_point_lore",
                strategy_name="베댓 집단지성 반전 & 후일담 주입",
                channel_alignment_reason=f"[{channel_name} - {expert_role}] 시청자 3만 명이 경악한 진짜 반전을 채널의 결로 해설.",
                hook_angle=f"댓글에서 폭발한 진짜 진실: {lead_comment}...",
                body_treatment="preserve_original",
                ending_treatment="영상 마지막 4초에 베댓 후일담 씬과 뉴스 팩트체크 1컷 삽입",
                reused_content_defense_score=95,
                expected_completion_rate_pct=89
            )

        # 4. 단편적 클립이거나 글/기사인 경우 ➔ Level 3 (시나리오 전면 확장)
        return StrategyPrescription(
            intervention_level="level_3_full_reconstruction",
            strategy_name="오픈엔디드 심층 시나리오 확장",
            channel_alignment_reason=f"[{channel_name}] 단편적 사건을 {expert_role}의 시각에서 입체적 다큐멘터리로 재창조.",
            hook_angle="시청자의 허를 찌르는 도파민 훅 멘트 주입",
            body_treatment="interleave_broll",
            ending_treatment="전후 맥락과 3년 뒤 충격 결말을 결합하여 완결",
            reused_content_defense_score=98,
            expected_completion_rate_pct=86
        )


# Global singleton
deliberative_director = DeliberativeDirector()
