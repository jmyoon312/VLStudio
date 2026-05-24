import logging
import time
from app.services.stealth_ops_v2 import PatchrightStealth

logger = logging.getLogger("ChannelCreator")

class ChannelCreator:
    """Automate YouTube brand channel creation"""
    
    def __init__(self, stealth: PatchrightStealth):
        self.stealth = stealth
    
    def create_brand_channel(
        self, 
        page, 
        brand_name: str
    ) -> dict:
        """
        Automate brand channel creation on YouTube.
        Handles missing main channel (My Profile popup) automatically.
        """
        try:
            logger.info(f"🎬 Starting channel creation: {brand_name}")
            
            # 1. Direct navigation to Channel Switcher
            switcher_url = 'https://www.youtube.com/channel_switcher'
            page.goto(switcher_url)
            self.stealth.human_delay(3, 5)

            # [IDEMPOTENCY CHECK] Check if channel already exists (Robust Match)
            normalized_target = brand_name.replace(" ", "").lower()
            existing_channels = page.locator(f'//*[contains(text(), "{brand_name}")]').all()
            
            for ch in existing_channels:
                if ch.inner_text().replace(" ", "").lower() == normalized_target:
                    logger.info(f"✅ Channel '{brand_name}' already exists. Skipping creation.")
                    return {
                        "success": True, 
                        "channel_url": page.url,
                        "brand_name": brand_name,
                        "skipped": True
                    }

            # 2. Creation Loop (Handles Personal Channel Prerequisite)
            max_attempts = 2
            for attempt in range(max_attempts):
                phase_name = "Personal Channel Check" if attempt == 0 else "Brand Channel Creation"
                logger.info(f"🔄 Phase {attempt+1}: {phase_name}")
                
                # A. Look for "Create a channel" button
                create_btn = page.locator('text=채널 만들기').first
                if not create_btn.is_visible():
                    create_btn = page.locator('text=Create a channel').first
                if not create_btn.is_visible():
                    create_btn = page.locator('a[href*="create_channel"]').first

                if create_btn.is_visible():
                    logger.info("Found 'Create a channel' button, clicking...")
                    self.stealth.safe_click(create_btn)
                    self.stealth.human_delay(3, 5)
                
                # B. Determine State - Use explicit checks for Dialog vs Page
                
                # State 1: "My Profile" Dialog (Personal Channel Required)
                personal_dialog_candidate = page.locator('ytd-channel-creation-dialog-renderer').first
                if not personal_dialog_candidate.is_visible():
                    personal_dialog_candidate = page.locator('#channel-creation-form').first
                if not personal_dialog_candidate.is_visible():
                    personal_dialog_candidate = page.locator('div:has-text("내 프로필")').last

                if personal_dialog_candidate.is_visible():
                    logger.info("⚠️ Detected 'My Profile' Dialog (Personal Channel missing). Creating it first...")
                    
                    all_inputs = personal_dialog_candidate.locator('input').all()
                    valid_inputs = [inp for inp in all_inputs if inp.is_visible() and inp.get_attribute('type') not in ['checkbox', 'hidden', 'file']]
                    
                    logger.info(f"Found {len(valid_inputs)} visible inputs in dialog.")

                    if len(valid_inputs) >= 1:
                        # 1. Fill Name
                        p_name_input = valid_inputs[0]
                        logger.info(f"Filling Personal Channel Name: {brand_name}")
                        p_name_input.fill("")
                        self.stealth.human_type(p_name_input, brand_name)
                        self.stealth.human_delay(0.5, 1)

                        # 2. Fill Handle (if exists)
                        if len(valid_inputs) >= 2:
                            p_handle_input = valid_inputs[1]
                            import random
                            safe_handle = "".join(x for x in brand_name if x.isalnum())
                            if not safe_handle: safe_handle = "user"
                            safe_handle = f"{safe_handle}{random.randint(1000,9999)}"
                            
                            logger.info(f"Filling Personal Handle: @{safe_handle}")
                            p_handle_input.fill("")
                            self.stealth.human_type(p_handle_input, safe_handle)
                            self.stealth.human_delay(1, 2)
                    else:
                         logger.warning("⚠️ No text inputs found in 'My Profile' dialog! Trying fallback...")
                         fallback_name = page.locator('input[placeholder="이름"]').first
                         if fallback_name.is_visible():
                             fallback_name.fill("")
                             self.stealth.human_type(fallback_name, brand_name)

                    # Target the 'Create' button
                    create_personal_btn = page.locator('ytd-channel-creation-dialog-renderer yt-button-renderer#submit-button').first
                    if not create_personal_btn.is_visible():
                        create_personal_btn = page.locator('button:has(span:text-is("채널 만들기"))').first
                    if not create_personal_btn.is_visible():
                        create_personal_btn = page.locator('button:has-text("채널 만들기")').first
                    
                    if create_personal_btn.is_visible():
                        logger.info("Clicking confirm on Personal Channel dialog...")
                        self.stealth.safe_click(create_personal_btn)
                        logger.info("⏳ Waiting for Personal Channel creation...")
                        self.stealth.human_delay(6, 8)
                        
                        logger.info("Returning to Switcher to proceed to Brand Channel...")
                        page.goto(switcher_url)
                        self.stealth.human_delay(3, 5)
                        continue # Restart loop to now create Brand Channel
                
                # State 2: Brand Channel Creation Page (Target)
                name_input = page.locator('input#channel-name').first
                if not name_input.is_visible():
                    name_input = page.locator('input[name="channelName"]').first
                if not name_input.is_visible():
                    name_input = page.locator('ytd-channel-name-input-renderer input').first

                if name_input.is_visible():
                    logger.info("✅ Found Brand Channel Name Input")
                    name_input.fill("")
                    self.stealth.human_type(name_input, brand_name)
                    self.stealth.human_delay(0.5, 1)
                    
                    # Terms Checkbox
                    terms_input = page.locator('input[type="checkbox"]').first
                    if terms_input.is_visible():
                        if not terms_input.is_checked():
                            logger.info("Clicking Terms Checkbox...")
                            # Playwright check() handles clicking checkboxes properly
                            terms_input.check(force=True)
                    self.stealth.human_delay(0.5, 1)
                    
                    # Submit
                    submit_btn = page.locator('text=만들기').first
                    if not submit_btn.is_visible():
                        submit_btn = page.locator('text=Create').first
                    if not submit_btn.is_visible():
                        submit_btn = page.locator('input[type="submit"]').first
                    
                    if submit_btn.is_visible():
                        self.stealth.safe_click(submit_btn)
                        logger.info("Clicked Create button...")
                        self.stealth.human_delay(5, 8)
                        
                        # Verify Logic
                        current_url = page.url
                        if "youtube.com/channel/" in current_url or "youtube.com/@" in current_url:
                            logger.info(f"✅ Channel created successfully: {current_url}")
                            return {
                                "success": True, 
                                "channel_url": current_url,
                                "brand_name": brand_name
                            }
                        else:
                            error_msg = page.locator('.error-message, [role="alert"]').first
                            if error_msg.is_visible():
                                raise Exception(f"Creation Error: {error_msg.inner_text()}")
                            elif "phone" in page.content().lower() and "verify" in page.content().lower() and "number" in page.content().lower():
                                raise Exception("Phone verification required")
                            else:
                                raise Exception("Unknown error (Page did not redirect)")
                                
                else:
                    logger.warning("Unknown state or 'Create' button failed. Dumping minimal info.")
                    if attempt == max_attempts - 1:
                         return {"success": False, "error": "Could not find creation form after retries (Stuck on My Profile?)"}
            
            return {"success": False, "error": "Max attempts exceeded"}
                
        except Exception as e:
            logger.error(f"❌ Channel creation failed: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return {"success": False, "error": str(e)}

    def detect_active_channel(self, page) -> dict:
        """
        Detects the currently active channel ID and Name.
        1. Tries scraping Advanced Settings (HTML dump).
        2. Fallback: Navigates to 'Your Channel' and reads URL.
        """
        try:
            logger.info("🕵️ Detection Mode: Scouting for active channel...")
            
            if "account_advanced" not in page.url:
                page.goto('https://www.youtube.com/account_advanced')
                self.stealth.human_delay(2, 3)

            import re
            
            try:
                html_content = page.content()
                candidates = set(re.findall(r'\bUC[\w-]{22}\b', html_content))
                logger.info(f"🔎 Regex Candidates: {candidates}")
                
                if candidates:
                    channel_id = list(candidates)[0]
                    logger.info(f"✅ Found ID via Regex: {channel_id}")
                    
                    return {
                        "success": True, 
                        "channel_id": channel_id,
                        "channel_url": f"https://www.youtube.com/channel/{channel_id}",
                        "brand_name": "Detected Channel",
                        "message": f"Verified: {channel_id}"
                    }
            except Exception as e:
                logger.warning(f"HTML Regex failed: {e}")

            logger.info("⚠️ Settings scrape failed. Trying 'Your Channel' navigation...")
            
            avatar_btn = page.locator('#avatar-btn').first
            if avatar_btn.is_visible():
                avatar_btn.click()
                self.stealth.human_delay(1, 2)
                
                menu_items = page.locator('ytd-compact-link-renderer').all()
                for item in menu_items:
                    text = item.inner_text().lower()
                    if "channel" in text or "채널" in text:
                        item.click()
                        self.stealth.human_delay(3, 5)
                        
                        current_url = page.url
                        if "/channel/" in current_url:
                            channel_id = current_url.split("/channel/")[1].split("/")[0].split("?")[0]
                            return {
                                "success": True, 
                                "channel_id": channel_id,
                                "channel_url": current_url,
                                "brand_name": "Detected Channel",
                                "message": f"Verified via Nav: {channel_id}"
                            }
                        elif "/@" in current_url:
                            try:
                                meta_id = page.locator('meta[itemprop="identifier"]').first.get_attribute('content')
                                if meta_id and meta_id.startswith("UC"):
                                    return {
                                        "success": True, 
                                        "channel_id": meta_id,
                                        "channel_url": f"https://www.youtube.com/channel/{meta_id}",
                                        "brand_name": "Detected Channel",
                                        "message": f"Verified via Meta: {meta_id}"
                                    }
                            except:
                                pass
                        break
            
            return {"success": False, "error": "Could not detect Channel ID via settings or navigation."}

        except Exception as e:
            logger.error(f"❌ Detection failed: {e}")
            return {"success": False, "error": str(e)}
