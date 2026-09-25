"""
Director Sessions & Project Folders Router for ViraLoop Studio.
Sovereign storage in viral_loop.db:
- director_projects (Project folders)
- director_threads (Independent conversation sessions)
- director_messages (Message history, steps, deliverables, and attachments)
"""

import uuid
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app import models

logger = logging.getLogger("director_sessions")

router = APIRouter(prefix="/director", tags=["director_sessions"])


class ProjectCreate(BaseModel):
    name: str
    color: Optional[str] = "emerald"
    icon: Optional[str] = "folder"


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None


class ThreadCreate(BaseModel):
    project_id: Optional[str] = None
    title: Optional[str] = "새 대화"
    preset_id: Optional[str] = None
    provider: Optional[str] = "openai"
    model: Optional[str] = "GPT-6 Astra"
    reasoning_effort: Optional[str] = "medium"


class ThreadUpdate(BaseModel):
    title: Optional[str] = None
    preset_id: Optional[str] = None
    provider: Optional[str] = None
    model: Optional[str] = None
    reasoning_effort: Optional[str] = None
    project_id: Optional[str] = None


class MessageCreate(BaseModel):
    role: str
    content: Optional[str] = ""
    steps: Optional[List[Dict[str, Any]]] = None
    deliverable: Optional[Dict[str, Any]] = None
    created_preset: Optional[Dict[str, Any]] = None
    attachments: Optional[List[Dict[str, Any]]] = None
    tasks: Optional[List[Dict[str, Any]]] = None


