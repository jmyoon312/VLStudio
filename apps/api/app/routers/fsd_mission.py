"""
ViraLoop Studio: FSD Mission API Router
Endpoints for Autonomous Production Missions (Loopy Mission Control).
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
from pydantic import BaseModel

from app.database import get_db
from app.services.fsd_mission_runner import FSDMissionRunner

router = APIRouter(prefix="/fsd-mission", tags=["fsd-mission"])

class MissionStartRequest(BaseModel):
    goal: str
    category_id: Optional[int] = None
    fsd_level: Optional[int] = 3

@router.get("/status")
@router.get("/status/", include_in_schema=False)
def get_mission_status():
    """Get current active FSD mission status, progress, and logs"""
    return FSDMissionRunner.get_status()

@router.post("/start")
@router.post("/start/", include_in_schema=False)
async def start_mission(req: MissionStartRequest, db: Session = Depends(get_db)):
    """Start an autonomous video production mission"""
    return await FSDMissionRunner.start_mission(
        db=db,
        goal=req.goal,
        category_id=req.category_id,
        fsd_level=req.fsd_level or 3
    )

@router.post("/approve")
@router.post("/approve/", include_in_schema=False)
async def approve_stage(db: Session = Depends(get_db)):
    """1-Click Approve current stage (e.g. script) and continue unmanned production"""
    return await FSDMissionRunner.approve_and_continue(db)

@router.post("/stop")
@router.post("/stop/", include_in_schema=False)
def stop_mission():
    """Emergency stop / intervene on autonomous mission"""
    return FSDMissionRunner.stop_mission()
