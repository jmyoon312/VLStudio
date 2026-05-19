import logging
from DrissionPage import ChromiumPage
from app.services.stealth_ops_v2 import DrissionStealth

logger = logging.getLogger("AdminDelegator")

class AdminDelegator:
    """Automate YouTube channel admin permission delegation"""
    
    def __init__(self, stealth: DrissionStealth):
        self.stealth = stealth
    
    def delegate_admin(
        self, 
        page: ChromiumPage, 
        admin_email: str
    ) -> dict:
        """
        Automate admin permission delegation in YouTube Studio
        
        Args:
            page: DrissionPage instance
            admin_email: Email of the admin to add
            
        Returns:
            dict with success status and error if any
        """
        
        try:
            logger.info(f"👤 Starting admin delegation: {admin_email}")
            
            # 1. Navigate to YouTube Studio
            page.get('https://studio.youtube.com')
            self.stealth.human_delay(3, 5)
            
            # [HANDLE UNSUPPORTED BROWSER PAGE PRE-CHECK]
            # Check immediately after navigation
            # [HANDLE UNSUPPORTED BROWSER PAGE PRE-CHECK]
            # Check immediately after navigation with BROAD selectors
            for _ in range(3):
                # Detect "Update Browser" / "Unsupported" / "Environment Improvement"
                has_warning = (
                    page.ele('xpath://*[contains(text(), "환경 개선하기")]') or
                    page.ele('xpath://*[contains(text(), "브라우저 버전")]') or
                    "google_app_unsupported" in page.url
                )
                
                if has_warning:
                    logger.warning("⚠️ 'Unsupported Browser' page detected. Attempting to skip...")
                    
                    # Try finding the skip button (usually at the bottom)
                    skip_btn = (
                        page.ele('xpath://*[contains(text(), "스튜디오로 건너뛰기")]') or 
                        page.ele('xpath://*[contains(text(), "건너뛰기")]') or
                        page.ele('xpath://a[contains(@href, "studio")]')
                    )
                    
                    if skip_btn:
                        logger.info("Found 'Skip' button, clicking...")
                        self.stealth.safe_click(skip_btn)
                        self.stealth.human_delay(4, 6) # Wait longer for redirect
                        
                        # Refresh if stuck
                        if page.ele('xpath://*[contains(text(), "환경 개선하기")]'):
                             logger.warning("Still on unsupported page, refreshing...")
                             page.get('https://studio.youtube.com')
                             self.stealth.human_delay(3, 5)
                        break
                self.stealth.human_delay(1, 1.5)

            # [HANDLE WELCOME POPUP]
            # Check for "Welcome to YouTube Studio" dialog
            welcome_dialog = (
                page.ele('xpath://*[contains(text(), "스튜디오에 오신 것을 환영합니다")]') or
                page.ele('@@text:Welcome to YouTube Studio')
            )
            if welcome_dialog:
                logger.info("👋 'Welcome to Studio' popup detected. Clicking Continue...")
                continue_btn = (
                    page.ele('@@text:계속') or
                    page.ele('@@text:Continue') or
                    page.ele('xpath://ytcp-button[@id="confirm-button"]')
                )
                if continue_btn:
                    self.stealth.safe_click(continue_btn)
                    self.stealth.human_delay(1, 2)

            # 2. Click Settings icon
            # Use specific invalidation-proof selectors
            logger.info("Looking for Settings button...")
            settings_btn = None
            for _ in range(5): # Retry finding settings button for up to 10 seconds
                settings_btn = (
                    page.ele('xpath://yt-icon-button[@id="settings-button"]') or
                    page.ele('@@id=settings-button') or
                    page.ele('@aria-label:설정') or
                    page.ele('@aria-label:Settings')
                )
                if settings_btn and settings_btn.states.is_displayed:
                    break
                self.stealth.human_delay(1, 2)
            
            if not settings_btn:
                logger.warning("Settings button not found")
                return {"success": False, "error": "Settings button not found"}
            
            self.stealth.safe_click(settings_btn)
            self.stealth.human_delay(1, 2)
            
            # 3. Click Permissions tab
            permissions_tab = (
                page.ele('@@text:권한') or
                page.ele('@@text:Permissions') or
                page.ele('xpath://div[contains(@class, "ytcp-settings-dialog")]//div[contains(text(), "권한")]')
            )
            
            if not permissions_tab:
                logger.warning("Permissions tab not found")
                return {"success": False, "error": "Permissions tab not found"}
            
            self.stealth.safe_click(permissions_tab)
            self.stealth.human_delay(2, 3)
            
            # [IDEMPOTENCY CHECK] Check if admin already exists
            # Look for the email in the table/list of permissions
            if admin_email in page.html:
                logger.info(f"✅ Users '{admin_email}' already has permissions. Skipping.")
                return {
                    "success": True, 
                    "admin_email": admin_email,
                    "skipped": True
                }

            # 4. Click "Invite" or "Add" button
            invite_btn = (
                page.ele('xpath://ytcp-button[@id="invite-button"]') or 
                page.ele('@@text:초대') or
                page.ele('@@text:Invite') or
                page.ele('@@text:관리자 추가')
            )
            
            if not invite_btn:
                logger.warning("Invite button not found")
                return {"success": False, "error": "Invite button not found"}
            
            self.stealth.safe_click(invite_btn)
            self.stealth.human_delay(1, 2)
            
            # 5. Enter admin email (In Popup)
            email_input = (
                page.ele('xpath://input[@type="email"]') or
                page.ele('xpath://input[contains(@placeholder, "이메일")]') or
                page.ele('tag:input@type=email')
            )
            
            if not email_input:
                logger.error("Email input field not found")
                return {"success": False, "error": "Email input not found"}
            
            email_input.clear()
            self.stealth.human_type(email_input, admin_email)
            self.stealth.human_delay(0.5, 1)
            
            # 6. Select permission level (Manager)
            # Use click to open dropdown if needed, but often radio or simple selection
            manager_option = (
                page.ele('@@text:관리자') or
                page.ele('@@text:Manager') or
                page.ele('xpath://ytcp-text-dropdown-trigger//div[contains(text(), "액세스 권한")]') # Dropdown trigger
            )
            
            if manager_option:
                self.stealth.safe_click(manager_option)
                self.stealth.human_delay(0.5, 1)
                
                # If it was a dropdown, click "Manager" item
                real_manager_item = (
                    page.ele('xpath://paper-item//div[contains(text(), "관리자")]') or
                    page.ele('xpath://paper-item//div[contains(text(), "Manager")]')
                )
                if real_manager_item:
                    self.stealth.safe_click(real_manager_item)
            
            # 7. Send invitation (Done button in popup)
            send_btn = (
                page.ele('xpath://ytcp-button[@id="done-button"]') or
                page.ele('@@text:완료') or
                page.ele('@@text:Done')
            )
            
            if send_btn:
                self.stealth.safe_click(send_btn)
                self.stealth.human_delay(1, 2)
            
            # 8. Save changes (Main dialog save button) -- CRITICAL STEP OFTEN MISSED
            save_btn = (
                page.ele('xpath://ytcp-button[@id="save-button"]') or
                page.ele('@@text:저장') or
                page.ele('@@text:Save')
            )
            
            if save_btn:
                self.stealth.safe_click(save_btn)
                logger.info("Clicked Save button...")
                self.stealth.human_delay(3, 5)
            
            # 9. Verify
            # If successful, we should be back on dashboard or see a success toast
            logger.info(f"✅ Admin invitation process for {admin_email} completed")
            return {
                "success": True,
                "admin_email": admin_email
            }

        except Exception as e:
            logger.error(f"❌ Admin delegation failed: {e}")
            return {"success": False, "error": str(e)}
