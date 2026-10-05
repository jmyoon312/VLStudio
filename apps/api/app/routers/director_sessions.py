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
    id: Optional[str] = None
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
    is_pinned: Optional[bool] = None
    is_archived: Optional[bool] = None


class MessageCreate(BaseModel):
    id: Optional[str] = None
    role: str
    content: Optional[str] = ""
    steps: Optional[List[Dict[str, Any]]] = None
    deliverable: Optional[Dict[str, Any]] = None
    created_preset: Optional[Dict[str, Any]] = None
    attachments: Optional[List[Dict[str, Any]]] = None
    tasks: Optional[List[Dict[str, Any]]] = None
    action_chips: Optional[List[str]] = None
    created_at: Optional[datetime] = None


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
            "is_pinned": bool(getattr(t, "is_pinned", False)),
            "is_archived": bool(getattr(t, "is_archived", False)),
            "message_count": msg_count,
            "snippet": last_msg.content[:60] if last_msg and last_msg.content else None,
            "created_at": t.created_at.isoformat() if t.created_at else None,
            "updated_at": t.updated_at.isoformat() if t.updated_at else None,
        })
    return results


@router.post("/threads")
def create_thread(data: ThreadCreate, db: Session = Depends(get_db)):
    """Create or register an independent conversation session."""
    default_proj = _ensure_default_project(db)
    target_proj_id = data.project_id or default_proj.id
    thread_id = data.id or f"th_{uuid.uuid4().hex[:10]}"

    existing_th = db.query(models.DirectorThread).filter_by(id=thread_id).first()
    if existing_th:
        if data.title and data.title != "새 대화":
            existing_th.title = data.title
        if data.model:
            existing_th.model = data.model
        if data.provider:
            existing_th.provider = data.provider
        existing_th.updated_at = datetime.now()
        db.commit()
        db.refresh(existing_th)
        th = existing_th
    else:
        th = models.DirectorThread(
            id=thread_id,
            project_id=target_proj_id,
            title=data.title or "새 대화",
            preset_id=data.preset_id,
            provider=data.provider or "openai",
            model=data.model or "GPT-6 Astra",
            reasoning_effort=data.reasoning_effort or "medium",
            is_pinned=False,
            is_archived=False,
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
        "is_pinned": False,
        "is_archived": False,
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
    if data.is_pinned is not None:
        th.is_pinned = data.is_pinned
    if data.is_archived is not None:
        th.is_archived = data.is_archived
    th.updated_at = datetime.now()
    db.commit()
    db.refresh(th)
    return {"status": "success", "thread": {
        "id": th.id,
        "title": th.title,
        "preset_id": th.preset_id,
        "project_id": th.project_id,
        "provider": th.provider,
        "model": th.model,
        "reasoning_effort": th.reasoning_effort,
        "is_pinned": th.is_pinned,
        "is_archived": th.is_archived
    }}


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
        return {"thread": {"id": thread_id, "title": "새 대화"}, "messages": []}
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
            "action_chips": m.action_chips or [],
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
    """Persist a message into the conversation thread (self-healing thread creation & upsert)."""
    th = db.query(models.DirectorThread).filter_by(id=thread_id).first()
    if not th:
        default_proj = _ensure_default_project(db)
        th = models.DirectorThread(
            id=thread_id,
            project_id=default_proj.id,
            title="새 대화",
            provider="openai",
            model="GPT-6 Astra",
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        db.add(th)
        db.commit()
        db.refresh(th)

    msg_id = data.id or f"msg_{uuid.uuid4().hex[:12]}"
    existing_msg = db.query(models.DirectorMessage).filter_by(id=msg_id).first()
    if existing_msg:
        existing_msg.content = data.content or ""
        if data.steps is not None:
            existing_msg.steps = data.steps
        if data.deliverable is not None:
            existing_msg.deliverable = data.deliverable
        if data.created_preset is not None:
            existing_msg.created_preset = data.created_preset
        if data.attachments is not None:
            existing_msg.attachments = data.attachments
        if data.tasks is not None:
            existing_msg.tasks = data.tasks
        if data.action_chips is not None:
            existing_msg.action_chips = data.action_chips
        msg = existing_msg
    else:
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
            action_chips=data.action_chips or [],
            created_at=data.created_at or datetime.now()
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
