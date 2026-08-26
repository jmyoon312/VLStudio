from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import crud, models
from app.services import report_generator

router = APIRouter(tags=["Reports"])

@router.get("/ping")
def ping():
    return {"status": "pong"}

@router.get("/")
def read_reports(skip: int = 0, limit: int = 30, db: Session = Depends(get_db)):
    """List daily reports."""
    return crud.get_daily_reports(db, skip=skip, limit=limit)

@router.get("/latest")
def get_latest_report(db: Session = Depends(get_db)):
    """Get the most recent report."""
    report = crud.get_latest_daily_report(db)
    if not report:
        raise HTTPException(status_code=404, detail="No reports found")
    return report

@router.get("/dashboard-overview")
def get_dashboard_overview(db: Session = Depends(get_db)):
    """Get 7-day aggregated pipeline telemetry and KPI summary for BI Dashboard."""
    from datetime import datetime, timedelta
    now = datetime.now()
    seven_days_ago = now - timedelta(days=7)
    
    # Total Sourcing
    total_videos = db.query(models.Video).count()
    recent_videos = db.query(models.Video).filter(models.Video.downloaded_at >= seven_days_ago).count()
    
    # Total Queue / Creation
    total_queue = db.query(models.WorkQueueItem).count()
    completed_uploads = db.query(models.WorkQueueItem).filter(models.WorkQueueItem.status == "COMPLETED").count()
    failed_uploads = db.query(models.WorkQueueItem).filter(models.WorkQueueItem.status == "FAILED").count()
    pending_queue = db.query(models.WorkQueueItem).filter(models.WorkQueueItem.status.in_(["QUEUED", "PENDING", "DRAFT", "SCHEDULED_UPLOAD"])).count()
    
    # Total Channels
    total_channels = 0
    try:
        total_channels = db.query(models.YouTubeChannel).count()
    except Exception:
        pass
        
    # 7-Day History Trend
    history_reports = db.query(models.DailyReport).order_by(models.DailyReport.report_date.desc()).limit(7).all()
    history_trend = []
    for r in reversed(history_reports):
        st = r.raw_stats_json or {}
        history_trend.append({
            "date": r.report_date.strftime("%m/%d") if r.report_date else "",
            "sourcing": st.get("sourcing", {}).get("videos_collected", st.get("videos_collected", 0)),
            "scripts": st.get("sourcing", {}).get("scripts_collected", st.get("scripts_collected", 0)),
            "creation": st.get("creation", {}).get("today_created_items", 0),
            "uploaded": st.get("distribution", {}).get("uploaded_today", 0),
            "views_increase": st.get("growth", {}).get("total_daily_views_increase", 0)
        })
        
    return {
        "kpis": {
            "total_vault_videos": total_videos,
            "recent_sourced_7d": recent_videos,
            "total_queue_items": total_queue,
            "completed_uploads": completed_uploads,
            "failed_uploads": failed_uploads,
            "pending_queue": pending_queue,
            "total_channels": total_channels,
            "overall_success_rate": round((completed_uploads / (completed_uploads + failed_uploads)) * 100, 1) if (completed_uploads + failed_uploads) > 0 else 100.0
        },
        "history_trend": history_trend
    }

@router.post("/generate")
def generate_report_manually(db: Session = Depends(get_db)):
    """Manually trigger today's report generation."""
    success = report_generator.generate_daily_report(db)
    if not success:
         raise HTTPException(status_code=500, detail="Generation failed")
    
    # Return the newly created report
    return crud.get_latest_daily_report(db)

@router.put("/{report_id}/read")
def mark_as_read(report_id: int, db: Session = Depends(get_db)):
    """Mark report as read."""
    report = crud.mark_report_read(db, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report

from typing import List
from fastapi import Query

@router.delete("/")
def delete_reports(ids: List[int] = Query(...), db: Session = Depends(get_db)):
    """Bulk delete reports."""
    print(f"DEBUG: Received DELETE request for IDs: {ids}")
    count = crud.delete_daily_reports(db, ids)
    print(f"DEBUG: Deleted {count} reports")
    print(f"DEBUG: Deleted {count} reports")
    return {"status": "success", "deleted": count}

@router.post("/{report_id}/fix")
def run_auto_fix_manual(report_id: int, db: Session = Depends(get_db)):
    """Manually trigger auto-fix for a specific report."""
    report = crud.get_daily_report(db, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    from app.services.auto_fixer import run_auto_fix
    
    # We pass the raw stats from the report to re-analyze
    # Or should we re-fetch current DB stats? 
    # Auto-fixer relies on report_stats['diagnostics'].
    # If the report is old, the diagnostics might be stale.
    # However, '0 views' is a persistent state until fixed.
    # So using the report diagnostics is a good starting point.
    # But if the user manually fixes it, re-running based on old report might be redundant but harmless.
    # Let's run it.
    
    run_auto_fix(db, report.id, report.raw_stats_json)
    
    # Refresh to return updated logs
    db.refresh(report)
    return report
