"""
Director Project Manager Component.
Enables real users to create, bind, and manage project folders directly through
the AI Director conversational chat window (Zero Manual DB/Script Law).
"""

import sys
import os
import re
import uuid
import logging
from typing import AsyncGenerator, Dict, Any, Optional
from datetime import datetime

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

logger = logging.getLogger("director_project_manager")


class DirectorProjectManager:
    """Conversational controller for project folder creation and thread binding in AI Director."""

    PALETTE_COLORS = ["emerald", "indigo", "purple", "sky", "amber", "rose", "teal", "violet"]

    @staticmethod
    def match_intent(clean_prompt: str) -> bool:
        """Determines if user is asking to create or manage project folders in chat."""
        p = clean_prompt.strip().lower()

        # Exclude OS folder opening requests handled by DirectorSystemTools
        if any(kw in p for kw in ["폴더 열어", "폴더 열어줘", "탐색기", "내보내기 폴더", "다운로드 폴더", "저장 폴더"]):
            return False

        create_keywords = [
            "프로젝트 폴더", "폴더 생성", "폴더 만들어", "새 폴더", "폴더 추가",
            "프로젝트 생성", "프로젝트 만들어", "새 프로젝트", "프로젝트 파줘", "폴더 하나",
            "프로젝트 하나", "폴더로 묶어", "프로젝트로 묶어", "폴더로 이동"
        ]
        return any(kw in p for kw in create_keywords)

    @classmethod
    def extract_project_name(cls, prompt: str) -> str:
        """Extracts a clean project folder name from user dialogue."""
        raw = prompt.strip()

        # 1. Quoted name: e.g. '아이돌 숏폼 분석' or "트렌드 썰"
        quote_match = re.search(r"['\"‘“]([^'\"’”]+)['\"’”]", raw)
        if quote_match:
            cand = quote_match.group(1).strip()
            if cand:
                return cand

        # 2. Pattern: [이름] (프로젝트|폴더) 만들어줘/생성해줘
        pattern = re.search(r"([가-힣a-zA-Z0-9_\-\s]{2,25}?)\s*(?:프로젝트\s*폴더|폴더|프로젝트)\s*(?:하나\s*)?(?:만들어|생성|추가|파줘|구성|세팅)", raw)
        if pattern:
            cand = pattern.group(1).strip()
            # Clean filler words
            cand = re.sub(r"^(새|신규|새로운|하나|이것|요거)\s*", "", cand).strip()
            if cand and len(cand) >= 2:
                return cand

        # 3. Pattern: 이름은 [이름]으로
        name_clause = re.search(r"이름은\s*([가-힣a-zA-Z0-9_\-\s]{2,25}?)(?:으로|로|\s)", raw)
        if name_clause:
            cand = name_clause.group(1).strip()
            if cand:
                return cand

        # Default fallback
        return f"숏폼 프로젝트 {datetime.now().strftime('%m%d_%H%M')}"

    @classmethod
    async def handle_project_action(
        cls,
        prompt: str,
        thread_id: Optional[str] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Executes project folder creation and thread binding within the conversation stream.
        Yields ReAct progress steps, Markdown confirmation card, and contextual action chips.
        """
        from app.database import SessionLocal
        from app import models

        project_name = cls.extract_project_name(prompt)
        proj_id = f"proj_{uuid.uuid4().hex[:8]}"
        color_idx = abs(hash(project_name)) % len(cls.PALETTE_COLORS)
        color = cls.PALETTE_COLORS[color_idx]

        # 1. Step: Project Folder DB Creation
        yield {
            "type": "step",
            "item_index": 0,
            "total_items": 2,
            "step_id": "project_folder_create",
            "title": f"📁 새 프로젝트 폴더 생성 ('{project_name}')",
            "status": "in_progress",
            "detail": f"데이터베이스에 프로젝트 폴더 '{project_name}'(ID: {proj_id})를 등록하는 중입니다..."
        }

        db = SessionLocal()
        thread_title = "새 대화"
        thread_bound = False
        try:
            # Create project
            proj = models.DirectorProject(
                id=proj_id,
                name=project_name,
                color=color,
                icon="folder",
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            db.add(proj)
            db.commit()
            db.refresh(proj)

            yield {
                "type": "step",
                "item_index": 0,
                "total_items": 2,
                "step_id": "project_folder_create",
                "title": f"📁 새 프로젝트 폴더 생성 완료 ('{project_name}')",
                "status": "completed",
                "detail": f"프로젝트 ID '{proj_id}', 색상 토큰 '{color}' 등록 완료"
            }

            # 2. Step: Bind current conversation thread
            if thread_id:
                yield {
                    "type": "step",
                    "item_index": 1,
                    "total_items": 2,
                    "step_id": "thread_folder_bind",
                    "title": "🔗 대화 세션 프로젝트 폴더 연동",
                    "status": "in_progress",
                    "detail": f"현재 대화 세션(ID: {thread_id})을 '{project_name}' 폴더로 분류하는 중입니다..."
                }

                th = db.query(models.DirectorThread).filter_by(id=thread_id).first()
                if th:
                    th.project_id = proj.id
                    th.updated_at = datetime.now()
                    thread_title = th.title or "현재 대화"
                    thread_bound = True
                    db.commit()

                yield {
                    "type": "step",
                    "item_index": 1,
                    "total_items": 2,
                    "step_id": "thread_folder_bind",
                    "title": "🔗 대화 세션 프로젝트 폴더 연동 완료",
                    "status": "completed",
                    "detail": f"대화 세션 '{thread_title}'이(가) '{project_name}' 폴더에 배속되었습니다."
                }
            else:
                yield {
                    "type": "step",
                    "item_index": 1,
                    "total_items": 2,
                    "step_id": "thread_folder_bind",
                    "title": "📁 프로젝트 폴더 독립 준비 완료",
                    "status": "completed",
                    "detail": "새 대화를 시작할 때 이 폴더를 기본 컨테이너로 선택할 수 있습니다."
                }

        except Exception as e:
            logger.error(f"[DirectorProjectManager] Failed to create project folder: {e}", exc_info=True)
            db.rollback()
            err_msg = f"❌ 프로젝트 폴더 생성 중 오류가 발생했습니다: {str(e)}"
            yield {"type": "content_chunk", "delta": err_msg, "content": err_msg}
            yield {
                "type": "chat_response",
                "content": err_msg,
                "action_chips": ["다시 시도하기", "기본 폴더로 진행"]
            }
            return
        finally:
            db.close()

        # 3. Detailed Markdown Response
        msg_markdown = (
            f"### 📁 새 프로젝트 폴더 생성 및 대화 배속 완료\n\n"
            f"대표님, 요청하신 프로젝트 폴더 **'{project_name}'**이(가) AI 디렉터 시스템에 정상 생성되었습니다.\n\n"
            f"| 프로젝트 항목 | 설정 값 | 상태 |\n"
            f"| :--- | :--- | :--- |\n"
            f"| **폴더명** | `{project_name}` | 활성화됨 |\n"
            f"| **프로젝트 식별자** | `{proj_id}` | SQLite DB 등록 완료 |\n"
            f"| **테마 태그 색상** | `{color}` | 시각 인덱싱 반영 |\n"
            f"| **배속된 대화 세션** | `{thread_title}` | {('자동 바인딩됨' if thread_bound else '독립 대기 중')} |\n\n"
            f"이제 이 프로젝트 폴더 안에서 타겟 채널들을 체계적으로 분석하고 전용 프리셋을 제작하실 수 있습니다.\n\n"
            f"**분석을 시작할 유튜브 채널 링크(예: `https://www.youtube.com/@채널명`)를 대화창에 입력해 주세요!**"
        )

        yield {"type": "content_chunk", "delta": msg_markdown, "content": msg_markdown}
        yield {
            "type": "chat_response",
            "content": msg_markdown,
            "created_project": {
                "id": proj_id,
                "name": project_name,
                "color": color,
                "icon": "folder"
            },
            "action_chips": [
                "🎬 이 폴더에서 새 채널 분석하기",
                "📂 프로젝트 폴더 이름 변경",
                "📑 대화 목록 확인"
            ]
        }

    @classmethod
    def create_project_and_bind_thread(cls, thread_id: str, project_name: str) -> Optional[str]:
        """Programmatic helper to create a project folder and bind thread immediately."""
        from app.database import SessionLocal
        from app import models
        db = SessionLocal()
        try:
            # Check existing project with same name
            existing = db.query(models.DirectorProject).filter_by(name=project_name).first()
            if existing:
                proj_id = existing.id
            else:
                proj_id = f"proj_{uuid.uuid4().hex[:8]}"
                color_idx = abs(hash(project_name)) % len(cls.PALETTE_COLORS)
                color = cls.PALETTE_COLORS[color_idx]
                proj = models.DirectorProject(
                    id=proj_id,
                    name=project_name,
                    color=color,
                    icon="folder",
                    created_at=datetime.now(),
                    updated_at=datetime.now()
                )
                db.add(proj)
                db.commit()
                db.refresh(proj)

            if thread_id:
                th = db.query(models.DirectorThread).filter_by(id=thread_id).first()
                if th:
                    th.project_id = proj_id
                    th.updated_at = datetime.now()
                    db.commit()
                else:
                    new_th = models.DirectorThread(
                        id=thread_id,
                        title=project_name,
                        project_id=proj_id,
                        created_at=datetime.now(),
                        updated_at=datetime.now()
                    )
                    db.add(new_th)
                    db.commit()
            return proj_id
        except Exception as e:
            logger.warning(f"[DirectorProjectManager] Auto create_project_and_bind_thread error: {e}")
            db.rollback()
            return None
        finally:
            db.close()

    @classmethod
    def get_thread(cls, thread_id: str) -> Optional[Dict[str, Any]]:
        from app.database import SessionLocal
        from app import models
        db = SessionLocal()
        try:
            th = db.query(models.DirectorThread).filter_by(id=thread_id).first()
            if th:
                return {"id": th.id, "title": th.title, "project_id": th.project_id}
            return None
        finally:
            db.close()

    @classmethod
    def get_project(cls, project_id: str) -> Optional[Dict[str, Any]]:
        from app.database import SessionLocal
        from app import models
        db = SessionLocal()
        try:
            p = db.query(models.DirectorProject).filter_by(id=project_id).first()
            if p:
                return {"id": p.id, "name": p.name, "color": p.color}
            return None
        finally:
            db.close()

    @classmethod
    def get_all_threads(cls) -> list:
        from app.database import SessionLocal
        from app import models
        db = SessionLocal()
        try:
            threads = db.query(models.DirectorThread).all()
            return [{"id": th.id, "title": th.title, "project_id": th.project_id} for th in threads]
        finally:
            db.close()
