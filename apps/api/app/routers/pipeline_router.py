from fastapi import APIRouter, HTTPException, Body
from typing import Dict, Any, List, Optional
from ..services.pipeline_engine import pipeline_engine
from ..agent.memory_store import memory_store

router = APIRouter(tags=["pipelines_and_memory"])

# --- Pipeline Endpoints ---

@router.get("/api/pipelines/")
def list_pipelines():
    return pipeline_engine.list_pipelines()

@router.get("/api/pipelines/{pipeline_id}")
def get_pipeline(pipeline_id: str):
    p = pipeline_engine.get_pipeline(pipeline_id)
    if not p:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    return p

@router.post("/api/pipelines/")
def create_or_save_pipeline(pipeline_data: Dict[str, Any] = Body(...)):
    return pipeline_engine.save_pipeline(pipeline_data)

@router.delete("/api/pipelines/{pipeline_id}")
def delete_pipeline(pipeline_id: str):
    success = pipeline_engine.delete_pipeline(pipeline_id)
    if not success:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    return {"success": True, "message": "파이프라인이 삭제되었습니다."}

@router.post("/api/pipelines/{pipeline_id}/run")
def run_pipeline(pipeline_id: str, payload: Dict[str, Any] = Body(default={})):
    try:
        return pipeline_engine.run_pipeline(pipeline_id, payload)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# --- Studio Memory & Skills Endpoints ---

@router.get("/api/agent/memory")
def get_studio_memory():
    return {
        "soul": memory_store.get_soul(),
        "memory": memory_store.get_memory(),
        "skills": memory_store.list_skills()
    }

@router.put("/api/agent/memory/soul")
def update_soul(payload: Dict[str, str] = Body(...)):
    content = payload.get("content", "")
    memory_store.save_soul(content)
    return {"success": True, "message": "스튜디오 정체성(soul.md)이 업데이트되었습니다."}

@router.post("/api/agent/memory/learn")
def append_learning(payload: Dict[str, str] = Body(...)):
    note = payload.get("note", "")
    if note:
        memory_store.append_memory(note)
    return {"success": True, "message": "새로운 제작 노하우가 장기 기억(memory.md)에 축적되었습니다."}

@router.get("/api/agent/memory/skills")
def list_skills():
    return memory_store.list_skills()

@router.post("/api/agent/memory/skills")
def save_skill(payload: Dict[str, str] = Body(...)):
    name = payload.get("name", "").strip()
    content = payload.get("content", "")
    if not name:
        raise HTTPException(status_code=400, detail="Skill name is required")
    memory_store.save_skill(name, content)
    return {"success": True, "message": f"스킬 '{name}'이 저장되었습니다."}
