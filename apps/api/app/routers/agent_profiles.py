"""
Agent Profiles API Router
8대 전문 하수인 조회, SOUL.md 튜닝 및 모델 설정 제어 API
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List

from app.services.agent_soul_service import agent_soul_service

router = APIRouter(prefix="/api/agent-profiles", tags=["agent_profiles"])


class UpdateSoulRequest(BaseModel):
    soul_content: str
    provider: Optional[str] = None
    model: Optional[str] = None


@router.get("")
def list_agent_profiles():
    """8대 전문 하수인 목록 및 프로필 조회"""
    try:
        items = agent_soul_service.list_agents()
        return {"success": True, "items": items}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{agent_id}/soul")
def get_agent_soul(agent_id: str):
    """특정 에이전트의 SOUL.md 및 설정 조회"""
    try:
        data = agent_soul_service.get_agent_soul(agent_id)
        return {"success": True, "data": data}
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{agent_id}/soul")
def update_agent_soul(agent_id: str, req: UpdateSoulRequest):
    """사용자가 튜닝한 에이전트 SOUL.md 및 모델 설정 저장"""
    try:
        data = agent_soul_service.update_agent_soul(
            agent_id=agent_id,
            soul_content=req.soul_content,
            provider=req.provider,
            model=req.model
        )
        return {
            "success": True,
            "message": f"@{data['name']} 에이전트의 SOUL.md 설정이 성공적으로 업데이트되었습니다.",
            "data": data
        }
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{agent_id}/reset")
def reset_agent_soul(agent_id: str):
    """에이전트 SOUL.md 기본값 초기화"""
    try:
        data = agent_soul_service.reset_agent_soul(agent_id)
        return {
            "success": True,
            "message": f"@{data['name']} 에이전트의 SOUL.md가 공장 초기화되었습니다.",
            "data": data
        }
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
