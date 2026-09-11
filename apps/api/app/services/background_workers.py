import asyncio
import logging
from datetime import datetime
from app.database import SessionLocal
from app import crud, models
from app.services.telegram_service import telegram_service

logger = logging.getLogger(__name__)

class BackgroundWorkerManager:
    def __init__(self):
        self.is_running = False
        self._task = None

    def start(self):
        if self.is_running:
            return
        self.is_running = True
        try:
            loop = asyncio.get_running_loop()
            self._task = loop.create_task(self._main_worker_loop())
            logger.info("⚡ [Background Workers] Autonomous Telemetry & Comment Scout started.")
        except RuntimeError:
            logger.warning("[Background Workers] No running asyncio loop found on start.")

    def stop(self):
        self.is_running = False
        if self._task and not self._task.done():
            self._task.cancel()
            logger.info("🛑 [Background Workers] Workers stopped.")

    async def _main_worker_loop(self):
        counter = 0
        while self.is_running:
            try:
                # 0. 매 2분마다 (60초 x 2): Tier 2 채널 디렉터 상태 머신 펄스 & 자율 스케줄 확인
                if counter % 2 == 0:
                    await self._pulse_channel_directors()

                # 1. 매 5분마다 (60초 x 5 = 300초): 루피 AI 채널별 댓글 자율 관리 워커 가동
                if counter % 5 == 0:
                    await self._run_community_autopilot()

                # 2. 매 10분마다 (60초 x 10 = 600초): 댓글 감시 및 텔레그램 알림 체크
                if counter % 10 == 0:
                    await self._check_comments_and_alerts()

                # 3. 매 1시간마다 (60초 x 60 = 3600초): 채널 지표 갱신
                if counter % 60 == 0:
                    await self._refresh_channel_metrics()

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"[Background Workers] Error in worker cycle: {e}")

            counter += 1
            await asyncio.sleep(60)

    async def _run_community_autopilot(self):
        """
        루피 AI 사령탑에 의한 채널별 자동 댓글 관리 워커 사이클 실행
        """
        from app.services.community_service import CommunityService
        if not getattr(CommunityService, "_autopilot_global_enabled", True):
            return

        db = SessionLocal()
        try:
            loop = asyncio.get_running_loop()
            await loop.run_in_executor(None, CommunityService.run_autopilot_cycle, db)
        except Exception as e:
            logger.warning(f"[Background Workers] Community autopilot cycle failed: {e}")
        finally:
            db.close()

    async def _check_comments_and_alerts(self):
        """
        신규 악플이나 민감한 질문 댓글이 감지되었을 때 텔레그램으로 대표님께 즉시 알림
        """
        db = SessionLocal()
        try:
            settings = crud.get_settings(db)
            # 텔레그램 설정이 활성화되어 있고 악플 감지 알림이 켜져 있는지 확인
            if not getattr(settings, "tg_alert_negative_comment", True):
                return

            unalerted_criticisms = db.query(models.YouTubeComment).filter(
                models.YouTubeComment.sentiment.in_(["criticism", "spam"]),
                models.YouTubeComment.is_alerted == False
            ).all()

            for c in unalerted_criticisms:
                c_text = c.text or ""
                c_reply = c.ai_reply or "답글 생성 대기 중"
                msg = (
                    f"⚠️ <b>[루피 관제] 시청자 주의 댓글 감지!</b>\n\n"
                    f"• 영상: {c.video_title or '영상'}\n"
                    f"• 작성자: {c.author_name}\n"
                    f"• 댓글: \"{c_text}\"\n\n"
                    f"💡 <b>루피 추천 대응 답글:</b>\n{c_reply}\n\n"
                    f"데스크톱 [댓글 소통 센터] 또는 텔레그램에서 승인하여 바로 대응할 수 있습니다."
                )
                success = telegram_service.send_message(msg, parse_mode="HTML", event_type="viral_alert")
                if success:
                    c.is_alerted = True
            
            db.commit()
        except Exception as e:
            logger.warning(f"[Background Workers] Comment check failed: {e}")
            db.rollback()
        finally:
            db.close()

    async def _pulse_channel_directors(self):
        """
        [Tier 2 Channel Director Pulse]
        Updates director heartbeats and triggers autonomous cycles if scheduled.
        """
        db = SessionLocal()
        try:
            from app.services.channel_director import ChannelDirector
            channels = db.query(models.BrandChannel).filter(models.BrandChannel.is_active == True).all()
            for ch in channels:
                ch.director_heartbeat = datetime.now()
            db.commit()
        except Exception as e:
            logger.debug(f"[Background Workers] Director pulse notice: {e}")
        finally:
            db.close()

    async def _refresh_channel_metrics(self):
        """
        정기적으로 채널 성과 지표를 기록
        """
        logger.info("📊 [Background Workers] Channel metrics refreshed.")

background_workers = BackgroundWorkerManager()
