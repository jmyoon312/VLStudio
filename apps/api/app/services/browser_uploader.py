import logging
import time
import os
import random
import subprocess
from typing import Optional
from sqlalchemy.orm import Session

# [Core Infrastructure]
from app import models
from app.services.browser_session_manager import BrowserSessionManager
from app.services.adb_service import adb_service
from app.services.stealth_ops_v2 import UserInteractiveActiveException

logger = logging.getLogger(__name__)


def extract_shorts_thumbnail(video_path: str, thumbnail_path: Optional[str] = None) -> Optional[str]:
    """
    유튜브 쇼츠용 맞춤 썸네일을 반환하거나, 없을 경우 비디오의 0.8초(가장 강력한 후킹 씬) 프레임을
    FFmpeg를 통해 고화질 JPEG로 자동 추출합니다.
    """
    if thumbnail_path and os.path.exists(thumbnail_path):
        return thumbnail_path

    if not video_path or not os.path.exists(video_path):
        return None

    try:
        from app.config import discover_ffmpeg
        ffmpeg_bin = discover_ffmpeg()

        base, _ = os.path.splitext(video_path)
        out_thumb = f"{base}_thumb.jpg"

        if os.path.exists(out_thumb) and os.path.getsize(out_thumb) > 1024:
            return out_thumb

        cmd = [
            ffmpeg_bin, "-y",
            "-ss", "00:00:00.800",
            "-i", video_path,
            "-vframes", "1",
            "-q:v", "2",
            out_thumb
        ]
        res = subprocess.run(cmd, capture_output=True, timeout=15)
        if os.path.exists(out_thumb) and os.path.getsize(out_thumb) > 1024:
            logger.info(f"📸 [Thumb] Auto-extracted Shorts hook thumbnail: {out_thumb}")
            return out_thumb
        else:
            logger.warning(f"[Thumb] FFmpeg thumbnail extract failed: {res.stderr.decode('utf-8', errors='ignore')[:200]}")
    except Exception as e:
        logger.warning(f"[Thumb] Failed to extract shorts thumbnail: {e}")
    return None


