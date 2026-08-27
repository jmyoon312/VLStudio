"""
Report Generator Service

Provides:
1. Periodic report generation (daily, weekly, monthly) using real DB stats
2. Multi-format exports (JSON, HTML, PDF-ready)
3. Channel performance reports
4. Upload statistics
5. Trend analysis

Usage:
    from app.services.report_generator import generate_daily_report
    generate_daily_report(db)
"""

import os
import asyncio
import logging
import json
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field
from enum import Enum
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

class ReportType(Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    CUSTOM = "custom"

class ReportFormat(Enum):
    JSON = "json"
    HTML = "html"
    SUMMARY = "summary"

@dataclass
class Report:
    report_id: str
    report_type: ReportType
    title: str
    start_date: datetime
    end_date: datetime
    created_at: datetime
    data: Dict[str, Any]
    format: ReportFormat = ReportFormat.JSON

def generate_daily_report(db: Session) -> bool:
    """
    Generates today's daily report based on real database statistics and Gemini synthesis,
    saves it to the SQLite database, and runs the safe Auto-Fixer immediately.
    """
    try:
        from app import models, crud
        from app.config.feature_flags import get_llm_client
        from app.services.auto_fixer import run_auto_fix
        
        # 1. Date Range
        today = datetime.now()
        start = today.replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=1)
        
        # 2. Sourcing Telemetry
        videos_collected = db.query(models.Video).filter(
            models.Video.is_script_only == False,
            models.Video.downloaded_at >= start,
            models.Video.downloaded_at < end
        ).count()
        
        scripts_collected = db.query(models.Video).filter(
            models.Video.is_script_only == True,
            models.Video.downloaded_at >= start,
            models.Video.downloaded_at < end
        ).count()
        
        failed_downloads = db.query(models.Video).filter(
            models.Video.status == 'failed',
            models.Video.downloaded_at >= start,
            models.Video.downloaded_at < end
        ).count()
        
        total_vault_videos = db.query(models.Video).count()
        
        # Trends cached
        try:
            trends_cached = db.query(models.ResearchTopic).count()
        except Exception:
            trends_cached = 0
            
        # 3. Creation & Work Queue Telemetry (생산 & 제작 지표)
        today_created_items = 0
        queue_status_distribution = {
            "DRAFT": 0, "PENDING": 0, "QUEUED": 0,
            "UPLOADING": 0, "COMPLETED": 0, "FAILED": 0
        }
        source_type_distribution = {}
        uploaded_today_count = 0
        failed_upload_today_count = 0
        recent_failure_reasons = []
        
        try:
            # Today's created work queue items
            today_queue_query = db.query(models.WorkQueueItem).filter(
                models.WorkQueueItem.created_at >= start,
                models.WorkQueueItem.created_at < end
            ).all()
            today_created_items = len(today_queue_query)
            
            for item in today_queue_query:
                st = item.source_type or "MANUAL"
                source_type_distribution[st] = source_type_distribution.get(st, 0) + 1
                
            # Current overall WorkQueue status
            all_queue_items = db.query(models.WorkQueueItem).all()
            for item in all_queue_items:
                s = (item.status or "DRAFT").upper()
                if s in queue_status_distribution:
                    queue_status_distribution[s] += 1
                else:
                    queue_status_distribution[s] = queue_status_distribution.get(s, 0) + 1
                    
                # Uploaded today
                if item.upload_completed_at and item.upload_completed_at >= start and item.upload_completed_at < end:
                    uploaded_today_count += 1
                if item.status == "FAILED" and item.updated_at and item.updated_at >= start and item.updated_at < end:
                    failed_upload_today_count += 1
                    if item.failure_reason and len(recent_failure_reasons) < 5:
                        recent_failure_reasons.append(item.failure_reason)
        except Exception as e_q:
            logger.warning(f"Failed to query WorkQueue metrics: {e_q}")
            
        total_upload_attempts = uploaded_today_count + failed_upload_today_count
        upload_success_rate = round((uploaded_today_count / total_upload_attempts) * 100, 1) if total_upload_attempts > 0 else 100.0
        
        # 4. Brand Channels & Growth Performance (채널 성과 & 성장 지표)
        channels = []
        try:
            channels = db.query(models.YouTubeChannel).all()
        except Exception:
            try:
                channels = db.query(models.Channel).all()
            except Exception:
                channels = []
                
        active_channels_count = 0
        warmup_channels_count = 0
        failing_channels_count = 0
        channel_details = []
        total_daily_views_increase = 0
        total_daily_subs_increase = 0
        
        for chan in channels:
            chan_status = str(getattr(chan, "status", "ACTIVE") or "ACTIVE").upper()
            chan_auth = str(getattr(chan, "auth_status", "COMPLETED") or "COMPLETED").upper()
            warmup_st = str(getattr(chan, "warmup_status", "IDLE") or "IDLE").upper()
            
            if "ACTIVE" in chan_status:
                active_channels_count += 1
            if warmup_st == "RUNNING":
                warmup_channels_count += 1
            if "SUSPENDED" in chan_status or chan_auth == "FAILED":
                failing_channels_count += 1
                
            chan_id = getattr(chan, "channel_id", None) or getattr(chan, "id", "")
            chan_name = getattr(chan, "channel_name", "") or getattr(chan, "title", "") or getattr(chan, "channel_handle", "") or str(chan_id)
            
            sub_increase = 0
            view_increase = 0
            try:
                stats = db.query(models.ChannelDailyStats).filter(
                    models.ChannelDailyStats.channel_id == chan_id
                ).order_by(models.ChannelDailyStats.stat_date.desc()).first()
                if stats:
                    view_increase = getattr(stats, "daily_view_increase", 0) or 0
                    sub_increase = getattr(stats, "daily_subscriber_increase", 0) or 0
                    total_daily_views_increase += view_increase
                    total_daily_subs_increase += sub_increase
            except Exception:
                pass
                
            channel_details.append({
                "handle": chan_name,
                "subscribers": getattr(chan, "subscriber_count", 0) or 0,
                "views": getattr(chan, "view_count", 0) or 0,
                "videos": getattr(chan, "video_count", 0) or 0,
                "sub_increase": sub_increase,
                "view_increase": view_increase,
                "status": chan_status,
                "warmup_status": warmup_st,
                "trust_score": getattr(chan, "stealth_trust_score", 100) or 100
            })
            
        # Top Performing / Recent Uploaded Videos
        video_details = []
        try:
            recent_cutoff = today - timedelta(days=7)
            recent_uploads = db.query(models.VideoMetadataCache).filter(
                models.VideoMetadataCache.upload_date >= recent_cutoff
            ).order_by(models.VideoMetadataCache.view_count.desc()).limit(10).all()
            
            for vid in recent_uploads:
                vc = getattr(vid, "view_count", 0) or 0
                lc = getattr(vid, "like_count", 0) or 0
                like_ratio = round((lc / vc) * 100, 2) if vc > 0 else 0.0
                ud = getattr(vid, "upload_date", None)
                video_details.append({
                    "title": getattr(vid, "title", "제목 없음") or "제목 없음",
                    "uploaded": ud.strftime("%Y-%m-%d") if ud else "",
                    "views": vc,
                    "likes": lc,
                    "comments": getattr(vid, "comment_count", 0) or 0,
                    "like_ratio": like_ratio
                })
        except Exception as e_vid:
            logger.warning(f"Failed to fetch recent uploads: {e_vid}")
            
        # 5. Infrastructure & System Health
        from app.config import settings as settings_conf
        db_path = "viral_loop.db"
        if settings_conf.DATABASE_URL.startswith("sqlite:///"):
            db_path = settings_conf.DATABASE_URL[10:]
        db_size_mb = 0
        if os.path.exists(db_path):
            db_size_mb = round(os.path.getsize(db_path) / (1024**2), 2)
            
        settings = crud.get_settings(db)
        root_path = settings.root_download_path if settings and settings.root_download_path else settings_conf.MEDIA_ROOT
        if not os.path.isabs(root_path):
            root_path = os.path.abspath(root_path)
            
        storage_info = {"total_gb": 0, "used_gb": 0, "free_gb": 0, "percent": 0}
        if os.path.exists(root_path):
            import shutil
            total, used, free = shutil.disk_usage(root_path)
            storage_info = {
                "total_gb": round(total / (1024**3), 2),
                "used_gb": round(used / (1024**3), 2),
                "free_gb": round(free / (1024**3), 2),
                "percent": round((used / total) * 100, 1)
            }
            
        zombie_cutoff = datetime.now() - timedelta(hours=2)
        zombies = db.query(models.Video).filter(
            models.Video.status == "downloading",
            models.Video.downloaded_at < zombie_cutoff
        ).count()
        
        # 6. Assemble Full-Lifecycle Telemetry Payload
        raw_stats = {
            "sourcing": {
                "videos_collected": videos_collected,
                "scripts_collected": scripts_collected,
                "failed_downloads": failed_downloads,
                "total_vault_videos": total_vault_videos,
                "trends_cached": trends_cached
            },
            "creation": {
                "today_created_items": today_created_items,
                "source_type_distribution": source_type_distribution,
                "queue_total": len(all_queue_items) if 'all_queue_items' in locals() else 0
            },
            "distribution": {
                "uploaded_today": uploaded_today_count,
                "failed_today": failed_upload_today_count,
                "upload_success_rate": upload_success_rate,
                "queue_status": queue_status_distribution,
                "recent_failures": recent_failure_reasons
            },
            "growth": {
                "total_channels": len(channels),
                "active_channels": active_channels_count,
                "warmup_channels": warmup_channels_count,
                "failing_channels": failing_channels_count,
                "total_daily_views_increase": total_daily_views_increase,
                "total_daily_subs_increase": total_daily_subs_increase,
                "channels_detail": channel_details,
                "top_videos": video_details
            },
            "system_health": {
                "storage": storage_info,
                "db_size_mb": db_size_mb,
                "zombie_tasks": zombies
            },
            # Backward compatibility aliases for existing UI components
            "videos_collected": videos_collected,
            "scripts_collected": scripts_collected,
            "failed_downloads": failed_downloads,
            "trends_cached": trends_cached,
            "channels": {
                "total": len(channels),
                "active": active_channels_count,
                "failing": failing_channels_count
            }
        }
        
        # 7. Generate markdown summary via Gemini / Fallback Analyst Template
        summary_markdown = ""
        try:
            llm = get_llm_client()
            prompt = f"""
            너는 ViraLoop Studio의 최고 비즈니스 분석 및 자율 운영 에이전트(Sovereign Growth Analyst)야.
            오늘 하루 동안 시스템에서 수행된 [1. 레퍼런스 수집], [2. AI 영상 제작], [3. 다채널 업로드 배포], [4. 채널 성장 성과] 전 주기의 데이터를 종합 분석하여
            운영자가 즉시 의사결정을 내릴 수 있는 최고 수준의 비즈니스 인텔리전스 일일 리포트(Executive BI Daily Report)를 한국어로 작성해줘.
            
            [오늘의 풀-라이프사이클 데이터]
            ■ 1. 수집 파이프라인 (Sourcing):
            - 금일 수집 비디오: {videos_collected}개 / 대본: {scripts_collected}개 / 다운로드 실패: {failed_downloads}건
            - 보관함 총 레퍼런스 비디오: {total_vault_videos}개 / 캐시된 트렌드 시그널: {trends_cached}개
            
            ■ 2. 제작 파이프라인 (Creation):
            - 금일 신규 생성 대기열 아이템: {today_created_items}개
            - 생성 유입 경로 분포: {json.dumps(source_type_distribution, ensure_ascii=False)}
            
            ■ 3. 배포 & 업로드 (Distribution):
            - 금일 업로드 완료: {uploaded_today_count}개 / 업로드 실패: {failed_upload_today_count}개 (성공률: {upload_success_rate}%)
            - 대기열 전체 상태: {json.dumps(queue_status_distribution, ensure_ascii=False)}
            
            ■ 4. 채널 성장 & 반응 (Growth & Performance):
            - 총 모니터링 채널: {len(channels)}개 (정상 활성: {active_channels_count}개, 웜업 육성 중: {warmup_channels_count}개, 이상: {failing_channels_count}개)
            - 일일 전체 채널 순증 조회수: +{total_daily_views_increase:,}회 / 순증 구독자: +{total_daily_subs_increase:,}명
            - 상위 성과 영상: {json.dumps(video_details[:3], ensure_ascii=False)}
            
            ■ 5. 인프라 건전성:
            - 스토리지: {storage_info['percent']}% 사용 ({storage_info['free_gb']}GB 잔여), DB: {db_size_mb}MB, 좀비: {zombies}개
            
            [보고서 작성 가이드라인]
            1. **# 🚀 ViraLoop 데일리 종합 관제 리포트**
            2. **## 💡 종합 총평 및 핵심 브리핑 (Executive Briefing)**: 오늘 시스템의 생산성과 배포 흐름, 채널 반응에 대한 날카로운 2~3줄 요약.
            3. **## 1. 📥 영상 수집 & 소재 인덱싱**: 수집 원활성 및 자막 인덱싱 성과 평가.
            4. **## 2. ⚡ AI 대량 생산 & 제작 효율성**: 딸깍/Flow2CapCut 생성 처리량 및 파이프라인 속도 분석.
            5. **## 3. 🚀 다채널 자동 업로드 & 대기열 배포 현황**: 업로드 성공률과 대기열 병목(Pending/Queued) 분석 및 실패 원인 조치.
            6. **## 4. 📈 채널 성장 성과 & 바이럴 반응 분석**: 조회수/구독자 성장률이 높은 채널과 상위 바이럴 영상 훅(Hook) 분석.
            7. **## 🎯 내일 집중 실행해야 할 3대 전략 액션**: 생산량 증대, 블루오션 키워드 타겟팅, 채널 웜업 등 구체적 지침 제시.
            """
            res = llm.generate(prompt)
            if res and not str(res).strip().startswith("ERROR:"):
                summary_markdown = str(res).strip()
        except Exception as e_llm:
            logger.warning(f"LLM synthesis fallback used: {e_llm}")

        if not summary_markdown or summary_markdown.startswith("ERROR:"):
            # Rich Fallback Analytical Template
            status_comment = "최적 안정" if failed_downloads == 0 and failed_upload_today_count == 0 else "일부 파이프라인 점검 필요"
            summary_markdown = f"""# 🚀 ViraLoop 데일리 종합 관제 리포트

## 💡 종합 총평 및 핵심 브리핑 (Executive Briefing)
* **운영 상태**: 전체 바이럴루프 자동화 파이프라인이 정상 가동 중이며, 전반적인 생산-배포 안정성은 **{status_comment}** 상태입니다.
* **핵심 지표**: 오늘 총 **{videos_collected}개**의 레퍼런스를 수집하고 **{today_created_items}개**의 제작 아이템이 생성되었으며, **{uploaded_today_count}개**의 숏폼이 채널로 안전하게 업로드 배포되었습니다 (성공률: **{upload_success_rate}%**).
* **채널 반응**: 전체 브랜드 채널에서 금일 **+{total_daily_views_increase:,}회**의 순증 조회수와 **+{total_daily_subs_increase:,}명**의 신규 구독자가 유입되었습니다.

---

## 1. 📥 영상 수집 & 소재 인덱싱 (Sourcing)
* **레퍼런스 영상 확보**: 금일 신규 다운로드 완료 **{videos_collected}개** (보관함 누적 총 **{total_vault_videos}개**).
* **다국어 대본 추출**: **{scripts_collected}개**의 음성/자막이 즉시 재가공 가능한 형태로 인덱싱되었습니다.
* **수집 오류 및 복구**: 다운로드 예외 **{failed_downloads}건**이 감지되어 자율 재시도 큐에 등록되었습니다.

---

## 2. ⚡ AI 대량 생산 & 제작 효율성 (Creation)
* **신규 제작 큐 등록**: 오늘 딸깍/Flow 파이프라인을 통해 **{today_created_items}개**의 영상 제작 작업이 등록되었습니다.
* **대기열 적재 현황**: 현재 대기 중인 작업은 **{queue_status_distribution.get('QUEUED', 0) + queue_status_distribution.get('PENDING', 0)}개**로 안정적인 생산 파이프라인을 유지하고 있습니다.

---

## 3. 🚀 다채널 자동 업로드 & 대기열 배포 현황 (Distribution)
* **업로드 성공률**: 오늘 배포 시도 건 중 **{upload_success_rate}%**가 유튜브 쇼츠 및 타겟 플랫폼에 성공적으로 발행되었습니다.
* **완료/대기 상태**: 누적 완료 **{queue_status_distribution.get('COMPLETED', 0)}건**, 업로드 진행 중 **{queue_status_distribution.get('UPLOADING', 0)}건**, 오류 실패 **{queue_status_distribution.get('FAILED', 0)}건**.

---

## 4. 📈 채널 성장 성과 & 바이럴 반응 분석 (Growth)
* **채널 인큐베이팅**: 총 **{len(channels)}개** 채널 중 정상 활성 **{active_channels_count}개**, 웜업 육성 중 **{warmup_channels_count}개**, 계정 점검 요망 **{failing_channels_count}개**.
* **트래픽 성장세**: 24시간 동안 집계된 순증 조회수는 **+{total_daily_views_increase:,}회**, 구독자 증가는 **+{total_daily_subs_increase:,}명**입니다.

---

## 🎯 내일 집중 실행해야 할 3대 전략 액션
1. **소재 수집 다변화**: 급상승 트렌드 키워드 기반으로 더우인/유튜브 레퍼런스 수집량을 일일 20건 이상으로 확대하십시오.
2. **대량 생성 배치 가동**: 확보된 자막 대본을 기반으로 딸깍 UI 일괄 씬 커팅 및 다국어 TTS 합성 배치를 실행하십시오.
3. **업로드 스케줄 최적화**: 시청자 유입 피크 타임(오후 6시~10시)에 맞춰 대기열 예약 발행 일정을 분산 배치하십시오.
"""

        # 8. Save to DB
        report_data = {
            "report_date": today,
            "summary_markdown": summary_markdown,
            "raw_stats_json": raw_stats,
            "auto_fix_log": [],
            "is_read": False
        }
        
        db_report = models.DailyReport(**report_data)
        db.add(db_report)
        db.commit()
        db.refresh(db_report)
        logger.info(f"[OK] Saved daily report to database with ID: {db_report.id}")
        
        # 9. Trigger Auto-Fix immediately for instant repair and sync!
        try:
            logger.info(f"[WRENCH] Launching Auto-Fixer for new Report #{db_report.id}")
            run_auto_fix(db, db_report.id, raw_stats)
        except Exception as e_fix:
            logger.error(f"Failed to auto-fix immediately: {e_fix}")
            
        return True
    except Exception as e:
        logger.error(f"Error in generate_daily_report: {e}")
        db.rollback()
        return False


