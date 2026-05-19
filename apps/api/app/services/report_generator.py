"""
Report Generator Service

Provides:
1. Periodic report generation (daily, weekly, monthly)
2. Multi-format exports (JSON, HTML, PDF-ready)
3. Channel performance reports
4. Upload statistics
5. Trend analysis

Usage:
    report = ReportGenerator()
    
    # Generate daily report
    daily = await report.generate_daily_report()
    
    # Get weekly summary
    weekly = await report.generate_weekly_report()
    
    # Export
    await report.export_report("daily_2026-04-27", format="html")
"""

import os
import asyncio
import logging
import json
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field
from enum import Enum
from collections import defaultdict

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


class ReportGenerator:
    def __init__(self):
        self._reports: Dict[str, Report] = {}
        self._report_history: List[str] = []
        
        logger.info("ReportGenerator initialized")
    
    async def generate_daily_report(
        self,
        date: datetime = None,
        channels: List[str] = None
    ) -> Dict:
        if date is None:
            date = datetime.now()
        
        start = date.replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=1)
        
        report_id = f"daily_{date.strftime('%Y%m%d')}"
        
        report_data = await self._gather_report_data(
            start, end, channels
        )
        
        report_data["summary"] = {
            "total_uploads": report_data.get("upload_count", 0),
            "successful_uploads": report_data.get("successful_uploads", 0),
            "failed_uploads": report_data.get("failed_uploads", 0),
            "total_views": report_data.get("total_views", 0),
            "avg_engagement": report_data.get("avg_engagement", 0),
            "channels_active": report_data.get("active_channels", 0)
        }
        
        report = Report(
            report_id=report_id,
            report_type=ReportType.DAILY,
            title=f"Daily Report - {date.strftime('%Y-%m-%d')}",
            start_date=start,
            end_date=end,
            created_at=datetime.now(),
            data=report_data
        )
        
        self._reports[report_id] = report
        self._report_history.append(report_id)
        
        logger.info(f"📊 Generated daily report: {report_id}")
        
        return report_data
    
    async def generate_weekly_report(
        self,
        week_start: datetime = None,
        channels: List[str] = None
    ) -> Dict:
        if week_start is None:
            today = datetime.now()
            week_start = today - timedelta(days=today.weekday())
        
        start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=7)
        
        report_id = f"weekly_{start.strftime('%Y%m%d')}"
        
        report_data = await self._gather_report_data(
            start, end, channels
        )
        
        daily_breakdown = await self._get_daily_breakdown(start, end, channels)
        
        report_data["summary"] = {
            "period": f"{start.strftime('%Y-%m-%d')} ~ {(end - timedelta(days=1)).strftime('%Y-%m-%d')}",
            "total_uploads": report_data.get("upload_count", 0),
            "successful_uploads": report_data.get("successful_uploads", 0),
            "failed_uploads": report_data.get("failed_uploads", 0),
            "total_views": report_data.get("total_views", 0),
            "avg_daily_uploads": round(report_data.get("upload_count", 0) / 7, 1),
            "top_performing_videos": report_data.get("top_videos", [])[:5],
            "channel_rankings": report_data.get("channel_stats", [])[:5]
        }
        
        report_data["daily_breakdown"] = daily_breakdown
        
        report = Report(
            report_id=report_id,
            report_type=ReportType.WEEKLY,
            title=f"Weekly Report - {start.strftime('%Y-%m-%d')}",
            start_date=start,
            end_date=end,
            created_at=datetime.now(),
            data=report_data
        )
        
        self._reports[report_id] = report
        self._report_history.append(report_id)
        
        logger.info(f"📊 Generated weekly report: {report_id}")
        
        return report_data
    
    async def generate_monthly_report(
        self,
        year: int = None,
        month: int = None,
        channels: List[str] = None
    ) -> Dict:
        now = datetime.now()
        if year is None:
            year = now.year
        if month is None:
            month = now.month
        
        start = datetime(year, month, 1)
        
        if month == 12:
            end = datetime(year + 1, 1, 1)
        else:
            end = datetime(year, month + 1, 1)
        
        report_id = f"monthly_{year}{month:02d}"
        
        report_data = await self._gather_report_data(
            start, end, channels
        )
        
        days_in_month = (end - start).days
        
        report_data["summary"] = {
            "period": f"{start.strftime('%Y-%m')}",
            "days": days_in_month,
            "total_uploads": report_data.get("upload_count", 0),
            "successful_uploads": report_data.get("successful_uploads", 0),
            "failed_uploads": report_data.get("failed_uploads", 0),
            "total_views": report_data.get("total_views", 0),
            "avg_daily_uploads": round(report_data.get("upload_count", 0) / days_in_month, 1),
            "moM_growth": report_data.get("growth_rate", 0)
        }
        
        report = Report(
            report_id=report_id,
            report_type=ReportType.MONTHLY,
            title=f"Monthly Report - {start.strftime('%Y-%m')}",
            start_date=start,
            end_date=end,
            created_at=datetime.now(),
            data=report_data
        )
        
        self._reports[report_id] = report
        self._report_history.append(report_id)
        
        logger.info(f"📊 Generated monthly report: {report_id}")
        
        return report_data
    
    async def _gather_report_data(
        self,
        start: datetime,
        end: datetime,
        channels: List[str] = None
    ) -> Dict:
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
    
    async def _get_daily_breakdown(
        self,
        start: datetime,
        end: datetime,
        channels: List[str] = None
    ) -> List[Dict]:
        days = []
        current = start
        
        while current < end:
            days.append({
                "date": current.strftime("%Y-%m-%d"),
                "uploads": 0,
                "views": 0,
                "engagement": 0.0
            })
            current += timedelta(days=1)
        
        return days
    
    async def export_report(
        self,
        report_id: str,
        format: str = "json"
    ) -> Optional[str]:
        report = self._reports.get(report_id)
        if not report:
            return None
        
        report_format = ReportFormat(format.lower())
        
        if report_format == ReportFormat.JSON:
            return json.dumps(report.data, indent=2, ensure_ascii=False)
        
        elif report_format == ReportFormat.HTML:
            return await self._generate_html_report(report)
        
        elif report_format == ReportFormat.SUMMARY:
            return self._generate_summary(report)
        
        return None
    
    async def _generate_html_report(self, report: Report) -> str:
        html = f"""
<!DOCTYPE html>
<html>
<head>
    <title>{report.title}</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 40px; }}
        h1 {{ color: #333; }}
        .summary {{ background: #f5f5f5; padding: 20px; border-radius: 8px; }}
        table {{ border-collapse: collapse; width: 100%; }}
        th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
        th {{ background: #4CAF50; color: white; }}
    </style>
</head>
<body>
    <h1>{report.title}</h1>
    <p>Period: {report.start_date.strftime('%Y-%m-%d')} ~ {report.end_date.strftime('%Y-%m-%d')}</p>
    <div class="summary">
        <h2>Summary</h2>
        <pre>{json.dumps(report.data.get('summary', {}), indent=2)}</pre>
    </div>
</body>
</html>
        """
        return html
    
    def _generate_summary(self, report: Report) -> str:
        summary = report.data.get("summary", {})
        
        lines = [
            f"📊 {report.title}",
            f"기간: {report.start_date.strftime('%Y-%m-%d')} ~ {report.end_date.strftime('%Y-%m-%d')}",
            "",
            "📈 요약:",
            f"  - 총 업로드: {summary.get('total_uploads', 0)}",
            f"  - 성공: {summary.get('successful_uploads', 0)}",
            f"  - 실패: {summary.get('failed_uploads', 0)}",
            f"  - 총 조회수: {summary.get('total_views', 0)}",
        ]
        
        return "\n".join(lines)
    
    def get_report_list(
        self,
        report_type: str = None,
        limit: int = 10
    ) -> List[Dict]:
        reports = list(self._reports.values())
        
        if report_type:
            rt = ReportType(report_type.lower())
            reports = [r for r in reports if r.report_type == rt]
        
        reports = sorted(reports, key=lambda x: x.created_at, reverse=True)
        
        return [
            {
                "report_id": r.report_id,
                "title": r.title,
                "type": r.report_type.value,
                "start_date": r.start_date.isoformat(),
                "end_date": r.end_date.isoformat(),
                "created_at": r.created_at.isoformat()
            }
            for r in reports[:limit]
        ]
    
    def get_report(self, report_id: str) -> Optional[Dict]:
        report = self._reports.get(report_id)
        if not report:
            return None
        
        return {
            "report_id": report.report_id,
            "title": report.title,
            "type": report.report_type.value,
            "data": report.data
        }


_report_generator = None

def get_report_generator() -> ReportGenerator:
    global _report_generator
    if _report_generator is None:
        _report_generator = ReportGenerator()
    return _report_generator