"""
작업 대기열 API 엔드포인트
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import os
import asyncio
import json
import logging
import redis.asyncio as aioredis

from app.database import get_db
from app import models
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(tags=["work_queue"])


# === Pydantic Schemas ===

class WorkQueueItemCreate(BaseModel):
    title: str
    description: Optional[str] = None
    hashtags: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    video_file_path: str
    source_type: Optional[str] = "MANUAL"
    approval_required: bool = False
    upload_method: Optional[str] = "API"
    target_platforms: Optional[List[str]] = ["youtube"]
    upload_method: Optional[str] = "API"
    target_platforms: Optional[List[str]] = ["youtube"]
    platform_configs: Optional[dict] = None
    scheduled_upload_time: Optional[datetime] = None  # [NEW] Scheduled Upload


class WorkQueueItemUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    hashtags: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    approval_status: Optional[str] = None
    upload_method: Optional[str] = None
    target_platforms: Optional[List[str]] = None
    platform_configs: Optional[dict] = None
    target_platforms: Optional[List[str]] = None
    platform_configs: Optional[dict] = None
    status: Optional[str] = None
    scheduled_upload_time: Optional[datetime] = None  # [NEW]


class WorkQueueItemResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    hashtags: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    video_file_path: str
    # Source & Quality
    source_type: Optional[str] = None
    approval_required: bool
    approval_status: str
    rejection_reason: Optional[str] = None
    # Upload Config
    upload_method: Optional[str] = None
    target_platforms: Optional[List[str]] = None
    target_platforms: Optional[List[str]] = None
    platform_configs: Optional[dict] = None
    upload_priority: int
    scheduled_upload_time: Optional[datetime] = None  # [NEW]
    # Status
    status: str
    upload_progress: int
    uploaded_urls: Optional[dict] = None
    failure_reason: Optional[str] = None
    # Timestamps
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class BatchApproveRequest(BaseModel):
    item_ids: List[int]
    approved_by: str = "system"


class BatchRejectRequest(BaseModel):
    item_ids: List[int]
    reason: str


class BatchDeleteRequest(BaseModel):
    item_ids: List[int]


class PriorityUpdateRequest(BaseModel):
    item_id: int
    priority: int


class BatchResetRequest(BaseModel):
    item_ids: List[int]


class ExpertApprovalRequest(BaseModel):
    script: Optional[str] = None
    instructions: Optional[str] = None
    update_master_identity: bool = False
    approved_by: str = "expert"

# === API Endpoints ===

@router.get("/items", response_model=List[WorkQueueItemResponse])
def get_queue_items(
    status: Optional[str] = None,
    approval_status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """작업 대기열 목록 조회"""
    query = db.query(models.WorkQueueItem)
    
    if status:
        query = query.filter(models.WorkQueueItem.status == status)
    
    if approval_status:
        query = query.filter(models.WorkQueueItem.approval_status == approval_status)
    
    items = query.order_by(
        models.WorkQueueItem.upload_priority.desc(),
        models.WorkQueueItem.created_at.desc()
    ).offset(skip).limit(limit).all()
    
    return items


# ... imports ...
from app.services.native_queue_worker import native_worker

# ... (get_queue_items remains same)

@router.post("/items", response_model=WorkQueueItemResponse)
def create_queue_item(
    item_data: WorkQueueItemCreate,
    db: Session = Depends(get_db)
):
    """작업 대기열에 항목 추가 (Auto-Approve 지원)"""
    
    # 파일 존재 확인
    if not os.path.exists(item_data.video_file_path):
        raise HTTPException(404, f"Video file not found: {item_data.video_file_path}")
    
    # Determine initial status based on approval_required
    initial_status = "QUEUED"
    if item_data.scheduled_upload_time and item_data.scheduled_upload_time > datetime.now():
        initial_status = "SCHEDULED_UPLOAD"
        logger.info(f"📅 Item scheduled for {item_data.scheduled_upload_time}")
    
    if item_data.approval_required:
        initial_approval = "PENDING"
    else:
        # Auto-Approve
        initial_approval = "AUTO_APPROVED"
    
    # WorkQueueItem 생성
    queue_item = models.WorkQueueItem(
        title=item_data.title,
        description=item_data.description,
        hashtags=item_data.hashtags,
        tags=item_data.tags,
        video_file_path=item_data.video_file_path,
        source_type=item_data.source_type,
        approval_required=item_data.approval_required,
        approval_status=initial_approval,
        # Upload Config
        upload_method=item_data.upload_method,
        target_platforms=item_data.target_platforms,
        platform_configs=item_data.platform_configs or {},
        scheduled_upload_time=item_data.scheduled_upload_time, # [NEW]
        # Initial State
        status=initial_status,
        upload_progress=0,
        created_at=datetime.now()
    )
    
    db.add(queue_item)
    db.flush()  # ID 생성을 위해 flush
    
    # 규칙 엔진 적용
    from app.services.rule_engine import RuleEngine
    rule_engine = RuleEngine(db)
    
    actions = rule_engine.evaluate_rules(queue_item)
    if actions:
        logger.info(f"Applying rule actions to item {queue_item.id}: {actions}")
        rule_engine.apply_actions(queue_item, actions)
        
        # 승인 상태 재평가 (규칙 엔진이 변경했을 수 있음)
        # 하지만 Auto-Approve 로직이 우선이라면? 사용자가 명시적으로 체크해제했으면 승인됨.
        if not item_data.approval_required:
             if queue_item.approval_status != "REJECTED":
                 queue_item.approval_status = "AUTO_APPROVED"

    db.commit()
    db.refresh(queue_item)
    
    # [Auto-Upload Trigger]
    # Only trigger if Auto-Approved AND NOT Scheduled
    if queue_item.approval_status == "AUTO_APPROVED" and queue_item.status == "QUEUED":
        logger.info(f"🚀 Auto-Approved item {queue_item.id}. Queuing for upload...")
        native_worker.add_task(queue_item.id)
    
    return queue_item


@router.get("/items/{item_id}")
def get_queue_item(item_id: int, db: Session = Depends(get_db)):
    """작업 대기열 항목 상세 조회"""
    item = db.query(models.WorkQueueItem).filter(models.WorkQueueItem.id == item_id).first()
    if not item:
        raise HTTPException(404, "Queue item not found")
    return item


@router.patch("/items/{item_id}")
def update_queue_item(
    item_id: int,
    update_data: WorkQueueItemUpdate,
    db: Session = Depends(get_db)
):
    """작업 대기열 항목 수정"""
    item = db.query(models.WorkQueueItem).filter(models.WorkQueueItem.id == item_id).first()
    if not item:
        raise HTTPException(404, "Queue item not found")
    
    # 업데이트
    for key, value in update_data.dict(exclude_unset=True).items():
        setattr(item, key, value)
    
    item.updated_at = datetime.now()
    db.commit()
    db.refresh(item)
    
    return item


@router.delete("/items/{item_id}")
def delete_queue_item(item_id: int, db: Session = Depends(get_db)):
    """작업 대기열 항목 삭제"""
    item = db.query(models.WorkQueueItem).filter(models.WorkQueueItem.id == item_id).first()
    if not item:
        raise HTTPException(404, "Queue item not found")
    
    db.delete(item)
    db.commit()
    
    return {"message": "Queue item deleted"}


@router.post("/items/{item_id}/approve")
def approve_queue_item(
    item_id: int,
    approval_data: Optional[ExpertApprovalRequest] = None,
    db: Session = Depends(get_db)
):
    """작업 대기열 항목 승인 (Expert Intervention 지원)"""
    item = db.query(models.WorkQueueItem).filter(models.WorkQueueItem.id == item_id).first()
    if not item:
        raise HTTPException(404, "Queue item not found")
    
    # [EXPERT INTERVENTION] Apply human edits if provided
    if approval_data:
        if approval_data.script:
            item.description = approval_data.script
            logger.info(f"✍️ [Expert] Script modified for item {item_id}")
            
        if approval_data.instructions:
            # Store instructions in platform_configs for mission context
            if not item.platform_configs:
                item.platform_configs = {}
            item.platform_configs["expert_instructions"] = approval_data.instructions
            logger.info(f"🧠 [Expert] Instructions injected for item {item_id}: {approval_data.instructions}")

            # [EVOLUTION] Persistence to Master Identity
            if approval_data.update_master_identity:
                yt_config = item.platform_configs.get('youtube', {})
                channel_id_field = yt_config.get('channel_id')
                if channel_id_field:
                    channel = db.query(models.BrandChannel).filter(models.BrandChannel.channel_id == channel_id_field).first()
                    if channel:
                        if not channel.expert_identity:
                            channel.expert_identity = {}
                        channel.expert_identity["latest_instructions"] = approval_data.instructions
                        channel.identity_version += 1
                        logger.info(f"🧬 [Evolution] Master Identity updated for channel {channel_id_field}")

    item.approval_status = "APPROVED"
    item.approved_by = approval_data.approved_by if approval_data else "system"
    item.approved_at = datetime.now()
    item.updated_at = datetime.now()
    item.status = "QUEUED"
    
    db.commit()
    db.refresh(item)
    
    # [Native Queue Trigger]
    native_worker.add_task(item.id)
    
    return {
        "status": "APPROVED",
        "item_id": item.id,
        "mode": "expert_intervention" if approval_data else "native_queue"
    }


@router.post("/items/{item_id}/reject")
def reject_queue_item(
    item_id: int,
    reason: str,
    db: Session = Depends(get_db)
):
    """작업 대기열 항목 반려"""
    item = db.query(models.WorkQueueItem).filter(models.WorkQueueItem.id == item_id).first()
    if not item:
        raise HTTPException(404, "Queue item not found")
    
    item.approval_status = "REJECTED"
    item.rejection_reason = reason
    item.updated_at = datetime.now()
    
    db.commit()
    db.refresh(item)
    return item


@router.get("/stats")
def get_queue_stats(db: Session = Depends(get_db)):
    """작업 대기열 통계"""
    total = db.query(models.WorkQueueItem).count()
    queued = db.query(models.WorkQueueItem).filter(models.WorkQueueItem.status == "QUEUED").count()
    uploading = db.query(models.WorkQueueItem).filter(models.WorkQueueItem.status == "UPLOADING").count()
    completed = db.query(models.WorkQueueItem).filter(models.WorkQueueItem.status == "COMPLETED").count()
    failed = db.query(models.WorkQueueItem).filter(models.WorkQueueItem.status == "FAILED").count()
    
    pending_approval = db.query(models.WorkQueueItem).filter(
        models.WorkQueueItem.approval_status == "PENDING"
    ).count()
    
    return {
        "total": total,
        "queued": queued,
        "uploading": uploading,
        "completed": completed,
        "failed": failed,
        "pending_approval": pending_approval
    }

# === WebSocket for Real-time Progress ===

class ConnectionManager:
    def __init__(self):
        # item_id -> List[WebSocket]
        self.active_connections: dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, item_id: int):
        await websocket.accept()
        if item_id not in self.active_connections:
            self.active_connections[item_id] = []
        self.active_connections[item_id].append(websocket)
        logger.info(f"✅ WebSocket Client connected to item {item_id}")

    def disconnect(self, websocket: WebSocket, item_id: int):
        if item_id in self.active_connections:
            if websocket in self.active_connections[item_id]:
                self.active_connections[item_id].remove(websocket)
            if not self.active_connections[item_id]:
                del self.active_connections[item_id]
        logger.info(f"🔌 WebSocket Client disconnected from item {item_id}")

    async def broadcast(self, item_id: int, message: dict):
        if item_id in self.active_connections:
            # Copy list to avoid modification during iteration
            for connection in self.active_connections[item_id][:]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.warning(f"Failed to send to socket: {e}")
                    self.disconnect(connection, item_id)

manager = ConnectionManager()

@router.websocket("/ws/progress/{item_id}")
async def websocket_endpoint(websocket: WebSocket, item_id: int):
    # [Security] Validate item exists?
    # For now, just accept to avoid 403 loop if DB is locked
    await manager.connect(websocket, item_id)
    try:
        while True:
            # Just keep connection open, maybe handle pings
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, item_id)
    except Exception as e:
        logger.error(f"WebSocket Error: {e}")
        manager.disconnect(websocket, item_id)

# Expose broadcast for worker
async def notify_progress(item_id: int, status: str, progress: int, log: str = None):
    msg = {
        "item_id": item_id,
        "status": status,
        "progress": progress,
        "log": log,
        "timestamp": datetime.now().isoformat()
    }
    await manager.broadcast(item_id, msg)

@router.post("/items/{item_id}/upload")
def trigger_upload(item_id: int, db: Session = Depends(get_db)):
    """
    업로드 작업 수동 트리거 (Native Queue)
    """
    item = db.query(models.WorkQueueItem).filter(models.WorkQueueItem.id == item_id).first()
    if not item:
        raise HTTPException(404, "Queue item not found")
    
    # 승인 확인
    if item.approval_status not in ["APPROVED", "AUTO_APPROVED"]:
        raise HTTPException(400, "Item not approved")
    
    # Native Queue Trigger
    native_worker.add_task(item.id)
    
    return {
        "message": "Upload task triggered",
        "item_id": item_id,
        "mode": "native_queue"
    }


# ... (Batch Classes) ...

@router.post("/batch/approve")
def batch_approve(
    request: BatchApproveRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """일괄 승인 (Native Queue)"""
    approved_items = []
    failed_items = []
    
    for item_id in request.item_ids:
        try:
            item = db.query(models.WorkQueueItem).filter(
                models.WorkQueueItem.id == item_id
            ).first()
            
            if not item:
                failed_items.append({"item_id": item_id, "reason": "Not found"})
                continue
            
            item.approval_status = "APPROVED"
            item.approved_by = request.approved_by
            item.approved_at = datetime.now()
            item.updated_at = datetime.now()
            item.status = "QUEUED"
            
            # [Native Queue Trigger]
            native_worker.add_task(item.id)
            
            approved_items.append({
                "item_id": item.id,
                "mode": "native_queue"
            })
                
        except Exception as e:
            logger.error(f"Failed to approve item {item_id}: {e}")
            failed_items.append({"item_id": item_id, "reason": str(e)})
    
    db.commit()
    
    return {
        "approved": len(approved_items),
        "failed": len(failed_items),
        "approved_items": approved_items,
        "failed_items": failed_items
    }


@router.post("/batch/reject")
def batch_reject(
    request: BatchRejectRequest,
    db: Session = Depends(get_db)
):
    """일괄 반려"""
    rejected_items = []
    failed_items = []
    
    for item_id in request.item_ids:
        try:
            item = db.query(models.WorkQueueItem).filter(
                models.WorkQueueItem.id == item_id
            ).first()
            
            if not item:
                failed_items.append({"item_id": item_id, "reason": "Not found"})
                continue
            
            item.approval_status = "REJECTED"
            item.rejection_reason = request.reason
            item.updated_at = datetime.now()
            
            rejected_items.append(item.id)
            
        except Exception as e:
            logger.error(f"Failed to reject item {item_id}: {e}")
            failed_items.append({"item_id": item_id, "reason": str(e)})
    
    db.commit()
    
    return {
        "rejected": len(rejected_items),
        "failed": len(failed_items),
        "rejected_items": rejected_items,
        "failed_items": failed_items
    }


@router.post("/batch/reset")
def batch_reset(
    request: BatchResetRequest,
    db: Session = Depends(get_db)
):
    """
    일괄 상태 초기화 (실패한 항목 재시도용)
    Status -> QUEUED
    Approval -> PENDING
    Failure Reason -> None
    """
    reset_items = []
    failed_items = []
    
    for item_id in request.item_ids:
        try:
            item = db.query(models.WorkQueueItem).filter(
                models.WorkQueueItem.id == item_id
            ).first()
            
            if not item:
                failed_items.append({"item_id": item_id, "reason": "Not found"})
                continue
            
            # Reset Status
            item.status = "QUEUED"
            item.approval_status = "PENDING"
            item.failure_reason = None
            item.upload_progress = 0
            item.updated_at = datetime.now()
            
            reset_items.append(item.id)
            
        except Exception as e:
            logger.error(f"Failed to reset item {item_id}: {e}")
            failed_items.append({"item_id": item_id, "reason": str(e)})
    
    db.commit()
    
    return {
        "reset": len(reset_items),
        "failed": len(failed_items),
        "reset_items": reset_items,
        "failed_items": failed_items
    }



@router.post("/batch/delete")
def batch_delete(
    request: BatchDeleteRequest,
    db: Session = Depends(get_db)
):
    """일괄 삭제"""
    deleted_items = []
    failed_items = []
    
    for item_id in request.item_ids:
        try:
            item = db.query(models.WorkQueueItem).filter(
                models.WorkQueueItem.id == item_id
            ).first()
            
            if not item:
                failed_items.append({"item_id": item_id, "reason": "Not found"})
                continue
            
            db.delete(item)
            deleted_items.append(item_id)
            
        except Exception as e:
            logger.error(f"Failed to delete item {item_id}: {e}")
            failed_items.append({"item_id": item_id, "reason": str(e)})
    
    db.commit()
    
    return {
        "deleted": len(deleted_items),
        "failed": len(failed_items),
        "deleted_items": deleted_items,
        "failed_items": failed_items
    }


@router.post("/priority/update")
def update_priority(
    request: PriorityUpdateRequest,
    db: Session = Depends(get_db)
):
    """우선순위 업데이트"""
    item = db.query(models.WorkQueueItem).filter(
        models.WorkQueueItem.id == request.item_id
    ).first()
    
    if not item:
        raise HTTPException(404, "Queue item not found")
    
    item.upload_priority = request.priority
    item.updated_at = datetime.now()
    
    db.commit()
    db.refresh(item)
    
    return item


@router.post("/priority/reorder")
def reorder_priorities(
    item_ids: List[int],
    db: Session = Depends(get_db)
):
    """
    우선순위 재정렬 (드래그 앤 드롭)
    
    Args:
        item_ids: 새로운 순서대로 정렬된 항목 ID 리스트
    """
    # 우선순위를 역순으로 할당 (첫 번째 항목이 가장 높은 우선순위)
    for index, item_id in enumerate(item_ids):
        item = db.query(models.WorkQueueItem).filter(
            models.WorkQueueItem.id == item_id
        ).first()
        
        if item:
            # 우선순위: 리스트 길이 - 인덱스
            item.upload_priority = len(item_ids) - index
            item.updated_at = datetime.now()
    
    db.commit()
    
    return {"message": "Priorities reordered", "count": len(item_ids)}


@router.post("/schedule/delay")
def schedule_delayed_upload(
    item_id: int,
    delay_minutes: int,
    db: Session = Depends(get_db)
):
    """
    지연 업로드 스케줄링
    
    Args:
        item_id: 항목 ID
        delay_minutes: 지연 시간 (분)
    """
    item = db.query(models.WorkQueueItem).filter(
        models.WorkQueueItem.id == item_id
    ).first()
    
    if not item:
        raise HTTPException(404, "Queue item not found")
    
    item.upload_delay_minutes = delay_minutes
    item.updated_at = datetime.now()
    
    db.commit()
    db.refresh(item)
    
    return item


# === AI Metadata Generation ===

class MetadataGenerationRequest(BaseModel):
    video_path: str
    platform: str = "youtube"  # youtube, tiktok, instagram


@router.post("/generate-metadata")
def generate_metadata(
    request: MetadataGenerationRequest,
    db: Session = Depends(get_db)
):
    """
    AI 기반 메타데이터 자동 생성
    
    영상 파일에서 자막을 추출하고 AI를 사용하여 플랫폼별로 최적화된
    제목, 설명, 해시태그를 자동으로 생성합니다.
    
    Args:
        request: 영상 경로 및 플랫폼 정보
        
    Returns:
        생성된 메타데이터 (title, description/caption, hashtags)
    """
    try:
        # 파일 존재 확인
        if not os.path.exists(request.video_path):
            # [FIX] Try to find in downloads folder if relative path provided
            from app import crud
            from app.config import settings as settings_conf
            settings = crud.get_settings(db)
            root_path = settings.root_download_path if settings and settings.root_download_path else settings_conf.MEDIA_ROOT
            download_path = os.path.join(root_path, request.video_path)
            
            if os.path.exists(download_path):
                logger.info(f"files resolved to: {download_path}")
                request.video_path = download_path
            else:
                logger.error(f"Video file not found at: {request.video_path} OR {download_path}")
                # [FIX] Return 400 (Bad Request) instead of 404 to distinguish from 'Route Not Found'
                # Also provide a helpful hint to the user.
                from app.config import settings
                import platform
                example_path = "F:\\Videos\\file.mp4" if platform.system() == "Windows" else "/home/user/viral_loop_media/videos/file.mp4"
                raise HTTPException(
                    status_code=400, 
                    detail=f"Video file not found. Please provide the FULL ABSOLUTE PATH (e.g., {example_path}). System checked: '{request.video_path}' and '{download_path}'"
                )
        
        # AI 메타데이터 서비스 사용
        from app.services.ai_metadata_service import AIMetadataService
        
        service = AIMetadataService(db)
        metadata = service.generate_metadata(
            video_path=request.video_path,
            platform=request.platform.lower()
        )
        
        logger.info(f"✅ Generated metadata for {request.platform}: {metadata.get('title', 'N/A')}")
        
        return {
            "success": True,
            "platform": request.platform,
            "metadata": metadata
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Metadata generation failed: {e}")
        raise HTTPException(500, f"Failed to generate metadata: {str(e)}")


# === Video Streaming ===

@router.get("/stream")
def stream_video(path: str):
    """
    Local Video Streaming for Work Queue
    Allows playing files from absolute paths (e.g. F:/...)
    """
    if not os.path.exists(path):
        raise HTTPException(404, "File not found")
        
    from fastapi.responses import FileResponse
    return FileResponse(path, media_type="video/mp4")