class BrowserUploader:
    """
    Advanced Browser Automation for YouTube Uploads (Patchright Version).
    Leverages BrowserSessionManager for 'Secure Connection' and 'IP Rotation'.
    """

    def __init__(self):
        self.session_manager = BrowserSessionManager()
        self.default_headless_mode = True

    def upload_video(self, db: Session, item_id: int, force_ip_rotation: bool = False):
        """
        Orchestrates the Upload Flow:
        1. Secure Browser Launch (via SessionManager)
        2. Direct Navigate to Studio (Zero home feed delay)
        3. Upload & Metadata Fill (Custom Thumbnails, Audience, 2026 Policy)
        4. Publish to Private for verification
        5. Guaranteed browser cleanup via finally block
        """
        item = db.query(models.WorkQueueItem).filter(models.WorkQueueItem.id == item_id).first()
        if not item:
            logger.error(f"WorkQueueItem {item_id} not found")
            return

        logger.info(f"[FALLBACK] Starting Browser Automation for: {item.title}")

        # Resolve Channel ID
        yt_config = item.platform_configs.get('youtube', {})
        channel_id = yt_config.get('channel_id') or item.channel_id
        if not channel_id:
            msg = "Channel ID missing in configs"
            logger.error(msg)
            item.status = "FAILED"
            item.failure_reason = msg
            db.commit()
            return

        # [DEATH_VALLEY Blocker] Uploads are strictly forbidden in this recovery mode
        youtube_channel = db.query(models.YouTubeChannel).filter(models.YouTubeChannel.channel_id == channel_id).first()
        if youtube_channel and youtube_channel.cultivation_strategy == "DEATH_VALLEY":
            msg = "Uploads are blocked during Death Valley recovery. The channel is in pure viewer mode."
            logger.error(msg)
            item.status = "FAILED"
            item.failure_reason = msg
            db.commit()
            return

        # 1. Launch Secure Browser (IP Rotation handled inside)
        try:
            rotate_decision = force_ip_rotation
            # Headless Mode Resolution:
            # If the user explicitly set the global toggle to "창 표시: 켜짐" (default_headless_mode == False),
            # global visibility takes absolute precedence over any item-level stale configs!
            global_headless = getattr(self, 'default_headless_mode', None)
            if global_headless is None:
                try:
                    from app.models import Settings
                    settings = db.query(Settings).first()
                    if settings and hasattr(settings, 'work_queue_headless_mode'):
                        global_headless = settings.work_queue_headless_mode
                except Exception:
                    pass

            if global_headless is False:
                headless_mode = False
            else:
                item_headless = yt_config.get('headless_mode')
                if item_headless is not None:
                    headless_mode = bool(item_headless)
                else:
                    headless_mode = bool(global_headless) if global_headless is not None else False
            logger.info(f"🛡️ IP Rotation Policy: {'ROTATE' if rotate_decision else 'STICKY'} (Force={force_ip_rotation}) | Headless={headless_mode} (Global={global_headless}, Item={item_headless})")

            # [Direct Studio Launch]
            # 대기열 업로드는 홈 피드 시청/프리 웜업을 무조건 건너뛰고 YouTube Studio로 즉시 직행 (웜업은 독립 백그라운드 루틴에서 별도 처리)
            skip_pre_warmup = True
            initial_url = "https://studio.youtube.com/"

            page = self.session_manager._launch_orchestrator(
                channel_id=channel_id, db=db,
                rotate_ip=rotate_decision,
                target_url=initial_url,
                headless=headless_mode
            )
            if not page:
                raise Exception("Failed to launch secure browser session")

            if not skip_pre_warmup:
                logger.info("🎬 [Pre-Upload Warmup] Simulating natural user behavior on YouTube Home before upload...")
                try:
                    time.sleep(random.uniform(2.0, 3.5))
                    for _ in range(random.randint(1, 2)):
                        page.mouse.wheel(0, int(random.gauss(300, 100)))
                        time.sleep(random.uniform(1.0, 2.0))
                    
                    logger.info("🎬 [Pre-Upload Warmup] Transitioning to YouTube Studio for upload...")
                    page.goto("https://studio.youtube.com/", wait_until="domcontentloaded", timeout=45000)
                except Exception as w_e:
                    logger.warning(f"Pre-upload buffer soft warning: {w_e}")
                    try:
                        page.goto("https://studio.youtube.com/", timeout=30000)
                    except Exception as e2:
                        logger.warning(f"Fallback navigation to studio: {e2}")

            target_page = page

            # Browser is now open at Studio dashboard
            self._execute_upload_flow(target_page, item, db)

            logger.info(f"[OK] Upload Task Complete. Final status: {item.status}")
            db.commit()

        except UserInteractiveActiveException as ue:
            logger.warning(f"👑 [BrowserUploader] Upload deferred for channel {channel_id}: {ue}")
            item.status = "PAUSED"
            item.failure_reason = "사용자 보안 접속(수동 조작) 중으로 안전하게 대기 중입니다. 창이 닫히면 자동으로 다시 진행됩니다."
            db.commit()
            return
        except Exception as e:
            logger.error(f"[FAIL] Browser Automation Failed: {e}")
            item.status = "FAILED"
            item.failure_reason = f"Browser Error: {str(e)}"
            db.commit()
        finally:
            # 🧹 [Guaranteed Browser Teardown]
            # Always close the browser session cleanly on completion or failure
            logger.info(f"🧹 [Browser Cleanup] Closing browser session for channel: {channel_id}")
            try:
                self.session_manager.close_session(channel_id)
            except Exception as close_e:
                logger.warning(f"Browser close cleanup soft warning: {close_e}")

    def _execute_upload_flow(self, page, item: models.WorkQueueItem, db: Session):
        """
        Robust Upload Flow (Fast Path + Localized Selectors + Shorts Thumbnail + 2026 Options)
        """
        wait_time = random.uniform(2.0, 3.5)
        logger.info(f"[WAIT] Waiting for Studio Dashboard ({wait_time:.1f}s human pause)...")
        time.sleep(wait_time)

        # 0. Wait for Dashboard or Create / Upload Button
        try:
            studio_indicator = page.locator('#upload-icon, #upload-button, #create-icon, button:has-text("만들기"), button:has-text("Create")').first
            studio_indicator.wait_for(state='visible', timeout=45000)
            logger.info("[OK] Studio Dashboard Loaded (Secure Session)")
        except Exception as e:
            if "signin" in page.url or "accounts.google" in page.url:
                raise Exception("Login Page Detected. Session isolation failed or cookie expired.")
            raise Exception(f"Dashboard failed to load: {e}")

        # 1. Click Create -> Upload
        try:
            file_input = page.locator('input[type="file"]').first
            upload_dialog = page.locator('ytcp-uploads-dialog').first

            if not (upload_dialog.is_visible() or file_input.is_visible()):
                # Try direct upload icon / button first (fast path)
                direct_btn = page.locator('#upload-icon, #upload-button, [aria-label*="동영상 업로드"], [aria-label*="Upload videos"]').first
                if direct_btn.count() > 0 and direct_btn.is_visible():
                    logger.info("🖱️ Click: Direct Upload Button/Icon")
                    direct_btn.evaluate("el => el.click()")
                else:
                    logger.info("🖱️ Click: Create Button")
                    create_btn = page.locator('#create-icon, button:has-text("만들기"), button:has-text("Create"), [aria-label*="만들기"], [aria-label*="Create"]').first
                    create_btn.evaluate("el => el.click()")
                    time.sleep(1)

                    upload_menu = page.locator('#text-item-0, tp-yt-paper-item:has-text("동영상 업로드"), tp-yt-paper-item:has-text("Upload videos"), [aria-label*="업로드"]').first
                    if upload_menu.is_visible(timeout=5000):
                        logger.info("🖱️ Click: Upload Menu Item")
                        upload_menu.evaluate("el => el.click()")

            # 2. Upload File
            logger.info(f"📂 Uploading: {item.video_file_path}")
            time.sleep(1.5)

            file_input = page.locator('input[type="file"]').first
            file_input.wait_for(state="attached", timeout=15000)
            file_input.set_input_files(item.video_file_path)

        except Exception as e:
            raise Exception(f"File upload interaction failed: {e}")

        # 3. Meticulous Metadata Entry
        try:
            logger.info("✍️ Waiting for Upload Dialog...")
            upload_dialog = page.locator('ytcp-uploads-dialog').first
            upload_dialog.wait_for(state='attached', timeout=60000)
            time.sleep(1.5)

            # --- Title ---
            logger.info("✍️ Writing Title...")
            title_input = page.locator('#title-textarea #textbox, div[aria-label*="제목"] #textbox, #textbox').first
            title_input.wait_for(state='visible', timeout=20000)
            title_input.evaluate('''(el, val) => {
                el.focus();
                el.innerText = val;
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }''', item.title)
            logger.info(f"[OK] Title applied cleanly: {item.title}")
            time.sleep(1.0)

            # --- Normalize Metadata (SSOT: Single Source of Truth) ---
            from app.services.metadata_normalizer import normalize_item_metadata
            normalized_meta = normalize_item_metadata(item.description, item.hashtags, item.tags)
            final_description = normalized_meta["youtube_description"]
            tags_to_upload = normalized_meta["tags"]

            # --- Description ---
            logger.info("✍️ Writing Description...")
            desc_input = page.locator('#description-textarea #textbox, div[aria-label*="설명"] #textbox, div[aria-label*="description"] #textbox').first
            if desc_input.count() > 0 and desc_input.is_visible():
                desc_input.evaluate('''(el, val) => {
                    el.focus();
                    el.innerText = val;
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                }''', final_description)
                logger.info(f"[OK] Description applied cleanly via JS injection ({len(final_description)} chars, {len(normalized_meta['hashtags'])} hashtags)")
                time.sleep(1.0)
            else:
                logger.warning("[WARN] Description input not found or not visible")

            # --- Early Video URL Detection (from right-hand preview card) ---
            try:
                url_el = page.locator('a[href*="youtu.be"], a.ytcp-video-info').first
                if url_el.count() > 0:
                    found_url = url_el.get_attribute("href") or url_el.inner_text()
                    if found_url and "youtu.be" in found_url:
                        found_url = found_url.strip()
                        logger.info(f"🔗 Detected Video URL early: {found_url}")
                        item.uploaded_urls = {'youtube': found_url}
            except Exception:
                pass

            # --- Shorts Custom Thumbnail Upload (2026 YouTube Desktop Feature) ---
            logger.info("🖼️ Checking Shorts Thumbnail...")
            try:
                thumb_file = extract_shorts_thumbnail(item.video_file_path, item.thumbnail_path)
                if thumb_file and os.path.exists(thumb_file):
                    logger.info(f"📸 Attaching Shorts thumbnail: {thumb_file}")
                    thumb_input = page.locator('ytcp-thumbnails-compact input[type="file"], #file-loader, input[type="file"][accept*="image"]').first
                    if thumb_input.count() > 0:
                        thumb_input.set_input_files(thumb_file)
                        logger.info("[OK] Custom Shorts Thumbnail attached via file input")
                        time.sleep(1)
                    else:
                        upload_thumb_btn = page.locator(':text("파일 업로드"), :text("Upload file"), #upload-button, button:has-text("파일 업로드")').first
                        if upload_thumb_btn.is_visible(timeout=2000):
                            with page.expect_file_chooser(timeout=4000) as fc_info:
                                upload_thumb_btn.click()
                            file_chooser = fc_info.value
                            file_chooser.set_files(thumb_file)
                            logger.info("[OK] Custom Shorts Thumbnail attached via file chooser")
                            time.sleep(1)
            except Exception as th_e:
                logger.warning(f"Shorts thumbnail attach warning (non-fatal): {th_e}")

            # --- Audience (Not Made for Kids) ---
            logger.info("👶 Setting Audience (Not Made for Kids)...")
            try:
                not_kids_selector = 'tp-yt-paper-radio-button[name="VIDEO_MADE_FOR_KIDS_NOT_MFK"], [name="VIDEO_MADE_FOR_KIDS_NOT_MFK"]'
                not_kids_btn = page.locator(not_kids_selector).first
                if not_kids_btn.count() > 0:
                    not_kids_btn.evaluate("node => { node.scrollIntoView({ block: 'center', inline: 'center' }); node.click(); }")
                    logger.info("[OK] Selected: Not Made for Kids (JS DOM Click)")
                    time.sleep(0.5)
                else:
                    logger.warning("[WARN] 'Not Made for Kids' radio not found. Checking if preset.")
            except Exception as aud_e:
                logger.warning(f"Audience selection warning: {aud_e}")

            # --- 2026 Altered Content / Show More Options ---
            try:
                altered_no = page.locator('tp-yt-paper-radio-button[name="ALTERED_CONTENT_NO"], [name="ALTERED_CONTENT_NO"]').first
                if altered_no.is_visible(timeout=1500):
                    altered_no.evaluate("node => node.click()")
                    logger.info("[OK] Altered Content: Selected 'No'")
            except Exception:
                pass

            # Expand 'Show More' (자세히 표시 / Show more) & Input Tags
            if tags_to_upload:
                try:
                    logger.info(f"🏷️ Processing Tags (Expanding Show More, {len(tags_to_upload)} tags)...")
                    # 1. Scroll container down to mount #toggle-button in virtual DOM
                    page.evaluate('''() => {
                        const sc = document.querySelector('#scrollable-content');
                        if (sc) sc.scrollTop = sc.scrollHeight;
                    }''')
                    time.sleep(1.0)

                    # 2. Click toggle button (자세히 표시)
                    toggle_btn = page.locator('ytcp-button#toggle-button, #toggle-button, ytcp-button:has-text("자세히 표시"), ytcp-button:has-text("Show more")').first
                    if toggle_btn.count() > 0:
                        toggle_btn.evaluate("node => node.click()")
                        logger.info("[OK] Clicked '자세히 표시 (Show more)' button")
                        time.sleep(1.0)

                    # 3. Scroll down again to reveal #tags-container
                    page.evaluate('''() => {
                        const sc = document.querySelector('#scrollable-content');
                        if (sc) sc.scrollTop = sc.scrollHeight;
                    }''')
                    time.sleep(1.0)

                    # 4. Insert tags with comma separation to create chips
                    tag_input = page.locator('#tags-container #text-input, input[aria-label*="태그"], input[aria-label*="Tags"]').first
                    if tag_input.is_visible(timeout=5000):
                        tags_text = ",".join(tags_to_upload) + ","
                        tag_input.type(tags_text, delay=20)
                        time.sleep(0.5)
                        logger.info(f"[OK] Tags applied ({len(tags_to_upload)} chips created: {tags_text[:40]}...)")
                    else:
                        logger.warning("[WARN] Tag input not visible after expand")
                except Exception as t_e:
                    logger.warning(f"Tags non-critical warning: {t_e}")

            # --- Shorts Remixing Option (Allow all remixing for max viral reach) ---
            try:
                remix_radio = page.locator('tp-yt-paper-radio-button[name="SHORT_REMIX_OPTION_ALLOW_ALL"], [name="SHORT_REMIX_OPTION_ALLOW_ALL"]').first
                if remix_radio.is_visible(timeout=1500):
                    remix_radio.evaluate("node => node.click()")
            except Exception:
                pass

            # --- Video Language Selection (Global Targeting: ja, ko, en, es) ---
            try:
                lang_code = yt_config.get('language') or getattr(brand_channel, 'default_language', None)
                if not lang_code and item.title:
                    import re
                    has_jp = bool(re.search(r'[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]', item.title))
                    has_ko = bool(re.search(r'[\uAC00-\uD7AF\u1100-\u11FF]', item.title))
                    if has_jp and not has_ko:
                        lang_code = 'ja'
                    elif has_ko:
                        lang_code = 'ko'

                if lang_code:
                    logger.info(f"🌐 [BrowserUploader] Configuring Video Language for global targeting: {lang_code}...")
                    lang_targets = {
                        'ja': ['일본어', 'Japanese'],
                        'ko': ['한국어', 'Korean'],
                        'en': ['영어', 'English'],
                        'es': ['스페인어', 'Spanish']
                    }.get(lang_code, [lang_code])

                    # Scroll down to reveal language section
                    page.evaluate('''() => {
                        const sc = document.querySelector('#scrollable-content');
                        if (sc) sc.scrollTop = sc.scrollHeight;
                    }''')
                    time.sleep(0.5)

                    lang_selector = page.locator('ytcp-form-language-input, ytcp-select[aria-label*="동영상 언어"], ytcp-select[aria-label*="Video language"], #language-audio-language').first
                    if lang_selector.count() > 0 and lang_selector.is_visible(timeout=3000):
                        lang_selector.click()
                        time.sleep(0.8)

                        # Check if search box opened
                        search_box = page.locator('tp-yt-paper-dialog input, input#search-input, input[aria-label*="검색"], input[aria-label*="Search"]').first
                        if search_box.count() > 0 and search_box.is_visible(timeout=1500):
                            search_box.fill(lang_targets[0])
                            time.sleep(0.5)

                        # Select matching option
                        for target_text in lang_targets:
                            opt = page.locator(f'tp-yt-paper-item:has-text("{target_text}"), ytcp-text-menu tp-yt-paper-item:has-text("{target_text}"), tp-yt-paper-item .item-text:has-text("{target_text}")').first
                            if opt.count() > 0 and opt.is_visible(timeout=2000):
                                opt.click()
                                logger.info(f"✅ [BrowserUploader] Video Language set to: {target_text}")
                                time.sleep(0.5)
                                break
            except Exception as lang_e:
                logger.warning(f"Video language selection non-critical warning: {lang_e}")

        except Exception as e:
            logger.error(f"[FAIL] Metadata Entry Error: {e}")
            raise Exception(f"Metadata phase failed: {e}")

        # 4. Progression & Publish
        logger.info("➡️ Progression & Publish Flow...")
        try:
            def click_next_step(step_name: str):
                logger.info(f"➡️ Transitioning: {step_name}")
                time.sleep(1.5)
                btn = page.locator('#next-button, ytcp-button#next-button, button:has-text("다음"), button:has-text("Next")').first
                btn.wait_for(state='visible', timeout=25000)
                time.sleep(0.5)
                btn.evaluate("node => node.click()")
                time.sleep(2.0)

            # Step 1: Details -> Video Elements
            click_next_step("Details -> Video Elements")

            # Step 2: Video Elements -> Checks
            click_next_step("Video Elements -> Checks")

            # Step 3: Checks -> Visibility
            try:
                if page.locator(':text("검사가 완료되었습니다"), :text("Checks complete")').first.is_visible(timeout=3000):
                    logger.info("[OK] Checks complete. No copyright or policy issues.")
            except Exception:
                pass

            click_next_step("Checks -> Visibility")

            # [VISIBILITY & SCHEDULING LOGIC]
            logger.info("👁️ Setting Visibility & Schedule...")
            yt_config = item.platform_configs.get('youtube', {})
            original_privacy = yt_config.get('privacy', 'private').lower()
            if original_privacy == 'smart_scheduled' and not item.scheduled_upload_time:
                import os
                file_mb = 15.0
                try:
                    if item.video_file_path and os.path.exists(item.video_file_path):
                        file_mb = os.path.getsize(item.video_file_path) / (1024 * 1024)
                except Exception:
                    pass
                aging_mins = min(max(15, int(file_mb * 0.15) + 12), 30)
                item.scheduled_upload_time = __import__('datetime').datetime.now() + __import__('datetime').timedelta(minutes=aging_mins)
                db.commit()

            is_scheduled = (original_privacy in ["schedule", "scheduled", "smart_scheduled"]) or (item.scheduled_upload_time is not None and item.scheduled_upload_time > __import__('datetime').datetime.now())

            yt_config['final_privacy'] = 'scheduled' if is_scheduled else original_privacy
            item.platform_configs['youtube'] = yt_config
            from sqlalchemy.orm.attributes import flag_modified
            flag_modified(item, "platform_configs")

            if is_scheduled and item.scheduled_upload_time:
                logger.info(f"📅 Setting Direct Scheduled Publish for {item.scheduled_upload_time}...")
                try:
                    sched_radio = page.locator('tp-yt-paper-radio-button[name="SCHEDULE"], #schedule-radio, tp-yt-paper-radio-button:has-text("게시 일정"), tp-yt-paper-radio-button:has-text("예약")').first
                    if sched_radio.count() > 0:
                        sched_radio.evaluate("node => { node.scrollIntoView({ block: 'center' }); node.click(); }")
                        time.sleep(1.0)

                    t = item.scheduled_upload_time
                    date_input = page.locator('#datepicker-trigger input, input[aria-label*="날짜"], input[aria-label*="date"]').first
                    if date_input.is_visible(timeout=3000):
                        date_input.click()
                        page.keyboard.press("Control+A")
                        page.keyboard.press("Backspace")
                        date_str = f"{t.year}. {t.month:02d}. {t.day:02d}."
                        date_input.type(date_str, delay=30)
                        page.keyboard.press("Enter")
                        time.sleep(0.5)

                    time_input = page.locator('#time-of-day-trigger input, input[aria-label*="시간"], input[aria-label*="time"]').first
                    if time_input.is_visible(timeout=3000):
                        time_input.click()
                        page.keyboard.press("Control+A")
                        page.keyboard.press("Backspace")
                        time_str = t.strftime("%H:%M")
                        time_input.type(time_str, delay=30)
                        page.keyboard.press("Enter")
                        time.sleep(0.5)

                    logger.info(f"📅 Schedule configured for {date_str} {time_str}")
                except Exception as sc_e:
                    logger.warning(f"Scheduling direct config pass: {sc_e}")

            elif original_privacy == 'public':
                try:
                    pub_radio = page.locator('tp-yt-paper-radio-button[name="PUBLIC"], #privacy-radios-public').first
                    pub_radio.evaluate("node => { node.scrollIntoView({ block: 'center' }); node.click(); }")
                    logger.info("🌐 Selected PUBLIC")
                except Exception:
                    pass
            elif original_privacy == 'unlisted':
                try:
                    unl_radio = page.locator('tp-yt-paper-radio-button[name="UNLISTED"], #privacy-radios-unlisted').first
                    unl_radio.evaluate("node => { node.scrollIntoView({ block: 'center' }); node.click(); }")
                    logger.info("🔗 Selected UNLISTED")
                except Exception:
                    pass
            else:
                # Default to Private for safe upload
                try:
                    private_radio = page.locator('tp-yt-paper-radio-button[name="PRIVATE"], #privacy-radios-private').first
                    private_radio.evaluate("node => { node.scrollIntoView({ block: 'center' }); node.click(); }")
                    logger.info("🔒 Selected PRIVATE")
                except Exception:
                    try:
                        page.locator('tp-yt-paper-radio-button[name="PRIVATE"]').first.click(force=True, timeout=5000)
                    except Exception:
                        page.locator(':text("비공개"), :text("Private")').first.click(force=True, timeout=5000)

            # Final Click: Save / Publish
            logger.info("🚀 Clicking Done / Publish...")
            time.sleep(1.0)
            done_btn = page.locator('#done-button, #save-button, ytcp-button#done-button, button:has-text("저장"), button:has-text("게시"), button:has-text("예약"), button:has-text("Save"), button:has-text("Publish"), button:has-text("Schedule")').first
            done_btn.wait_for(state='visible', timeout=15000)
            done_btn.evaluate("node => node.click()")
            time.sleep(3.0)

            # Wait for confirmation dialog (Video Link available)
            try:
                share_dialog = page.locator('ytcp-video-share-dialog').first
                if share_dialog.is_visible(timeout=15000):
                    try:
                        link_node = share_dialog.locator('a.style-scope.ytcp-video-share-dialog, a[href*="youtu.be"], #share-url').first
                        if link_node.is_visible():
                            uploaded_url = link_node.get_attribute("href") or link_node.inner_text()
                            if uploaded_url and "youtu.be" in uploaded_url:
                                uploaded_url = uploaded_url.strip()
                                logger.info(f"🎉 Upload Success! URL: {uploaded_url}")
                                item.uploaded_urls = {'youtube': uploaded_url}
                    except Exception:
                        pass

                    # Close share dialog cleanly
                    try:
                        close_btn = share_dialog.locator('#close-button, button[aria-label*="닫기"], button[aria-label*="Close"]').first
                        if close_btn.is_visible():
                            close_btn.evaluate("node => node.click()")
                    except Exception:
                        pass
            except Exception as e:
                logger.warning(f"[WARN] Share dialog check: {e}")

        except Exception as e:
            raise Exception(f"Publishing phase failed: {e}")

        # [Status Update - Sovereign Publisher v4]
        item.upload_completed_at = __import__('datetime').datetime.now()
        if original_privacy == 'private' or is_scheduled:
            item.status = "COMPLETED"
            logger.info(f"[OK] Video uploaded directly as {'SCHEDULED' if is_scheduled else 'PRIVATE'}. Status -> COMPLETED.")
        else:
            item.status = "VERIFYING"
            logger.info("[WAIT] Upload Task Complete. Routing to VERIFYING queue for aging/copyright checks.")

        # Cleanly release browser session on upload completion so profile locks and processes are freed
        try:
            time.sleep(1.0)
            self.session_manager.close_session(channel_id)
            logger.info(f"🚪 Browser session closed for channel {channel_id}")
        except Exception as cs_e:
            logger.debug(f"Session close pass: {cs_e}")

    def verify_and_publish_video(self, db: Session, item_id: int):
        """
        Phase 2: Check constraints and switch a 'VERIFYING' video from Private to its final privacy.
        """
        import time
        from app import models
        item = db.query(models.WorkQueueItem).filter(models.WorkQueueItem.id == item_id).first()
        if not item: return

        # 1. Launch Browser (using optimized orchestrator)
        yt_config = item.platform_configs.get('youtube', {})
        channel_id = yt_config.get('channel_id')
        final_privacy = yt_config.get('final_privacy', 'public').upper()
        
        # [Optimization] Reusing context via _launch_orchestrator for verification
        page = self.session_manager._launch_orchestrator(channel_id, db, rotate_ip=False, target_url="https://studio.youtube.com/")
        
        try:
            # Click Content Icon
            page.locator('#menu-paper-icon-item-1').first.click(timeout=10000)
            time.sleep(3)
            
            # 3. Find the Video row
            first_row = page.locator('ytcp-video-row.style-scope.ytcp-video-section-content').first
            if not first_row.is_visible(timeout=15000):
                raise Exception("No videos found in Content tab")
                
            video_title = first_row.locator('#video-title').first.inner_text()
            if item.title[:10] not in video_title:
                logger.warning(f"[WARN] Top video title '{video_title}' might not match. Checking Shorts tab...")
                shorts_tab = page.locator('tp-yt-paper-tab').filter(has_text="Shorts").first
                if shorts_tab.is_visible():
                    shorts_tab.click()
                    time.sleep(3)
                    first_row = page.locator('ytcp-video-row.style-scope.ytcp-video-section-content').first
                    if first_row.is_visible():
                        video_title = first_row.locator('#video-title').first.inner_text()
                        if item.title[:10] not in video_title:
                            logger.warning(f"[WARN] Still doesn't match. Found: '{video_title}'. Proceeding with caution.")
            
            # 4. Check Restrictions Column
            restrictions_cell = first_row.locator('.style-scope.ytcp-video-row-cell#restrictions').first
            restrictions_text = restrictions_cell.inner_text().strip().lower()
            logger.info(f"🛡️ Video Restrictions: {restrictions_text}")

            if "checking" in restrictions_text or "검사" in restrictions_text or "검토" in restrictions_text:
                logger.info("[WAIT] Video is still being checked. Updating timestamp to wait another 10 mins.")
                item.updated_at = __import__('datetime').datetime.now()
                db.commit()
                return

            if "copyright" in restrictions_text or "저작권" in restrictions_text or "claim" in restrictions_text or "신고" in restrictions_text:
                logger.error(f"[FAIL] Copyright or restriction claim found: {restrictions_text}")
                item.status = "FAILED_REVIEW"
                item.failure_reason = f"유튜브 검토 실패: {restrictions_text}"
                db.commit()
                return

            # If "None" or safe, proceed to change visibility
            logger.info(f"[OK] Checks passed. Applying final privacy: {final_privacy}")
            visibility_cell = first_row.locator('.style-scope.ytcp-video-row-cell#visibility').first
            visibility_cell.click(timeout=5000)
            time.sleep(1)
            
            # Select final privacy
            if final_privacy in ["SCHEDULE", "SCHEDULED", "SMART_SCHEDULED"] and item.scheduled_upload_time:
                logger.info(f"📅 Entering Scheduling Mode for {item.scheduled_upload_time}")
                # Click the schedule radio
                page.locator('tp-yt-paper-radio-button[name="SCHEDULE"], tp-yt-paper-radio-button[name="SCHEDULED"]').first.click(timeout=5000)
                time.sleep(1)
                
                # Setup Date
                try:
                    date_input = page.locator('#datepicker-trigger input').first
                    if not date_input.is_visible():
                        date_input = page.locator('input[aria-label*="날짜"], input[aria-label*="date"]').first
                    
                    # Round time to nearest 15 minutes for YouTube constraints
                    t = item.scheduled_upload_time
                    discard = __import__('datetime').timedelta(minutes=t.minute % 15, seconds=t.second, microseconds=t.microsecond)
                    t -= discard
                    if discard >= __import__('datetime').timedelta(minutes=7.5):
                        t += __import__('datetime').timedelta(minutes=15)
                    
                    # Clear and type YYYY. MM. DD. (Korean format) or let JS do its best
                    date_input.click()
                    # Ctrl+A then Delete to clear
                    page.keyboard.press("Control+A")
                    page.keyboard.press("Backspace")
                    date_str = f"{t.year}. {t.month:02d}. {t.day:02d}."
                    date_input.type(date_str, delay=50)
                    page.keyboard.press("Enter")
                    time.sleep(1)
                except Exception as e:
                    logger.warning(f"[WARN] Could not set date: {e}")

                # Setup Time
                try:
                    time_input = page.locator('#time-of-day-trigger input').first
                    if not time_input.is_visible():
                        time_input = page.locator('input[aria-label*="시간"], input[aria-label*="time"]').first
                    
                    time_input.click()
                    page.keyboard.press("Control+A")
                    page.keyboard.press("Backspace")
                    time_str = t.strftime("%H:%M")
                    time_input.type(time_str, delay=50)
                    page.keyboard.press("Enter")
                    time.sleep(1)
                except Exception as e:
                    logger.warning(f"[WARN] Could not set time: {e}")
                
                save_btn = page.locator('#save-button, #done-button').filter(has_text="예약").first
                if not save_btn.is_visible():
                    save_btn = page.locator('#save-button').first
                save_btn.click(timeout=5000)
                time.sleep(3)
                logger.info(f"[OK] Video scheduled to {item.scheduled_upload_time}.")

            else:
                page.locator(f'[name="{final_privacy}"]').first.click(timeout=5000)
                time.sleep(1)
                
                # Click Publish/Save (in the popup)
                save_btn = page.locator('#save-button').first
                save_btn.click(timeout=5000)
                time.sleep(3)
                logger.info(f"[OK] Video switched to {final_privacy}.")
            item.status = "COMPLETED"
            db.commit()
            
        except Exception as e:
            logger.error(f"[FAIL] Verification & Publish Failed: {e}")
        finally:
            # Keep context open for next reuse
            pass

browser_uploader = BrowserUploader()
