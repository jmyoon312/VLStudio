"""블루오션 시그널 탐지 데이터 완전 초기화 스크립트"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'apps', 'api'))

from app.database import SessionLocal
from app import models
from app.services import trend_signal_tracker

db = SessionLocal()
try:
    counts = {}
    counts['discovery_video_history'] = db.query(models.DiscoveryVideoHistory).delete()
    counts['discovery_watchlist'] = db.query(models.DiscoveryWatchlist).delete()
    counts['discovery_video'] = db.query(models.DiscoveryVideo).delete()
    counts['discovery_channel'] = db.query(models.DiscoveryChannel).delete()
    counts['scout_candidate'] = db.query(models.ScoutCandidate).delete()
    counts['strategic_brief'] = db.query(models.StrategicBrief).delete()
    counts['trend'] = db.query(models.Trend).delete()
    counts['ai_category'] = db.query(models.CategoryTree).filter(models.CategoryTree.ai_generated == True).delete()
    db.commit()

    trend_signal_tracker.scanner_state.update({
        "is_running": False, "is_paused": False, "total_reviewed": 0,
        "new_outliers": 0, "shorts_added": 0, "long_added": 0,
        "current_keywords": [], "status": "대기 중 (초기화됨)", "is_llm_refreshing": False,
    })
    trend_signal_tracker.last_scouted_times.clear()

    for k, v in counts.items():
        print(f"  {k}: {v}개 삭제")
    print("인메모리 스캐너 상태 리셋 완료")
    print("초기화 성공!")
except Exception as e:
    print(f"오류: {e}")
    db.rollback()
finally:
    db.close()