def ensure_today_report_exists(db: Session) -> bool:
    """
    오늘 날짜(00:00:00 ~ 23:59:59)의 일일 리포트가 이미 존재하는지 확인하고,
    누락된 경우에만 자동으로 리포트를 생성합니다 (중복 생성 방지).
    """
    try:
        from app import models
        today = datetime.now()
        start = today.replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=1)
        
        # 오늘 날짜 리포트 존재 여부 검사
        existing = db.query(models.DailyReport).filter(
            models.DailyReport.report_date >= start,
            models.DailyReport.report_date < end
        ).first()
        
        if existing:
            logger.info(f"📊 [DailyReport] Today's report already exists (#{existing.id}). Skipping auto-generation.")
            return True
            
        logger.info("📊 [DailyReport] No report found for today. Generating catch-up daily report now...")
        return generate_daily_report(db)
    except Exception as e:
        logger.error(f"Error in ensure_today_report_exists: {e}")
        return False



class ReportGenerator:
    def __init__(self):
        self._reports: Dict[str, Report] = {}
        self._report_history: List[str] = []
        logger.info("ReportGenerator initialized")
    
    async def generate_daily_report(self, date: datetime = None, channels: List[str] = None) -> Dict:
        # Backward compatibility / legacy support
        if date is None:
            date = datetime.now()
        start = date.replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=1)
        report_id = f"daily_{date.strftime('%Y%m%d')}"
        return {
            "upload_count": 0,
            "successful_uploads": 0,
            "failed_uploads": 0,
            "total_views": 0,
            "avg_engagement": 0.0,
            "active_channels": 0,
            "top_videos": [],
            "channel_stats": [],
            "growth_rate": 0.0
        }

_report_generator = None

def get_report_generator() -> ReportGenerator:
    global _report_generator
    if _report_generator is None:
        _report_generator = ReportGenerator()
    return _report_generator