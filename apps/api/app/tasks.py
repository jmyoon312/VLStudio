"""
작업 대기열 백그라운드 작업
"""
from app.celery_app import celery_app
from app.database import SessionLocal
from app import models
from datetime import datetime
import logging
import time
import redis
import json

import os

logger = logging.getLogger(__name__)

# Redis 클라이언트 (진행률 발행용 - 컨테이너 환경 대응)
REDIS_HOST = os.getenv('REDIS_HOST', 'redis')
try:
    redis_client = redis.Redis(host=REDIS_HOST, port=6379, db=0, decode_responses=True, socket_connect_timeout=1)
except:
    redis_client = None


@celery_app.task(bind=True, name='app.tasks.process_work_queue_item')
def process_work_queue_item(self, queue_item_id: str):
    """
    워크플로우에서 호출되는 Work Queue Item 처리 작업
    execute_upload_task를 호출하는 래퍼
    
    Args:
        queue_item_id: WorkQueueItem ID (문자열)
    """
    logger.info(f"🚀 Processing Work Queue Item: {queue_item_id}")
    return execute_upload_task(queue_item_id)


@celery_app.task(bind=True, name='app.tasks.execute_upload_task')
def execute_upload_task(self, queue_item_id: int):
    """
    작업 대기열 항목 업로드 실행 (Wrapper)
    """
    from app.services.upload_orchestrator import upload_orchestrator
    
    db = SessionLocal()
    try:
        return upload_orchestrator.process_item(db, queue_item_id, task_instance=self)
    finally:
        db.close()

# Helper 'publish_progress' is still useful for other tasks potentially, or can be deprecated.
# Removing unused helpers to avoid confusion.
def publish_progress(queue_item_id: int, progress: int, message: str):
    """ Legacy Helper """
    pass 

