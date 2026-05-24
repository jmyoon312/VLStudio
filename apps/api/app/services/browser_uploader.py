import logging
import time
import os
import random
from sqlalchemy.orm import Session

# [Core Infrastructure]
from app import models
from app.services.browser_session_manager import BrowserSessionManager
from app.services.adb_service import adb_service

logger = logging.getLogger(__name__)

class BrowserUploader:
    """
    Advanced Browser Automation for YouTube Uploads (Patchright Version).
    Leverages BrowserSessionManager for 'Secure Connection' and 'IP Rotation'.
    """
    
    def __init__(self):
        self.session_manager = BrowserSessionManager()

    def upload_video(self, db: Session, item_id: int, force_ip_rotation: bool = False):
        """
        Orchestrates the Upload Flow:
        1. Secure Browser Launch (via SessionManager)
        2. Navigate to Studio
        3. Upload & Metadata Fill
        4. Publish
        """
        item = db.query(models.WorkQueueItem).filter(models.WorkQueueItem.id == item_id).first()
        if not item:
            logger.error(f"WorkQueueItem {item_id} not found")
            return

        logger.info(f"🚀 Starting Browser Automation for: {item.title}")
        
        # Resolve Channel ID
        yt_config = item.platform_configs.get('youtube', {})
        channel_id = yt_config.get('channel_id')
        if not channel_id:
            msg = "Channel ID missing in configs"
            logger.error(msg)
            item.status = "FAILED"
            item.failure_reason = msg
            db.commit()
            return

        # [DEATH_VALLEY Blocker] Uploads are strictly forbidden in this recovery mode
        brand_channel = db.query(models.BrandChannel).filter(models.BrandChannel.channel_id == channel_id).first()
        if brand_channel and brand_channel.youtube_channel and brand_channel.youtube_channel.cultivation_strategy == "DEATH_VALLEY":
            msg = "Uploads are blocked during Death Valley recovery. The channel is in pure viewer mode."
            logger.error(msg)
            item.status = "FAILED"
            item.failure_reason = msg
            db.commit()
            return

        # 1. Launch Secure Browser (IP Rotation handled inside)
        try:
            # [Smart Rotation] Use flag passed from worker
            rotate_decision = force_ip_rotation
            logger.info(f"🛡️ IP Rotation Policy: {'ROTATE' if rotate_decision else 'STICKY'} (Force={force_ip_rotation})")
            
            page = self.session_manager.launch_channel(channel_id, db, rotate_ip=rotate_decision)
            if not page:
                raise Exception("Failed to launch secure browser session")
            
            # [Fix] Switch to the existing Studio tab if launch_channel opened it.
            context = page.context
            
            # Wait for tabs to stabilize
            time.sleep(2)
            
            target_page = page
            for p in context.pages:
                if "studio.youtube.com" in p.url:
                    target_page = p
                    target_page.bring_to_front()
                    logger.info(f"✅ Switched to existing Studio tab: {target_page.title()}")
                    break
            
            # Browser is now open at Studio dashboard (or target URL)
            self._execute_upload_flow(target_page, item, db)
            
            logger.info("✅ Upload Task Complete.")
            item.status = "COMPLETED"
            db.commit()
            
        except Exception as e:
            logger.error(f"❌ Browser Automation Failed: {e}")
            item.status = "FAILED"
            item.failure_reason = f"Browser Error: {str(e)}"
            db.commit()

    def _execute_upload_flow(self, page, item: models.WorkQueueItem, db: Session):
        """
        Robust Upload Flow (Fast Path + Localized Selectors)
        """
        # [Adjusted Timing] Safe Zone (3-5s) to bypass Identity Verification
        wait_time = random.uniform(3.0, 5.0)
        logger.info(f"⏳ Waiting for Studio Dashboard ({wait_time:.1f}s human pause)...")
        time.sleep(wait_time) 
        
        # [Simplified Launch] Direct wait for Dashboard or Create Button
        try:
            # Wait for either the Create button OR the dashboard URL
            create_btn = page.locator('#create-icon').first
            if not create_btn.is_visible():
                create_btn = page.locator('text="만들기"').first
            if not create_btn.is_visible():
                create_btn = page.locator('text="Create"').first
                
            create_btn.wait_for(state='visible', timeout=60000)
            logger.info("✅ Studio Dashboard Loaded (Secure Session)")
        except Exception as e:
            if "signin" in page.url or "accounts.google" in page.url:
                raise Exception("Login Page Detected. Session isolation failed or cookie expired.")
            raise Exception(f"Dashboard failed to load: {e}")

        # 1. Click Create -> Upload
        try:
            logger.info("🖱️ Click: Create Button")
            create_btn.click()
            time.sleep(1)
            
            upload_menu = page.locator('#text-item-0').first
            if not upload_menu.is_visible():
                upload_menu = page.locator('text="동영상 업로드"').first
            if not upload_menu.is_visible():
                upload_menu = page.locator('text="Upload videos"').first
                
            if upload_menu.is_visible():
                upload_menu.click()
            else:
                raise Exception("Could not find 'Upload videos' menu item")
                
        except Exception as e:
            raise Exception(f"Failed to click Create/Upload: {e}")

        # 2. Upload File
        logger.info(f"📂 Uploading: {item.video_file_path}")
        try:
            # Wait for any potential overlay
            time.sleep(2)
            
            file_input = page.locator('input[type="file"]').first
            if file_input.is_attached():
                file_input.set_input_files(item.video_file_path)
            else:
                raise Exception("File input element not found in DOM")
            
        except Exception as e:
            raise Exception(f"File upload interaction failed: {e}")
        
        # 3. Meticulous Metadata Entry (Fast Path)
        try:
            # --- Title ---
            logger.info("✍️ Writing Title...")
            page.locator('ytcp-uploads-dialog').first.wait_for(state='visible', timeout=60000)
            
            title_input = page.locator('#title-textarea #textbox').first
            if not title_input.is_visible():
                title_input = page.locator('div[aria-label*="제목"]').first
            
            if title_input.is_visible():
                title_input.fill("")
                time.sleep(0.5)
                # Type title slowly to simulate human
                title_input.type(item.title, delay=random.randint(50, 100))
            else:
                raise Exception("Title input not found")

            # --- Description ---
            logger.info("✍️ Writing Description...")
            desc_input = page.locator('#description-textarea #textbox').first
            if not desc_input.is_visible():
                desc_input = page.locator('div[aria-label*="설명"]').first
            
            if desc_input.is_visible():
                description = item.description or ""
                if item.hashtags:
                     tags_str = " ".join(item.hashtags) if isinstance(item.hashtags, list) else str(item.hashtags)
                     description += f"\n\n{tags_str}"
                
                desc_input.fill("")
                # Use fill here to avoid extremely long typing times for descriptions
                desc_input.fill(description)
            else:
                logger.warning("⚠️ Description input not found")

            # --- Audience (Not Made for Kids) ---
            logger.info("👶 Setting Audience...")
            not_kids_btn = page.locator('text="아니요, 아동용이 아닙니다"').first
            if not not_kids_btn.is_visible():
                not_kids_btn = page.locator('text="No, it\'s not made for kids"').first
                
            if not_kids_btn.is_visible():
                not_kids_btn.click()
            else:
                logger.warning("⚠️ 'Not Made for Kids' button not found. Maybe already set?")

            # --- Tags (Show More) ---
            if item.tags:
                try:
                    logger.info("🏷️ Processing Tags...")
                    show_more = page.locator('text="자세히 보기"').first
                    if not show_more.is_visible():
                        show_more = page.locator('text="Show more"').first
                    
                    if show_more.is_visible():
                        show_more.click()
                        time.sleep(1)
                    
                    tag_input = page.locator('#tags-container #text-input').first
                    if tag_input.is_visible():
                        tags_list = item.tags if isinstance(item.tags, list) else []
                        tags_str = ",".join(tags_list)
                        tag_input.type(tags_str, delay=50)
                        tag_input.press("Enter")
                    else:
                        logger.warning("⚠️ Tag input field not revealed.")
                except Exception as e:
                    logger.warning(f"Feature: Tags failed (Non-critical): {e}")

        except Exception as e:
            logger.error(f"❌ Metadata Entry Error: {e}")
            raise Exception(f"Metadata phase failed: {e}")

        # 4. Progression & Publish
        logger.info("➡️ Finishing Upload Flow...")
        try:
            # Step 1: Details -> Video Elements
            next_btn = page.locator('#next-button').first
            if next_btn.is_visible():
                next_btn.click()
                logger.info("✅ Details -> Video Elements")
            time.sleep(1)
            
            # Step 2: Video Elements -> Checks
            if next_btn.is_visible():
                next_btn.click()
                logger.info("✅ Video Elements -> Checks")
            time.sleep(1)
            
            # Step 3: Checks -> Visibility
            try:
                checks_done = False
                if page.locator('text="검사가 완료되었습니다"').first.is_visible() or \
                   page.locator('text="Checks complete"').first.is_visible():
                    checks_done = True
                
                if checks_done:
                    logger.info("✅ Checks Complete. No issues found.")
                else:
                    logger.warning("⚠️ Checks still processing or text not found. Proceeding anyway.")
            except:
                pass
            
            if next_btn.is_visible():
                next_btn.click()
                logger.info("✅ Checks -> Visibility")
            time.sleep(1)
            
            # [VISIBILITY LOGIC]
            logger.info("👁️ Setting Visibility...")
            
            yt_config = item.platform_configs.get('youtube', {})
            privacy = yt_config.get('privacy', 'private').lower()
            
            is_delayed_publish = (item.upload_delay_minutes and item.upload_delay_minutes > 0)
            
            if is_delayed_publish:
                logger.info(f"⏳ Delayed Publication Active: {item.upload_delay_minutes}min. Forcing PRIVATE.")
                target_privacy = 'private'
            else:
                target_privacy = privacy

            if target_privacy == 'public':
                page.locator('#privacy-radios-public').first.click(timeout=10000)
                logger.info("🔓 Selected PUBLIC")
            elif target_privacy == 'unlisted':
                page.locator('#privacy-radios-unlisted').first.click(timeout=10000)
            else:
                page.locator('#privacy-radios-private').first.click(timeout=10000)
                logger.info("🔒 Selected PRIVATE (Default/Forced)")
            
            # Final Click
            logger.info("🚀 Clicking Save/Publish...")
            page.locator('#done-button').first.click(timeout=5000)
            
            # Wait for confirmation dialog (Video Link available)
            page.locator('ytcp-video-share-dialog').first.wait_for(state='visible', timeout=60000)
            
            # Grab URL
            uploaded_url = None
            try:
                link_node = page.locator('a.style-scope.ytcp-video-share-dialog').first
                if link_node.is_visible():
                    uploaded_url = link_node.get_attribute("href")
                    logger.info(f"🎉 Upload Success! URL: {uploaded_url}")
                    item.uploaded_urls = {'youtube': uploaded_url}
            except:
                logger.info("Upload confirmed, but URL logic extraction skipped.")

        except Exception as e:
            raise Exception(f"Publishing phase failed: {e}")

        # [Status Update]
        if is_delayed_publish:
            item.status = "SCHEDULED_PUBLISH"
            from datetime import datetime, timedelta
            item.scheduled_upload_time = datetime.now() + timedelta(minutes=item.upload_delay_minutes)
            logger.info(f"📅 Scheduled for Public Release at: {item.scheduled_upload_time}")
        else:
            item.status = "COMPLETED"
            logger.info("✅ Upload Task Fully Complete.")


    def publish_scheduled_video(self, db: Session, item_id: int):
        """
        Phase 2: Switch a 'SCHEDULED_PUBLISH' video from Private to Public.
        """
        item = db.query(models.WorkQueueItem).filter(models.WorkQueueItem.id == item_id).first()
        if not item or item.status != "SCHEDULED_PUBLISH":
            logger.warning(f"Item {item_id} is not valid for scheduled publish.")
            return

        logger.info(f"🚀 executing Delayed Publish for item {item_id}")
        
        # 1. Launch Browser
        yt_config = item.platform_configs.get('youtube', {})
        channel_id = yt_config.get('channel_id')
        page = self.session_manager.launch_channel(channel_id, db, rotate_ip=False)
        
        try:
            # 2. Go to Content Tab
            page.goto("https://studio.youtube.com/")
            time.sleep(3)
            
            # Click Content Icon
            page.locator('#menu-paper-icon-item-1').first.click(timeout=5000)
            time.sleep(2)
            
            # 3. Find the Video
            first_row = page.locator('ytcp-video-row.style-scope.ytcp-video-section-content').first
            if not first_row.is_visible():
                raise Exception("No videos found in Content tab")
                
            video_title = first_row.locator('#video-title').first.inner_text()
            if item.title[:10] not in video_title:
                logger.warning(f"⚠️ Top video title '{video_title}' might not be '{item.title}'. Proceeding with caution.")
            
            # Click Visibility Dropdown
            visibility_cell = first_row.locator('.style-scope.ytcp-video-row-cell#visibility').first
            visibility_cell.click(timeout=5000)
            time.sleep(1)
            
            # Select Public
            page.locator('[name="PUBLIC"]').first.click(timeout=5000)
            time.sleep(1)
            
            # Click Publish/Save (in the popup)
            save_btn = page.locator('#save-button').first
            save_btn.click(timeout=5000)
            time.sleep(3)
            
            logger.info("✅ Video switched to PUBLIC.")
            item.status = "COMPLETED"
            db.commit()
            
        except Exception as e:
            logger.error(f"❌ Delayed Publish Failed: {e}")
            item.failure_reason = f"Delayed Publish Error: {e}"
            item.retry_count = (item.retry_count or 0) + 1
            db.commit()
        finally:
            if page and page.context:
                page.context.close()

browser_uploader = BrowserUploader()