def _ensure_default_project(db: Session) -> models.DirectorProject:
    """Ensure at least one default project folder exists."""
    default_proj = db.query(models.DirectorProject).filter_by(id="proj_default").first()
    if not default_proj:
        default_proj = models.DirectorProject(
            id="proj_default",
            name="기본 프로젝트",
            color="emerald",
            icon="folder",
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        db.add(default_proj)
        db.commit()
        db.refresh(default_proj)
    return default_proj


@router.get("/projects")
def list_projects(db: Session = Depends(get_db)):
    """List all project folders with thread counts."""
    _ensure_default_project(db)
    projects = db.query(models.DirectorProject).order_by(models.DirectorProject.created_at.asc()).all()
    results = []
    for p in projects:
        thread_count = db.query(models.DirectorThread).filter_by(project_id=p.id).count()
        results.append({
            "id": p.id,
            "name": p.name,
            "color": p.color or "emerald",
            "icon": p.icon or "folder",
            "thread_count": thread_count,
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "updated_at": p.updated_at.isoformat() if p.updated_at else None,
        })
    return results


@router.post("/projects")
def create_project(data: ProjectCreate, db: Session = Depends(get_db)):
    """Create a new project folder."""
    proj_id = f"proj_{uuid.uuid4().hex[:8]}"
    proj = models.DirectorProject(
        id=proj_id,
        name=data.name.strip() or "새 프로젝트",
        color=data.color or "emerald",
        icon=data.icon or "folder",
        created_at=datetime.now(),
        updated_at=datetime.now()
    )
    db.add(proj)
    db.commit()
    db.refresh(proj)
    return {"status": "success", "project": {
        "id": proj.id,
        "name": proj.name,
        "color": proj.color,
        "icon": proj.icon,
        "thread_count": 0
    }}


@router.put("/projects/{project_id}")
def update_project(project_id: str, data: ProjectUpdate, db: Session = Depends(get_db)):
    """Update project folder name or color."""
    proj = db.query(models.DirectorProject).filter_by(id=project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    if data.name is not None:
        proj.name = data.name.strip()
    if data.color is not None:
        proj.color = data.color
    proj.updated_at = datetime.now()
    db.commit()
    db.refresh(proj)
    return {"status": "success", "project": {"id": proj.id, "name": proj.name, "color": proj.color}}


@router.delete("/projects/{project_id}")
def delete_project(project_id: str, db: Session = Depends(get_db)):
    """Delete a project folder and all child threads."""
    if project_id == "proj_default":
        raise HTTPException(status_code=400, detail="Cannot delete default project")
    proj = db.query(models.DirectorProject).filter_by(id=project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(proj)
    db.commit()
    return {"status": "success", "deleted_id": project_id}


@router.get("/threads")
def list_threads(project_id: Optional[str] = None, db: Session = Depends(get_db)):
    """List conversation threads, optionally filtered by project_id."""
    query = db.query(models.DirectorThread)
    if project_id:
        query = query.filter_by(project_id=project_id)
    threads = query.order_by(models.DirectorThread.updated_at.desc()).all()
    results = []
    for t in threads:
        msg_count = db.query(models.DirectorMessage).filter_by(thread_id=t.id).count()
        last_msg = db.query(models.DirectorMessage).filter_by(thread_id=t.id).order_by(models.DirectorMessage.created_at.desc()).first()
        results.append({
            "id": t.id,
            "project_id": t.project_id,
            "title": t.title,
            "preset_id": t.preset_id,
            "provider": t.provider,
            "model": t.model,
            "reasoning_effort": t.reasoning_effort,
            "message_count": msg_count,
            "snippet": last_msg.content[:60] if last_msg and last_msg.content else None,
            "created_at": t.created_at.isoformat() if t.created_at else None,
            "updated_at": t.updated_at.isoformat() if t.updated_at else None,
        })
    return results


@router.post("/threads")
def create_thread(data: ThreadCreate, db: Session = Depends(get_db)):
    """Create a new independent conversation session."""
    default_proj = _ensure_default_project(db)
    target_proj_id = data.project_id or default_proj.id
    thread_id = f"th_{uuid.uuid4().hex[:10]}"

    th = models.DirectorThread(
        id=thread_id,
        project_id=target_proj_id,
        title=data.title or "새 대화",
        preset_id=data.preset_id,
        provider=data.provider or "openai",
        model=data.model or "GPT-6 Astra",
        reasoning_effort=data.reasoning_effort or "medium",
        created_at=datetime.now(),
        updated_at=datetime.now()
    )
    db.add(th)
    db.commit()
    db.refresh(th)
    return {"status": "success", "thread": {
        "id": th.id,
        "project_id": th.project_id,
        "title": th.title,
        "preset_id": th.preset_id,
        "provider": th.provider,
        "model": th.model,
        "reasoning_effort": th.reasoning_effort,
        "message_count": 0
    }}


@router.put("/threads/{thread_id}")
def update_thread(thread_id: str, data: ThreadUpdate, db: Session = Depends(get_db)):
    """Update conversation thread properties."""
    th = db.query(models.DirectorThread).filter_by(id=thread_id).first()
    if not th:
        raise HTTPException(status_code=404, detail="Thread not found")
    if data.title is not None:
        th.title = data.title.strip()
    if data.preset_id is not None:
        th.preset_id = data.preset_id
    if data.provider is not None:
        th.provider = data.provider
    if data.model is not None:
        th.model = data.model
    if data.reasoning_effort is not None:
        th.reasoning_effort = data.reasoning_effort
    if data.project_id is not None:
        th.project_id = data.project_id
    th.updated_at = datetime.now()
    db.commit()
    db.refresh(th)
    return {"status": "success", "thread": {"id": th.id, "title": th.title, "preset_id": th.preset_id}}


@router.delete("/threads/{thread_id}")
def delete_thread(thread_id: str, db: Session = Depends(get_db)):
    """Delete a conversation thread and its messages."""
    th = db.query(models.DirectorThread).filter_by(id=thread_id).first()
    if not th:
        raise HTTPException(status_code=404, detail="Thread not found")
    db.delete(th)
    db.commit()
    return {"status": "success", "deleted_id": thread_id}


@router.get("/threads/{thread_id}/messages")
def get_thread_messages(thread_id: str, db: Session = Depends(get_db)):
    """Fetch complete message history for a conversation thread."""
    th = db.query(models.DirectorThread).filter_by(id=thread_id).first()
    if not th:
        raise HTTPException(status_code=404, detail="Thread not found")
    messages = db.query(models.DirectorMessage).filter_by(thread_id=thread_id).order_by(models.DirectorMessage.created_at.asc()).all()
    results = []
    for m in messages:
        results.append({
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "steps": m.steps,
            "deliverable": m.deliverable,
            "created_preset": m.created_preset,
            "attachments": m.attachments or [],
            "tasks": m.tasks or [],
            "timestamp": int(m.created_at.timestamp() * 1000) if m.created_at else None
        })
    return {"thread": {
        "id": th.id,
        "title": th.title,
        "project_id": th.project_id,
        "preset_id": th.preset_id,
        "provider": th.provider,
        "model": th.model,
        "reasoning_effort": th.reasoning_effort
    }, "messages": results}


@router.post("/threads/{thread_id}/messages")
def save_thread_message(thread_id: str, data: MessageCreate, db: Session = Depends(get_db)):
    """Persist a message into the conversation thread."""
    th = db.query(models.DirectorThread).filter_by(id=thread_id).first()
    if not th:
        raise HTTPException(status_code=404, detail="Thread not found")

    msg_id = f"msg_{uuid.uuid4().hex[:12]}"
    msg = models.DirectorMessage(
        id=msg_id,
        thread_id=thread_id,
        role=data.role,
        content=data.content or "",
        steps=data.steps,
        deliverable=data.deliverable,
        created_preset=data.created_preset,
        attachments=data.attachments or [],
        tasks=data.tasks or [],
        created_at=datetime.now()
    )
    db.add(msg)
    
    # Auto-update thread title from first user message if title is still default
    if data.role == "user" and th.title in ["새 대화", "새 채팅"] and data.content:
        clean_title = data.content.strip().replace("\n", " ")[:30]
        if clean_title:
            th.title = clean_title

    th.updated_at = datetime.now()
    db.commit()
    db.refresh(msg)
    return {"status": "success", "message_id": msg.id}
