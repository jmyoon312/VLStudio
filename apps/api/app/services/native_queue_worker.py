print("!!! [DEBUG] WORKER FILE LOADED (WINDOWS NATIVE) !!!")
import threading
import queue
import logging
import time
import os
import sys
from datetime import datetime

print(f"!!! [DEBUG] Python: {sys.executable}")
print(f"!!! [DEBUG] CWD: {os.getcwd()}")

from app.services.upload_orchestrator import upload_orchestrator
from app.services.workflow_runner import workflow_runner_singleton
from app.database import SessionLocal
from app.services.verification_worker import verification_worker  # [NEW] Hook Verification Worker

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
        self.last_channel_id = None
        self.worker_thread = threading.Thread(target=self._process_queue, daemon=True, name="NativeUploadWorker")
        self.worker_thread.start()
        logger.info("✅ Native Queue Worker Started (ThreadSafe, Sequential, Smart Batching)")

    def add_task(self, item_id: int):
        logger.info(f"📥 [NativeQueue] Adding item {item_id} to queue")
        self.task_queue.put(item_id)

    def _process_queue(self):
        from app import models
        while self.running:
            try:
                item_id = self.task_queue.get(timeout=1.0)
                logger.info(f"🔄 [NativeQueue] Picking up item {item_id}...")
                db = SessionLocal()
                try:
                    item = db.query(models.WorkQueueItem).filter(models.WorkQueueItem.id == item_id).first()
                    should_rotate = True
                    if item:
                        yt_config = item.platform_configs.get('youtube', {})
                        current_channel_id = yt_config.get('channel_id')
                        if current_channel_id:
                            if current_channel_id == self.last_channel_id:
                                logger.info(f"🧬 Same Channel ({current_channel_id}) detected. Sticky IP active.")
                                should_rotate = False
                            else:
                                logger.info(f"🔀 New Channel ({current_channel_id}). Forcing IP Rotation.")
                                should_rotate = True
                            self.last_channel_id = current_channel_id
                        else:
                            should_rotate = True
                            self.last_channel_id = None
                    
                    if item and item.source_type == "SOVEREIGN_AI":
                        logger.info(f"🚀 [NativeQueue] Detected SOVEREIGN_AI mission for {item_id}. Starting production engine...")
                        try:
                            import asyncio as aio
                            production_result = aio.run(workflow_runner_singleton.execute_workflow_for_mission(db, item_id))
                            logger.info(f"🎨 [NativeQueue] Production Success for {item_id}: {production_result.get('video_path')}")
                        except Exception as prod_err:
                            logger.error(f"❌ [NativeQueue] Production Failed for {item_id}: {prod_err}")
                            item.status = "FAILED"
                            item.failure_reason = f"Production Error: {str(prod_err)}"
                            db.commit()
                            db.close()
                            self.task_queue.task_done()
                            continue

                    result = upload_orchestrator.process_item(db, item_id, task_instance=None, force_ip_rotation=should_rotate)
                    logger.info(f"✅ [NativeQueue] Finished item {item_id}: {result}")
                except Exception as e:
                    logger.error(f"❌ [NativeQueue] Error processing {item_id}: {e}")
                finally:
                    db.close()
                    self.task_queue.task_done()
            except queue.Empty:
                continue
            except Exception as e:
                logger.error(f"❌ [NativeQueue] Worker Thread Crash: {e}")
                time.sleep(1)

native_worker = NativeQueueWorker()

if __name__ == "__main__":
    print("!!! [DEBUG] ENTERING KEEP-ALIVE LOOP !!!")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("🛑 Stopping worker...")
        native_worker.running = False
