import threading
import time
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class VerificationWorker:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialize()
        return cls._instance
        
    def _initialize(self):
        self.running = True
        self.worker_thread = threading.Thread(target=self._run_loop, daemon=True, name="VerificationWorker")
        self.worker_thread.start()
        logger.info("✅ Verification Worker Started (10m aging and copyright checking)")

    def _run_loop(self):
        from app.database import SessionLocal
        from app import models
        from app.services.browser_uploader import browser_uploader
        
        while self.running:
            try:
                db = SessionLocal()
                try:
                    # Find items that are VERIFYING and updated_at is more than 10 mins ago
                    cutoff_time = datetime.now() - timedelta(minutes=10)
                    items_to_verify = db.query(models.WorkQueueItem).filter(
                        models.WorkQueueItem.status == "VERIFYING",
                        models.WorkQueueItem.updated_at <= cutoff_time
                    ).all()

                    for item in items_to_verify:
                        logger.info(f"🔍 [VerificationWorker] Verifying item {item.id} after aging...")
                        
                        # 1 hour timeout check (60 mins) -> fails the review
                        if item.updated_at <= datetime.now() - timedelta(minutes=60):
                            logger.warning(f"⏰ [VerificationWorker] Item {item.id} timed out. Failing review.")
                            item.status = "FAILED_REVIEW"
                            item.failure_reason = "유튜브 자체 검사 지연 (1시간 타임아웃)"
                            db.commit()
                            continue

                            # Execute Verification
                            try:
                                browser_uploader.verify_and_publish_video(db, item.id)
                            except Exception as e:
                                logger.error(f"❌ [VerificationWorker] Verification execution failed for {item.id}: {e}")
                                
                    # --- [NEW] Garbage Collector for MP4 files ---
                    import os
                    settings = db.query(models.Settings).first()
                    if settings and getattr(settings, 'auto_delete_mp4_days', 0) > 0:
                        delete_cutoff = datetime.now() - timedelta(days=settings.auto_delete_mp4_days)
                        
                        items_to_cleanup = db.query(models.WorkQueueItem).filter(
                            models.WorkQueueItem.status.in_(["COMPLETED", "FAILED", "FAILED_REVIEW"]),
                            models.WorkQueueItem.updated_at <= delete_cutoff
                        ).all()
                        
                        for cleanup_item in items_to_cleanup:
                            if cleanup_item.video_file_path and os.path.exists(cleanup_item.video_file_path):
                                try:
                                    os.remove(cleanup_item.video_file_path)
                                    logger.info(f"🗑️ [GarbageCollector] Auto-deleted old video file for item {cleanup_item.id}: {cleanup_item.video_file_path}")
                                except Exception as e:
                                    logger.error(f"❌ [GarbageCollector] Failed to delete file {cleanup_item.video_file_path}: {e}")
                                    
                finally:
                    db.close()
            except Exception as e:
                logger.error(f"❌ [VerificationWorker] Loop error: {e}")
            
            # Sleep for 1 minute before checking again
            time.sleep(60)

verification_worker = VerificationWorker()
