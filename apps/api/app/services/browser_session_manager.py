"""
브라우저 세션 관리자 (Singleton) - Hybrid Version
채널별 IP 격리 및 단일 세션 보장 (Windows Native Agent 사용)
"""

import os
import time
import random
import logging
import asyncio
from typing import Optional
from datetime import datetime
from sqlalchemy.orm import Session
from app import crud
from app.services.stealth_ops_v2 import stealth_ops
from app.services.warmup_comment_generator_v2 import get_intelligence_generator

logger = logging.getLogger("BrowserSessionManager")

class BrowserSessionManager:
    """
    단일 브라우저 세션 관리 (Hybrid Singleton Pattern)
    
    핵심 기능:
    1. 윈도우 에이전트(host.docker.internal:8001)를 통해 브라우저 제어
    2. 도커 내부의 V2Ray 프록시(port 10800)를 윈도우 브라우저에 연동
    3. 기존의 모든 유튜브 웜업 로직(Day 1-7) 완벽 호환
    """
    
    _instance = None
    _active_session = None # Patchright Page instance
    _active_channel_id: Optional[str] = None
    _active_profile_id: Optional[str] = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def _create_browser(self, profile_id: str, engine_mode: str = "standard", headless: bool = True) -> any:
        """
        [Hybrid] 윈도우 에이전트에게 브라우저 생성을 요청합니다.
        engine_mode: standard, cloak, fox
        """
        logger.info(f"🌐 Requesting hybrid browser for profile: {profile_id} (Mode: {engine_mode}, Headless: {headless})")
        
        # 1. 윈도우 에이전트를 통해 브라우저 실행
        page = stealth_ops.create_page(profile_id=profile_id, headless=headless)
        
        if not page:
            logger.error("❌ Failed to create hybrid browser session")
            raise Exception("Hybrid browser creation failed")
            
        logger.info(f"✅ Hybrid browser session active for {profile_id}")
        return page

    def launch_channel(self, channel_id: str, db: Session, rotate_ip: bool = True) -> any:
        """ [Isolated Access] Launch browser for manual management """
        # 1. SAIF Phase 1: 네트워크 완전 격리 (Total Isolation)
        if rotate_ip:
            from app.services.network_stealth_manager import network_stealth_manager
            success = network_stealth_manager.prepare_upload_session(serial=None, captain_id=channel_id)
            if not success:
                logger.error("❌ [SAIF] Network hardening failed. Aborting session for safety.")
                raise Exception("Network isolation failure")
                
        # Profile DB에서 해당 브랜드 채널을 위임받은 CAPTAIN(관리자) 이메일/비밀번호 추출
        from app.models import Profile, ChannelAccess
        
        # 관리자(MANAGER) 권한을 가진 접근 기록 찾기
        access = db.query(ChannelAccess).filter(ChannelAccess.channel_id == channel_id, ChannelAccess.role == "MANAGER").first()
        
        email = None
        password = None
        if access:
            manager = db.query(Profile).filter(Profile.id == access.profile_id).first()
            if manager:
                email = manager.email
                password = manager.password
                
        # 만약 매니저가 없다면 소유자(OWNER)로 폴백 시도
        if not email:
            owner_access = db.query(ChannelAccess).filter(ChannelAccess.channel_id == channel_id, ChannelAccess.role == "OWNER").first()
            if owner_access:
                owner = db.query(Profile).filter(Profile.id == owner_access.profile_id).first()
                if owner:
                    email = owner.email
                    password = owner.password
        
        # 그래도 없다면 예전 방식 (fallback)
        if not email:
            owner = db.query(Profile).filter(Profile.channel_id == channel_id, Profile.profile_type == "Tin Can").first()
            if owner:
                email = owner.email
                password = owner.password
                
        # 2. 독립적인 UI 브라우저 창 띄우기 (마법사 수동 설정 모드)
        stealth_ops.launch_for_setup(
            profile_id=channel_id,
            db=db,
            email=email,
            password=password,
            target_channel_id=channel_id
        )
        return True

    def _launch_orchestrator(self, channel_id: str, db: Session, rotate_ip: bool = True, target_url: str = None, headless: bool = True) -> any:
        from app.routers.resource_manager import _ensure_fresh_ip
        
        profile_id = channel_id
        
        # [Optimization] Browser Context Reuse for the same profile
        if self._active_session and self._active_profile_id == profile_id:
            logger.info(f"⚡ [Context Reuse] Reusing active browser session for {profile_id}")
            page = self._active_session
        else:
            # 1. 기존 세션 종료
            if self._active_session:
                self.close_session()
            
            # 2. SAIF Phase 1: 네트워크 완전 격리 및 IP 교체 (Total Isolation)
            if rotate_ip:
                from app.services.network_stealth_manager import network_stealth_manager
                # Captain ID 또는 Channel ID를 기반으로 세션 격리 수행
                success = network_stealth_manager.prepare_upload_session(serial=None, captain_id=channel_id)
                
                if not success:
                    logger.error("❌ [SAIF] Network hardening failed. Aborting session for safety.")
                    raise Exception("Network isolation failure")
            
            # 3. 채널 프로필 ID 및 엔진 모드 결정
            from app.models import YouTubeChannel
            channel = db.query(YouTubeChannel).filter(YouTubeChannel.channel_id == channel_id).first()
            engine_mode = channel.engine_mode if channel and channel.engine_mode else "standard"
            
            # 4. 하이브리드 브라우저 실행
            page = self._create_browser(profile_id, engine_mode=engine_mode, headless=headless)

        
        # 5. 목표 URL 이동
        if target_url:
            page.goto(target_url)
            time.sleep(3)
            
        # [NEW] 비동기 글로벌 광고 스킵 핸들러 등록 (Playwright 1.42+)
        try:
            def handle_ad(locator):
                logger.info("🎬 Ad detected! Attempting to skip asynchronously...")
                if locator.is_visible():
                    locator.click()
            page.add_locator_handler(
                page.locator('.ytp-ad-skip-button-modern, .ytp-skip-ad-button, button[aria-label^="Skip ad"]'), 
                handle_ad
            )
            logger.info("✅ Global Ad Skip Handler registered.")
        except Exception as e:
            logger.warning(f"Failed to register ad handler: {e}")
            
        # 6. 세션 저장
        self._active_session = page
        self._active_channel_id = channel_id
        self._active_profile_id = profile_id
        
        return page

    def run_warmup_routine(self, channel_id: str, stage: int = 1, visible: bool = False) -> bool:
        """ [Warmup] Automated warmup routine using hybrid bridge """
        from app.database import SessionLocal
        db = SessionLocal()
        try:
            # Load DNA from warmup_config
            from app.models import YouTubeChannel
            channel = db.query(YouTubeChannel).filter(YouTubeChannel.channel_id == channel_id).first()
            
            dna = None
            if channel and channel.warmup_config:
                try:
                    from app.schemas.dna import ChannelDNA
                    dna = ChannelDNA.parse_obj(channel.warmup_config)
                    logger.info(f"🧬 DNA Loaded for {channel_id}: {dna.positioning.micro_niche}")
                except Exception as e:
                    logger.error(f"❌ Failed to parse DNA for {channel_id}: {e}")

            # Get Intelligence Generator
            from app import crud
            settings = crud.get_settings(db)
            intel = get_intelligence_generator(settings)

            # [DAY LOGIC]
            # Use discover as default target_url for now
            target_url = "https://www.youtube.com"
            page = self._launch_orchestrator(channel_id=channel_id, db=db, rotate_ip=True, target_url=target_url, headless=not visible)

            if stage == 1: success = self._warmup_day_1_discovery(page, db, channel_id, stage, dna, intel)
            elif stage == 2: success = self._warmup_day_2_interest(page, db, channel_id, stage, dna, intel)
            elif stage >= 3: success = self._warmup_day_3_community(page, db, channel_id, stage, dna, intel)
            else: success = True
            
            # Update DB Status
            if channel:
                if success == "AUTH_DROPPED":
                    channel.status = "AUTH_DROPPED"
                    channel.warmup_status = "FAILED"
                else:
                    channel.warmup_status = "COMPLETED" if success else "FAILED"
                channel.warmup_stage = stage
                
                # --- [NEW] Create Warmup Log ---
                try:
                    from app.models import WarmupLog
                    import json
                    log_status = "success" if success is True else "failed"
                    error_msg = "AUTH_DROPPED" if success == "AUTH_DROPPED" else None
                    if not success and success != "AUTH_DROPPED":
                        error_msg = "Automated warmup encountered an error or was interrupted."
                    
                    warmup_log = WarmupLog(
                        channel_id=channel_id,
                        stage=stage,
                        action=f"Stage {stage} Routine",
                        status=log_status,
                        error_message=error_msg,
                        details=json.dumps({"planned_duration": 600, "actual_duration": 600})
                    )
                    db.add(warmup_log)
                except Exception as e:
                    logger.error(f"❌ Failed to save warmup log: {e}")
                    
                channel.warmup_last_run = datetime.now()
                db.commit()
            return success == True
        finally:
            self.close_session()
            db.close()

    def close_session(self):
        if self._active_session:
            try:
                if self._active_session.context:
                    self._active_session.context.close()
            except: pass
            self._active_session = None
            self._active_channel_id = None
            self._active_profile_id = None

    def get_active_channel(self) -> Optional[str]:
        return self._active_channel_id

    def _verify_login(self, page) -> bool:
        """ [Health Check] 로그인 세션 유지 여부 확인 """
        try:
            # 아바타 버튼 유무로 로그인 확인 (최대 15초 대기)
            page.wait_for_selector('button#avatar-btn, yt-img-shadow#avatar, #avatar-btn', timeout=15000)
            return True
        except Exception as e:
            logger.error(f"Login verification failed (Timeout): {e}")
            return False
            
    def _active_watch(self, page, duration: int, allow_like: bool = False, allow_comment: bool = False, comment_text: str = ""):
        """ 사람처럼 시청 시뮬레이션 (Micro-actions & Entropy) """
        logger.info(f"👀 Active watching for {duration} seconds... (Like: {allow_like}, Comment: {allow_comment})")
        end_time = time.time() + duration
        
        while time.time() < end_time:
            remaining = end_time - time.time()
            if remaining <= 0: break
            
            # 휴먼 딜레이 (가우스 분포 활용)
            action_delay = max(2.0, random.gauss(5.0, 2.0))
            time.sleep(min(action_delay, remaining))
            
            rand_action = random.random()
            if rand_action < 0.15:
                # 무작위 스크롤 (Hover or Reading comments)
                scroll_amount = int(random.gauss(300, 100))
                page.mouse.wheel(0, scroll_amount)
            elif rand_action < 0.25:
                # 반대 방향 스크롤 (Wobble)
                scroll_amount = int(random.gauss(-200, 100))
                page.mouse.wheel(0, scroll_amount)
            elif rand_action < 0.30:
                # 마우스 방황 (Idle Drift)
                x = random.randint(100, 800)
                y = random.randint(100, 600)
                page.mouse.move(x, y, steps=10)
                
        # 좋아요 시도
        if allow_like and random.random() < 0.5:
            try:
                like_btn = page.locator('like-button-view-model button').first
                if like_btn.is_visible():
                    page.mouse.wheel(0, -1000) # 영상 위로 스크롤
                    time.sleep(random.uniform(1, 2))
                    like_btn.click()
                    logger.info("👍 Like button clicked.")
            except Exception:
                pass
                
        # 댓글 작성 시도
        if allow_comment and comment_text and random.random() < 0.6:
            try:
                for _ in range(4):
                    page.mouse.wheel(0, 400)
                    time.sleep(random.uniform(0.5, 1.5))
                
                comment_box = page.locator('ytd-comment-simplebox-renderer').first
                comment_box.wait_for(state='visible', timeout=8000)
                if comment_box.is_visible():
                    comment_box.scroll_into_view_if_needed()
                    time.sleep(random.uniform(1, 2))
                    comment_box.click()
                    time.sleep(random.uniform(1, 2))
                    
                    input_box = page.locator('#contenteditable-root').first
                    input_box.wait_for(state='visible', timeout=5000)
                    
                    if input_box.is_visible():
                        # 인간적인 타이핑 시뮬레이션 (의도적 지연)
                        input_box.fill("")
                        for char in comment_text:
                            input_box.type(char, delay=random.randint(50, 200))
                        time.sleep(random.uniform(1, 2))
                        
                        submit_btn = page.locator('#submit-button').first
                        if submit_btn.is_visible():
                            submit_btn.click()
                            logger.info("📝 Comment posted.")
            except Exception as e:
                logger.warning(f"Comment attempt failed: {e}")

    def _warmup_day_1_discovery(self, page, db, channel_id, stage, dna, intel):
        """[Stage 1: 순수 관찰자] 홈 피드 탐색, 검색 없이 무작위 시청, 상호작용 불가"""
        logger.info(f"🔍 [Stage 1] Passive Observer for {channel_id}")
        try:
            if not self._verify_login(page):
                logger.error("❌ Session Dropped or Captcha blocked.")
                raise Exception("AUTH_DROPPED")
                
            # 홈 피드 진입
            page.goto("https://www.youtube.com/")
            time.sleep(random.uniform(3, 7))
            
            # 홈 피드 스크롤 하며 썸네일 탐색
            for _ in range(random.randint(2, 5)):
                page.mouse.wheel(0, int(random.gauss(500, 200)))
                time.sleep(random.uniform(2, 5))
            
            # 홈 피드에서 영상 클릭 (1~3번째 중 하나)
            video_card = page.locator('ytd-rich-item-renderer').nth(random.randint(0, 3))
            try:
                video_card.wait_for(state='visible', timeout=10000)
                video_card.scroll_into_view_if_needed()
                time.sleep(random.uniform(1, 3))
                video_card.click()
                logger.info("📺 Selected video from Home Feed.")
                
                # 시청 (45 ~ 120초), 상호작용 절대 금지
                self._active_watch(page, random.randint(45, 120), allow_like=False, allow_comment=False)
            except Exception as e:
                logger.warning(f"Could not click video from home feed: {e}")
                
            return True
        except Exception as e:
            logger.error(f"❌ Stage 1 Failed: {e}")
            if str(e) == "AUTH_DROPPED": return "AUTH_DROPPED"
            return False

    def _warmup_day_2_interest(self, page, db, channel_id, stage, dna, intel):
        """[Stage 2: 관심사 좁히기] DNA 검색, Shorts 탐색, 제한적 상호작용"""
        logger.info(f"🔍 [Stage 2] Niche Explorer for {channel_id}")
        try:
            if not self._verify_login(page):
                raise Exception("AUTH_DROPPED")
                
            queries = intel.generate_dna_search_queries(dna) if dna else ["재미있는 영상", "일상 브이로그"]
            query = random.choice(queries)
            
            # 직접 타이핑하듯 검색
            page.goto("https://www.youtube.com/")
            time.sleep(random.uniform(2, 4))
            search_input = page.locator('input#search')
            if search_input.is_visible():
                search_input.click()
                search_input.fill("")
                search_input.type(query, delay=random.randint(50, 150))
                page.keyboard.press('Enter')
                time.sleep(random.uniform(4, 7))
            else:
                page.goto(f"https://www.youtube.com/results?search_query={query}")
                time.sleep(random.uniform(3, 5))
                
            # 검색 결과에서 2~4번째 영상 클릭 (최상단 회피)
            video_card = page.locator('ytd-video-renderer').nth(random.randint(1, 3))
            try:
                video_card.wait_for(state='visible', timeout=10000)
                video_card.scroll_into_view_if_needed()
                time.sleep(random.uniform(1, 3))
                video_card.click()
                logger.info(f"📺 Selected niche video for '{query}'.")
                
                # 시청 (90 ~ 180초), 좋아요 50% 허용
                self._active_watch(page, random.randint(90, 180), allow_like=True, allow_comment=False)
            except Exception:
                pass
            
            # 숏츠 시청 로직
            logger.info("📱 Exploring Shorts...")
            page.goto("https://www.youtube.com/shorts/")
            time.sleep(random.uniform(3, 6))
            for _ in range(random.randint(3, 6)): # 3~6개 숏츠
                # 숏츠 체류 시간 (3초 ~ 30초)
                time.sleep(random.uniform(3, 30))
                # 다음 숏츠로 넘어가기 (휠 내리기)
                page.mouse.wheel(0, 800)
                time.sleep(random.uniform(0.5, 1.5))
                
            return True
        except Exception as e:
            logger.error(f"❌ Stage 2 Failed: {e}")
            if str(e) == "AUTH_DROPPED": return "AUTH_DROPPED"
            return False

    def _warmup_day_3_community(self, page, db, channel_id, stage, dna, intel):
        """[Stage 3: 커뮤니티 일원화] 롱테일 체류, 구독 및 댓글 작성"""
        logger.info(f"💬 [Stage 3] Active Participant for {channel_id}")
        try:
            # Stage 2의 검색 로직을 일부 차용하여 영상 진입
            res = self._warmup_day_2_interest(page, db, channel_id, stage, dna, intel)
            if res == "AUTH_DROPPED": return res
            
            # 추가적으로 한 번 더 영상을 클릭하여 깊은 상호작용 시도
            queries = intel.generate_dna_search_queries(dna) if dna else ["인기 급상승", "추천 영상"]
            page.goto(f"https://www.youtube.com/results?search_query={random.choice(queries)}")
            time.sleep(random.uniform(3, 5))
            
            video_card = page.locator('ytd-video-renderer').nth(random.randint(0, 2))
            try:
                video_card.wait_for(state='visible', timeout=10000)
                video_card.scroll_into_view_if_needed()
                time.sleep(random.uniform(1, 3))
                video_card.click()
                time.sleep(random.uniform(3, 5))
            except Exception:
                pass
            
            title_ele = page.locator('h1.ytd-watch-metadata').first
            video_title = title_ele.inner_text() if title_ele.is_visible() else "Interesting Video"
            comment_text = intel.generate_dna_comment(dna, video_title) if dna else "정말 잘 봤습니다! 👍"
            
            # 긴 시청 (120 ~ 300초), 좋아요 & 댓글 허용
            self._active_watch(page, random.randint(120, 300), allow_like=True, allow_comment=True, comment_text=comment_text)
            
            # 10% ~ 20% 확률로 구독 클릭
            if random.random() < 0.2:
                try:
                    sub_btn = page.locator('#subscribe-button yt-button-shape button').first
                    if sub_btn.is_visible():
                        sub_btn.scroll_into_view_if_needed()
                        time.sleep(random.uniform(1, 2))
                        sub_btn.click()
                        logger.info("🔔 Subscribed to channel.")
                        time.sleep(random.uniform(2, 4))
                except Exception:
                    pass
                    
            return True
        except Exception as e:
            logger.error(f"❌ Stage 3 Failed: {e}")
            if str(e) == "AUTH_DROPPED": return "AUTH_DROPPED"
            return False

    def launch_tiktok_upload(self, profile_id: str, db: Session, video_path: str, caption: str, hashtags: list, privacy: str) -> dict:
        logger.info(f"Launching TikTok Upload for profile {profile_id}")
        page = self._create_browser(profile_id=profile_id, engine_mode="standard", headless=False)
        try:
            from app.services.tiktok_uploader import tiktok_uploader
            return tiktok_uploader.upload_video(page, video_path, caption, hashtags, privacy)
        finally:
            if page and page.context:
                page.context.close()

    def launch_instagram_upload(self, profile_id: str, db: Session, video_path: str, caption: str) -> dict:
        logger.info(f"Launching Instagram Upload for profile {profile_id}")
        page = self._create_browser(profile_id=profile_id, engine_mode="standard", headless=False)
        try:
            from app.services.instagram_browser_uploader import instagram_browser_uploader
            return instagram_browser_uploader.upload_reel(page, video_path, caption)
        finally:
            if page and page.context:
                page.context.close()

session_manager = BrowserSessionManager()
