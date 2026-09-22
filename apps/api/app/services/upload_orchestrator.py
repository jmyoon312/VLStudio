import logging
import json
import asyncio
from datetime import datetime
from sqlalchemy.orm import Session
from app import models

# Redis Client (Optional - graceful fallback if not installed/running)
redis_client = None
try:
    import socket
    # 0.05초 초고속 소켓 테스트로 Redis 포트가 열려있는지 확인 (윈도우 소켓 블로킹 0초 방어)
    _sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    _sock.settimeout(0.05)
    _res = _sock.connect_ex(('127.0.0.1', 6379))
    _sock.close()
    if _res == 0:
        import redis as _redis_lib
        _test_r = _redis_lib.Redis(host='127.0.0.1', port=6379, db=0, decode_responses=True, socket_connect_timeout=0.2, socket_timeout=0.2)
        _test_r.ping()
        redis_client = _test_r
        logging.getLogger(__name__).info("✅ Redis connected for work-queue progress publishing.")
    else:
        redis_client = None
except Exception:
    redis_client = None
logger = logging.getLogger(__name__)


class UploadOrchestrator:
    """
    Central Logic for processing WorkQueueItems.
    Can be called by Celery Worker OR synchronously via BackgroundTasks.
    """
    
    def process_item(self, db: Session, queue_item_id: int, task_instance=None, force_ip_rotation: bool = False):
        """
        Main execution flow.
        task_instance: Optional Celery task instance for update_state calls.
        force_ip_rotation: If True, forces IP rotation before launch (Smart Batching Strategy).
        """
        try:
            # 1. 항목 조회 (Reusable)
            item = db.query(models.WorkQueueItem).filter(
                models.WorkQueueItem.id == queue_item_id
            ).first()
            
            if not item:
                logger.error(f"Queue item {queue_item_id} not found")
                return {"status": "error", "message": "Item not found"}
            
            # 2. 승인 확인
            if item.approval_status not in ["APPROVED", "AUTO_APPROVED"]:
                logger.warning(f"Item {queue_item_id} not approved, skipping")
                return {"status": "skipped", "message": "Not approved"}
            
            # 3. 상태 업데이트: UPLOADING
            item.status = "UPLOADING"
            item.upload_started_at = datetime.now()
            item.upload_progress = 0
            db.commit()
            
            self._publish_progress(queue_item_id, 0, "업로드 시작", task_instance)
            
            # Anti-Association Shield Configs (유튜브 전용 쉴드 — 타 플랫폼 전용 업로드 시 불필요한 대기/변조 방지)
            targets = item.target_platforms or ["youtube"]
            platform_configs = item.platform_configs or {}
            yt_config = platform_configs.get('youtube', {})
            shield_cfg = yt_config.get('anti_association', {})
            shield_enabled = shield_cfg.get('enabled', False) if "youtube" in targets else False
            
            # 3.4 Jitter Jumps (대기열 즉시 실행 시에는 지연 대기 없이 즉시 업로드 처리)
            if task_instance and shield_enabled and shield_cfg.get('jitter_jumps', False):
                import random
                import time
                jitter_secs = random.randint(30, 900)
                self._publish_progress(queue_item_id, 2, f"🛡️ Jitter Jumps: {jitter_secs}초 지연 대기 중...", task_instance)
                logger.info(f"Jitter jumps enabled. Sleeping for {jitter_secs}s")
                time.sleep(jitter_secs)
            
            # 3.5 Apply Mutation (Sovereign Shield) [NEW]
            try:
                from app.services.video.mutation_engine import mutation_engine
                import os
                
                original_video_path = item.video_file_path
                if original_video_path and os.path.exists(original_video_path):
                    mutated_video_path = original_video_path.replace(".mp4", "_v65_shield.mp4")
                    channel_id = yt_config.get('channel_id', 'unknown_channel')
                    
                    intensity_str = shield_cfg.get('mutation_intensity', '0.5') if shield_enabled else '0.5'
                    intensity = float(intensity_str)
                    
                    if shield_enabled and intensity > 0.0:
                        self._publish_progress(queue_item_id, 5, f"🛡️ 알고리즘 교란 엔진 (강도 {intensity}) 적용 중...", task_instance)
                        success = mutation_engine.apply_mutation(original_video_path, mutated_video_path, channel_id=channel_id, intensity=intensity)
                        if success:
                            item.video_file_path = mutated_video_path
                            if item.video:
                                meta = dict(item.video.metadata_json) if item.video.metadata_json else {}
                                meta["saif_mutated"] = True
                                meta["mutated_at"] = datetime.now().isoformat()
                                item.video.metadata_json = meta
                            db.commit()
                            logger.info(f"🛡️ Sovereign Shield applied and flagged for item {queue_item_id}")
                        else:
                            logger.warning(f"Mutation failed for item {queue_item_id}, proceeding with original.")
                    elif shield_enabled and shield_cfg.get('metadata_scrub', False):
                        self._publish_progress(queue_item_id, 5, "🛡️ 메타데이터 파괴 중...", task_instance)
                        import subprocess
                        subprocess.run([
                            mutation_engine.ffmpeg, "-y", "-i", original_video_path, 
                            "-map_metadata", "-1", "-c", "copy", mutated_video_path
                        ], check=False, capture_output=True)
                        if os.path.exists(mutated_video_path):
                            item.video_file_path = mutated_video_path
                            db.commit()
            except Exception as mutation_err:
                logger.error(f"Mutation process error: {mutation_err}")

            # 3.7 [NEW] Dynamic SEO Optimization (Stage 9)
            try:
                if shield_enabled and shield_cfg.get('dynamic_seo', False):
                    from app.config.feature_flags import get_llm_client
                    llm = get_llm_client()
                    self._publish_progress(queue_item_id, 8, "✍️ 단계 9: AI 동적 SEO 최적화 중...", task_instance)
                    seo_prompt = f"Optimize this niche '{item.category}' for a viral video. Title, Description, and 5 hashtags. JSON format. Base Title: {item.title}"
                    seo_data = llm.generate_structured_response(seo_prompt)
                    if seo_data:
                        item.title = seo_data.get("title", item.title)
                        item.description = seo_data.get("description", item.description)
                        item.hashtags = seo_data.get("hashtags", item.hashtags)
                        db.commit()
                        logger.info(f"[MAGIC] SEO Optimized for item {queue_item_id}")
                elif not item.title or "Sovereign" in item.title:
                    from app.config.feature_flags import get_llm_client
                    llm = get_llm_client()
                    self._publish_progress(queue_item_id, 8, "✍️ 단계 9: 기본 제목 최적화 중...", task_instance)
                    seo_prompt = f"Optimize this niche '{item.category}' for a viral video. Title, Description, and 5 hashtags. JSON format."
                    seo_data = llm.generate_structured_response(seo_prompt)
                    if seo_data:
                        item.title = seo_data.get("title", item.title)
                        item.description = seo_data.get("description", item.description)
                        item.hashtags = seo_data.get("hashtags", item.hashtags)
                        db.commit()
            except Exception as seo_err:
                logger.error(f"SEO process error: {seo_err}")

            if shield_enabled and shield_cfg.get('smart_routing', False):
                force_ip_rotation = True

            # 4. 플랫폼별 업로드 실행
            results = {}
            total_platforms = len(item.target_platforms or ["youtube"])
            
            for idx, platform in enumerate(item.target_platforms or ["youtube"]):
                try:
                    # 진행률 계산 (각 플랫폼당 균등 분배)
                    base_progress = int((idx / total_platforms) * 100)
                    
                    logger.info(f"Uploading to {platform} for item {queue_item_id}")
                    
                    result = None
                    if platform == "youtube":
                        result = self._upload_to_youtube(item, db, task_instance, base_progress, force_ip_rotation)
                    elif platform == "tiktok":
                        result = self._upload_to_tiktok(item, db, task_instance, base_progress)
                    elif platform == "instagram":
                        result = self._upload_to_instagram(item, db, task_instance, base_progress)
                    else:
                        result = {"status": "error", "message": f"Unknown platform: {platform}"}
                    
                    results[platform] = result
                    
                    # 플랫폼 완료 진행률
                    platform_complete_progress = int(((idx + 1) / total_platforms) * 100)
                    item.upload_progress = platform_complete_progress
                    db.commit()
                    self._publish_progress(queue_item_id, platform_complete_progress, f"{platform} 업로드 완료", task_instance)
                    
                except Exception as e:
                    logger.error(f"Upload to {platform} failed: {e}")
                    results[platform] = {"status": "error", "message": str(e)}
            
            # 5. 결과 저장
            item.uploaded_urls = {k: v.get("url") for k, v in results.items() if v.get("url")}
            
            # 6. 최종 상태 결정
            if all(r.get("status") == "success" for r in results.values()):
                item.status = "COMPLETED"
                item.upload_progress = 100
                self._publish_progress(queue_item_id, 100, "업로드 완료", task_instance)
            else:
                item.status = "FAILED"
                item.failure_reason = json.dumps(results)
                self._publish_progress(queue_item_id, item.upload_progress, "업로드 실패", task_instance)
            
            item.upload_completed_at = datetime.now()
            db.commit()
            return {"status": "completed", "results": results}
            
        except Exception as e:
            logger.error(f"Orchestrator failed: {e}")
            if item:
                item.status = "FAILED"
                item.failure_reason = str(e)
                item.upload_completed_at = datetime.now()
                db.commit()
                self._publish_progress(queue_item_id, 0, f"시스템 오류: {str(e)}", task_instance)
            return {"status": "error", "message": str(e)}

    def _publish_progress(self, item_id, progress, message, task_instance=None):
        """Safe status update via Redis + Celery"""
        # 1. Update Celery State if exists
        if task_instance:
            try:
                task_instance.update_state(state='PROGRESS', meta={'current': progress, 'status': message})
            except: pass
            
        # 2. Publish to Redis (Best Effort - Only if active)
        if redis_client:
            try:
                data = {
                    "queue_item_id": item_id,
                    "progress": progress,
                    "message": message,
                    "timestamp": datetime.now().isoformat()
                }
                redis_client.publish(f"queue:{item_id}:progress", json.dumps(data))
            except Exception:
                # Redis down? Just ignore.
                pass

    def _upload_to_youtube(self, item, db, task_instance, base_progress, force_rotation=False):
        self._publish_progress(item.id, base_progress + 10, "YouTube 업로드 준비 중...", task_instance)
        
        try:
            if item.upload_method == 'BROWSER_AUTO':
                # Browser Automation
                logger.info("Executing BROWSER_AUTO upload strategy")
                from app.services.browser_uploader import browser_uploader
                
                # Pass force_rotation flag
                browser_uploader.upload_video(db, item.id, force_ip_rotation=force_rotation)
                
                db.refresh(item)
                if item.status in ('COMPLETED', 'VERIFYING'):
                    return {
                        "status": "success", 
                        "url": item.uploaded_urls.get('youtube') if item.uploaded_urls else "",
                        "message": "Browser Upload Success" if item.status == 'COMPLETED' else "Video uploaded as PRIVATE, awaiting verification before publishing"
                    }
                else:
                    return {"status": "error", "message": item.failure_reason or "Browser Upload Failed"}
            else:
                # API
                from app.services.youtube_uploader import youtube_uploader
                youtube_uploader.upload_video(db, item.id, force_ip_rotation=force_rotation)
                
                db.refresh(item)
                if item.status in ('COMPLETED', 'VERIFYING'):
                    return {
                        "status": "success",
                        "url": item.uploaded_urls.get('youtube') if item.uploaded_urls else "",
                        "message": "API Upload Success" if item.status == 'COMPLETED' else "API Upload Success (Video uploaded as PRIVATE, queued for browser review & auto-publish)"
                    }
                else:
                    return {"status": "error", "message": item.failure_reason or "API Upload Failed"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def _resolve_headless_mode(self, item, platform_config: dict, db) -> bool:
        """
        [SSOT] 브라우저 창 표시(가시성) 단일 진실 공급원 거버넌스.
        1. 전역 DB 설정(settings.work_queue_headless_mode)이 False('창 표시: 켜짐')이면:
           사용자의 시각적 감시 요구를 최우선 존중하여 플랫폼 불문 무조건 headless=False (화면 표시).
        2. 전역 DB 설정이 True('창 숨김')인 경우:
           플랫폼별 설정 -> 아이템 공통 설정 순으로 확인하여 개별 예외 존중, 없으면 True.
        """
        try:
            from app.models import Settings
            from app.services.browser_uploader import browser_uploader
            settings = db.query(Settings).first()
            global_headless = getattr(settings, 'work_queue_headless_mode', None) if settings else None
            
            # 1. 툴바 전역 가시성 토글이 '창 표시: 켜짐'(False/0)이면 절대적 우선순위 적용!
            if global_headless is False or global_headless == 0 or (global_headless is not None and not bool(global_headless)):
                return False
            if getattr(browser_uploader, 'default_headless_mode', None) is False:
                return False

            # 2. 개별 플랫폼 설정 확인 (예: item.platform_configs['tiktok']['headless_mode'])
            if platform_config and "headless_mode" in platform_config:
                return bool(platform_config["headless_mode"])

            # 3. 아이템 최상위 platform_configs 확인
            all_configs = item.platform_configs or {}
            if "headless_mode" in all_configs:
                return bool(all_configs["headless_mode"])

            # 4. 아이템 타겟 플랫폼이 유튜브인 경우에만 레거시 유튜브 설정 확인
            targets = item.target_platforms or []
            if "youtube" in targets:
                yt_headless = all_configs.get("youtube", {}).get("headless_mode")
                if yt_headless is not None:
                    return bool(yt_headless)

            # 5. 전역 기본값 (설정되어 있지 않으면 기본 False: 창 표시로 사용자에게 직관적 노출)
            return bool(global_headless) if global_headless is not None else False
        except Exception as e:
            logger.warning(f"Error resolving headless mode: {e}")
            return False

    # ... Helper implementations for TikTok/Instagram (Simplified copies from tasks.py) ...
    def _upload_to_tiktok(self, item, db, task_instance, base_progress):
        self._publish_progress(item.id, base_progress + 5, "TikTok 업로드 준비 중...", task_instance)
        try:
            from app.services.browser_session_manager import session_manager
            
            # Config extraction
            config = item.platform_configs.get("tiktok", {}) if item.platform_configs else {}
            account_id = config.get("account_id")
            
            if not account_id:
                return {"status": "error", "message": "TikTok Account ID not specified"}
                
            # Resolve Profile ID: SSOT Profile 모델 우선 조회, 없으면 레거시 TikTokChannel 폴백
            profile_id = None
            profile = db.query(models.Profile).filter(models.Profile.id == account_id).first()
            if profile:
                profile_id = profile.id
            else:
                channel = db.query(models.TikTokChannel).filter(models.TikTokChannel.id == account_id).first()
                if channel and channel.browser_profile_id:
                    profile_id = channel.browser_profile_id

            if not profile_id:
                return {"status": "error", "message": f"TikTok Profile/Channel not found for account_id '{account_id}'"}
            
            # Viral Dispatcher for TikTok: 손 하나 대지 않아도 전자동 최적화 (커스텀 캡션 시 최우선 존중)
            from app.services.viral_metadata_dispatcher import viral_dispatcher
            custom_caption = config.get("caption")
            meta = viral_dispatcher.generate_tiktok_metadata(
                title=item.title or "",
                description=item.description or "",
                base_tags=item.hashtags or [],
                custom_caption=custom_caption
            )
            caption = meta["caption"]
            hashtags = meta["hashtags"]
            privacy = config.get("privacy", "PUBLIC").upper()
            allow_comments = config.get("allow_comments", True)
            allow_duet = config.get("allow_duet", True)
            
            # Headless Mode Resolution from DB Settings & Global Sovereignty (창 표시 설정 완벽 연동)
            headless_mode = self._resolve_headless_mode(item, config, db)
            
            logger.info(f"🖥️ [TikTokOrchestrator] Launching TikTok upload: profile={profile_id}, headless={headless_mode}")
            try:
                print(f"🖥️ [TikTokOrchestrator] Launching TikTok upload: profile={profile_id}, headless={headless_mode}")
            except Exception:
                pass

            # Launch Upload
            self._publish_progress(item.id, base_progress + 20, "TikTok 브라우저 실행 중...", task_instance)
            result = session_manager.launch_tiktok_upload(
                profile_id=profile_id,
                db=db,
                video_path=item.video_file_path,
                caption=caption,
                hashtags=hashtags,
                privacy=privacy,
                allow_comments=allow_comments,
                allow_duet=allow_duet,
                headless=headless_mode
            )
            
            return result
            
        except Exception as e:
            logger.error(f"TikTok Logic Failed: {e}")
            return {"status": "error", "message": str(e)}

    def _upload_to_instagram(self, item, db, task_instance, base_progress):
        self._publish_progress(item.id, base_progress + 5, "Instagram 업로드 준비 중...", task_instance)
        try:
            from app.services.browser_session_manager import session_manager
            from app.services.viral_metadata_dispatcher import viral_dispatcher
             
            # Config extraction
            config = item.platform_configs.get("instagram", {}) if item.platform_configs else {}
            account_id = config.get("account_id")
            
            if not account_id:
                return {"status": "error", "message": "Instagram Account ID not specified"}
                
            # Resolve Profile ID: SSOT Profile 모델 우선 조회, 없으면 레거시 InstagramChannel 폴백
            profile_id = None
            profile = db.query(models.Profile).filter(models.Profile.id == account_id).first()
            if profile:
                profile_id = profile.id
            else:
                channel = db.query(models.InstagramChannel).filter(models.InstagramChannel.id == account_id).first()
                if channel and channel.browser_profile_id:
                    profile_id = channel.browser_profile_id

            if not profile_id:
                return {"status": "error", "message": f"Instagram Profile/Channel not found for account_id '{account_id}'"}
            
            # Viral Dispatcher for Instagram: 릴스 감성 서식 및 전용 해시태그 전자동 주입
            custom_caption = config.get("caption")
            share_to_feed = bool(config.get("share_to_feed", False))
            meta = viral_dispatcher.generate_instagram_metadata(
                title=item.title or "",
                description=item.description or "",
                base_tags=item.hashtags or [],
                custom_caption=custom_caption,
                share_to_feed=share_to_feed
            )
            caption = meta["full_text"]
            
            # Headless Mode Resolution from DB Settings & Global Sovereignty (창 표시 설정 완벽 연동)
            headless_mode = self._resolve_headless_mode(item, config, db)
            logger.info(f"🖥️ [InstagramOrchestrator] Launching Instagram upload: profile={profile_id}, headless={headless_mode}")
            
            # Launch Upload
            self._publish_progress(item.id, base_progress + 20, "Instagram 브라우저 실행 중...", task_instance)
            result = session_manager.launch_instagram_upload(
                profile_id=profile_id,
                db=db,
                video_path=item.video_file_path,
                caption=caption,
                share_to_feed=share_to_feed,
                headless=headless_mode
            )
            
            return result

        except Exception as e:
            logger.error(f"Instagram Logic Failed: {e}")
            return {"status": "error", "message": str(e)}

upload_orchestrator = UploadOrchestrator()
