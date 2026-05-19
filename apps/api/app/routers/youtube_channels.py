"""
YouTube Channel Management API Endpoints
Updated: 2026-01-23 - Added Captain Dashboard endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
import logging
import time
from collections import defaultdict
from datetime import datetime, timedelta

from app.database import get_db
from app.models import YouTubeChannel, ChannelAccess, ChannelAccessLog, Profile, ChannelRole
from app.services.browser_session_manager import session_manager
from app.services.stealth_ops_v2 import stealth_ops

logger = logging.getLogger(__name__)

router = APIRouter(tags=["YouTube Channels"])
@router.get("/captain/{profile_id}/channels")
async def get_captain_channels(
    profile_id: str,
    role: Optional[str] = None,  # OWNER or MANAGER
    view: Optional[str] = None,  # dashboard, list
    db: Session = Depends(get_db)
):
    """Captain 계정이 관리하는 채널 목록 조회
    
    Args:
        profile_id: Profile ID (for MANAGER role) or ignored for OWNER role
        role: Optional role filter (OWNER or MANAGER)
            - OWNER: Google API 업로드용 (모든 TinCan 계정의 소유 채널)
            - MANAGER: 브라우저 자동화용 (해당 Captain 계정의 위임받은 채널)
        view: Optional view format (dashboard, list)
    """
    
    # OWNER 역할인 경우: 모든 TinCan 프로필의 OWNER 채널 반환
    if role == "OWNER":
        # 모든 TinCan 프로필 조회
        tincan_profiles = db.query(Profile).filter(
            Profile.profile_type == "TIN_CAN",
            Profile.status == "ACTIVE"
        ).all()
        
        if not tincan_profiles:
            return []
        
        # 모든 TinCan 프로필의 OWNER 채널 조회
        tincan_ids = [p.id for p in tincan_profiles]
        channels = db.query(YouTubeChannel).join(ChannelAccess).filter(
            ChannelAccess.profile_id.in_(tincan_ids),
            ChannelAccess.role == "OWNER"
        ).all()
    else:
        # MANAGER 역할 또는 role 미지정: 특정 프로필의 채널만 반환
        profile = db.query(Profile).filter(Profile.id == profile_id).first()
        if not profile:
            raise HTTPException(404, "Profile not found")
        
        query = db.query(YouTubeChannel).join(ChannelAccess).filter(
            ChannelAccess.profile_id == profile_id
        )
        
        if role:
            query = query.filter(ChannelAccess.role == role)
        
        channels = query.all()
    
    channel_list = [
        {
            "channel_id": ch.channel_id,
            "channel_name": ch.channel_name,
            "channel_handle": ch.channel_handle,
            "thumbnail_url": ch.thumbnail_url,
            "status": ch.status,
            "quarantine_reason": ch.quarantine_reason,
            "last_used_ip": ch.last_used_ip,
            "last_accessed_at": ch.last_accessed_at.isoformat() if ch.last_accessed_at else None,
            "subscriber_count": ch.subscriber_count,
            "video_count": ch.video_count,
            "warmup_status": ch.warmup_status,
            "warmup_stage": ch.warmup_stage or 0,
            "warmup_last_run": ch.warmup_last_run.isoformat() if ch.warmup_last_run else None,
            # [SAIF] Security Fields
            "engine_mode": ch.engine_mode or 'standard',
            "stealth_trust_score": ch.stealth_trust_score or 0,
            "is_network_isolated": ch.is_network_isolated or False,
            "health_score": ch.stealth_trust_score if ch.stealth_trust_score is not None else 100
        }
        for ch in channels
    ]
    
    # Frontend expects {channels: [...]} format for dashboard view
    if view == "dashboard":
        return {"channels": channel_list}
    
    # Return array directly for other views
    return channel_list


# ============================================
# Captain Dashboard
# ============================================

@router.get("/captain/{profile_id}/dashboard")
async def get_captain_dashboard(
    profile_id: str,
    period: int = 30,
    db: Session = Depends(get_db)
):
    """
    Get dashboard data for a specific Captain account
    """
    # 1. Verify Captain profile exists
    captain = db.query(Profile).filter(
        Profile.id == profile_id,
        Profile.profile_type == "CAPTAIN"
    ).first()
    
    if not captain:
        raise HTTPException(404, "Captain profile not found")
    
    # 2. Get all channels managed by this Captain
    channels = db.query(YouTubeChannel).join(
        ChannelAccess,
        ChannelAccess.channel_id == YouTubeChannel.channel_id
    ).filter(
        ChannelAccess.profile_id == profile_id,
        ChannelAccess.role == ChannelRole.MANAGER
    ).all()
    
    # 3. Aggregate statistics
    total_subscribers = sum(ch.subscriber_count or 0 for ch in channels)
    total_views = sum(ch.view_count or 0 for ch in channels)
    total_videos = sum(ch.video_count or 0 for ch in channels)
    channel_count = len(channels)
    
    # 4. Generate warnings
    warnings = []
    for ch in channels:
        # Quarantine warning
        if ch.status == "QUARANTINED":
            warnings.append({
                "level": "critical",
                "channel_id": ch.channel_id,
                "channel_name": ch.channel_name,
                "type": "quarantine",
                "message": f"격리됨: {ch.quarantine_reason or '이유 없음'}"
            })
        
        # Low subscriber warning
        if (ch.subscriber_count or 0) < 100:
            warnings.append({
                "level": "warning",
                "channel_id": ch.channel_id,
                "channel_name": ch.channel_name,
                "type": "low_subscribers",
                "message": "구독자 수가 매우 적습니다"
            })
        
        # Stale data warning removed - last_synced_at field doesn't exist
    
    # 5. Build channel list with health scores
    channel_list = []
    for ch in channels:
        # Simple health score calculation
        health_score = 100
        if ch.status == "QUARANTINED":
            health_score = 0
        elif (ch.subscriber_count or 0) < 100:
            health_score -= 30
        
        
        channel_list.append({
            "channel_id": ch.channel_id,
            "channel_name": ch.channel_name,
            "subscriber_count": ch.subscriber_count or 0,
            "view_count": ch.view_count or 0,
            "video_count": ch.video_count or 0,
            "health_score": max(0, health_score),
            "needs_refresh": False,
            # [SAIF] Security Fields
            "engine_mode": ch.engine_mode or 'standard',
            "stealth_trust_score": ch.stealth_trust_score or 0,
            "is_network_isolated": ch.is_network_isolated or False
        })
    
    return {
        "total_stats": {
            "total_subscribers": total_subscribers,
            "total_views": total_views,
            "total_videos": total_videos,
            "channel_count": channel_count
        },
        "warnings": warnings,
        "channels": channel_list
    }


@router.get("/captain/dashboard/overview")
async def get_all_captains_dashboard(
    period: int = 30,
    db: Session = Depends(get_db)
):
    """
    Get aggregated dashboard data for all Captain accounts
    """
    # 1. Get all CAPTAIN profiles
    captains = db.query(Profile).filter(
        Profile.profile_type == "CAPTAIN",
        Profile.status == "ACTIVE"
    ).all()
    
    # 2. Aggregate data across all Captains
    all_channels = []
    captain_summaries = []
    all_warnings = []
    
    for captain in captains:
        # Get channels for this Captain
        channels = db.query(YouTubeChannel).join(
            ChannelAccess,
            ChannelAccess.channel_id == YouTubeChannel.channel_id
        ).filter(
            ChannelAccess.profile_id == captain.id,
            ChannelAccess.role == ChannelRole.MANAGER
        ).all()
        
        # Captain summary
        captain_subscribers = sum(ch.subscriber_count or 0 for ch in channels)
        captain_summaries.append({
            "profile_id": captain.id,
            "email": captain.email,
            "channel_count": len(channels),
            "total_subscribers": captain_subscribers
        })
        
        # Add channels with Captain info
        for ch in channels:
            # Health score
            health_score = 100
            if ch.status == "QUARANTINED":
                health_score = 0
            elif (ch.subscriber_count or 0) < 100:
                health_score -= 30
            
            all_channels.append({
                "channel_id": ch.channel_id,
                "channel_name": ch.channel_name,
                "subscriber_count": ch.subscriber_count or 0,
                "view_count": ch.view_count or 0,
                "video_count": ch.video_count or 0,
                "health_score": max(0, health_score),
                "needs_refresh": False,
                "captain_id": captain.id,
                "captain_email": captain.email,
                # [SAIF] Security Fields
                "engine_mode": ch.engine_mode or 'standard',
                "stealth_trust_score": ch.stealth_trust_score or 0,
                "is_network_isolated": ch.is_network_isolated or False
            })
            
            # Warnings
            if ch.status == "QUARANTINED":
                all_warnings.append({
                    "level": "critical",
                    "channel_id": ch.channel_id,
                    "channel_name": ch.channel_name,
                    "type": "quarantine",
                    "message": f"격리됨: {ch.quarantine_reason or '이유 없음'}",
                    "captain_email": captain.email
                })
    
    # 3. Calculate total stats
    total_subscribers = sum(ch["subscriber_count"] for ch in all_channels)
    total_views = sum(ch["view_count"] for ch in all_channels)
    total_videos = sum(ch["video_count"] for ch in all_channels)
    
    return {
        "total_stats": {
            "total_subscribers": total_subscribers,
            "total_views": total_views,
            "total_videos": total_videos,
            "channel_count": len(all_channels),
            "captain_count": len(captains)
        },
        "captains": captain_summaries,
        "warnings": all_warnings,
        "channels": all_channels
    }


# ============================================
# Analytics Endpoints
# ============================================

@router.get("/captain/{profile_id}/analytics/engagement")
async def get_captain_engagement_analytics(
    profile_id: str,
    days: int = 30,
    db: Session = Depends(get_db)
):
    """
    Get engagement analytics for Captain's channels
    Uses YouTube Data API v3 (accessible to managers)
    """
    from app.services.youtube_analytics import YouTubeAnalyticsService
    
    # Get Captain profile
    captain = db.query(Profile).filter(
        Profile.id == profile_id,
        Profile.profile_type == "CAPTAIN",
        Profile.status == "ACTIVE"
    ).first()
    
    if not captain:
        raise HTTPException(404, "Captain profile not found")
    
    # Initialize analytics service
    analytics_service = YouTubeAnalyticsService(db, captain)
    
    if not analytics_service.youtube:
        logger.warning(f"YouTube service not initialized for captain {profile_id} - returning empty data")
        return {"daily_data": [], "summary": {"avg_engagement_rate": 0, "total_likes": 0, "total_comments": 0, "total_views": 0}}
    
    # Get channels managed by this Captain
    channels = db.query(YouTubeChannel).join(ChannelAccess).filter(
        ChannelAccess.profile_id == profile_id,
        ChannelAccess.role == ChannelRole.MANAGER,
        YouTubeChannel.status != "QUARANTINED"
    ).all()
    
    if not channels:
        return {"daily_data": [], "summary": {"avg_engagement_rate": 0, "total_likes": 0, "total_comments": 0, "total_views": 0}}
    
    # Aggregate engagement data from all channels
    all_daily_data = defaultdict(lambda: {'views': 0, 'likes': 0, 'comments': 0})
    total_views = 0
    total_likes = 0
    total_comments = 0
    
    
    for channel in channels:
        try:
            logger.info(f"Fetching analytics for channel {channel.channel_id}")
            # Get video performance stats (uses Data API, not Analytics API)
            result = analytics_service.get_video_performance_stats(channel.channel_id, limit=50)
            videos = result.get('videos', [])
            
            logger.info(f"Got {len(videos)} videos for channel {channel.channel_id}")
            
            # Filter by date range
            cutoff_date = datetime.now() - timedelta(days=days)
            
            for video in videos:
                try:
                    pub_date = datetime.fromisoformat(video['published_at'].replace('Z', '+00:00'))
                    if pub_date.replace(tzinfo=None) >= cutoff_date:
                        date_key = pub_date.date().isoformat()
                        all_daily_data[date_key]['views'] += video['views']
                        all_daily_data[date_key]['likes'] += video['likes']
                        all_daily_data[date_key]['comments'] += video['comments']
                        
                        total_views += video['views']
                        total_likes += video['likes']
                        total_comments += video['comments']
                except Exception as e:
                    logger.warning(f"Failed to process video {video.get('video_id', 'unknown')}: {e}")
                    continue
        except Exception as e:
            logger.error(f"Failed to get engagement for channel {channel.channel_id}: {e}", exc_info=True)
            continue
    
    # Format daily data
    daily_data = []
    for date_str in sorted(all_daily_data.keys()):
        stats = all_daily_data[date_str]
        engagement_rate = ((stats['likes'] + stats['comments']) / stats['views']) if stats['views'] > 0 else 0
        
        daily_data.append({
            'date': date_str,
            'views': stats['views'],
            'likes': stats['likes'],
            'comments': stats['comments'],
            'engagement_rate': round(engagement_rate, 4)
        })
    
    avg_engagement_rate = ((total_likes + total_comments) / total_views) if total_views > 0 else 0
    
    return {
        "daily_data": daily_data,
        "summary": {
            "avg_engagement_rate": round(avg_engagement_rate, 4),
            "total_likes": total_likes,
            "total_comments": total_comments,
            "total_views": total_views
        }
    }


@router.get("/captain/{profile_id}/analytics/top-videos")
async def get_captain_top_videos(
    profile_id: str,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """
    Get top performing videos across Captain's channels
    """
    from app.services.youtube_analytics import YouTubeAnalyticsService
    
    # Get Captain profile
    captain = db.query(Profile).filter(
        Profile.id == profile_id,
        Profile.profile_type == "CAPTAIN",
        Profile.status == "ACTIVE"
    ).first()
    
    if not captain:
        raise HTTPException(404, "Captain profile not found")
    
    # Initialize analytics service
    analytics_service = YouTubeAnalyticsService(db, captain)
    
    if not analytics_service.youtube:
        logger.warning(f"YouTube service not initialized for captain {profile_id} - returning empty videos")
        return {"videos": []}
    
    # Get channels
    channels = db.query(YouTubeChannel).join(ChannelAccess).filter(
        ChannelAccess.profile_id == profile_id,
        ChannelAccess.role == ChannelRole.MANAGER,
        YouTubeChannel.status != "QUARANTINED"
    ).all()
    
    if not channels:
        return {"videos": []}
    
    # Collect all videos from all channels
    all_videos = []
    
    for channel in channels:
        try:
            result = analytics_service.get_video_performance_stats(channel.channel_id, limit=30)
            videos = result.get('videos', [])
            
            for video in videos:
                # Calculate engagement rate
                views = video['views']
                engagement = video['likes'] + video['comments']
                video['engagement_rate'] = (engagement / views) if views > 0 else 0
                video['channel_name'] = channel.channel_name
                video['channel_id'] = channel.channel_id
                all_videos.append(video)
        except Exception as e:
            logger.error(f"Failed to get videos for channel {channel.channel_id}: {e}")
            continue
    
    # Sort by views and get top N
    sorted_videos = sorted(all_videos, key=lambda x: x['views'], reverse=True)
    
    return {"videos": sorted_videos[:limit]}


# ============================================
# Channel Launch (IP Isolated)
# ============================================

@router.post("/channels/{channel_id}/launch")
async def launch_channel_isolated(
    channel_id: str,
    rotate_ip: bool = True,
    db: Session = Depends(get_db)
):
    """
    채널 격리 접속 (IP 교체 + 전용 프로필)
    """
    # 1. 채널 조회
    channel = db.query(YouTubeChannel).filter(YouTubeChannel.channel_id == channel_id).first()
    if not channel:
        raise HTTPException(404, "Channel not found")
    
    # 2. 격리 상태 확인
    if channel.status == 'QUARANTINED':
        raise HTTPException(403, f"Channel is quarantined: {channel.quarantine_reason}")
    
    # 3. Captain 프로필 찾기
    access = db.query(ChannelAccess).filter(
        ChannelAccess.channel_id == channel_id,
        ChannelAccess.role == ChannelRole.MANAGER
    ).first()
    
    if not access:
        raise HTTPException(404, "No manager found for this channel")
    
    # 4. 브라우저 실행
    try:
        logger.info(f"🚀 Launching isolated session for channel: {channel_id}")
        session_manager.launch_channel(
            channel_id=channel_id,
            db=db,
            rotate_ip=rotate_ip
        )
        
        # 5. 접속 로그 기록
        import uuid
        log = ChannelAccessLog(
            id=str(uuid.uuid4()),
            channel_id=channel_id,
            profile_id=access.profile_id,
            action="login",
            ip_address=channel.last_used_ip
        )
        db.add(log)
        db.commit()
        
        return {"success": True, "message": "Channel launched"}
    except Exception as e:
        logger.error(f"❌ Launch failed: {e}")
        raise HTTPException(500, f"Launch failed: {str(e)}")

# ============================================
# SAIF Security Control Endpoints
# ============================================

@router.get("/channels/{channel_id}/security")
async def get_channel_security_status(
    channel_id: str,
    db: Session = Depends(get_db)
):
    """채널의 SAIF 보안 및 격리 상태 조회"""
    channel = db.query(YouTubeChannel).filter(YouTubeChannel.channel_id == channel_id).first()
    if not channel:
        raise HTTPException(404, "Channel not found")
    
    return {
        "channel_id": channel.channel_id,
        "engine_mode": channel.engine_mode or 'standard',
        "stealth_trust_score": channel.stealth_trust_score or 0,
        "last_audit_at": channel.last_audit_at,
        "is_network_isolated": channel.is_network_isolated or False,
        "status": channel.status
    }

@router.patch("/channels/{channel_id}/security")
async def update_channel_security_settings(
    channel_id: str,
    settings: dict, # {"engine_mode": "cloak"}
    db: Session = Depends(get_db)
):
    """채널의 엔진 모드 등 보안 설정 변경"""
    channel = db.query(YouTubeChannel).filter(YouTubeChannel.channel_id == channel_id).first()
    if not channel:
        raise HTTPException(404, "Channel not found")
    
    if "engine_mode" in settings:
        mode = settings["engine_mode"]
        if mode not in ["standard", "cloak", "fox"]:
            raise HTTPException(400, "Invalid engine mode. Use: standard, cloak, fox")
        channel.engine_mode = mode
        logger.info(f"🛡️ [SAIF] Channel {channel_id} engine_mode updated to: {mode}")

    db.commit()
    return {"success": True, "message": "Security settings updated"}

@router.post("/channels/{channel_id}/audit")
async def trigger_sentinel_audit(
    channel_id: str,
    db: Session = Depends(get_db)
):
    """Sentinel Audit (지문 신뢰도 진단) 즉시 수행"""
    channel = db.query(YouTubeChannel).filter(YouTubeChannel.channel_id == channel_id).first()
    if not channel:
        raise HTTPException(404, "Channel not found")
    
    # 1. 런칭 시 Audit 수행을 위해 stealth_ops 호출
    # 실제 구현은 브라우저를 띄워서 감사 사이트 접속 후 점수 파싱
    logger.info(f"🔍 [Sentinel] Manual audit triggered for channel: {channel_id}")
    
    # [SAIF-2026] 실제 감사 로직 실행 및 점수 획득
    score = stealth_ops._perform_stealth_audit(channel_id)
    
    return {
        "success": True, 
        "score": score, 
        "message": f"Sentinel Audit completed with score: {score}%"
    }

@router.post("/channels/{channel_id}/warmup")
async def launch_channel_warmup(
    channel_id: str,
    stage: int = 1,
    db: Session = Depends(get_db)
):
    """
    Trigger warmup routine for a specific channel.
    Stage: 1-7 (Day 1 to Day 7)
    """
    try:
        logger.info(f"🚦 [Warmup] Received request for channel_id={channel_id}, stage={stage}")
        
        # Find channel by channel_id (YouTube ID)
        channel = db.query(YouTubeChannel).filter(
            YouTubeChannel.channel_id == channel_id
        ).first()
        
        if not channel:
            logger.error(f"❌ [Warmup] Channel not found: {channel_id}")
            raise HTTPException(404, f"Channel not found: {channel_id}")
        
        logger.info(f"✅ [Warmup] Found channel: {channel.channel_name} (DB ID: {channel.id})")
        
        # Update status to IDLE before starting
        channel.warmup_status = "IDLE"
        db.commit()
        logger.info(f"📝 [Warmup] Status reset to IDLE for {channel_id}")
        
        # Execute warmup synchronously (no background task)
        logger.info(f"🎬 [Warmup] Starting warmup routine for {channel_id}, stage={stage}")
        result = session_manager.run_warmup_routine(channel_id, stage)
        
        if result:
            logger.info(f"✅ [Warmup] Warmup completed successfully for {channel_id}")
            return {
                "success": True,
                "message": "Warmup routine completed successfully",
                "channel_id": channel_id,
                "stage": stage
            }
        else:
            logger.error(f"❌ [Warmup] Warmup failed for {channel_id}")
            raise HTTPException(500, "Warmup routine failed")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ [Warmup] Unexpected error for {channel_id}: {e}")
        raise HTTPException(500, f"Warmup failed: {str(e)}")


@router.post("/channels/{channel_id}/warmup/reset")
async def reset_channel_warmup(channel_id: int, db: Session = Depends(get_db)):
    """개별 채널 웜업 초기화"""
    try:
        # Use integer ID (database primary key)
        channel = db.query(YouTubeChannel).filter(YouTubeChannel.id == channel_id).first()
        if not channel:
            raise HTTPException(404, "Channel not found")
        
        # Reset warmup fields
        channel.warmup_stage = 0
        channel.warmup_status = "IDLE"
        channel.warmup_last_run = None
        channel.warmup_started_at = None
        channel.warmup_completed_at = None
        channel.warmup_total_duration = 0
        channel.warmup_error_count = 0
        channel.warmup_last_error = None
        
        db.commit()
        
        return {
            "success": True,
            "message": "Warmup reset successfully",
            "channel_id": channel.channel_id
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Reset failed: {str(e)}")


# ==================== Warmup Logging & Analytics ====================

@router.get("/channels/{channel_id}/warmup/logs")
async def get_warmup_logs(
    channel_id: str,
    stage: int = None,
    action: str = None,
    status: str = None,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """채널 웜업 로그 조회"""
    from app.models import WarmupLog
    import json
    
    # 기본 쿼리
    query = db.query(WarmupLog).filter(WarmupLog.channel_id == channel_id)
    
    # 필터 적용
    if stage is not None:
        query = query.filter(WarmupLog.stage == stage)
    if action:
        query = query.filter(WarmupLog.action == action)
    if status:
        query = query.filter(WarmupLog.status == status)
    
    # 최신순 정렬
    logs = query.order_by(WarmupLog.created_at.desc()).limit(limit).all()
    
    return {
        "channel_id": channel_id,
        "total": len(logs),
        "filters": {
            "stage": stage,
            "action": action,
            "status": status
        },
        "logs": [
            {
                "id": log.id,
                "stage": log.stage,
                "action": log.action,
                "details": json.loads(log.details) if log.details else {},
                "status": log.status,
                "error_message": log.error_message,
                "created_at": log.created_at.isoformat()
            }
            for log in logs
        ]
    }


@router.get("/channels/{channel_id}/warmup/analytics")
async def get_warmup_analytics(
    channel_id: str,
    stage: int = None,
    db: Session = Depends(get_db)
):
    """웜업 성공률 분석"""
    from app.models import WarmupLog
    
    # 기본 쿼리
    query = db.query(WarmupLog).filter(WarmupLog.channel_id == channel_id)
    
    if stage is not None:
        query = query.filter(WarmupLog.stage == stage)
    
    logs = query.all()
    
    if not logs:
        return {
            "channel_id": channel_id,
            "stage": stage,
            "total_actions": 0,
            "success_rate": 0,
            "action_stats": {}
        }
    
    # 전체 통계
    total = len(logs)
    success = len([l for l in logs if l.status == "success"])
    failed = len([l for l in logs if l.status == "failed"])
    
    # 액션별 통계
    action_stats = {}
    for log in logs:
        if log.action not in action_stats:
            action_stats[log.action] = {"total": 0, "success": 0, "failed": 0}
        
        action_stats[log.action]["total"] += 1
        if log.status == "success":
            action_stats[log.action]["success"] += 1
        else:
            action_stats[log.action]["failed"] += 1
    
    # 성공률 계산
    for action, stats in action_stats.items():
        stats["success_rate"] = round(stats["success"] / stats["total"] * 100, 2)
    
    return {
        "channel_id": channel_id,
        "stage": stage,
        "total_actions": total,
        "success_count": success,
        "failed_count": failed,
        "success_rate": round(success / total * 100, 2) if total > 0 else 0,
        "action_stats": action_stats
    }


@router.get("/channels/{channel_id}/warmup/recent")
async def get_recent_warmup_activity(
    channel_id: str,
    hours: int = 24,
    db: Session = Depends(get_db)
):
    """최근 웜업 활동 요약"""
    from app.models import WarmupLog
    from datetime import datetime, timedelta
    
    since = datetime.now() - timedelta(hours=hours)
    
    logs = db.query(WarmupLog).filter(
        WarmupLog.channel_id == channel_id,
        WarmupLog.created_at > since
    ).order_by(WarmupLog.created_at.desc()).all()
    
    if not logs:
        return {
            "channel_id": channel_id,
            "hours": hours,
            "activity": "No recent activity"
        }
    
    # 최근 활동 요약
    latest_stage = logs[0].stage
    total_actions = len(logs)
    success_count = len([l for l in logs if l.status == "success"])
    
    # 액션 타입별 카운트
    action_counts = {}
    for log in logs:
        action_counts[log.action] = action_counts.get(log.action, 0) + 1
    
    return {
        "channel_id": channel_id,
        "hours": hours,
        "latest_stage": latest_stage,
        "total_actions": total_actions,
        "success_count": success_count,
        "success_rate": round(success_count / total_actions * 100, 2),
        "action_breakdown": action_counts,
        "latest_actions": [
            {
                "action": log.action,
                "status": log.status,
                "created_at": log.created_at.isoformat()
            }
            for log in logs[:10]  # 최근 10개
        ]
    }


# ==================== Bulk Warmup Control ====================

@router.post("/warmup/bulk/start")
async def bulk_start_warmup(
    filter: str = "pending",  # pending, all, failed
    db: Session = Depends(get_db)
):
    """여러 채널 순차 웜업 시작 (IP 로테이션 보장)"""
    try:
        query = db.query(YouTubeChannel)
        
        if filter == "pending":
            query = query.filter(YouTubeChannel.warmup_stage == 0)
        elif filter == "failed":
            query = query.filter(YouTubeChannel.warmup_status == "FAILED")
        # "all" = no additional filter
        
        channels = query.all()
        
        if not channels:
            return {
                "success": True,
                "started": 0,
                "filter": filter,
                "message": "No channels to start"
            }
        
        # 순차 실행: 각 채널을 하나씩 완료
        success_count = 0
        failed_count = 0
        
        for idx, channel in enumerate(channels, 1):
            try:
                next_stage = channel.warmup_stage + 1 if channel.warmup_stage > 0 else 1
                
                logger.info(f"🔄 [Bulk Warmup] Processing channel {idx}/{len(channels)}: {channel.channel_name} (Day {next_stage})")
                
                # Reset status
                channel.warmup_status = "IDLE"
                db.commit()
                
                # 순차 실행: 완료될 때까지 대기
                # IP 변경 → 웜업 → 브라우저 닫기가 완료된 후 다음 채널로
                result = session_manager.run_warmup_routine(
                    channel.channel_id,
                    next_stage
                )
                
                if result:
                    success_count += 1
                    logger.info(f"✅ [Bulk Warmup] Channel {idx}/{len(channels)} completed successfully")
                else:
                    failed_count += 1
                    logger.warning(f"⚠️ [Bulk Warmup] Channel {idx}/{len(channels)} failed")
                
                # 다음 채널 전에 짧은 대기 (IP 안정화)
                if idx < len(channels):
                    import time
                    time.sleep(2)
                    
            except Exception as e:
                failed_count += 1
                logger.error(f"❌ [Bulk Warmup] Channel {idx}/{len(channels)} error: {e}")
                continue
        
        logger.info(f"🏁 [Bulk Warmup] Completed: {success_count} success, {failed_count} failed")
        
        return {
            "success": True,
            "started": len(channels),
            "completed": success_count,
            "failed": failed_count,
            "filter": filter
        }
    except Exception as e:
        raise HTTPException(500, f"Bulk start failed: {str(e)}")


@router.post("/warmup/bulk/pause")
async def bulk_pause_warmup(db: Session = Depends(get_db)):
    """실행 중인 모든 웜업 일시정지"""
    try:
        channels = db.query(YouTubeChannel).filter(
            YouTubeChannel.warmup_status == "RUNNING"
        ).all()
        
        for channel in channels:
            channel.warmup_status = "PAUSED"
        
        db.commit()
        
        return {
            "success": True,
            "paused": len(channels)
        }
    except Exception as e:
        raise HTTPException(500, f"Bulk pause failed: {str(e)}")


@router.post("/warmup/bulk/reset")
async def bulk_reset_warmup(db: Session = Depends(get_db)):
    """모든 채널 웜업 초기화"""
    try:
        channels = db.query(YouTubeChannel).all()
        
        for channel in channels:
            channel.warmup_stage = 0
            channel.warmup_status = "IDLE"
            channel.warmup_last_run = None
            channel.warmup_started_at = None
            channel.warmup_completed_at = None
            channel.warmup_total_duration = 0
            channel.warmup_error_count = 0
            channel.warmup_last_error = None
        
        db.commit()
        
        return {
            "success": True,
            "reset": len(channels)
        }
    except Exception as e:
        raise HTTPException(500, f"Bulk reset failed: {str(e)}")


@router.get("/warmup/bulk/status")
async def bulk_warmup_status(db: Session = Depends(get_db)):
    """전체 웜업 상태 요약"""
    try:
        total = db.query(YouTubeChannel).count()
        running = db.query(YouTubeChannel).filter(
            YouTubeChannel.warmup_status == "RUNNING"
        ).count()
        completed = db.query(YouTubeChannel).filter(
            YouTubeChannel.warmup_stage == 7,
            YouTubeChannel.warmup_status == "COMPLETED"
        ).count()
        failed = db.query(YouTubeChannel).filter(
            YouTubeChannel.warmup_status == "FAILED"
        ).count()
        paused = db.query(YouTubeChannel).filter(
            YouTubeChannel.warmup_status == "PAUSED"
        ).count()
        pending = db.query(YouTubeChannel).filter(
            YouTubeChannel.warmup_stage == 0
        ).count()
        in_progress = db.query(YouTubeChannel).filter(
            YouTubeChannel.warmup_stage > 0,
            YouTubeChannel.warmup_stage < 7
        ).count()
        
        return {
            "total": total,
            "running": running,
            "completed": completed,
            "failed": failed,
            "paused": paused,
            "pending": pending,
            "in_progress": in_progress
        }
    except Exception as e:
        raise HTTPException(500, f"Status check failed: {str(e)}")



@router.get("/channels/active")
async def get_active_channel():
    """현재 활성 채널 정보 반환"""
    
    active_channel_id = session_manager.get_active_channel()
    
    if not active_channel_id:
        return {"active": False, "channel_id": None}
    
    return {
        "active": True,
        "channel_id": active_channel_id
    }


@router.post("/channels/close-session")
async def close_active_session():
    """현재 활성 브라우저 세션 종료"""
    
    try:
        session_manager.close_session()
        return {"success": True, "message": "Session closed"}
    except Exception as e:
        raise HTTPException(500, f"Failed to close session: {str(e)}")


# ============================================
# Channel Quarantine Management
# ============================================

@router.post("/channels/{channel_id}/quarantine")
async def quarantine_channel(
    channel_id: str,
    reason: str,
    days: int = 90,
    db: Session = Depends(get_db)
):
    """채널 격리 (OWNER만 가능)"""
    
    from datetime import datetime, timedelta
    
    channel = db.query(YouTubeChannel).filter(
        YouTubeChannel.channel_id == channel_id
    ).first()
    
    if not channel:
        raise HTTPException(404, "Channel not found")
    
    # 격리 설정
    channel.status = 'QUARANTINED'
    channel.quarantine_reason = reason
    channel.quarantine_until = datetime.now() + timedelta(days=days)
    
    db.commit()
    
    logger.info(f"🚨 Channel quarantined: {channel_id} - {reason}")
    
    return {
        "success": True,
        "channel_id": channel_id,
        "quarantine_until": channel.quarantine_until.isoformat()
    }


@router.post("/channels/{channel_id}/release")
async def release_quarantine(
    channel_id: str,
    db: Session = Depends(get_db)
):
    """격리 해제"""
    
    channel = db.query(YouTubeChannel).filter(
        YouTubeChannel.channel_id == channel_id
    ).first()
    
    if not channel:
        raise HTTPException(404, "Channel not found")
    
    channel.status = 'ACTIVE'
    channel.quarantine_reason = None
    channel.quarantine_until = None
    
    db.commit()
    
    logger.info(f"✅ Channel released from quarantine: {channel_id}")
    
    return {"success": True, "channel_id": channel_id}


# ============================================
# TIN_CAN Registration with Captain Session Reuse
# ============================================

@router.post("/resources/profiles/{tin_can_id}/setup-from-captain")
async def setup_tincan_from_captain(
    tin_can_id: str,
    captain_id: str,
    launch_browser: bool = True,
    db: Session = Depends(get_db)
):
    """
    TIN_CAN 계정 설정: Captain 세션 복사 및 브라우저 실행
    
    Process:
    1. Captain 브라우저 실행 중 확인
    2. Captain 프로필 복사 (세션 쿠키 포함)
    3. TIN_CAN 전용 프로필 생성
    4. 브라우저 실행 및 로그인 상태 확인
    """
    import shutil
    import os
    
    # 1. Profile 조회
    tin_can = db.query(Profile).filter(Profile.id == tin_can_id).first()
    captain = db.query(Profile).filter(Profile.id == captain_id).first()
    
    if not tin_can or not captain:
        raise HTTPException(404, "Profile not found")
    
    if tin_can.profile_type != "TIN_CAN":
        raise HTTPException(400, "Target profile must be TIN_CAN type")
    
    if captain.profile_type != "CAPTAIN":
        raise HTTPException(400, "Source profile must be CAPTAIN type")
    
    # 2. Captain 브라우저 실행 중 확인
    if session_manager.get_browser_for_profile(captain_id):
        raise HTTPException(400, "Captain browser is currently running. Please close it first.")
    
    try:
        # 3. 프로필 복사
        captain_profile_path = captain.folder_path
        tin_can_profile_path = f"{captain_profile_path}_{tin_can_id}"
        
        logger.info(f"📁 Copying profile from {captain_profile_path} to {tin_can_profile_path}")
        
        # 이미 존재하면 삭제
        if os.path.exists(tin_can_profile_path):
            shutil.rmtree(tin_can_profile_path)
        
        # 복사 (Cache, GPUCache 제외)
        shutil.copytree(
            captain_profile_path,
            tin_can_profile_path,
            ignore=shutil.ignore_patterns('Cache', 'GPUCache', 'Code Cache')
        )
        
        
        logger.info("✅ Profile copied successfully")
        
        # 4. DB 업데이트
        # CRITICAL: DO NOT overwrite folder_path - causes Captain session leakage
        # tin_can.folder_path = tin_can_profile_path  # REMOVED
        db.commit()
        
        # 5. 브라우저 실행 및 로그인 확인
        if launch_browser:
            logger.info(f"🚀 Launching browser for TIN_CAN: {tin_can_id}")
            browser = stealth_ops.create_page(tin_can_id)
            
            # Store session
            session_manager._active_session = browser
            session_manager._active_profile_id = tin_can_id
            
            # YouTube Studio 접속
            browser.get("https://studio.youtube.com")
            time.sleep(3)
            
            # 로그인 상태 확인
            current_url = browser.url.lower()
            login_required = "accounts.google.com" in current_url or "signin" in current_url
            
            return {
                "success": True,
                "login_required": login_required,
                "message": "세션이 만료되었습니다. 브라우저에서 로그인하세요." if login_required else "로그인 상태 확인됨"
            }
        
        return {"success": True, "login_required": False}
    
    except Exception as e:
        logger.error(f"Failed to setup TIN_CAN from Captain: {e}")
        raise HTTPException(500, f"Setup failed: {str(e)}")




@router.post("/resources/profiles/{tin_can_id}/verify-delegation")
async def verify_channel_delegation(
    tin_can_id: str,
    captain_id: str,
    channel_id: str,
    db: Session = Depends(get_db)
):
    """
    권한 위임 검증 및 ChannelAccess 등록
    
    Process:
    1. Captain 계정으로 채널 접근 확인
    2. TIN_CAN OWNER 권한 등록
    3. Captain MANAGER 권한 등록
    4. TIN_CAN 프로필에 channel_id 저장
    """
    
    # 1. Profile 조회
    tin_can = db.query(Profile).filter(Profile.id == tin_can_id).first()
    captain = db.query(Profile).filter(Profile.id == captain_id).first()
    
    if not tin_can or not captain:
        raise HTTPException(404, "Profile not found")
    
    # 2. Captain OAuth2 Credentials 확인
    if not captain.client_secret_json or not captain.refresh_token:
        raise HTTPException(400, "Captain OAuth2 credentials not configured")
    
    try:
        # 3. Captain으로 채널 접근 확인 (YouTube Data API)
        from googleapiclient.discovery import build
        from google.oauth2.credentials import Credentials
        import json
        
        client_config = json.loads(captain.client_secret_json)
        credentials = Credentials(
            token=captain.access_token,
            refresh_token=captain.refresh_token,
            token_uri=client_config['installed']['token_uri'],
            client_id=client_config['installed']['client_id'],
            client_secret=client_config['installed']['client_secret']
        )
        
        youtube = build('youtube', 'v3', credentials=credentials)
        
        # 채널 정보 조회 시도
        channel_response = youtube.channels().list(
            part="snippet,statistics",
            id=channel_id
        ).execute()
        
        if not channel_response.get('items'):
            raise HTTPException(400, "권한 위임이 완료되지 않았습니다. Captain 이메일에서 초대를 승인하세요.")
        
        channel_info = channel_response['items'][0]
        
        # 4. YouTubeChannel 레코드 생성 (없으면)
        channel = db.query(YouTubeChannel).filter(
            YouTubeChannel.channel_id == channel_id
        ).first()
        
        if not channel:
            channel = YouTubeChannel(
                channel_id=channel_id,
                channel_name=channel_info['snippet']['title'],
                channel_handle=channel_info['snippet'].get('customUrl'),
                thumbnail_url=channel_info['snippet']['thumbnails']['default']['url'],
                status=ChannelStatus.ACTIVE,
                subscriber_count=channel_info['statistics'].get('subscriberCount', 0),
                view_count=channel_info['statistics'].get('viewCount', 0),
                video_count=channel_info['statistics'].get('videoCount', 0),
                is_auto_discovered=True,
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            db.add(channel)
            logger.info(f"✅ Created YouTubeChannel: {channel_id}")
        else:
            # Update existing channel info
            channel.channel_name = channel_info['snippet']['title']
            channel.channel_handle = channel_info['snippet'].get('customUrl')
            channel.thumbnail_url = channel_info['snippet']['thumbnails']['default']['url']
            channel.subscriber_count = channel_info['statistics'].get('subscriberCount', 0)
            channel.view_count = channel_info['statistics'].get('viewCount', 0)
            channel.video_count = channel_info['statistics'].get('videoCount', 0)
            channel.updated_at = datetime.now()
            logger.info(f"✅ Updated YouTubeChannel: {channel_id}")
        
        # 5. ChannelAccess 등록
        # TIN_CAN: OWNER
        owner_access = ChannelAccess(
            id=f"{channel_id}_{tin_can_id}",
            channel_id=channel_id,
            profile_id=tin_can_id,
            role=ChannelRole.OWNER,
            granted_at=datetime.now()
        )
        db.merge(owner_access)
        
        # Captain: MANAGER
        manager_access = ChannelAccess(
            id=f"{channel_id}_{captain_id}",
            channel_id=channel_id,
            profile_id=captain_id,
            role=ChannelRole.MANAGER,
            granted_at=datetime.now()
        )
        db.merge(manager_access)
        
        # 6. TIN_CAN 프로필에 channel_id 저장
        tin_can.channel_id = channel_id
        tin_can.status = "ACTIVE"
        
        db.commit()
        
        logger.info(f"✅ Delegation verified and registered for channel: {channel_id}")
        
        return {
            "success": True,
            "channel": {
                "channel_id": channel_id,
                "channel_name": channel_info['snippet']['title'],
                "thumbnail": channel_info['snippet']['thumbnails']['default']['url']
            },
            "message": "권한 위임이 성공적으로 확인되었습니다."
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to verify delegation: {e}")
        raise HTTPException(500, f"Verification failed: {str(e)}")
