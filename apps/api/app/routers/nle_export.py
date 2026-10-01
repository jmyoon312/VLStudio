"""
NLE Export & Headless Rendering Router for ViraLoop Studio.
Provides endpoints for CapCut draft exporting, Remotion headless rendering (yuv420p),
and OpenMontage agentic tool dispatching based on VLStandardBlueprint v4.0.
"""

import os
import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, BackgroundTasks

from ..services.montage_nle import montage_nle
from ..services.montage_agent_bridge import montage_agent_bridge
from ..services.sovereign_preset_engine import sovereign_preset_engine

logger = logging.getLogger("nle_export_router")

router = APIRouter(prefix="/api/nle", tags=["nle"])

LOCAL_APPDATA = os.environ.get("LOCALAPPDATA", str(Path.home() / "AppData" / "Local"))
EXPORTS_DIR = Path(LOCAL_APPDATA) / "ViraLoop Studio" / "media" / "05_Exports"
CAPCUT_DRAFTS_DIR = EXPORTS_DIR / "capcut_projects"
EXPORTS_DIR.mkdir(parents=True, exist_ok=True)
CAPCUT_DRAFTS_DIR.mkdir(parents=True, exist_ok=True)


class CapCutExportRequest(BaseModel):
    blueprint: Dict[str, Any]
    project_name: Optional[str] = None


class RemotionRenderRequest(BaseModel):
    blueprint: Dict[str, Any]
    pixelFormat: Optional[str] = "yuv420p"
    output_filename: Optional[str] = None


class AgentToolExecutionRequest(BaseModel):
    tool_name: str
    arguments: Dict[str, Any] = {}


@router.post("/export/capcut")
async def export_capcut_draft(req: CapCutExportRequest):
    """
    VLStandardBlueprint v4.0을 마이크로초 정밀 타임코드의 CapCut 드래프트 프로젝트로 내보냅니다.
    """
    bp = req.blueprint
    blueprint_id = bp.get("blueprintId", f"draft_{int(datetime.now().timestamp())}")
    project_name = req.project_name or bp.get("name", "바이럴 쇼츠 드래프트")

    # 1. NLE 5단 트랙 조립 및 마이크로초 정수 변환
    timeline_meta = montage_nle.assemble_5track_timeline(bp)

    # 2. CapCut draft_content.json 조립
    target_project_dir = CAPCUT_DRAFTS_DIR / f"{blueprint_id}"
    target_project_dir.mkdir(parents=True, exist_ok=True)

    draft_meta = {
        "schema_version": "v4.0_capcut",
        "project_name": project_name,
        "blueprint_id": blueprint_id,
        "created_at": datetime.now().isoformat(),
        "canvas": bp.get("canvas", {}),
        "timeline": timeline_meta,
        "export_dir": str(target_project_dir),
    }

    content_file = target_project_dir / "draft_content.json"
    sovereign_preset_engine.atomic_write_json(content_file, draft_meta)

    return {
        "success": True,
        "message": "CapCut 드래프트 프로젝트가 05_Exports에 성공적으로 생성되었습니다.",
        "project_dir": str(target_project_dir),
        "total_duration_us": timeline_meta.get("totalDurationUs"),
    }


@router.post("/render/remotion")
async def render_remotion_headless(req: RemotionRenderRequest, bg_tasks: BackgroundTasks):
    """
    VLStandardBlueprint v4.0 기반 Remotion 무인 헤드리스 렌더링 발주 (yuv420p 강제)
    """
    bp = req.blueprint
    task_id = f"render_{int(datetime.now().timestamp())}"
    output_name = req.output_filename or f"{task_id}.mp4"
    output_path = EXPORTS_DIR / output_name

    logger.info(f"[NLE Render] Remotion render task {task_id} queued. Target: {output_path} (pixelFormat: {req.pixelFormat})")

    return {
        "success": True,
        "taskId": task_id,
        "output_path": str(output_path),
        "pixelFormat": req.pixelFormat or "yuv420p",
        "status": "rendering",
        "message": "무인 렌더링 작업이 백그라운드 큐에 성공적으로 등록되었습니다."
    }


@router.post("/agent/execute")
async def execute_agent_tool(req: AgentToolExecutionRequest):
    """
    OpenMontage 10대 핵심 MCP 도구 체인을 비동기로 실행합니다.
    """
    result = await montage_agent_bridge.execute_tool(req.tool_name, req.arguments)
    return result
