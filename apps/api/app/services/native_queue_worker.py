print("!!! [DEBUG] WORKER FILE LOADED (WINDOWS NATIVE) !!!")
import threading
import queue
import logging
import time
import os
import sys
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime

print(f"!!! [DEBUG] Python: {sys.executable}")
print(f"!!! [DEBUG] CWD: {os.getcwd()}")

from app.services.upload_orchestrator import upload_orchestrator
from app.services.workflow_runner import workflow_runner_singleton
from app.database import SessionLocal
from app.services.verification_worker import verification_worker

logger = logging.getLogger(__name__)

class NativeQueueWorker:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialize()
        return cls._instance
    
    def _initialize(self):
        self.task_queue = queue.Queue()
        self.running = True
        self.profile_busy = {}
        self.profile_lock = threading.Lock()
        self.executor = ThreadPoolExecutor(max_workers=10, thread_name_prefix="UploadWorker")
        self.scheduler_thread = threading.Thread(target=self._process_scheduler, daemon=True, name="NativeUploadScheduler")
        self.scheduler_thread.start()
        logger.info("[OK] Native Queue Worker Started (Concurrent Mode - one per isolated profile)")

    def add_task(self, item_id: int):
        msg = f"📥 [NativeQueue] Adding item {item_id} to task_queue"
        print(msg)
        logger.info(msg)
        self.task_queue.put(item_id)

    def _resolve_profile_id(self, item_id: int) -> str:
        """WorkQueueItem이 어느 프로필(IP)에 속하는지 확인 (target_platforms 최우선 반영)"""
        from app import models
        db = SessionLocal()
        try:
            item = db.query(models.WorkQueueItem).filter(models.WorkQueueItem.id == item_id).first()
            if not item:
                return None
            
            targets = item.target_platforms or ["youtube"]
            configs = item.platform_configs or {}

            # 타겟 플랫폼 우선 매핑 (TikTok 타겟이면 틱톡 계정 최우선)
            if "tiktok" in targets:
                tt_config = configs.get('tiktok', {})
                tt_account_id = tt_config.get('account_id')
                if tt_account_id:
                    logger.info(f"🎯 [NativeQueue] Resolved TikTok profile for item {item_id}: {tt_account_id}")
                    return tt_account_id

            if "instagram" in targets:
                ig_config = configs.get('instagram', {})
                ig_account_id = ig_config.get('account_id')
                if ig_account_id:
                    logger.info(f"🎯 [NativeQueue] Resolved Instagram profile for item {item_id}: {ig_account_id}")
                    return ig_account_id

            if "youtube" in targets:
                yt_config = configs.get('youtube', {})
                channel_id = yt_config.get('channel_id') or item.channel_id
                if channel_id:
                    channel = db.query(models.YouTubeChannel).filter(models.YouTubeChannel.channel_id == channel_id).first()
                    if channel and getattr(channel, 'owner_profile_id', None):
                        return channel.owner_profile_id
                    return channel_id

            # 폴백: 대기열 아이템 고유 ID 기반 프로필 보장 (무한 리큐잉 차단)
            fallback = f"item_profile_{item_id}"
            logger.info(f"🎯 [NativeQueue] Fallback profile for item {item_id}: {fallback}")
            return fallback
        finally:
            db.close()

    def _process_scheduler(self):
        """메인 스케줄러: 큐에서 항목을 꺼내 워커 쓰레드에 즉시 할당"""
        while self.running:
            try:
                item_id = self.task_queue.get(timeout=1.0)
                profile_id = self._resolve_profile_id(item_id)
                msg_start = f"⚙️ [NativeQueue] Dequeued item {item_id} -> profile={profile_id}"
                print(msg_start)
                logger.info(msg_start)
                
                if profile_id and self._try_claim_profile(profile_id):
                    logger.info(f"🚀 [NativeQueue] Acquired profile lock '{profile_id}' for item {item_id}. Dispatching worker thread.")
                    self.executor.submit(self._process_item, item_id, profile_id)
                else:
                    msg_busy = f"⏸ [NativeQueue] Item {item_id} (profile={profile_id}) - profile busy, re-queuing after brief wait"
                    print(msg_busy)
                    logger.info(msg_busy)
                    time.sleep(0.5)
                    self.task_queue.put(item_id)
                    self.task_queue.task_done()
                    
            except queue.Empty:
                continue
            except Exception as e:
                logger.error(f"[FAIL] [NativeQueue] Scheduler Error: {e}", exc_info=True)
                time.sleep(1)

    def _process_item(self, item_id: int, profile_id: str):
        """개별 워커 쓰레드에서 실행 - 각 프로필이 독립적으 실행"""
        from app import models
        db = SessionLocal()
        try:
            item = db.query(models.WorkQueueItem).filter(models.WorkQueueItem.id == item_id).first()
            
            # 해당 프로필이 이전에 사용된 적 없으면 IP 로테褂
            should_rotate = True
            if hasattr(self, '_profile_first_use'):
                if profile_id in self._profile_first_use:
                    should_rotate = False
            if not hasattr(self, '_profile_first_use'):
                self._profile_first_use = set()
            self._profile_first_use.add(profile_id)
            
            if item and item.source_type == "SOVEREIGN_AI":
                has_valid_video = bool(item.video_file_path and os.path.exists(item.video_file_path))
                if not has_valid_video:
                    logger.info(f"[NativeQueue] SOVEREIGN_AI mission for {item_id} needs video production")
                    try:
                        import asyncio as aio
                        production_result = aio.run(workflow_runner_singleton.execute_workflow_for_mission(db, item_id))
                        logger.info(f"🎨 Production Success: {production_result.get('video_path')}")
                    except Exception as prod_err:
                        logger.error(f"[FAIL] Production Failed: {prod_err}")
                        item.status = "FAILED"
                        item.failure_reason = f"Production Error: {str(prod_err)}"
                        db.commit()
                        return
                else:
                    logger.info(f"✅ [NativeQueue] SOVEREIGN_AI mission {item_id} already has verified video: {item.video_file_path}")

            result = upload_orchestrator.process_item(db, item_id, task_instance=None, force_ip_rotation=should_rotate)
            logger.info(f"[OK] [NativeQueue] Finished item {item_id}: {result}")
        except Exception as e:
            logger.error(f"[FAIL] [NativeQueue] Error processing {item_id}: {e}")
        finally:
            db.close()
            with self.profile_lock:
                if profile_id:
                    self.profile_busy.pop(profile_id, None)

    def _try_claim_profile(self, profile_id: str) -> bool:
        with self.profile_lock:
            if profile_id in self.profile_busy:
                return False
            self.profile_busy[profile_id] = True
            return True

native_worker = NativeQueueWorker()

def add_task(item_id: int):
    """모듈 레벨 안전 호출 래퍼 (외부 router 직접 import 완벽 지원)"""
    return native_worker.add_task(item_id)

if __name__ == "__main__":
    print(">>> [DEBUG] ENTERING KEEP-ALIVE LOOP <<<")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("🛑 Stopping worker...")
        native_worker.running = False