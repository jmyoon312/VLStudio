"""
Director System Tools Component.
Handles local OS desktop interactions (file explorer open, CapCut launch).
"""

import sys
import os
import logging
from typing import AsyncGenerator, Dict, Any

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

logger = logging.getLogger("director_system_tools")

class DirectorSystemTools:
    """Modular controller for desktop OS interactions."""

    @staticmethod
    def match_intent(clean_prompt: str) -> bool:
        return any(kw in clean_prompt for kw in [
            "폴더 열어", "폴더 열어줘", "결과물 폴더", "내보내기 폴더", 
            "저장 폴더", "다운로드 폴더", "캡컷 폴더",
            "캡컷 실행", "capcut 실행", "캡컷 열어", "capcut 열어", "캡컷 켜", "capcut 켜"
        ])

    @staticmethod
    async def handle_system_action(prompt: str) -> AsyncGenerator[Dict[str, Any], None]:
        from app.agent.hermes_core.tools.hermes_tool_registry import hermes_tool_dispatcher
        clean_prompt = prompt.strip().lower()

        # 1. Folder Open Action
        if any(kw in clean_prompt for kw in ["폴더 열어", "폴더 열어줘", "결과물 폴더", "내보내기 폴더", "저장 폴더", "다운로드 폴더", "캡컷 폴더"]):
            folder_type = "exports"
            if "다운로드" in clean_prompt:
                folder_type = "downloads"
            elif "캡컷" in clean_prompt or "capcut" in clean_prompt:
                folder_type = "capcut"

            yield {
                "type": "step",
                "item_index": 0,
                "total_items": 1,
                "step_id": "os_open_folder",
                "title": f"📂 윈도우 파일 탐색기 열기 ({folder_type})",
                "status": "in_progress",
                "detail": f"로컬 컴퓨터의 {folder_type} 폴더를 화면에 띄우는 중입니다..."
            }
            res = await hermes_tool_dispatcher.dispatch("system_open_folder", {"folder_type": folder_type})
            yield {
                "type": "step",
                "item_index": 0,
                "total_items": 1,
                "step_id": "os_open_folder",
                "title": f"📂 윈도우 파일 탐색기 열기 완료",
                "status": "completed",
                "detail": res.get("message", "폴더를 열었습니다.")
            }
            msg = f"📂 **{res.get('message', '폴더가 열렸습니다.')}**\n\n- 열린 경로: `{res.get('result', {}).get('opened_path', '')}`\n- 필요한 파일이 확인되면 말씀해 주세요!"
            yield {"type": "content_chunk", "delta": msg, "content": msg}
            yield {
                "type": "chat_response",
                "content": msg,
                "action_chips": ["🎬 이 파일로 영상 제작하기", "📁 다운로드 폴더 열기", "🚀 CapCut 실행하기"]
            }
            return

        # 2. CapCut Launch Action
        if any(kw in clean_prompt for kw in ["캡컷 실행", "capcut 실행", "캡컷 열어", "capcut 열어", "캡컷 켜", "capcut 켜"]):
            yield {
                "type": "step",
                "item_index": 0,
                "total_items": 1,
                "step_id": "os_launch_capcut",
                "title": "🎬 로컬 CapCut 데스크톱 앱 실행",
                "status": "in_progress",
                "detail": "로컬 PC의 CapCut 프로그램을 시작하는 중입니다..."
            }
            res = await hermes_tool_dispatcher.dispatch("system_launch_capcut", {})
            yield {
                "type": "step",
                "item_index": 0,
                "total_items": 1,
                "step_id": "os_launch_capcut",
                "title": "🎬 로컬 CapCut 데스크톱 앱 실행 완료",
                "status": "completed",
                "detail": res.get("message", "실행되었습니다.")
            }
            msg = f"🎬 **{res.get('message', '로컬 CapCut 프로그램이 실행되었습니다.')}**\n\n완성된 드래프트를 편집기에서 바로 이어 작업하실 수 있습니다."
            yield {"type": "content_chunk", "delta": msg, "content": msg}
            yield {
                "type": "chat_response",
                "content": msg,
                "action_chips": ["📂 내보내기 폴더 열기", "🎬 새 영상 제작하기"]
            }
            return
