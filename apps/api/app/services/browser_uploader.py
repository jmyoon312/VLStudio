import logging
import time
import os
import random
from sqlalchemy.orm import Session
from DrissionPage import ChromiumPage

# [Core Infrastructure]
from app import models
from app.services.browser_session_manager import BrowserSessionManager
from app.services.adb_service import adb_service

logger = logging.getLogger(__name__)

class BrowserUploader:
    """
    Advanced Browser Automation for YouTube Uploads (DrissionPage Version).
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

        # 1. Launch Secure Browser (IP Rotation handled inside)
        try:
            # NOTE: launch_channel opens a NEW TAB for the target URL.
            # [Smart Rotation] Use flag passed from worker
            rotate_decision = force_ip_rotation
            logger.info(f"🛡️ IP Rotation Policy: {'ROTATE' if rotate_decision else 'STICKY'} (Force={force_ip_rotation})")
            
            browser = self.session_manager.launch_channel(channel_id, db, rotate_ip=rotate_decision)
            if not browser:
                raise Exception("Failed to launch secure browser session")
            
            # [Fix] Switch to the existing Studio tab if launch_channel opened it.
            page_context = browser # Default to main
            
            # Wait for tabs to stabilize
            time.sleep(2)
            # DrissionPage uses .tab_ids key to access tabs
            for tab_id in browser.tab_ids:
                try:
                    tab = browser.get_tab(tab_id)
                    if "studio.youtube.com" in tab.url:
                        page_context = tab
                        logger.info(f"✅ Switched to existing Studio tab: {tab.title}")
                        break
                except: continue
            
            # Browser is now open at Studio dashboard (or target URL)
            self._execute_upload_flow(page_context, item, db)
            
            logger.info("✅ Upload Task Complete.")
            item.status = "COMPLETED"
            db.commit()
            
        except Exception as e:
            logger.error(f"❌ Browser Automation Failed: {e}")
            item.status = "FAILED"
            item.failure_reason = f"Browser Error: {str(e)}"
            db.commit()

    def _execute_upload_flow(self, page: ChromiumPage, item: models.WorkQueueItem, db: Session):
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
            # We look for the general container or the button to ensure load
            if not page.ele("#create-icon", timeout=60):
                 # Fallback check for text if ID missing
                 if not (page.ele("text:만들기") or page.ele("text:Create")):
                     raise Exception("Dashboard Create button not found")
            logger.info("✅ Studio Dashboard Loaded (Secure Session)")
        except Exception as e:
            # Last ditch check: maybe we are stuck on a login page?
            if "signin" in page.url or "accounts.google" in page.url:
                raise Exception("Login Page Detected. Session isolation failed or cookie expired.")
            raise Exception(f"Dashboard failed to load: {e}")

        # 1. Click Create -> Upload
        try:
            logger.info("🖱️ Click: Create Button")
            # Robust Selector Strategy: ID -> Korean Text -> English Text
            create_btn = page.ele("#create-icon")
            if not create_btn:
                create_btn = page.ele("text:만들기") # Korean
            if not create_btn:
                create_btn = page.ele("text:Create") # English
                
            if create_btn:
                create_btn.click()
            else:
                raise Exception("Could not find 'Create/만들기' button")
                
            time.sleep(1)
            
            # Click 'Upload videos' (first item usually, but safer to find text)
            # Menu items: #text-item-0 is usually "Upload videos"
            upload_menu = page.ele("#text-item-0") 
            if not upload_menu:
                upload_menu = page.ele("text:동영상 업로드") # Korean
            if not upload_menu:
                upload_menu = page.ele("text:Upload videos") # English
                
            if upload_menu:
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
            
            # DrissionPage input() method works best on the <input type='file'> element directly
            file_input = page.ele("css:input[type='file']")
            if not file_input:
                file_input = page.ele("xpath://input[@type='file']")
            
            if file_input:
                file_input.input(item.video_file_path)
            else:
                raise Exception("File input element not found in DOM")
            
        except Exception as e:
            raise Exception(f"File upload interaction failed: {e}")
        
        # 3. Meticulous Metadata Entry (Fast Path)
        try:
            # --- Title ---
            logger.info("✍️ Writing Title...")
            # Wait for dialog to exist (triggered by file input)
            page.wait.ele_displayed("ytcp-uploads-dialog", timeout=60)
            
            # Direct ID selector is usually best. If strictly Korean interface failed before, 
            # we try the aria-label strategy immediately.
            title_input = page.ele("#title-textarea #textbox", timeout=10)
            if not title_input:
                title_input = page.ele("xpath://div[contains(@aria-label, '제목')]", timeout=2)
            
            if title_input:
                title_input.clear()
                time.sleep(0.5)
                title_input.input(item.title)
            else:
                raise Exception("Title input not found")

            # --- Description ---
            logger.info("✍️ Writing Description...")
            # Use the ID directly, it is standard.
            desc_input = page.ele("#description-textarea #textbox", timeout=2)
            if not desc_input:
                desc_input = page.ele("xpath://div[contains(@aria-label, '설명')]", timeout=2)
            
            if desc_input:
                description = item.description or ""
                if item.hashtags:
                     # FORCE NEWLINE for Hashtags
                     tags_str = " ".join(item.hashtags) if isinstance(item.hashtags, list) else str(item.hashtags)
                     description += f"\n\n{tags_str}"
                
                desc_input.clear()
                desc_input.input(description)
            else:
                logger.warning("⚠️ Description input not found")

            # --- Audience (Not Made for Kids) ---
            logger.info("👶 Setting Audience...")
            # User reported 'name:...' selector failed. Using visible text is safest for this localized UI.
            # Korean: "아니요, 아동용이 아닙니다"
            not_kids_btn = page.ele("text:아니요, 아동용이 아닙니다", timeout=2)
            if not_kids_btn:
                # Toggle check: check if already selected? 
                # DrissionPage doesn't have easy is_selected for div-based radio, so just click.
                not_kids_btn.click()
            else:
                # Fallback to English text just in case
                not_kids_btn = page.ele("text:No, it's not made for kids", timeout=1)
                if not_kids_btn:
                    not_kids_btn.click()
                else:
                    logger.warning("⚠️ 'Not Made for Kids' button not found. Maybe already set?")

            # --- Tags (Show More) ---
            if item.tags:
                try:
                    logger.info("🏷️ Processing Tags...")
                    # 1. Click 'Show More' / '자세히 보기'
                    # It's usually a button or div with text.
                    show_more = page.ele("text:자세히 보기", timeout=2)
                    if not show_more:
                        show_more = page.ele("text:Show more", timeout=1)
                    
                    if show_more:
                        show_more.click()
                        time.sleep(1) # Allow expansion animation
                    
                    # 2. Input Tags
                    tag_input = page.ele("#tags-container #text-input", timeout=5)
                    if tag_input:
                        tags_list = item.tags if isinstance(item.tags, list) else []
                        tags_str = ",".join(tags_list)
                        tag_input.input(tags_str)
                        tag_input.input("\n")
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
            if page.ele("#next-button", timeout=5): 
                page.ele("#next-button").click()
                logger.info("✅ Details -> Video Elements")
            time.sleep(1)
            
            # Step 2: Video Elements -> Checks
            # Wait briefly for transition
            if page.ele("#next-button", timeout=5): 
                page.ele("#next-button").click()
                logger.info("✅ Video Elements -> Checks")
            time.sleep(1)
            
            # Step 3: Checks -> Visibility
            # [Checks Handling]
            # YouTube takes time to check copyright. We DO NOT need to wait for 100% completion.
            # If we see "Checks complete" (검사가 완료되었습니다), great. If not, we warn and proceed.
            try:
                checks_done = page.ele("text:검사가 완료되었습니다", timeout=2) or page.ele("text:Checks complete", timeout=1)
                if checks_done:
                    logger.info("✅ Checks Complete. No issues found.")
                else:
                    logger.warning("⚠️ Checks still processing or text not found. Proceeding anyway.")
            except:
                pass
            
            if page.ele("#next-button", timeout=5): 
                page.ele("#next-button").click()
                logger.info("✅ Checks -> Visibility")
            time.sleep(1)
            
            # [VISIBILITY LOGIC]
            logger.info("👁️ Setting Visibility...")
            
            # Read config (default to private)
            yt_config = item.platform_configs.get('youtube', {})
            privacy = yt_config.get('privacy', 'private').lower()
            
            # [Delayed Publication Feature]
            # If delay is set, we MUST upload as PRIVATE first, then schedule the switch.
            is_delayed_publish = (item.upload_delay_minutes and item.upload_delay_minutes > 0)
            
            if is_delayed_publish:
                logger.info(f"⏳ Delayed Publication Active: {item.upload_delay_minutes}min. Forcing PRIVATE.")
                target_privacy = 'private'
            else:
                target_privacy = privacy

            # Explicitly CLICK the target radio button
            if target_privacy == 'public':
                page.ele("#privacy-radios-public", timeout=10).click()
                logger.info("🔓 Selected PUBLIC")
            elif target_privacy == 'unlisted':
                page.ele("#privacy-radios-unlisted", timeout=10).click()
            else:
                page.ele("#privacy-radios-private", timeout=10).click()
                logger.info("🔒 Selected PRIVATE (Default/Forced)")
            
            # Final Click
            logger.info("🚀 Clicking Save/Publish...")
            page.ele("#done-button", timeout=5).click()
            
            # Wait for confirmation dialog (Video Link available)
            page.wait.ele_displayed("ytcp-video-share-dialog", timeout=60)
            
            # Grab URL
            uploaded_url = None
            try:
                link_node = page.ele("css:a.style-scope.ytcp-video-share-dialog", timeout=2)
                if link_node:
                    uploaded_url = link_node.attr("href")
                    logger.info(f"🎉 Upload Success! URL: {uploaded_url}")
                    item.uploaded_urls = {'youtube': uploaded_url}
            except:
                logger.info("Upload confirmed, but URL logic extraction skipped.")

        except Exception as e:
            raise Exception(f"Publishing phase failed: {e}")

        # [Status Update]
        if is_delayed_publish:
            item.status = "SCHEDULED_PUBLISH"
            # scheduled_upload_time = Now + Delay
            from datetime import datetime, timedelta
            item.scheduled_upload_time = datetime.now() + timedelta(minutes=item.upload_delay_minutes)
            logger.info(f"📅 Scheduled for Public Release at: {item.scheduled_upload_time}")
            
            # We can log this "Upload Phase" as complete, but the item isn't fully done.
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
        browser = self.session_manager.launch_channel(channel_id, db, rotate_ip=False)
        
        try:
            # 2. Go to Content Tab
            # Direct link is faster: studio.youtube.com/channel/ID/videos/upload
            # Or just click "Content"
            browser.get("https://studio.youtube.com/")
            time.sleep(3)
            
            # Click Content Icon
            browser.ele("#menu-paper-icon-item-1", timeout=5).click() # Usually Content is 2nd item
            time.sleep(2)
            
            # 3. Find the Video (Assume latest? Or search?)
            # Since we just uploaded it, it's at the top.
            # Row 1 -> Visibility Column
            
            # We look for the FIRST video row
            first_row = browser.ele("css:ytcp-video-row.style-scope.ytcp-video-section-content", timeout=10)
            if not first_row:
                raise Exception("No videos found in Content tab")
                
            # Check title matches (sanity check)
            video_title = first_row.ele("#video-title", timeout=2).text
            if item.title[:10] not in video_title: # Checking first 10 chars
                logger.warning(f"⚠️ Top video title '{video_title}' might not be '{item.title}'. Proceeding with caution.")
            
            # Click Visibility Dropdown (Currently "Private")
            visibility_cell = first_row.ele(".style-scope.ytcp-video-row-cell[id='visibility']", timeout=5)
            visibility_cell.click()
            time.sleep(1)
            
            # Select Public
            browser.ele("name:PUBLIC", timeout=5).click()
            time.sleep(1)
            
            # Click Publish/Save (in the popup)
            save_btn = browser.ele("#save-button", timeout=5)
            save_btn.click()
            time.sleep(3)
            
            logger.info("✅ Video switched to PUBLIC.")
            item.status = "COMPLETED"
            db.commit()
            
        except Exception as e:
            logger.error(f"❌ Delayed Publish Failed: {e}")
            item.failure_reason = f"Delayed Publish Error: {e}"
            # Keep status as SCHEDULED_PUBLISH to retry? Or FAIL?
            # Creating a 'PUBLISH_FAILED' status might be better, or retry count.
            item.retry_count = (item.retry_count or 0) + 1
            db.commit()
        finally:
            browser.quit()

browser_uploader = BrowserUploader()
