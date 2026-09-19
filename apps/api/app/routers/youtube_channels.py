"""YouTube Channel Management API Endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
import logging
import time
from collections import defaultdict
from datetime import datetime, timedelta

from app.database import get_db
from app.models import YouTubeChannel, ChannelAccess, ChannelAccessLog, Profile, ChannelRole
try:
    from app.services.browser_session_manager import session_manager
except Exception:
    session_manager = None
from app.services.stealth_ops_v2 import stealth_ops

logger = logging.getLogger(__name__)

router = APIRouter(tags=["YouTube Channels"])

def channel_to_dict(ch) -> dict:
    """BrandChannel 객체를 안전하게 딕셔너리로 변환 (없는 컬럼은 None/기본값 반환)"""
    return {
        "id": getattr(ch, 'id', None),
        "channel_id": getattr(ch, 'channel_id', None),
        "channel_name": getattr(ch, 'channel_name', None) or getattr(ch, 'title', None),
        "title": getattr(ch, 'title', None),
        "channel_handle": getattr(ch, 'channel_handle', None),
        "thumbnail_url": getattr(ch, 'thumbnail_url', None),
        "status": getattr(ch, 'status', None) or "ACTIVE",
        "quarantine_reason": getattr(ch, 'quarantine_reason', None),
        "last_used_ip": getattr(ch, 'last_used_ip', None),
        "last_accessed_at": (getattr(ch, 'last_accessed_at', None) or getattr(ch, 'warmup_last_run', None)).isoformat() if (getattr(ch, 'last_accessed_at', None) or getattr(ch, 'warmup_last_run', None)) else None,
        "subscriber_count": getattr(ch, 'subscriber_count', 0) or 0,
        "video_count": getattr(ch, 'video_count', 0) or 0,
        "view_count": getattr(ch, 'view_count', 0) or 0,
        "revenue_text": getattr(ch, 'revenue_text', "N/A") or "N/A",
        "warmup_status": getattr(ch, 'warmup_status', 'IDLE'),
        "warmup_stage": getattr(ch, 'warmup_stage', 0) or 0,
        "warmup_last_run": getattr(ch, 'warmup_last_run', None).isoformat() if getattr(ch, 'warmup_last_run', None) else None,
        "engine_mode": getattr(ch, 'engine_mode', 'standard') or 'standard',
        "stealth_trust_score": getattr(ch, 'stealth_trust_score', None) or getattr(ch, 'trust_score', 0) or 0,
        "is_network_isolated": getattr(ch, 'is_network_isolated', False) or False,
        "health_score": getattr(ch, 'stealth_trust_score', None) or getattr(ch, 'trust_score', 100) or 100,
        "cultivation_strategy": getattr(ch, 'cultivation_strategy', 'INITIAL') or 'INITIAL',
        "cultivation_active": getattr(ch, 'cultivation_active', False) or False,
        "cultivation_day": getattr(ch, 'cultivation_day', 0) or 0,
        "warmup_config": getattr(ch, 'warmup_config', None),
        "growth_phase": getattr(ch, 'growth_phase', 'NEW'),
        "owner_profile_id": getattr(ch, 'owner_profile_id', None),
        "account_email": getattr(ch, 'account_email', None),
        "is_active": getattr(ch, 'is_active', True),
    }

@router.get("/all")
def get_all_youtube_channels(
    registered_only: bool = False,
    db: Session = Depends(get_db)
):
    """모든 유튜브 브랜드 채널 목록 조회 (channel_to_dict 변환)"""
    query = db.query(YouTubeChannel)
    if registered_only:
        query = query.filter(
            YouTubeChannel.owner_profile_id.isnot(None)
        )
    channels = query.all()
    return [channel_to_dict(ch) for ch in channels]

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
        channels = db.query(YouTubeChannel).join(ChannelAccess, ChannelAccess.channel_id == YouTubeChannel.channel_id).filter(
            ChannelAccess.profile_id.in_(tincan_ids),
            ChannelAccess.role == "OWNER"
        ).all()
    else:
        # MANAGER 역할 또는 role 미지정: 특정 프로필의 채널만 반환
        profile = db.query(Profile).filter(Profile.id == profile_id).first()
        if not profile:
            raise HTTPException(404, "Profile not found")
        
        query = db.query(YouTubeChannel).join(ChannelAccess, ChannelAccess.channel_id == YouTubeChannel.channel_id).filter(
            ChannelAccess.profile_id == profile_id
        )
        
        if role:
            query = query.filter(ChannelAccess.role == role)
        
        channels = query.distinct(YouTubeChannel.channel_id).all()

    try:
        channel_list = [channel_to_dict(ch) for ch in channels]
    except Exception as e:
        logger.error(f"channel_to_dict failed: {e}", exc_info=True)
        raise HTTPException(500, f"Failed to serialize channels: {str(e)}")

    
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
        ch_status = getattr(ch, 'status', 'ACTIVE')
        if ch_status == "QUARANTINED":
            warnings.append({
                "level": "critical",
                "channel_id": ch.channel_id,
                "channel_name": ch.title,
                "type": "quarantine",
                "message": f"격리됨: {getattr(ch, 'quarantine_reason', None) or '이유 없음'}"
            })
        
        # Low subscriber warning
        if (ch.subscriber_count or 0) < 100:
            warnings.append({
                "level": "warning",
                "channel_id": ch.channel_id,
                "channel_name": ch.title,
                "type": "low_subscribers",
                "message": "구독자 수가 매우 적습니다"
            })
    
    # 5. Build channel list with health scores
    channel_list = []
    for ch in channels:
        # Simple health score calculation
        health_score = 100
        ch_status = getattr(ch, 'status', 'ACTIVE')
        if ch_status == "QUARANTINED":
            health_score = 0
        elif (ch.subscriber_count or 0) < 100:
            health_score -= 30
        
        channel_list.append(channel_to_dict(ch) | {"health_score": max(0, health_score)})
    
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
            ch_status = getattr(ch, 'status', 'ACTIVE')
            if ch_status == "QUARANTINED":
                health_score = 0
            elif (ch.subscriber_count or 0) < 100:
                health_score -= 30
            
            all_channels.append(channel_to_dict(ch) | {
                "health_score": max(0, health_score),
                "needs_refresh": False,
                "captain_id": captain.id,
                "captain_email": captain.email,
            })
            
            # Warnings
            if ch_status == "QUARANTINED":
                all_warnings.append({
                    "level": "critical",
                    "channel_id": ch.channel_id,
                    "channel_name": ch.title,
                    "type": "quarantine",
                    "message": f"격리됨: {getattr(ch, 'quarantine_reason', None) or '이유 없음'}",
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
    """Get engagement analytics for a Captain's managed channels."""
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
    channels = db.query(YouTubeChannel).join(ChannelAccess, ChannelAccess.channel_id == YouTubeChannel.channel_id).filter(
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
    channels = db.query(YouTubeChannel).join(ChannelAccess, ChannelAccess.channel_id == YouTubeChannel.channel_id).filter(
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
                video['channel_name'] = getattr(channel, 'title', None) or channel.channel_id
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
def launch_channel_isolated(
    channel_id: str,
    rotate_ip: bool = False, # Force disable
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
    if getattr(channel, 'status', 'ACTIVE') == 'QUARANTINED':
        raise HTTPException(403, f"Channel is quarantined: {getattr(channel, 'quarantine_reason', 'unknown')}")
    
    # 3. Captain 프로필 찾기
    access = db.query(ChannelAccess).filter(
        ChannelAccess.channel_id == channel_id,
        ChannelAccess.role == ChannelRole.MANAGER
    ).first()
    
    if not access:
        raise HTTPException(404, "No manager found for this channel")
    
    # 4. 브라우저 실행
    try:
        logger.info(f"[FALLBACK] Launching isolated session for channel: {channel_id}")
        session_manager.launch_channel(
            channel_id=channel_id,
            db=db,
            rotate_ip=False
        )
        
        # [NEW] 마법사 수동 셋업 창이 열렸다면 인증 대기 상태 해제
        if channel.auth_status == "PENDING":
            channel.auth_status = "COMPLETED"
            db.commit()
            
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
        logger.error(f"[FAIL] Launch failed: {e}")
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
    logger.info(f"[SEARCH] [Sentinel] Manual audit triggered for channel: {channel_id}")
    
    # [SAIF-2026] 실제 감사 로직 실행 및 점수 획득
    score = stealth_ops._perform_stealth_audit(channel_id)
    
    return {
        "success": True, 
        "score": score, 
        "message": f"Sentinel Audit completed with score: {score}%"
    }

@router.post("/channels/{channel_id}/warmup")
def launch_channel_warmup(
    channel_id: str,
    stage: int = 1,
    visible: bool = False,
    db: Session = Depends(get_db)
):
    """
    Trigger warmup routine for a specific channel.
    Stage: 1-7 (Day 1 to Day 7)
    visible: if True, runs in headed mode to show UI to user.
    """
    try:
        logger.info(f"🚦 [Warmup] Received request for channel_id={channel_id}, stage={stage}, visible={visible}")
        
        # Find channel by channel_id (YouTube ID)
        channel = db.query(YouTubeChannel).filter(
            YouTubeChannel.channel_id == channel_id
        ).first()
        
        if not channel:
            logger.error(f"[FAIL] [Warmup] Channel not found: {channel_id}")
            raise HTTPException(404, f"Channel not found: {channel_id}")
        
        logger.info(f"[OK] [Warmup] Found channel: {channel.title} (DB ID: {channel.channel_id})")
        
        # Update status to RUNNING before starting
        channel.warmup_status = "RUNNING"
        db.commit()
        logger.info(f"[SCRIPT] [Warmup] Status set to RUNNING for {channel_id}")
        
        # Execute warmup synchronously (no background task)
        logger.info(f"[VIDEO] [Warmup] Starting warmup routine for {channel_id}, stage={stage}")
        result = session_manager.run_warmup_routine(channel_id, stage, visible)
        
        if result:
            logger.info(f"[OK] [Warmup] Warmup completed successfully for {channel_id}")
            return {
                "success": True,
                "message": "Warmup routine completed successfully",
                "channel_id": channel_id,
                "stage": stage
            }
        else:
            logger.error(f"[FAIL] [Warmup] Warmup failed for {channel_id}")
            try:
                db.refresh(channel)
                err_msg = getattr(channel, 'warmup_last_error', None) or "웜업 루틴 실행 중 오류가 발생했습니다."
            except Exception:
                err_msg = "웜업 루틴 실행 중 오류가 발생했습니다."
            return {
                "success": False,
                "message": err_msg,
                "channel_id": channel_id,
                "stage": stage
            }
            
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        logger.error(f"[FAIL] [Warmup] Unexpected error for {channel_id}: {e}\n{tb}")
        # Return graceful error so frontend toast can show the reason
        return {
            "success": False,
            "message": f"Warmup failed: {str(e)}",
            "channel_id": channel_id
        }


@router.post("/channels/{channel_id}/warmup/reset")
async def reset_channel_warmup(channel_id: str, db: Session = Depends(get_db)):
    """개별 채널 웜업 초기화"""
    try:
        channel = db.query(YouTubeChannel).filter(YouTubeChannel.channel_id == channel_id).first()
        if not channel:
            raise HTTPException(404, "Channel not found")
        
        # 실제로 존재하는 컬럼만 초기화
        channel.warmup_stage = 0
        channel.warmup_status = "IDLE"
        channel.warmup_last_run = None
        
        db.commit()
        db.refresh(channel)
        
        return {
            "success": True,
            "message": "Warmup reset successfully",
            "channel_id": channel.channel_id,
            "warmup_stage": channel.warmup_stage,
            "warmup_status": channel.warmup_status,
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
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

def _run_bulk_channels_worker(channel_ids: list, is_auto_schedule: bool = False):
    import threading
    from app.database import SessionLocal
    from app.services.browser_session_manager import session_manager
    from app.models import YouTubeChannel
    
    if not session_manager:
        logger.error("[BulkWorker] session_manager not initialized")
        return

    session_manager.reset_abort()
    logger.info(f"🚀 [BulkWorker] Starting background processing for {len(channel_ids)} channels (AutoSchedule: {is_auto_schedule})")

    for idx, ch_id in enumerate(channel_ids, 1):
        if session_manager.is_aborted():
            logger.warning(f"🛑 [BulkWorker] Abort detected! Halting background worker at channel {idx}/{len(channel_ids)}")
            break

        db = SessionLocal()
        try:
            channel = db.query(YouTubeChannel).filter(YouTubeChannel.channel_id == ch_id).first()
            if not channel:
                continue

            target_stage = 1
            if is_auto_schedule:
                strategy = channel.cultivation_strategy or "INITIAL"
                channel.cultivation_day = (channel.cultivation_day or 0) + 1
                day = channel.cultivation_day
                if strategy == "INITIAL":
                    target_stage = 1 if day <= 2 else (2 if day <= 5 else 3)
                elif strategy == "NICHE_PIVOT":
                    target_stage = 2
                elif strategy == "TRAFFIC_HIJACK":
                    target_stage = 3
                elif strategy == "DEATH_VALLEY":
                    target_stage = 1 if day <= 4 else 2
                channel.warmup_stage = max(0, target_stage - 1)
            else:
                target_stage = channel.warmup_stage + 1 if channel.warmup_stage > 0 else 1

            channel.warmup_status = "RUNNING"
            db.commit()
            logger.info(f"▶️ [BulkWorker] [{idx}/{len(channel_ids)}] Channel {channel.title or ch_id} -> Stage {target_stage}")

            # Run routine
            res = session_manager.run_warmup_routine(ch_id, target_stage)
            
            # Re-fetch channel to avoid stale session
            channel = db.query(YouTubeChannel).filter(YouTubeChannel.channel_id == ch_id).first()
            if channel:
                if res:
                    channel.warmup_status = "COMPLETED"
                    channel.warmup_stage = target_stage
                    channel.warmup_completed_at = datetime.now()
                else:
                    channel.warmup_status = "FAILED"
                channel.warmup_last_run = datetime.now()
                db.commit()

        except Exception as e:
            logger.error(f"[BulkWorker] Error on channel {ch_id}: {e}", exc_info=True)
            try:
                ch = db.query(YouTubeChannel).filter(YouTubeChannel.channel_id == ch_id).first()
                if ch:
                    ch.warmup_status = "FAILED"
                    ch.warmup_last_error = str(e)
                    db.commit()
            except Exception:
                pass
        finally:
            db.close()

        # Inter-channel safety pause
        if idx < len(channel_ids) and not session_manager.is_aborted():
            time.sleep(3)

    logger.info("🏁 [BulkWorker] Background processing finished.")


@router.post("/warmup/bulk/start")
def bulk_start_warmup(
    filter: str = "pending",  # pending, all, failed, selected
    payload: dict = Body(None),
    db: Session = Depends(get_db)
):
    """여러 채널 순차 웜업 백그라운드 시작 (선택 채널 또는 필터 기반)"""
    import threading
    try:
        active_profile_ids = [r[0] for r in db.query(Profile.id).filter(
            Profile.status == "ACTIVE"
        ).all()]
        
        query = db.query(YouTubeChannel).filter(
            (YouTubeChannel.owner_profile_id.in_(active_profile_ids)) | (YouTubeChannel.owner_profile_id == None)
        )
        
        selected_ids = payload.get("channel_ids") if payload else None
        if selected_ids and len(selected_ids) > 0:
            query = query.filter(YouTubeChannel.channel_id.in_(selected_ids))
        elif filter == "pending":
            query = query.filter(YouTubeChannel.warmup_stage == 0)
        elif filter == "failed":
            query = query.filter(YouTubeChannel.warmup_status == "FAILED")
        
        channels = query.all()
        if not channels:
            return {
                "success": True,
                "started": 0,
                "filter": filter,
                "message": "실행할 대상 채널이 없습니다."
            }
        
        channel_ids = [ch.channel_id for ch in channels]
        for ch in channels:
            ch.warmup_status = "QUEUED"
        db.commit()
        
        if session_manager:
            session_manager.reset_abort()

        threading.Thread(target=_run_bulk_channels_worker, args=(channel_ids, False), daemon=True).start()
        
        return {
            "success": True,
            "started": len(channels),
            "filter": filter,
            "channel_ids": channel_ids,
            "message": f"{len(channels)}개 채널의 웜업이 백그라운드 큐에서 순차 시작되었습니다."
        }
    except Exception as e:
        raise HTTPException(500, f"Bulk start failed: {str(e)}")



@router.post("/warmup/bulk/pause")
def bulk_pause_warmup(db: Session = Depends(get_db)):
    """실행 중인 모든 웜업 즉시 일시정지 (실시간 킬스위치 연동)"""
    try:
        if session_manager:
            session_manager.request_abort()
        
        channels = db.query(YouTubeChannel).filter(
            YouTubeChannel.warmup_status.in_(["RUNNING", "QUEUED", "PENDING"])
        ).all()
        
        for channel in channels:
            channel.warmup_status = "PAUSED"
        db.commit()
        
        return {
            "success": True,
            "paused": len(channels),
            "message": f"{len(channels)}개 채널의 웜업이 즉시 중단/일시정지되었습니다."
        }
    except Exception as e:
        raise HTTPException(500, f"Bulk pause failed: {str(e)}")


@router.post("/warmup/bulk/reset")
def bulk_reset_warmup(db: Session = Depends(get_db)):
    """모든 채널 웜업 초기화"""
    try:
        active_profile_ids = [r[0] for r in db.query(Profile.id).filter(
            Profile.status == "ACTIVE"
        ).all()]
        
        channels = db.query(YouTubeChannel).filter(
            (YouTubeChannel.owner_profile_id.in_(active_profile_ids)) | (YouTubeChannel.owner_profile_id == None)
        ).all()
        
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
def bulk_warmup_status(db: Session = Depends(get_db)):
    """전체 웜업 상태 요약 (모든 등록 채널 포함)"""
    try:
        active_profile_ids = [r[0] for r in db.query(Profile.id).filter(
            Profile.status == "ACTIVE"
        ).all()]
        
        base_query = db.query(YouTubeChannel).filter(
            (YouTubeChannel.owner_profile_id.in_(active_profile_ids)) | (YouTubeChannel.owner_profile_id == None)
        )
        
        total = base_query.count()
        running = base_query.filter(
            YouTubeChannel.warmup_status.in_(["RUNNING", "QUEUED"])
        ).count()
        completed = base_query.filter(
            YouTubeChannel.warmup_stage >= 3,
            YouTubeChannel.warmup_status != "FAILED"
        ).count()
        failed = base_query.filter(
            YouTubeChannel.warmup_status == "FAILED"
        ).count()
        paused = base_query.filter(
            YouTubeChannel.warmup_status == "PAUSED"
        ).count()
        pending = base_query.filter(
            YouTubeChannel.warmup_stage < 3,
            ~YouTubeChannel.warmup_status.in_(["RUNNING", "QUEUED", "FAILED", "PAUSED"])
        ).count()
        in_progress = base_query.filter(
            YouTubeChannel.warmup_stage > 0,
            YouTubeChannel.warmup_stage < 3
        ).count()
        
        failed_channels = []
        if failed > 0:
            failed_rows = base_query.filter(YouTubeChannel.warmup_status == "FAILED").all()
            for ch in failed_rows:
                failed_channels.append({
                    "channel_id": ch.channel_id,
                    "title": ch.title or ch.channel_id,
                    "warmup_stage": ch.warmup_stage or 1,
                    "warmup_last_error": getattr(ch, 'warmup_last_error', None) or "원인 미상 오류",
                    "warmup_last_run": ch.warmup_last_run.isoformat() if ch.warmup_last_run else None,
                    "owner_profile_id": ch.owner_profile_id
                })

        return {
            "total": total,
            "running": running,
            "completed": completed,
            "failed": failed,
            "paused": paused,
            "pending": pending,
            "in_progress": in_progress,
            "failed_channels": failed_channels
        }
    except Exception as e:
        logger.error(f"Bulk status error: {e}")
        return {"total": 0, "running": 0, "completed": 0, "failed": 0, "paused": 0, "pending": 0, "in_progress": 0, "failed_channels": []}



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
    
    logger.info(f"[ALERT] Channel quarantined: {channel_id} - {reason}")
    
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
    
    logger.info(f"[OK] Channel released from quarantine: {channel_id}")
    
    return {"success": True, "channel_id": channel_id}







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
            logger.info(f"[OK] Created YouTubeChannel: {channel_id}")
        else:
            # Update existing channel info
            channel.channel_name = channel_info['snippet']['title']
            channel.channel_handle = channel_info['snippet'].get('customUrl')
            channel.thumbnail_url = channel_info['snippet']['thumbnails']['default']['url']
            channel.subscriber_count = channel_info['statistics'].get('subscriberCount', 0)
            channel.view_count = channel_info['statistics'].get('viewCount', 0)
            channel.video_count = channel_info['statistics'].get('videoCount', 0)
            channel.updated_at = datetime.now()
            logger.info(f"[OK] Updated YouTubeChannel: {channel_id}")
        
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
        
        logger.info(f"[OK] Delegation verified and registered for channel: {channel_id}")
        
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

# ============================================
# Strategic Cultivation (Auto Scheduler)
# ============================================

from pydantic import BaseModel
from typing import Optional

class CultivationUpdate(BaseModel):
    strategy: str
    active: bool
    target_niche: Optional[str] = None

@router.patch("/channels/{channel_id}/cultivation")
async def update_cultivation_strategy(
    channel_id: str,
    data: CultivationUpdate,
    db: Session = Depends(get_db)
):
    """채널의 육성 전략(Cultivation Strategy) 업데이트"""
    channel = db.query(YouTubeChannel).filter(YouTubeChannel.channel_id == channel_id).first()
    if not channel:
        raise HTTPException(404, "Channel not found")
        
    # 전략이 변경되면 진행 일차를 리셋
    if getattr(channel, 'cultivation_strategy', '') != data.strategy:
        channel.cultivation_day = 0
        channel.warmup_stage = 0
        
    channel.cultivation_strategy = data.strategy
    channel.cultivation_active = data.active
    
    # 타겟 니치가 입력되었다면 DNA 자동 생성 로직 실행
    if data.target_niche:
        try:
            from app.services.warmup_comment_generator_v2 import get_intelligence_generator
            from app.database import SessionLocal
            from app import crud
            import json
            
            # TODO: 실제로는 Intelligence Generator를 통해 생성되도록 연결
            # 임시로 더미/기본 ChannelDNA 포맷으로 저장 (따로 작성할 예정인 generate_channel_dna 사용)
            # 여기서는 편의상 import해서 사용
            from app.services.warmup_comment_generator_v2 import generate_channel_dna
            
            dna_data = generate_channel_dna(data.target_niche)
            channel.warmup_config = json.dumps(dna_data)
        except Exception as e:
            logger.error(f"[FAIL] Failed to generate DNA for {channel_id}: {e}")
        
    db.commit()
    return {
        "success": True,
        "strategy": channel.cultivation_strategy,
        "active": channel.cultivation_active,
        "day": channel.cultivation_day
    }

@router.post("/warmup/bulk/auto-schedule")
def trigger_auto_scheduler(db: Session = Depends(get_db)):
    """설정된 전략에 따라 모든 채널의 스케줄러를 백그라운드에서 순차 실행"""
    import threading
    try:
        active_profile_ids = [r[0] for r in db.query(Profile.id).filter(
            Profile.status == "ACTIVE"
        ).all()]
        
        query = db.query(YouTubeChannel).filter(
            (YouTubeChannel.owner_profile_id.in_(active_profile_ids)) | (YouTubeChannel.owner_profile_id == None)
        )
        
        # 1. First look for channels where cultivation_active == True
        active_channels = query.filter(YouTubeChannel.cultivation_active == True).all()
        
        # 2. If none have cultivation_active set, auto-enroll pending channels with INITIAL strategy
        if not active_channels:
            idle_channels = query.filter(YouTubeChannel.warmup_stage < 3).all()
            if idle_channels:
                for ch in idle_channels:
                    ch.cultivation_active = True
                    if not ch.cultivation_strategy:
                        ch.cultivation_strategy = "INITIAL"
                db.commit()
                active_channels = idle_channels
                logger.info(f"🌱 [Scheduler] Auto-enrolled {len(active_channels)} pending channels into INITIAL cultivation strategy")
        
        if not active_channels:
            return {
                "success": True,
                "processed": 0,
                "success": 0,
                "failed": 0,
                "message": "스케줄러를 실행할 채널이 없습니다. 채널의 육성 활성화 스위치를 켜주세요."
            }
            
        channel_ids = [ch.channel_id for ch in active_channels]
        for ch in active_channels:
            ch.warmup_status = "QUEUED"
        db.commit()

        threading.Thread(target=_run_bulk_channels_worker, args=(channel_ids, True), daemon=True).start()

        return {
            "success": True,
            "processed": len(active_channels),
            "success": len(active_channels),
            "failed": 0,
            "message": f"{len(active_channels)}개 채널의 오토 스케줄러 웜업이 백그라운드 큐에서 순차 시작되었습니다."
        }
    except Exception as e:
        logger.error(f"[AutoScheduler] Error: {e}", exc_info=True)
        raise HTTPException(500, f"Auto scheduler failed: {str(e)}")
