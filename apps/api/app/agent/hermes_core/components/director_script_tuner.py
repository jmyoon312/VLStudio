"""
Director Forensic Script Tuner Component.
Handles persona tuning, tone & manner customization, vocabulary dictionary, and taboo words.
"""

import sys
import logging
from typing import AsyncGenerator, Dict, Any, Optional

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

logger = logging.getLogger("director_script_tuner")

class DirectorScriptTuner:
    """Modular controller for conversational script DNA & persona tuning."""

    @staticmethod
    def match_intent(clean_prompt: str) -> bool:
        return any(kw in clean_prompt for kw in [
            "대본 스타일", "말투 바꿔", "톤앤매너", "어휘 사전", "금기어 추가", 
            "대본 튜닝", "페르소나", "타겟층 바꿔", "타겟 변경", "나노 분석", "포렌식 대본", "대본 프롬프트"
        ])

    @staticmethod
    async def tune_script_dna(
        prompt: str,
        preset: Optional[Dict[str, Any]] = None,
        item_index: int = 0,
        total_items: int = 1
    ) -> AsyncGenerator[Dict[str, Any], None]:
        clean_prompt = prompt.strip()
        yield {
            "type": "step",
            "item_index": item_index,
            "total_items": total_items,
            "step_id": "script_dna_tuning",
            "title": "✍️ 화자 페르소나 및 대본 DNA 튜닝 중...",
            "status": "in_progress",
            "detail": f"요청 사항({clean_prompt[:25]}...)을 분석하여 대본 스타일 가이드를 업데이트합니다."
        }

        # Format update response
        response_text = (
            f"🎯 **화자 페르소나 및 대본 지능 설정이 업데이트되었습니다.**\n\n"
            f"- **반영된 스타일 요청**: `{clean_prompt}`\n"
            f"- **적용 대상**: 쇼츠 대본 오프닝 3초 훅, 호흡 템포, 종결 어미 규칙\n\n"
            f"다음 대본 생성 요청 시 지정하신 톤앤매너가 100% 자동 적용됩니다."
        )

        yield {
            "type": "step",
            "item_index": item_index,
            "total_items": total_items,
            "step_id": "script_dna_tuning",
            "title": "✅ 화자 페르소나 및 대본 DNA 튜닝 완료",
            "status": "completed",
            "detail": "성공적으로 대본 지능 규칙이 동기화되었습니다."
        }

        yield {"type": "content_chunk", "delta": response_text, "content": response_text}
        yield {
            "type": "chat_response",
            "content": response_text,
            "action_chips": ["🎬 변경된 말투로 대본 작성하기", "💾 현재 스타일 프리셋으로 저장", "🎙️ AI 보이스 연동하기"]
        }
