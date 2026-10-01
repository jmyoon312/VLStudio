"""
Shorts Templates Router for ViraLoop Studio.
Handles CRUD operations for ShortsTemplate and VLStandardBlueprint v4.0 in viral_loop.db.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel

from ..database import get_db
from ..models import ShortsTemplate
from ..services.sovereign_preset_engine import sovereign_preset_engine

router = APIRouter(prefix="/api/shorts-templates", tags=["shorts-templates"])


class ShortsTemplateCreateRequest(BaseModel):
    id: Optional[str] = None
    name: str
    badge: Optional[str] = "커스텀"
    description: Optional[str] = None
    archetype: Optional[str] = "classic"
    aspect_ratio: Optional[str] = "9:16"
    is_system: Optional[bool] = False
    channel_id: Optional[int] = None
    layout: Optional[Any] = None
    manifest: Optional[Any] = None
    blueprint_v4: Optional[Any] = None


class ShortsTemplateUpdateRequest(BaseModel):
    name: Optional[str] = None
    badge: Optional[str] = None
    description: Optional[str] = None
    archetype: Optional[str] = None
    aspect_ratio: Optional[str] = None
    layout: Optional[Any] = None
    manifest: Optional[Any] = None
    blueprint_v4: Optional[Any] = None


@router.get("")
def list_shorts_templates(
    archetype: Optional[str] = Query(None),
    aspect_ratio: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """템플릿 목록 조회 (v4.0 청사진 포함)"""
    query = db.query(ShortsTemplate)
    if archetype:
        query = query.filter(ShortsTemplate.archetype == archetype)
    if aspect_ratio:
        query = query.filter(ShortsTemplate.aspect_ratio == aspect_ratio)
    
    templates = query.order_by(ShortsTemplate.updated_at.desc()).all()
    return [
        {
            "id": t.id,
            "name": t.name,
            "badge": t.badge,
            "description": t.description,
            "archetype": t.archetype,
            "aspect_ratio": t.aspect_ratio,
            "is_system": t.is_system,
            "channel_id": t.channel_id,
            "layout": t.layout,
            "manifest": t.manifest,
            "blueprint_v4": t.blueprint_v4,
            "created_at": t.created_at.isoformat() if t.created_at else None,
            "updated_at": t.updated_at.isoformat() if t.updated_at else None,
        }
        for t in templates
    ]


@router.get("/{template_id}")
def get_shorts_template(template_id: str, db: Session = Depends(get_db)):
    """단일 템플릿 상세 조회 (v4.0 마스터 청사진 반환)"""
    tmpl = db.query(ShortsTemplate).filter(ShortsTemplate.id == template_id).first()
    if not tmpl:
        # Check disk fallback
        disk_data = sovereign_preset_engine.load_blueprint_v4(template_id)
        if disk_data:
            return {"id": template_id, "blueprint_v4": disk_data}
        raise HTTPException(status_code=404, detail="템플릿을 찾을 수 없습니다.")

    return {
        "id": tmpl.id,
        "name": tmpl.name,
        "badge": tmpl.badge,
        "description": tmpl.description,
        "archetype": tmpl.archetype,
        "aspect_ratio": tmpl.aspect_ratio,
        "is_system": tmpl.is_system,
        "channel_id": tmpl.channel_id,
        "layout": tmpl.layout,
        "manifest": tmpl.manifest,
        "blueprint_v4": tmpl.blueprint_v4,
        "created_at": tmpl.created_at.isoformat() if tmpl.created_at else None,
        "updated_at": tmpl.updated_at.isoformat() if tmpl.updated_at else None,
    }


@router.post("")
def save_shorts_template(req: ShortsTemplateCreateRequest, db: Session = Depends(get_db)):
    """템플릿 신규 저장 또는 갱신 (viral_loop.db + 원자적 디스크 동기화)"""
    tmpl_id = req.id or f"tmpl_{int(datetime.now().timestamp())}"

    existing = db.query(ShortsTemplate).filter(ShortsTemplate.id == tmpl_id).first()
    if existing:
        existing.name = req.name
        if req.badge: existing.badge = req.badge
        if req.description: existing.description = req.description
        if req.archetype: existing.archetype = req.archetype
        if req.aspect_ratio: existing.aspect_ratio = req.aspect_ratio
        if req.layout is not None: existing.layout = req.layout
        if req.manifest is not None: existing.manifest = req.manifest
        if req.blueprint_v4 is not None: existing.blueprint_v4 = req.blueprint_v4
        existing.updated_at = datetime.now()
    else:
        existing = ShortsTemplate(
            id=tmpl_id,
            name=req.name,
            badge=req.badge or "커스텀",
            description=req.description,
            archetype=req.archetype or "classic",
            aspect_ratio=req.aspect_ratio or "9:16",
            is_system=req.is_system or False,
            channel_id=req.channel_id,
            layout=req.layout or [],
            manifest=req.manifest,
            blueprint_v4=req.blueprint_v4,
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        db.add(existing)

    db.commit()
    db.refresh(existing)

    # If blueprint_v4 is provided, also atomically save to disk for headless Remotion
    if req.blueprint_v4:
        sovereign_preset_engine.save_blueprint_v4(tmpl_id, req.blueprint_v4)

    # Synchronize sovereign preset JSON to 03_Assets/presets so PresetLoadModal immediately displays it
    try:
        import os, json
        from pathlib import Path
        local_appdata = os.environ.get("LOCALAPPDATA", str(Path.home() / "AppData" / "Local"))
        presets_dir = Path(local_appdata) / "ViraLoop Studio" / "media" / "03_Assets" / "presets"
        presets_dir.mkdir(parents=True, exist_ok=True)
        preset_file = presets_dir / f"{tmpl_id}.json"
        preset_data = {
            "id": tmpl_id,
            "name": req.name,
            "category": req.badge or "custom",
            "category_tab": "personal",
            "source": "viraloop_user",
            "archetype": req.archetype or "classic",
            "aspect_ratio": req.aspect_ratio or "9:16",
            "blueprint_v4": req.blueprint_v4,
            "blueprint": req.blueprint_v4 or {},
            "style": req.blueprint_v4 or {},
            "layout": req.layout or {},
            "recipe": req.description or f"{req.archetype or 'classic'} 커스텀 프리셋",
            "content_rules": [
                f"폼팩터 아키타입: {req.archetype or 'classic'}",
                f"종횡비 규격: {req.aspect_ratio or '9:16'}"
            ],
            "updated_at": datetime.now().isoformat()
        }
        with open(preset_file, "w", encoding="utf-8") as f:
            json.dump(preset_data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"[shorts_templates] Failed to sync preset file: {e}")

    return {
        "success": True,
        "id": existing.id,
        "name": existing.name,
        "blueprint_v4": existing.blueprint_v4,
        "message": "템플릿이 성공적으로 저장되었습니다."
    }


@router.delete("/{template_id}")
def delete_shorts_template(template_id: str, db: Session = Depends(get_db)):
    """템플릿 삭제 (DB + 디스크 동기화)"""
    tmpl = db.query(ShortsTemplate).filter(ShortsTemplate.id == template_id).first()
    if not tmpl:
        raise HTTPException(status_code=404, detail="템플릿을 찾을 수 없습니다.")

    db.delete(tmpl)
    db.commit()

    # Clean up disk files if exist
    try:
        import os
        from pathlib import Path
        local_appdata = os.environ.get("LOCALAPPDATA", str(Path.home() / "AppData" / "Local"))
        presets_dir = Path(local_appdata) / "ViraLoop Studio" / "media" / "03_Assets" / "presets"
        for candidate in [presets_dir / f"{template_id}.json", presets_dir / f"{template_id}.blueprint_v4.json"]:
            if candidate.exists():
                candidate.unlink()
    except Exception as e:
        print(f"[shorts_templates] Failed to delete disk preset file: {e}")

    return {"success": True, "deleted_id": template_id}
