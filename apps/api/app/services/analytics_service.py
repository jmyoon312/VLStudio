import logging
import json
import re
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app import crud, models
from app.llm_manager import LLMClient
from app.services.channel_network_guard import channel_network_guard

logger = logging.getLogger(__name__)


def parse_json_safely(raw_text: str) -> Any:
    clean = raw_text.strip()
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", clean)
    if match:
        clean = match.group(1).strip()
    try:
        return json.loads(clean)
    except Exception:
        first_bracket = min([i for i in [clean.find('{'), clean.find('[')] if i != -1], default=-1)
        last_bracket = max([clean.rfind('}'), clean.rfind(']')], default=-1)
        if first_bracket != -1 and last_bracket != -1 and last_bracket > first_bracket:
            try:
                return json.loads(clean[first_bracket:last_bracket+1])
            except Exception:
                pass
        return None

class AnalyticsService:
    @staticmethod
    def get_channel_analytics(db: Session, channel_id: str = "all", time_range: str = "monthly") -> Dict[str, Any]:
        """
        채널별 및 전체 기간별(daily, weekly, monthly, quarterly, yearly) 수익률 및 통계 집계
        """
        range_days = {
            "daily": 1,
            "weekly": 7,
            "monthly": 30,
            "quarterly": 90,
            "yearly": 365
        }.get(time_range, 30)

        channels = db.query(models.BrandChannel).all()
        channels_info = []
        for c in channels:
            sec = channel_network_guard.get_channel_security_summary(db, c.channel_id)
            channels_info.append({
                "id": c.channel_id,
                "title": c.title,
                "thumbnail": c.thumbnail_url,
                "security": sec
            })

        active_security = channel_network_guard.get_channel_security_summary(db, channel_id)

        query = db.query(models.ChannelMetricHistory).filter(models.ChannelMetricHistory.period == time_range)
        if channel_id and channel_id != "all":
            query = query.filter(models.ChannelMetricHistory.channel_id == channel_id)
        
        metrics = query.all()

        if not metrics:
            metrics = AnalyticsService._seed_metrics_if_empty(db, channels, time_range)

        total_views = sum(m.views for m in metrics) or (18500 * range_days)
        total_watch_hours = sum(m.watch_time_hours for m in metrics) or round(total_views * 0.012, 1)
        avg_rpm = sum(m.rpm for m in metrics) / len(metrics) if metrics else 42.0
        total_revenue = sum(m.estimated_revenue for m in metrics) or round((total_views / 1000) * avg_rpm)
        total_cost = sum(m.production_cost for m in metrics) or round(total_revenue * 0.14)
        net_profit = total_revenue - total_cost
        roi_percentage = round((net_profit / max(total_cost, 1)) * 100)
        total_subs = sum(m.subscribers for m in metrics) or 12800
        sub_increase = sum(m.sub_increase for m in metrics) or (45 * range_days)
        avg_ctr = sum(m.ctr for m in metrics) / len(metrics) if metrics else 6.8

        trend_chart = []
        points_count = 7 if time_range in ["daily", "weekly"] else 10
        base_daily_views = total_views / max(range_days, 1)
        now = datetime.now()
        for i in range(points_count - 1, -1, -1):
            step_date = now - timedelta(days=i * (max(range_days // points_count, 1)))
            point_views = int(base_daily_views * (0.8 + 0.4 * ((i * 7) % 5 / 5.0)))
            point_rev = round((point_views / 1000) * avg_rpm)
            point_cost = round(point_rev * 0.14)
            trend_chart.append({
                "date": step_date.strftime("%m-%d" if time_range != "yearly" else "%Y-%m"),
                "views": point_views,
                "revenue": point_rev,
                "net_profit": point_rev - point_cost,
                "cost": point_cost
            })

        query_logs = db.query(models.VideoPerformanceLog)
        if channel_id and channel_id != "all":
            query_logs = query_logs.filter(models.VideoPerformanceLog.channel_id == channel_id)
        logs = query_logs.all()
        if not logs:
            logs = AnalyticsService._seed_video_logs(db, channel_id)

        viral_videos = [
            {
                "id": log.video_id,
                "title": log.title,
                "views": log.views,
                "retention_rate_3s": log.retention_rate_3s,
                "retention_rate_5s": log.retention_rate_5s,
                "hook_score": log.hook_score,
                "strength_feedback": log.strength_feedback or "강렬한 질문형 오프닝과 빠른 템포 전환으로 초반 이탈 완벽 방어",
                "thumbnail_url": log.thumbnail_url
            }
            for log in logs if log.status_tier == "viral"
        ]

        underperforming_videos = [
            {
                "id": log.video_id,
                "title": log.title,
                "views": log.views,
                "retention_rate_3s": log.retention_rate_3s,
                "retention_rate_5s": log.retention_rate_5s,
                "hook_score": log.hook_score,
                "weakness_feedback": log.weakness_feedback or "초반 3초 내에 핵심 호기심 미제공, 첫 컷 장면 전환 지연으로 이탈 발생",
                "diagnosis_summary": log.diagnosis_summary,
                "thumbnail_url": log.thumbnail_url
            }
            for log in logs if log.status_tier == "underperforming"
        ]

        return {
            "time_range": time_range,
            "selected_channel": channel_id,
            "channels": channels_info,
            "active_security": active_security,
            "summary": {
                "views": total_views,
                "watch_time_hours": total_watch_hours,
                "estimated_revenue": total_revenue,
                "rpm": round(avg_rpm, 1),
                "production_cost": total_cost,
                "net_profit": net_profit,
                "roi_percentage": roi_percentage,
                "subscribers": total_subs,
                "sub_increase": sub_increase,
                "ctr": round(avg_ctr, 1)
            },
            "trend_chart": trend_chart,
            "viral_videos": viral_videos,
            "underperforming_videos": underperforming_videos
        }

    @staticmethod
    def _seed_metrics_if_empty(db: Session, channels: List[models.BrandChannel], period: str) -> List[models.ChannelMetricHistory]:
        seeded = []
        multiplier = {"daily": 1, "weekly": 7, "monthly": 30, "quarterly": 90, "yearly": 365}.get(period, 30)
        
        target_channels = channels if channels else [
            models.BrandChannel(channel_id="ch_default_1", title="ViraLoop Shorts #1"),
            models.BrandChannel(channel_id="ch_default_2", title="Knowledge Lab #2")
        ]

        for i, ch in enumerate(target_channels):
            views = (12000 + i * 4500) * multiplier
            rpm = 38.0 + (i * 6.5)
            rev = round((views / 1000) * rpm)
            cost = round(rev * 0.13)
            profit = rev - cost
            roi = round((profit / max(cost, 1)) * 100)
            
            metric = models.ChannelMetricHistory(
                channel_id=ch.channel_id or f"ch_{i+1}",
                channel_name=ch.title or f"채널 {i+1}",
                period=period,
                record_date=datetime.now(),
                views=views,
                watch_time_hours=round(views * 0.015, 1),
                subscribers=4500 + (i * 3200),
                sub_increase=20 * multiplier,
                estimated_revenue=rev,
                rpm=rpm,
                production_cost=cost,
                net_profit=profit,
                roi_percentage=roi,
                ctr=6.5 + (i * 0.8)
            )
            db.add(metric)
            seeded.append(metric)
        
        try:
            db.commit()
        except Exception:
            db.rollback()
        return seeded

    @staticmethod
    def _seed_video_logs(db: Session, channel_id: str) -> List[models.VideoPerformanceLog]:
        logs = [
            models.VideoPerformanceLog(
                channel_id=channel_id if channel_id != "all" else "ch_default_1",
                video_id="v_viral_01",
                title="단 3초 만에 10억 번 비밀 실화 쇼츠",
                thumbnail_url="",
                views=148000,
                retention_rate_3s=89.5,
                retention_rate_5s=82.1,
                average_view_duration_sec=52.4,
                hook_score=94.0,
                status_tier="viral",
                diagnosis_summary="초반 3초 파괴적 호기심 유발 및 시청 지속률 80% 이상 유지",
                strength_feedback="1. 첫 대사에 결론을 숨긴 채 '이 사람 때문에 전 세계가 멈췄습니다'라는 강한 후킹\n2. 2.5초마다 빠른 시각 전환 및 시네마틱 사운드 효과 극대화\n3. 다음 편 예고를 통한 구독 유도 전환율 12% 달성",
                analyzed_at=datetime.now()
            ),
            models.VideoPerformanceLog(
                channel_id=channel_id if channel_id != "all" else "ch_default_2",
                video_id="v_under_01",
                title="일상에서 유용한 과학 상식 5가지 모음",
                thumbnail_url="",
                views=3200,
                retention_rate_3s=41.2,
                retention_rate_5s=28.7,
                average_view_duration_sec=18.3,
                hook_score=48.0,
                status_tier="underperforming",
                diagnosis_summary="초반 인트로가 너무 길고 교과서적인 설명으로 인해 3초 내 58% 시청자 이탈 발생",
                weakness_feedback="1. 도입부 인사말('안녕하세요 여러분') 완전 제거 필요 - 즉각적인 충격 질문으로 시작할 것\n2. 썸네일의 약속과 첫 5초 영상 내용 불일치\n3. BGM 템포가 느려 쇼츠 알고리즘에서 정적인 느낌을 줌 -> 120BPM 이상 빠른 음향 추천",
                analyzed_at=datetime.now()
            )
        ]
        for log in logs:
            db.add(log)
        try:
            db.commit()
        except Exception:
            db.rollback()
        return logs

    @staticmethod
    def diagnose_video_with_ai(
        db: Session,
        video_id: str,
        title: str,
        retention_rate_3s: float,
        retention_rate_5s: float,
        views: int
    ) -> Dict[str, Any]:
        """
        루피 AI 브레인을 통한 영상 후킹 및 성공/실패 원인 심층 분석
        (DB Settings의 script_analysis_model 단일 진실 공급원 연동)
        """
        settings = crud.get_settings(db)
        target_model = (
            getattr(settings, "script_analysis_model", None) or
            getattr(settings, "default_llm_model", None) or
            "viraloop1"
        )
        llm_client = LLMClient(settings)

        is_viral = retention_rate_3s >= 75.0 or views >= 50000
        prompt = f"""
당신은 유튜브 알고리즘 및 숏폼/롱폼 후킹 엔지니어링 총괄 책임자 '루피 AI(Loopie)'입니다.
아래 영상의 성과 데이터를 분석하여, 후킹 성공/실패 원인과 즉각적인 액션 가이드를 JSON 형식으로 출력하세요.

[영상 데이터]
- 제목: {title}
- 조회수: {views:,}회
- 초반 3초 시청 지속률: {retention_rate_3s}%
- 초반 5초 시청 지속률: {retention_rate_5s}%
- 판정: {'대박(Viral)' if is_viral else '저조(Underperforming)'}

[출력 JSON 규격]
{{
  "hook_score": 0~100 사이 숫자,
  "status_tier": "{'viral' if is_viral else 'underperforming'}",
  "diagnosis_summary": "한 줄 요약 진단",
  "weakness_feedback": "초반 후킹 약점 분석 및 다음 영상 대본 수정 3대 핵심 포인트",
  "strength_feedback": "성공 요인 분석 및 향후 프롬프트/대본에 복제 적용할 성공 DNA",
  "recommended_hook_script": "루피가 추천하는 초반 3초 파괴적 대체 오프닝 대본 (2~3문장)"
}}
반드시 마크다운 없이 유효한 JSON만 반환하세요.
"""

        try:
            raw_response = llm_client.generate_content(prompt, model_name=target_model)
            parsed = parse_json_safely(raw_response)
            if not parsed:
                raise ValueError("JSON parse failed")
        except Exception as e:
            logger.warning(f"AI diagnosis failed: {e}. Fallback to rule-based diagnosis.")
            parsed = {
                "hook_score": 88.0 if is_viral else 45.0,
                "status_tier": "viral" if is_viral else "underperforming",
                "diagnosis_summary": "초반 3초 몰입도 높은 연출 성공" if is_viral else "초반 3초 이탈률 과다로 인한 알고리즘 노출 제한",
                "weakness_feedback": "도입부 호기심 유발 부족 및 텍스트 폰트 가독성 미흡" if not is_viral else "없음",
                "strength_feedback": "첫 장면의 강력한 시각적 충격과 속도감 있는 전개" if is_viral else "주제 자체의 잠재력은 충분함",
                "recommended_hook_script": "지금 이 영상을 보지 않으면 당신의 채널은 영원히 멈춥니다."
            }

        log = db.query(models.VideoPerformanceLog).filter(models.VideoPerformanceLog.video_id == video_id).first()
        if not log:
            log = models.VideoPerformanceLog(
                channel_id="ch_default",
                video_id=video_id,
                title=title
            )
            db.add(log)

        log.views = views
        log.retention_rate_3s = retention_rate_3s
        log.retention_rate_5s = retention_rate_5s
        log.hook_score = float(parsed.get("hook_score", 50.0))
        log.status_tier = parsed.get("status_tier", "normal")
        log.diagnosis_summary = parsed.get("diagnosis_summary", "")
        log.weakness_feedback = parsed.get("weakness_feedback", "")
        log.strength_feedback = parsed.get("strength_feedback", "")
        log.analyzed_at = datetime.now()

        try:
            db.commit()
            db.refresh(log)
        except Exception:
            db.rollback()

        return parsed
