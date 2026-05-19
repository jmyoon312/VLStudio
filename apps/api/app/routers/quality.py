from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

from app.database import get_db
from app import models
from app.llm_manager import LLMClient
from app.services.quality_auditor import QualityAuditor, get_quality_auditor
from app.config import settings

router = APIRouter(prefix="/api/quality", tags=["Quality Audit"])


class ScriptQualityRequest(BaseModel):
    """Request model for script quality verification"""
    script: str = Field(..., description="Script content to verify")
    dna: str = Field(..., description="Channel DNA/brand guidelines")
    niche: Optional[str] = Field(None, description="Channel niche")
    channel_id: Optional[int] = Field(None, description="Channel ID")


class VideoQualityRequest(BaseModel):
    """Request model for video quality verification"""
    video_path: str = Field(..., description="Path to video file")
    script: str = Field(..., description="Script used for video")
    dna: str = Field(..., description="Channel DNA/brand guidelines")
    niche: Optional[str] = Field(None, description="Channel niche")


class QualityScoreResponse(BaseModel):
    """Response model for quality verification"""
    success: bool
    score: float
    passed: bool
    needs_review: bool
    needs_human_review: bool
    status: str  # APPROVED, REVIEW, REJECTED
    details: Dict[str, float]
    feedback: List[str]
    metadata: Optional[Dict[str, Any]] = None


@router.post("/verify-script", response_model=QualityScoreResponse)
async def verify_script_quality(
    request: ScriptQualityRequest,
    db: Session = Depends(get_db)
):
    """
    Verify script quality (Phase 7)
    
    Returns quality score (0-100) with detailed breakdown:
    - structure_score: Script structure analysis (0-100)
    - dna_score: DNA alignment check (0-100)  
    - keyword_score: Keyword presence check (0-100)
    - engagement_score: Engagement potential assessment (0-100)
    
    Status logic:
    - APPROVED: score >= 70
    - REVIEW: 50 <= score < 70
    - REJECTED: score < 50
    """
    try:
        # Get LLM client
        llm_client = LLMClient(settings)
        
        # Create auditor
        auditor = QualityAuditor(llm_client)
        
        # Run verification
        result = await auditor.verify_script(
            script=request.script,
            dna=request.dna,
            niche=request.niche,
            channel_id=request.channel_id
        )
        
        return QualityScoreResponse(
            success=True,
            **result
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Quality verification failed: {str(e)}")


@router.post("/verify-video", response_model=QualityScoreResponse)
async def verify_video_quality(
    request: VideoQualityRequest,
    db: Session = Depends(get_db)
):
    """
    Verify video quality
    
    Note: Currently based on script verification.
    Future enhancement will include actual video analysis.
    """
    try:
        llm_client = LLMClient(settings)
        auditor = QualityAuditor(llm_client)
        
        result = await auditor.verify_video(
            video_path=request.video_path,
            script=request.script,
            dna=request.dna,
            niche=request.niche
        )
        
        return QualityScoreResponse(
            success=True,
            **result
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Video quality verification failed: {str(e)}")


@router.get("/status/{mission_id}")
async def get_quality_status(
    mission_id: str,
    db: Session = Depends(get_db)
):
    """
    Get quality verification status for a mission
    """
    try:
        # Look up mission
        session = db.query(models.AgentSwarmSession).filter(
            models.AgentSwarmSession.id == mission_id
        ).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Mission not found")
        
        # Get quality score from config
        config = session.config_json or {}
        quality_info = config.get('quality_info', {})
        
        return {
            "mission_id": mission_id,
            "status": session.status,
            "quality_score": quality_info.get('score'),
            "quality_status": quality_info.get('status'),
            "last_verified": quality_info.get('verified_at')
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/batch-verify")
async def batch_verify_quality(
    scripts: List[ScriptQualityRequest],
    db: Session = Depends(get_db)
):
    """
    Batch verify multiple scripts
    
    Useful for comparing multiple script variants
    """
    results = []
    
    try:
        llm_client = LLMClient(settings)
        auditor = QualityAuditor(llm_client)
        
        for i, req in enumerate(scripts):
            try:
                result = await auditor.verify_script(
                    script=req.script,
                    dna=req.dna,
                    niche=req.niche,
                    channel_id=req.channel_id
                )
                results.append({
                    "index": i,
                    "success": True,
                    **result
                })
            except Exception as e:
                results.append({
                    "index": i,
                    "success": False,
                    "error": str(e)
                })
        
        return {
            "total": len(scripts),
            "successful": sum(1 for r in results if r.get('success', False)),
            "results": results
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch verification failed: {str(e)}")


# Health check endpoint
@router.get("/health")
async def quality_health():
    """Quality audit service health check"""
    return {
        "service": "quality_auditor",
        "status": "healthy",
        "features": [
            "script_verification",
            "video_verification", 
            "batch_verification",
            "dna_alignment",
            "engagement_assessment"
        ]
    }