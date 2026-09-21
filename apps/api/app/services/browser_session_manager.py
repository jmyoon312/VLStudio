"""
브라우저 세션 관리자 (Singleton) - Hybrid Version
채널별 IP 격리 및 단일 세션 보장 (Windows Native Agent 사용)
"""

import os
import time
import random
import logging
import asyncio
import threading
from typing import Optional
from datetime import datetime
from sqlalchemy.orm import Session
from app import crud
from app.services.stealth_ops_v2 import stealth_ops
from app.services.warmup_comment_generator_v2 import get_intelligence_generator
from app.models import YouTubeChannel, Profile, ChannelAccess

logger = logging.getLogger("BrowserSessionManager")


class BrowserSessionManager:
    """
    다중 프로필 동시 브라우저 세션 관리 (Multi-Profile Singleton)

    핵심 기능:
    1. profile_id별 독립 브라우저 세션 관리 (1채널 = 1프로필 = 1브라우저)
    2. 동시 업로드 지원 (ISP 프록시 채널들은 동시에 업로드 가능)
    3. LTE 채널들은 순차적 (USB LTE 회선은 한 번에 하나의 프로필만 사용 가능)
    """

    _instance = None
    _sessions: dict = {}  # profile_id -> Page
    _session_headless: dict = {}  # profile_id -> bool (headless mode tracking)
    _active_channel_id: Optional[str] = None
    _active_profile_id: Optional[str] = None
    _session_lock = threading.Lock()
    _abort_event = threading.Event()
    _job_progress: dict = {}  # id -> { status, progress, current_step, total_steps, message }
    _last_warmup_error: dict = {}  # channel_id -> last_error_message

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def request_abort(self):
        """실행 중인 모든 웜업/시드예열 브라우저 태스크에 중단 신호를 보냅니다."""
        logger.warning("🛑 [SessionManager] Global abort requested!")
        self._abort_event.set()
        self.close_session()

    def close_session(self, profile_or_channel_id: Optional[str] = None):
        """
        특정 프로필/채널 또는 모든 활성 브라우저 세션을 안전하게 종료하고 리소스를 해제합니다.
        """
        with self._session_lock:
            if not profile_or_channel_id:
                keys = list(self._sessions.keys())
                for k in keys:
                    self._close_single_session_locked(k)
                self._sessions.clear()
                self._session_headless.clear()
                return

            keys_to_close = []
            for k in self._sessions.keys():
                if k == profile_or_channel_id or str(profile_or_channel_id) in str(k) or str(k) in str(profile_or_channel_id):
                    keys_to_close.append(k)

            # Check if profile_or_channel_id is a channel_id that maps to a profile_id in DB
            if not keys_to_close:
                try:
                    from app.database import SessionLocal
                    from app.models import YouTubeChannel, Profile
                    db = SessionLocal()
                    try:
                        ch = db.query(YouTubeChannel).filter(YouTubeChannel.channel_id == profile_or_channel_id).first()
                        if ch and ch.owner_profile_id and ch.owner_profile_id in self._sessions:
                            keys_to_close.append(ch.owner_profile_id)
                        prof = db.query(Profile).filter(Profile.channel_id == profile_or_channel_id).first()
                        if prof and prof.id in self._sessions and prof.id not in keys_to_close:
                            keys_to_close.append(prof.id)
                    finally:
                        db.close()
                except Exception:
                    pass

            if not keys_to_close and len(self._sessions) == 1:
                keys_to_close = list(self._sessions.keys())

            for k in set(keys_to_close):
                self._close_single_session_locked(k)

    def _close_single_session_locked(self, key: str):
        page = self._sessions.pop(key, None)
        self._session_headless.pop(key, None)
        if page:
            try:
                if not page.is_closed():
                    page.close()
            except Exception:
                pass
            try:
                ctx = getattr(page, 'context', None)
                if ctx:
                    ctx.close()
            except Exception:
                pass
            logger.info(f"🛑 [SessionManager] Browser session closed for {key}")
        try:
            from app.services.stealth_ops_v2 import stealth_ops
            if stealth_ops.context:
                stealth_ops.context.close()
                stealth_ops.context = None
        except Exception:
            pass

    def reset_abort(self):
        """중단 신호를 리셋합니다."""
        self._abort_event.clear()

    def is_aborted(self) -> bool:
        return self._abort_event.is_set()

    def set_job_progress(self, job_id: str, status: str, message: str = "", current_step: int = 0, total_steps: int = 0):
        with self._session_lock:
            self._job_progress[job_id] = {
                "status": status,
                "message": message,
                "current_step": current_step,
                "total_steps": total_steps,
                "updated_at": time.time()
            }

    def get_job_progress(self, job_id: str) -> dict:
        with self._session_lock:
            return self._job_progress.get(job_id, {"status": "IDLE", "message": "", "current_step": 0, "total_steps": 0})

    def _safe_navigate_to_video(self, page, card_or_link_locator) -> bool:
        """
        YouTube의 인라인 프리뷰 동영상(<video> overlay) 인터셉트를 원천 방어하며
        해당 비디오 카드의 재생 페이지로 안전하게 진입합니다.
        """
        try:
            # 1. 링크(a#video-title, a#thumbnail, a[href*="/watch"]) 태그 탐색
            link = card_or_link_locator.locator('a#video-title, a#video-title-link, a#thumbnail, a[href*="/watch"]').first
            href = None
            try:
                if link.count() > 0:
                    href = link.get_attribute("href")
            except Exception:
                pass
            
            # 카드가 이미 링크 태그인 경우
            if not href:
                try:
                    href = card_or_link_locator.get_attribute("href")
                except Exception:
                    pass

            if href and ("/watch" in href or "/shorts" in href):
                full_url = f"https://www.youtube.com{href}" if href.startswith("/") else href
                logger.info(f"🔗 [SafeNav] Direct URL navigation to video: {full_url}")
                page.goto(full_url, wait_until="domcontentloaded")
                return True

            # 2. 링크 추출 실패 시 강제 클릭 (force=True로 <video> 오버레이 무시)
            card_or_link_locator.scroll_into_view_if_needed()
            time.sleep(random.uniform(0.8, 1.5))
            if link.count() > 0:
                link.click(force=True, timeout=8000)
            else:
                card_or_link_locator.click(force=True, timeout=8000)
            return True
        except Exception as e:
            logger.warning(f"[SafeNav] Safe navigation failed: {e}")
            return False

    def _create_browser(self, profile_id: str, engine_mode: str = "standard", headless: bool = True) -> any:
        """
        [Hybrid] 윈도우 에이전트에게 브라우저 생성을 요청합니다.
        engine_mode: standard, cloak, fox
        """
        logger.info(f"[WEB] Requesting hybrid browser for profile: {profile_id} (Mode: {engine_mode}, Headless: {headless})")

        # 1. 윈도우 에이전트를 통해 브라우저 실행
        page = stealth_ops.create_page(profile_id=profile_id, headless=headless)

        if not page:
            logger.error("[FAIL] Failed to create hybrid browser session")
            raise Exception("Hybrid browser creation failed")

        logger.info(f"[OK] Hybrid browser session active for {profile_id}")
        return page

    def launch_channel(self, channel_id: str, db: Session, rotate_ip: bool = True) -> any:
        """ [Isolated Access] Launch browser for manual management """
        # 1. SAIF Phase 1: 네트워크 완전 격리 (Total Isolation)
        if rotate_ip:
            from app.services.network_stealth_manager import network_stealth_manager
            success = network_stealth_manager.prepare_upload_session(serial=None, captain_id=channel_id)
            if not success:
                logger.error("[FAIL] [SAIF] Network hardening failed. Aborting session for safety.")
                raise Exception("Network isolation failure")

        # Profile DB에서 해당 브랜드 채널을 위임받은 CAPTAIN(관리자) 이메일/비밀번호 추출

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
        """
        [Multi-Profile] 각 프로필별 독립 브라우저 세션 관리
        - 동일 profile_id면 세션 재사용, 다른 profile_id면 새 세션 생성
        - 닫힌/종료된 세션은 자동 감지 및 정리 후 재생성 (Self-Healing)
        - ISP 프록시는 프로필마다 독립 IP → 동시 업로드 가능
        - LTE는 USB 회선 공유 → 순차적 업로드 (native_queue_worker에서 제어)
        """

        channel = db.query(YouTubeChannel).filter(YouTubeChannel.channel_id == channel_id).first()
        owner_profile_id = getattr(channel, 'owner_profile_id', None)
        
        # 1. 프로필 ID 정밀 매핑 (owner_profile_id -> Profile.channel_id -> ChannelAccess -> channel_id)
        profile_id = owner_profile_id
        if not profile_id:
            profile_obj = db.query(Profile).filter(Profile.channel_id == channel_id).first()
            if profile_obj:
                profile_id = profile_obj.id
                if channel and not channel.owner_profile_id:
                    channel.owner_profile_id = profile_obj.id
                    try:
                        db.commit()
                    except Exception:
                        pass
        if not profile_id:
            access = db.query(ChannelAccess).filter(ChannelAccess.channel_id == channel_id).first()
            if access:
                profile_id = access.profile_id
        if not profile_id:
            profile_id = channel_id

        # 2. 세션 생존 여부(Liveness) 철저 검증 및 캐시 정리
        page = None
        with self._session_lock:
            existing_page = self._sessions.get(profile_id)
            if existing_page:
                is_dead = False
                try:
                    if existing_page.is_closed():
                        is_dead = True
                    elif getattr(existing_page, 'context', None) is None:
                        is_dead = True
                    else:
                        # 브라우저 컨텍스트 활성 상태 확인
                        _ = len(existing_page.context.pages)
                except Exception:
                    is_dead = True

                if not is_dead:
                    # [Headless Mode Sync] Check if existing session's headless mode matches the requested mode
                    cached_headless = self._session_headless.get(profile_id)
                    if cached_headless is not None and cached_headless != headless:
                        logger.info(f"🔄 [SessionManager] Headless mode mismatch for profile {profile_id} (cached={cached_headless}, requested={headless}). Recreating session.")
                        self._close_single_session_locked(profile_id)
                        existing_page = None
                        is_dead = True

                if is_dead:
                    logger.info(f"🧹 [SessionManager] Stale/closed page detected for profile {profile_id}. Discarding.")
                    self._sessions.pop(profile_id, None)
                    self._session_headless.pop(profile_id, None)
                    page = None
                else:
                    logger.info(f"[TURBO] [Context Reuse] Reusing healthy browser session for profile {profile_id} (headless={headless})")
                    page = existing_page

        # 3. 브라우저 세션 생성 (필요 시)
        if not page:
            if rotate_ip:
                try:
                    from app.services.network_stealth_manager import network_stealth_manager
                    network_stealth_manager.prepare_upload_session(serial=None, captain_id=profile_id)
                except Exception as e:
                    logger.warning(f"IP rotation skipped: {e}")

            engine_mode = getattr(channel, 'engine_mode', None) or 'standard'
            page = self._create_browser(profile_id, engine_mode=engine_mode, headless=headless)

            with self._session_lock:
                self._sessions[profile_id] = page
                self._session_headless[profile_id] = headless

        # 4. 목표 URL 안전 이동 (네비게이션 중 창 종료 시 자가 치유 재시도)
        if target_url:
            try:
                page.goto(target_url, wait_until="domcontentloaded", timeout=45000)
            except Exception as nav_err:
                logger.warning(f"Navigation to {target_url} encountered issue: {nav_err}")
                err_str = str(nav_err).lower()
                if "closed" in err_str or "target page" in err_str or "destroyed" in err_str:
                    logger.info("Target page/browser was closed during initial goto. Recreating fresh browser context...")
                    with self._session_lock:
                        self._sessions.pop(profile_id, None)
                        self._session_headless.pop(profile_id, None)
                    page = self._create_browser(profile_id, engine_mode=engine_mode, headless=headless)
                    with self._session_lock:
                        self._sessions[profile_id] = page
                        self._session_headless[profile_id] = headless
                    page.goto(target_url, wait_until="domcontentloaded", timeout=45000)
                else:
                    try:
                        page.goto(target_url, timeout=30000)
                    except Exception:
                        pass

            time.sleep(2)
            try:
                page.wait_for_selector('#create-icon, button:has-text("만들기"), button:has-text("Create"), [aria-label*="만들기"], [aria-label*="Create"], #upload-button', timeout=15000)
            except Exception:
                logger.warning("Dashboard elements not found after goto, continuing...")

        try:
            def handle_ad(locator):
                logger.info("Ad detected! Attempting to skip")
                if locator.is_visible():
                    locator.click()
            page.add_locator_handler(
                page.locator('.ytp-ad-skip-button-modern, .ytp-skip-ad-button, button[aria-label^="Skip ad"]'),
                handle_ad
            )
        except Exception as e:
            logger.warning(f"Failed to register ad handler: {e}")

        return page

    def run_warmup_routine(self, channel_id: str, stage: int = 1, visible: bool = False) -> bool:
        """
        [Refactored] TIN_CAN 직접 접근 방식 웜업 루틴
        - BrandChannel.owner_profile_id → TIN_CAN 프로필 → CloakBrowser 직접 실행
        - Captain 위임 구조 불필요
        """
        # [BugFix] 모든 모델을 먼저 import하여 SQLAlchemy mapper가 관계(relationship)를 올바르게 초기화하도록 함
        import app.models  # noqa: F401 — triggers full mapper registration
        from app.models import YouTubeChannel, WarmupLog
        from app.database import SessionLocal
        db = SessionLocal()
        success = False  # [BugFix] finally 블록에서 UnboundLocalError 방지
        try:
            channel = db.query(YouTubeChannel).filter(YouTubeChannel.channel_id == channel_id).first()
            
            if not channel:
                logger.error(f"[FAIL] [Warmup] Channel not found: {channel_id}")
                return False
            
            logger.info(f"[FALLBACK] [Warmup] Starting Stage {stage} for channel: {channel.title} (owner_profile: {channel.owner_profile_id})")

            # DNA 로드 (없으면 None으로 진행)
            dna = None
            warmup_config = getattr(channel, 'warmup_config', None)
            if warmup_config:
                try:
                    from app.schemas.dna import ChannelDNA
                    dna = ChannelDNA.parse_obj(warmup_config)
                    logger.info(f"🧬 DNA Loaded for {channel_id}: {dna.positioning.micro_niche}")
                except Exception as e:
                    logger.warning(f"[WARN] Failed to parse DNA for {channel_id}: {e} — continuing without DNA")

            # Intelligence Generator (설정 없으면 기본 사용)
            try:
                from app import crud
                settings = crud.get_settings(db)
                intel = get_intelligence_generator(settings)
            except Exception as e:
                logger.warning(f"[WARN] Failed to load intelligence generator: {e}")
                intel = get_intelligence_generator(None)

            # 브라우저 실행 (유튜브 홈으로 이동)
            target_url = "https://www.youtube.com"
            page = self._launch_orchestrator(
                channel_id=channel_id,
                db=db,
                rotate_ip=False, # 웜업 진입시 LTE 끊김 방지를 위해 False로 변경
                target_url=target_url,
                headless=not visible
            )

            # 스테이지별 웜업 실행
            if stage == 1:
                success = self._warmup_day_1_discovery(page, db, channel_id, stage, dna, intel)
            elif stage == 2:
                success = self._warmup_day_2_interest(page, db, channel_id, stage, dna, intel)
            elif stage >= 3:
                success = self._warmup_day_3_community(page, db, channel_id, stage, dna, intel)
            else:
                success = True
            
            # DB 상태 업데이트
            if channel:
                if success == "AUTH_DROPPED":
                    channel.warmup_status = "FAILED"
                    channel.warmup_last_error = "인증 세션 만료 (로그인 필요)"
                    try:
                        channel.status = "AUTH_DROPPED"
                    except Exception:
                        pass
                elif success is True:
                    channel.warmup_status = "COMPLETED"
                    channel.warmup_last_error = None
                    channel.warmup_stage = max(channel.warmup_stage or 0, stage)
                else:
                    channel.warmup_status = "FAILED"
                    channel.warmup_last_error = self._last_warmup_error.get(channel_id, "웜업 실행 중 브라우저 오류가 발생했습니다.")
                    if not channel.warmup_stage or channel.warmup_stage == 0:
                        channel.warmup_stage = stage
                
                # 웜업 로그 기록
                try:
                    import json
                    log_status = "success" if success is True else "failed"
                    error_msg = None
                    if success == "AUTH_DROPPED":
                        error_msg = "인증 세션 만료 (로그인 필요)"
                    elif success is not True:
                        error_msg = channel.warmup_last_error or "웜업 실행 중 알 수 없는 오류 발생"
                    
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
                    logger.error(f"[FAIL] Failed to save warmup log: {e}")
                    
                channel.warmup_last_run = datetime.now()
                db.commit()
                
            return success == True
        except Exception as e:
            err_msg = str(e)
            logger.error(f"[FAIL] [Warmup] run_warmup_routine error: {err_msg}", exc_info=True)
            self._last_warmup_error[channel_id] = err_msg
            # 실패 상태 기록
            try:
                channel = db.query(YouTubeChannel).filter(YouTubeChannel.channel_id == channel_id).first()
                if channel:
                    channel.warmup_status = "FAILED"
                    channel.warmup_last_error = err_msg
                    db.commit()
            except Exception:
                pass
            # 실제 에러 메시지를 상위에 전달
            raise RuntimeError(err_msg) from e
        finally:
            self.close_session()
            db.close()
            
            # 웜업이 모두 끝난 후 IP 변경 실행 (사용자 요청: LTE 끊김 방지)
            if success == True:
                try:
                    from app.services.adb_service import adb_service
                    logger.info("[REFRESH] [Warmup] Post-warmup IP rotation started.")
                    adb_service.rotate_ip(method='soft')
                    logger.info("[OK] [Warmup] Post-warmup IP rotation finished.")
                except Exception as e:
                    logger.warning(f"[WARN] [Warmup] Post-warmup IP rotation failed: {e}")

    def run_profile_seed_warmup(self, profile_id: str, keywords: list = None, video_count: int = 3, visible: bool = False) -> dict:
        """
        [Phase 1] Pure Google Account Seed Warmup (Pre-Brand Channel Creation)
        - Executes CloakBrowser stealth session on profile directly WITHOUT requiring YouTubeChannel
        - Searches realistic topics, watches videos with human entropy, builds watch history and cookies
        - Prepares Google Account trust score before brand channel is ever created
        """
        import app.models
        from app.models import Profile
        from app.database import SessionLocal
        db = SessionLocal()
        success = False
        watched = 0
        try:
            profile = db.query(Profile).filter(Profile.id == profile_id).first()
            if not profile:
                logger.error(f"[SeedWarmup] Profile not found: {profile_id}")
                return {"success": False, "error": f"Profile not found: {profile_id}"}

            logger.info(f"🌱 [SeedWarmup] Starting Account Seed Warmup for {profile.email or profile_id}")
            profile.incubation_status = "WARMING"
            db.commit()

            # Launch browser directly using stealth_ops.create_page
            from app.services.stealth_ops_v2 import stealth_ops
            page = stealth_ops.create_page(profile_id=profile_id, headless=not visible)
            if not page:
                raise Exception("Failed to launch stealth browser for seed warmup")
            with self._session_lock:
                self._sessions[profile_id] = page

            # 1. Check Login / Home Feed
            page.goto("https://www.youtube.com", wait_until="domcontentloaded")
            time.sleep(random.uniform(4, 6))

            # Dismiss Google / YouTube cookie or consent dialogs if present
            try:
                for btn_text in ["모두 수락", "동의", "I agree", "Accept all", "나중에", "Not now"]:
                    consent_btn = page.locator(f'button:has-text("{btn_text}"), a:has-text("{btn_text}")').first
                    if consent_btn.is_visible():
                        consent_btn.click()
                        time.sleep(1)
                        break
            except Exception:
                pass

            # Verify login / session
            sign_in_btn = page.locator('a[href*="ServiceLogin"], a[href*="accounts.google.com/signin"]').first
            if sign_in_btn.is_visible():
                logger.warning(f"[SeedWarmup] Not logged in for {profile.email} — attempting login...")
                if profile.email and profile.password:
                    page.goto("https://accounts.google.com/signin/v2/identifier?service=youtube")
                    time.sleep(2)
                    email_field = page.locator('input[type="email"]')
                    if email_field.is_visible():
                        email_field.fill("")
                        email_field.type(profile.email, delay=random.randint(60, 120))
                        page.keyboard.press('Enter')
                        time.sleep(random.uniform(3, 5))
                    pwd_field = page.locator('input[type="password"]')
                    if pwd_field.is_visible():
                        pwd_field.fill("")
                        pwd_field.type(profile.password, delay=random.randint(60, 120))
                        page.keyboard.press('Enter')
                        time.sleep(random.uniform(5, 8))
                    page.goto("https://www.youtube.com")
                    time.sleep(4)

            # 2. Select Search Queries
            default_seed_queries = [
                "2026 세상의 흥미로운 지식",
                "역사 속 숨겨진 미스터리 사건",
                "돈 버는 사람들의 경제 습관",
                "우주 다큐멘터리 몰아보기",
                "세계적인 명화와 예술 이야기",
                "알아두면 유용한 일상 꿀팁",
                "오늘의 핫한 트렌드 뉴스"
            ]
            queries_to_run = list(keywords) if keywords and len(keywords) > 0 else default_seed_queries
            random.shuffle(queries_to_run)

            watched_videos = []

            self.reset_abort()
            self.set_job_progress(profile_id, "WARMING", f"시드 예열 준비 완료 (목표 {video_count}편)", 0, video_count)

            # 3. Seed Watch Iterations
            for i in range(min(video_count, len(queries_to_run))):
                if self.is_aborted():
                    logger.warning(f"[SeedWarmup] Abort requested during seed warmup for {profile_id}")
                    break

                current_query = queries_to_run[i]
                logger.info(f"🔍 [SeedWarmup] [{i+1}/{video_count}] Searching & Watching: {current_query}")
                self.set_job_progress(profile_id, "WARMING", f"[{i+1}/{video_count}] '{current_query}' 검색 중...", i, video_count)

                # Gentle human scroll before search
                for _ in range(random.randint(1, 2)):
                    page.mouse.wheel(0, int(random.gauss(300, 100)))
                    time.sleep(random.uniform(1.0, 2.0))

                # 1) Direct search URL navigation ensures 100% reliable landing on search page
                import urllib.parse
                search_url = f"https://www.youtube.com/results?search_query={urllib.parse.quote(current_query)}"
                page.goto(search_url, wait_until="domcontentloaded")
                time.sleep(random.uniform(3.0, 5.0))

                # Dismiss consent popups again if needed
                try:
                    for btn_text in ["모두 수락", "동의", "I agree", "Accept all"]:
                        c_btn = page.locator(f'button:has-text("{btn_text}"), a:has-text("{btn_text}")').first
                        if c_btn.is_visible():
                            c_btn.click()
                            time.sleep(1)
                            break
                except Exception:
                    pass

                # Find clickable video card or title link
                target_link = None
                try:
                    page.wait_for_selector('ytd-video-renderer a#video-title, ytd-video-renderer a#thumbnail, a#video-title', timeout=10000)
                except Exception:
                    logger.warning(f"[SeedWarmup] Search results delayed for query '{current_query}'")

                # Scan candidate video links
                candidates = page.locator('ytd-video-renderer a#video-title, ytd-video-renderer a#thumbnail, a#video-title').all()
                for c in candidates[:6]:
                    try:
                        if c.is_visible():
                            target_link = c
                            break
                    except Exception:
                        continue

                # Fallback: if search results page yielded nothing, pick from home feed
                if not target_link:
                    logger.warning(f"[SeedWarmup] Falling back to YouTube home feed for video {i+1}...")
                    page.goto("https://www.youtube.com", wait_until="domcontentloaded")
                    time.sleep(random.uniform(2.5, 4.0))
                    try:
                        page.wait_for_selector('ytd-rich-item-renderer a#video-title-link, ytd-rich-item-renderer a#video-title, a#video-title', timeout=8000)
                        home_cands = page.locator('ytd-rich-item-renderer a#video-title-link, ytd-rich-item-renderer a#video-title, a#video-title').all()
                        for hc in home_cands[:6]:
                            if hc.is_visible():
                                target_link = hc
                                break
                    except Exception as home_err:
                        logger.warning(f"[SeedWarmup] Home feed fallback error: {home_err}")

                if target_link:
                    try:
                        video_title = ""
                        try:
                            video_title = target_link.get_attribute("title") or target_link.inner_text() or ""
                        except Exception:
                            pass
                        if not video_title.strip():
                            video_title = current_query

                        self.set_job_progress(profile_id, "WARMING", f"[{i+1}/{video_count}] '{video_title[:30]}' 시청 진입 중...", i, video_count)

                        # [Fix] YouTube 인라인 프리뷰 동영상(<video> overlay) 인터셉트 방어 탐색
                        nav_ok = self._safe_navigate_to_video(page, target_link)
                        if not nav_ok:
                            logger.warning(f"[SeedWarmup] Direct click failed for video {i+1}, trying fallback search click")

                        logger.info(f"▶️ [SeedWarmup] Watching video {i+1}: '{video_title}'...")

                        # Wait for player or video tag
                        try:
                            page.wait_for_selector('.html5-video-player, video', timeout=10000)
                        except Exception:
                            pass

                        watch_seconds = random.randint(45, 65)
                        self.set_job_progress(profile_id, "WARMING", f"[{i+1}/{video_count}] '{video_title[:25]}' 시청 중 ({watch_seconds}초)", i + 1, video_count)
                        self._active_watch(page, duration=watch_seconds, allow_like=False, allow_comment=False)
                        watched += 1
                        watched_videos.append(video_title)
                        logger.info(f"✅ [SeedWarmup] Finished video {i+1}: '{video_title}' ({watch_seconds}s)")
                    except Exception as watch_err:
                        logger.warning(f"[SeedWarmup] Video watch error: {watch_err}")
                else:
                    logger.warning(f"[SeedWarmup] No visible search results or home cards found for query '{current_query}'")

                # Short break between videos
                time.sleep(random.uniform(2.0, 4.0))

            success = watched > 0
            if success:
                profile.incubation_status = "WARMED"
                profile.seed_history_count = (profile.seed_history_count or 0) + watched
                profile.last_warmed_at = datetime.now()
                db.commit()
                self.set_job_progress(profile_id, "COMPLETED", f"시드 예열 완료 ({watched}편 시청)", watched, video_count)
                logger.info(f"🎉 [SeedWarmup] Successfully warmed profile {profile_id} (Watched {watched} videos: {watched_videos})")
                return {
                    "success": True,
                    "profile_id": profile_id,
                    "watched_count": watched,
                    "watched_videos": watched_videos,
                    "incubation_status": profile.incubation_status
                }
            else:
                profile.incubation_status = "NEWBORN"
                db.commit()
                self.set_job_progress(profile_id, "FAILED", "동영상 시청에 실패했습니다", 0, video_count)
                return {
                    "success": False,
                    "error": "유튜브 동영상 카드를 감지하지 못했습니다. 스텔스 브라우저가 화면에 떴을 때 네트워크 또는 로그인 상태를 확인해 주세요.",
                    "profile_id": profile_id,
                    "watched_count": 0,
                    "watched_videos": [],
                    "incubation_status": profile.incubation_status
                }
        except Exception as e:
            logger.error(f"[SeedWarmup] Execution failed: {e}", exc_info=True)
            return {"success": False, "error": str(e)}
        finally:
            try:
                self.close_session(profile_id)
            except Exception:
                pass
            db.close()
            # Post-warmup soft IP rotation
            if success:
                try:
                    from app.services.adb_service import adb_service
                    adb_service.rotate_ip(method='soft')
                except Exception:
                    pass

    def get_active_channel(self) -> Optional[str]:
        return self._active_channel_id

    def _verify_login(self, page, channel_id: str = None, db=None) -> bool:
        """ [Health Check] 로그인 세션 유지 여부 확인 + 자동 재로그인 """
        try:
            # 아바타 버튼 또는 로그인 버튼 유무 확인 (최대 15초 대기)
            try:
                page.wait_for_selector('button#avatar-btn, yt-img-shadow#avatar, #avatar-btn, a[href*="ServiceLogin"], a[href*="accounts.google.com"]', timeout=15000)
            except Exception:
                pass
            
            # 로그아웃 상태인지 명확히 확인
            sign_in_btn = page.locator('a[href*="ServiceLogin"], a[href*="accounts.google.com/signin"]').first
            if not sign_in_btn.is_visible():
                return True  # 이미 로그인된 상태
                
            logger.warning("[WARN] Not logged in — attempting auto-login...")
            
            # 자동 로그인 시도: DB에서 이메일/비밀번호 조회
            if not channel_id or not db:
                logger.error("[FAIL] Cannot auto-login: channel_id or db not provided")
                return False
                
            import app.models as _models
            channel = db.query(_models.YouTubeChannel).filter(_models.YouTubeChannel.channel_id == channel_id).first()
            if not channel or not channel.owner_profile_id:
                logger.error("[FAIL] Cannot auto-login: no owner_profile_id")
                return False
                
            profile = db.query(_models.Profile).filter(_models.Profile.id == channel.owner_profile_id).first()
            if not profile or not profile.email or not profile.password:
                logger.error("[FAIL] Cannot auto-login: profile has no credentials")
                return False
            
            logger.info(f"🔑 Auto-login attempt for {profile.email}")
            
            # 구글 로그인 페이지로 이동
            page.goto("https://accounts.google.com/signin/v2/identifier?service=youtube")
            time.sleep(2)
            
            # 이메일 입력
            email_field = page.locator('input[type="email"]')
            email_field.wait_for(state='visible', timeout=10000)
            email_field.fill("")
            email_field.type(profile.email, delay=random.randint(60, 130))
            page.keyboard.press('Enter')
            time.sleep(random.uniform(3, 5))
            
            # 비밀번호 입력
            pwd_field = page.locator('input[type="password"]')
            pwd_field.wait_for(state='visible', timeout=10000)
            pwd_field.fill("")
            pwd_field.type(profile.password, delay=random.randint(60, 130))
            page.keyboard.press('Enter')
            time.sleep(random.uniform(5, 8))
            
            # 로그인 완료 후 유튜브 홈으로
            page.goto("https://www.youtube.com/")
            time.sleep(random.uniform(4, 6))
            
            # 다시 로그인 상태 확인
            try:
                page.wait_for_selector('button#avatar-btn, yt-img-shadow#avatar, #avatar-btn', timeout=10000)
                logger.info("[OK] Auto-login successful!")
                return True
            except Exception:
                logger.error("[FAIL] Auto-login failed: avatar not found after login attempt")
                return False
                
        except Exception as e:
            logger.error(f"Login verification failed: {e}")
            return False
            
    def _active_watch(self, page, duration: int, allow_like: bool = False, allow_comment: bool = False, comment_text: str = ""):
        """ 사람처럼 시청 시뮬레이션 (Micro-actions & Entropy) """
        logger.info(f"👀 Active watching for {duration} seconds... (Like: {allow_like}, Comment: {allow_comment})")
        end_time = time.time() + duration
        
        while time.time() < end_time:
            if self.is_aborted():
                logger.info("⏹️ [ActiveWatch] Abort flag detected, stopping watch simulation.")
                break
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
                            logger.info("[SCRIPT] Comment posted.")
            except Exception as e:
                logger.warning(f"Comment attempt failed: {e}")

    def _warmup_day_1_discovery(self, page, db, channel_id, stage, dna, intel):
        """[Stage 1: 순수 관찰자] 홈 피드 탐색, 검색 없이 무작위 시청, 상호작용 불가"""
        logger.info(f"[SEARCH] [Stage 1] Passive Observer for {channel_id}")
        try:
            if not self._verify_login(page, channel_id=channel_id, db=db):
                logger.error("[FAIL] Session Dropped or Captcha blocked.")
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
                video_card.wait_for(state='visible', timeout=8000)
                self._safe_navigate_to_video(page, video_card)
                logger.info("📺 Selected video from Home Feed.")
                
                # 시청 (45 ~ 120초), 상호작용 절대 금지
                self._active_watch(page, random.randint(45, 120), allow_like=False, allow_comment=False)
            except Exception as e:
                logger.warning(f"Could not click video from home feed (Empty feed?): {e}")
                logger.info("[REFRESH] Fallback: Performing generic search to populate watch history.")
                
                # DNA 기반 검색어 생성 또는 기본 검색어 사용
                query = "요즘 뜨는 영상"
                if dna:
                    queries = intel.generate_dna_search_queries(dna)
                    if queries:
                        query = random.choice(queries)
                
                search_input = page.locator('input#search')
                if search_input.is_visible():
                    search_input.click()
                    search_input.fill("")
                    search_input.type(query, delay=random.randint(50, 150))
                    page.keyboard.press('Enter')
                    time.sleep(random.uniform(4, 7))
                else:
                    import urllib.parse
                    encoded_query = urllib.parse.quote(query)
                    page.goto(f"https://www.youtube.com/results?search_query={encoded_query}", wait_until="domcontentloaded", timeout=30000)
                    time.sleep(random.uniform(3, 5))
                    
                # 검색 결과에서 영상 클릭
                search_card = page.locator('ytd-video-renderer').first
                try:
                    search_card.wait_for(state='visible', timeout=8000)
                    self._safe_navigate_to_video(page, search_card)
                    logger.info("📺 Selected video from Fallback Search.")
                    self._active_watch(page, random.randint(45, 120), allow_like=False, allow_comment=False)
                except Exception as search_err:
                    logger.error(f"[FAIL] Fallback search failed: {search_err}")
                
            return True
        except Exception as e:
            err_msg = f"Stage 1 오류: {e}"
            logger.error(f"[FAIL] {err_msg}")
            self._last_warmup_error[channel_id] = err_msg
            if str(e) == "AUTH_DROPPED": return "AUTH_DROPPED"
            return False

    def _warmup_day_2_interest(self, page, db, channel_id, stage, dna, intel):
        """[Stage 2: 관심사 좁히기] DNA 검색, Shorts 탐색, 제한적 상호작용"""
        logger.info(f"[SEARCH] [Stage 2] Niche Explorer for {channel_id}")
        try:
            if not self._verify_login(page, channel_id=channel_id, db=db):
                raise Exception("AUTH_DROPPED")
                
            queries = intel.generate_dna_search_queries(dna) if dna else ["재미있는 영상", "일상 브이로그"]
            query = random.choice(queries)
            
            # 직접 타이핑하듯 검색
            page.goto("https://www.youtube.com/", wait_until="domcontentloaded", timeout=30000)
            time.sleep(random.uniform(2, 4))
            search_input = page.locator('input#search')
            if search_input.is_visible():
                search_input.click()
                search_input.fill("")
                search_input.type(query, delay=random.randint(50, 150))
                page.keyboard.press('Enter')
                time.sleep(random.uniform(4, 7))
            else:
                page.goto(f"https://www.youtube.com/results?search_query={query}", wait_until="domcontentloaded", timeout=30000)
                time.sleep(random.uniform(3, 5))
                
            # 검색 결과에서 2~4번째 영상 클릭 (최상단 회피)
            video_card = page.locator('ytd-video-renderer').nth(random.randint(1, 3))
            try:
                video_card.wait_for(state='visible', timeout=10000)
                self._safe_navigate_to_video(page, video_card)
                logger.info(f"📺 Selected niche video for '{query}'.")
                
                # 시청 (90 ~ 180초), 좋아요 50% 허용
                self._active_watch(page, random.randint(90, 180), allow_like=True, allow_comment=False)
            except Exception:
                pass
            
            # 숏츠 시청 로직
            logger.info("📱 Exploring Shorts...")
            page.goto("https://www.youtube.com/shorts/", wait_until="domcontentloaded", timeout=30000)
            time.sleep(random.uniform(3, 6))
            for _ in range(random.randint(3, 6)): # 3~6개 숏츠
                # 숏츠 체류 시간 (3초 ~ 30초)
                time.sleep(random.uniform(3, 30))
                # 다음 숏츠로 넘어가기 (휠 내리기)
                page.mouse.wheel(0, 800)
                time.sleep(random.uniform(0.5, 1.5))
                
            return True
        except Exception as e:
            err_msg = f"Stage 2 오류: {e}"
            logger.error(f"[FAIL] {err_msg}")
            self._last_warmup_error[channel_id] = err_msg
            if str(e) == "AUTH_DROPPED": return "AUTH_DROPPED"
            return False

    def _warmup_day_3_community(self, page, db, channel_id, stage, dna, intel):
        """[Stage 3: 커뮤니티 일원화] 롱테일 체류, 구독 및 댓글 작성"""
        logger.info(f"💬 [Stage 3] Active Participant for {channel_id}")
        try:
            # Stage 2의 검색 로직을 일부 차용하여 영상 진입
            res = self._warmup_day_2_interest(page, db, channel_id, stage, dna, intel)
            if res == "AUTH_DROPPED": return res
            if not res:
                logger.warning(f"[Stage 3] Stage 2 선행 탐색 실패로 웜업 안전 중단: {channel_id}")
                return False
                
            # 추가적으로 한 번 더 영상을 클릭하여 깊은 상호작용 시도
            queries = intel.generate_dna_search_queries(dna) if dna else ["인기 급상승", "추천 영상"]
            page.goto(f"https://www.youtube.com/results?search_query={random.choice(queries)}", wait_until="domcontentloaded", timeout=30000)
            time.sleep(random.uniform(3, 5))
                
            video_card = page.locator('ytd-video-renderer').nth(random.randint(0, 2))
            try:
                video_card.wait_for(state='visible', timeout=10000)
                self._safe_navigate_to_video(page, video_card)
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
            err_msg = f"Stage 3 오류: {e}"
            logger.error(f"[FAIL] {err_msg}")
            self._last_warmup_error[channel_id] = err_msg
            if str(e) == "AUTH_DROPPED": return "AUTH_DROPPED"
            return False

    def launch_tiktok_upload(
        self,
        profile_id: Optional[str] = None,
        db: Optional[Session] = None,
        video_path: str = "",
        caption: str = "",
        hashtags: Optional[list] = None,
        privacy: str = "PUBLIC",
        allow_comments: bool = True,
        allow_duet: bool = True,
        headless: bool = False
    ) -> dict:
        """
        TikTok 스텔스 브라우저 업로드 실행.
        profile_id 누락 시 DB에서 활성 TIKTOK 프로필 자동 폴백 지원.
        """
        # 프로필 ID 폴백
        target_profile_id = profile_id
        if not target_profile_id:
            try:
                from app.database import SessionLocal
                from app.models import Profile
                db_sess = db or SessionLocal()
                p = db_sess.query(Profile).filter(Profile.profile_type == "TIKTOK", Profile.status == "ACTIVE").first()
                if not p:
                    p = db_sess.query(Profile).filter(Profile.profile_type == "TIKTOK").first()
                if p:
                    target_profile_id = p.id
                if not db and db_sess:
                    db_sess.close()
            except Exception as e:
                logger.warning(f"Failed to resolve fallback TikTok profile: {e}")

        if not target_profile_id:
            return {"status": "error", "message": "No TikTok Profile found to execute upload"}

        msg = f"🖥️ [SessionManager] Launching TikTok Upload for profile {target_profile_id} (headless={headless})"
        print(msg)
        logger.info(msg)
        page = self._create_browser(profile_id=target_profile_id, engine_mode="standard", headless=headless)
        try:
            from app.services.tiktok_uploader import tiktok_uploader
            return tiktok_uploader.upload_video(
                page=page,
                video_path=video_path,
                caption=caption,
                hashtags=hashtags or [],
                privacy=privacy,
                allow_comments=allow_comments,
                allow_duet=allow_duet
            )
        finally:
            if page and getattr(page, 'context', None):
                try:
                    page.context.close()
                except Exception:
                    pass

    def launch_instagram_upload(
        self,
        profile_id: Optional[str] = None,
        db: Optional[Session] = None,
        video_path: str = "",
        caption: str = "",
        share_to_feed: bool = False
    ) -> dict:
        """
        Instagram Reels 스텔스 브라우저 업로드 실행.
        profile_id 누락 시 DB에서 활성 INSTAGRAM 프로필 자동 폴백 지원.
        """
        target_profile_id = profile_id
        if not target_profile_id:
            try:
                from app.database import SessionLocal
                from app.models import Profile
                db_sess = db or SessionLocal()
                p = db_sess.query(Profile).filter(Profile.profile_type == "INSTAGRAM", Profile.status == "ACTIVE").first()
                if not p:
                    p = db_sess.query(Profile).filter(Profile.profile_type == "INSTAGRAM").first()
                if p:
                    target_profile_id = p.id
                if not db and db_sess:
                    db_sess.close()
            except Exception as e:
                logger.warning(f"Failed to resolve fallback Instagram profile: {e}")

        if not target_profile_id:
            return {"status": "error", "message": "No Instagram Profile found to execute upload"}

        logger.info(f"Launching Instagram Upload for profile {target_profile_id}")
        page = self._create_browser(profile_id=target_profile_id, engine_mode="standard", headless=False)
        try:
            from app.services.instagram_browser_uploader import instagram_browser_uploader
            return instagram_browser_uploader.upload_reel(
                page=page,
                video_path=video_path,
                caption=caption,
                share_to_feed=share_to_feed
            )
        finally:
            if page and getattr(page, 'context', None):
                try:
                    page.context.close()
                except Exception:
                    pass

session_manager = BrowserSessionManager()
