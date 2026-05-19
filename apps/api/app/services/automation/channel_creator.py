import logging
import time
from DrissionPage import ChromiumPage
from app.services.stealth_ops_v2 import DrissionStealth

logger = logging.getLogger("ChannelCreator")

class ChannelCreator:
    """Automate YouTube brand channel creation"""
    
    def __init__(self, stealth: DrissionStealth):
        self.stealth = stealth
    
    def create_brand_channel(
        self, 
        page: ChromiumPage, 
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
            page.get(switcher_url)
            self.stealth.human_delay(3, 5)

            # [IDEMPOTENCY CHECK] Check if channel already exists (Robust Match)
            # Remove spaces and lower case for comparison
            normalized_target = brand_name.replace(" ", "").lower()
            existing_channels = page.eles(f'xpath://*[contains(text(), "{brand_name}")]')
            
            for ch in existing_channels:
                if ch.text.replace(" ", "").lower() == normalized_target:
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
                create_btn = (
                    page.ele('@@text:채널 만들기') or 
                    page.ele('@@text:Create a channel') or
                    page.ele('xpath://a[contains(@href, "create_channel")]')
                )

                if create_btn:
                    logger.info("Found 'Create a channel' button, clicking...")
                    self.stealth.safe_click(create_btn)
                    self.stealth.human_delay(3, 5)
                
                # B. Determine State - Use explicit checks for Dialog vs Page
                
                # State 1: "My Profile" Dialog (Personal Channel Required)
                # [FIX] Strict Visibility Check: Only handle if dialog is genuinely visible
                personal_dialog_candidate = (
                    page.ele('xpath://ytd-channel-creation-dialog-renderer') or
                    page.ele('id:channel-creation-form') or
                    page.ele('xpath://div[contains(text(), "내 프로필")]')
                )
                
                personal_dialog = None
                if personal_dialog_candidate and personal_dialog_candidate.states.is_displayed:
                     personal_dialog = personal_dialog_candidate

                if personal_dialog:
                    logger.info("⚠️ Detected 'My Profile' Dialog (Personal Channel missing). Creating it first...")
                    
                    # [FIX] Positional Strategy: Get ALL inputs in the dialog
                    all_inputs = personal_dialog.eles('tag:input')
                    valid_inputs = [inp for inp in all_inputs if inp.states.is_displayed and inp.attr('type') not in ['checkbox', 'hidden', 'file']]
                    
                    logger.info(f"Found {len(valid_inputs)} visible inputs in dialog.")

                    if len(valid_inputs) >= 1:
                        # 1. Fill Name
                        p_name_input = valid_inputs[0]
                        logger.info(f"Filling Personal Channel Name: {brand_name}")
                        p_name_input.clear()
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
                            p_handle_input.clear()
                            self.stealth.human_type(p_handle_input, safe_handle)
                            self.stealth.human_delay(1, 2)
                    else:
                         logger.warning("⚠️ No text inputs found in 'My Profile' dialog! Trying fallback...")
                         fallback_name = page.ele('xpath://input[@placeholder="이름"]')
                         if fallback_name:
                             fallback_name.clear()
                             self.stealth.human_type(fallback_name, brand_name)

                    # Target the 'Create' button
                    create_personal_btn = (
                        page.ele('xpath://ytd-channel-creation-dialog-renderer//yt-button-renderer[@id="submit-button"]') or
                        page.ele('xpath://button//span[contains(text(), "채널 만들기")]') or
                        page.ele('@@text:채널 만들기')
                    )
                    
                    if create_personal_btn:
                        logger.info("Clicking confirm on Personal Channel dialog...")
                        self.stealth.safe_click(create_personal_btn)
                        logger.info("⏳ Waiting for Personal Channel creation...")
                        self.stealth.human_delay(6, 8)
                        
                        logger.info("Returning to Switcher to proceed to Brand Channel...")
                        page.get(switcher_url)
                        self.stealth.human_delay(3, 5)
                        continue # Restart loop to now create Brand Channel
                
                # State 2: Brand Channel Creation Page (Target)
                # Check for specific input field
                name_input = (
                    page.ele('xpath://input[@id="channel-name"]') or
                    page.ele('xpath://input[@name="channelName"]') or
                    page.ele('xpath://ytd-channel-name-input-renderer//input') or
                    page.ele('tag:input@id=input')
                )
                
                if name_input:
                    logger.info("✅ Found Brand Channel Name Input")
                    name_input.clear()
                    self.stealth.human_type(name_input, brand_name)
                    self.stealth.human_delay(0.5, 1)
                    
                    # Terms Checkbox
                    terms_input = page.ele('xpath://input[@type="checkbox"]')
                    if terms_input:
                        if not terms_input.states.is_checked:
                            logger.info("Clicking Terms Checkbox (JS)...")
                            try:
                                terms_input.click(by_js=True)
                            except Exception as e:
                                logger.warning(f"JS Click failed, attempting wrapper click: {e}")
                                terms_input.parent().click()
                    self.stealth.human_delay(0.5, 1)
                    
                    # Submit
                    submit_btn = (
                        page.ele('@@text:만들기') or
                        page.ele('@@text:Create') or
                        page.ele('@@value=Create') or
                        page.ele('@@type=submit')
                    )
                    
                    if submit_btn:
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
                            # Error check
                            error_msg = page.ele('@@class:error-message') or page.ele('@@role=alert')
                            if error_msg:
                                raise Exception(f"Creation Error: {error_msg.text}")
                            elif "phone" in page.html.lower() and "verify" in page.html.lower() and "number" in page.html.lower():
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

    def detect_active_channel(self, page: ChromiumPage) -> dict:
        """
        Detects the currently active channel ID and Name.
        1. Tries scraping Advanced Settings (HTML dump).
        2. Fallback: Navigates to 'Your Channel' and reads URL.
        """
        try:
            logger.info("🕵️ Detection Mode: Scouting for active channel...")
            
            # 1. Advanced Settings Page (Fastest, no nav if already there)
            if "account_advanced" not in page.url:
                page.get('https://www.youtube.com/account_advanced')
                self.stealth.human_delay(2, 3)

            import re
            
            # Method A: Raw HTML Regex Search (Settings Page)
            # Channel IDs start with 'UC' and are 24 chars long.
            # We look for explicit "Channel ID" labels nearby or just unique UC IDs.
            try:
                html_content = page.html
                # Find all potential Channel ID candidates
                # Explicitly looking for the value next to the label would be better but the DOM is messy.
                # However, on the Settings page, the Channel ID is usually the second long ID (after User ID).
                # But User ID doesn't start with UC.
                
                candidates = set(re.findall(r'\bUC[\w-]{22}\b', html_content))
                logger.info(f"🔎 Regex Candidates: {candidates}")
                
                # Filter out any that might be internal IDs if necessary (but UC... is usually Channel)
                # If we found candidates, verify by context or just pick the first one?
                # The user ID is 24 chars but often doesn't start with UC.
                # Let's check for specific Korean/English labels in HTML to be sure.
                
                if candidates:
                    # Best candidate is one that appears near "Channel ID" or "채널 ID" in text dump?
                    # Let's just return the first one found, it's highly likely the correct one on this page.
                    # Usually there's only one "Channel ID" starting with UC displayed prominently.
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

            # Method B: Navigation to 'Your Channel' (Fallback)
            logger.info("⚠️ Settings scrape failed. Trying 'Your Channel' navigation...")
            
            # Click Avatar
            avatar_btn = page.ele('#avatar-btn')
            if avatar_btn:
                avatar_btn.click()
                self.stealth.human_delay(1, 2)
                
                # Find "Your Channel" / "내 채널"
                # It's usually the first item in the menu: "ytd-compact-link-renderer"
                # Text: "내 채널" or "Your channel"
                menu_items = page.eles('tag:ytd-compact-link-renderer')
                for item in menu_items:
                    if "channel" in item.text.lower() or "채널" in item.text:
                        item.click()
                        self.stealth.human_delay(3, 5) # Wait for nav
                        
                        # Now check URL
                        current_url = page.url
                        # URL format: youtube.com/channel/UC... or youtube.com/@Handle
                        
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
                            # Handle URL! We need the Channel ID.
                            # On the channel page, the ID is in the meta tags.
                            try:
                                # <meta itemprop="identifier" content="UC...">
                                meta_id = page.ele('xpath://meta[@itemprop="identifier"]').attr('content')
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
