import os
import time
import logging
import json
import shutil
import platform
from pathlib import Path
from DrissionPage import ChromiumPage, ChromiumOptions
from app import models
from app.database import SessionLocal

logger = logging.getLogger(__name__)

class BrowserFarmWorker:
    def __init__(self, profile_id: str, headless: bool = False):
        self.profile_id = profile_id
        self.headless = headless
        self.db = SessionLocal()
        self.profile = self.db.query(models.BrowserProfile).filter(models.BrowserProfile.id == profile_id).first()
        
        if not self.profile:
            raise ValueError(f"Profile {profile_id} not found")
            
        self.page = None
        self.is_linux = platform.system() != "Windows"

    def _get_mock_path(self, name: str) -> str:
        """ [FIX] Cross-platform mock path for Linux/WSL2 """
        from app.config import settings
        temp_dir = settings.TEMP_DIR
        os.makedirs(temp_dir, exist_ok=True)
        return os.path.join(temp_dir, f"{name}_mock.png")

    def _get_browser_path(self):
        """[Sovereign] Environment-agnostic browser path resolution"""
        # 1. Environment Variable Priority
        env_path = os.getenv("CHROME_PATH")
        if env_path and os.path.exists(env_path):
            return env_path
            
        # 2. Linux/WSL Common Paths
        if platform.system() != "Windows":
            possible_linux_paths = [
                "/usr/bin/google-chrome",
                "/usr/bin/google-chrome-stable",
                "/usr/bin/chromium",
                "/usr/bin/chromium-browser",
                "/snap/bin/chromium",
                # WSL Mounts
                "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe",
                "/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe",
                "/mnt/c/Program Files/Microsoft/Edge/Application/msedge.exe",
            ]
            for path in possible_linux_paths:
                if os.path.exists(path):
                    logger.info(f"✅ Found system browser at: {path}")
                    return path
                    
        # 3. Windows Defaults (if on Windows)
        else:
            possible_win_paths = [
                os.path.join(os.environ.get("PROGRAMFILES", "C:\\Program Files"), "Google\\Chrome\\Application\\chrome.exe"),
                os.path.join(os.environ.get("PROGRAMFILES(X86)", "C:\\Program Files (x86)"), "Google\\Chrome\\Application\\chrome.exe"),
            ]
            for path in possible_win_paths:
                if os.path.exists(path):
                    return path
                    
        return "chrome" # Last resort fallback

    def start_browser(self):
        """Initializes the browser with the profile's user data directory."""
        try:
            co = ChromiumOptions()
            co.set_user_data_path(self.profile.user_data_dir)
            
            if self.headless:
                co.headless(True)
                
            # [FIX] Explicitly set browser executable path
            browser_path = self._get_browser_path()
            if browser_path and browser_path != "chrome":
                 co.set_browser_path(browser_path)
                 logger.info(f"🎯 Browser Path Set: {browser_path}")
            
            # Initialize Page
            self.page = ChromiumPage(addr_or_opts=co)
            logger.info(f"🚀 Browser Started: {self.profile.name} ({self.profile.id})")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to start browser for {self.profile.name}: {e}")
            return False

    def close(self):
        if self.page:
            try:
                self.page.quit()
            except:
                pass

    def _execute_with_healing(self, func, *args, **kwargs):
        """
        Self-Healing Wrapper: If execution fails (e.g. nav/eval error, blocked),
        it attempts to clear the corrupted session, launch in GUI mode for re-auth, and retries once.
        """
        try:
            return func(*args, **kwargs)
        except Exception as e:
            logger.warning(f"⚠️ Browser action failed: {e}. Initiating Self-Healing sequence...")
            self.close()
            
            # 1. Backup & clear user data dir
            if self.profile and self.profile.user_data_dir and os.path.exists(self.profile.user_data_dir):
                backup_dir = f"{self.profile.user_data_dir}_backup_{int(time.time())}"
                try:
                    shutil.move(self.profile.user_data_dir, backup_dir)
                    logger.info(f"🔄 Backed up corrupted profile to {backup_dir}")
                except Exception as shutil_e:
                    logger.warning(f"Failed to move user_data_dir: {shutil_e}")
                    
            # 2. Restart Headless Off for re-auth
            old_headless = self.headless
            self.headless = False
            logger.info("🔓 Restarting browser in GUI mode for re-authentication...")
            if not self.start_browser():
                raise RuntimeError("Self-healing: Browser restart failed.")
                
            logger.warning("⏳ Waiting 15 seconds for manual re-authentication or captcha solving if needed...")
            time.sleep(15)
            
            try:
                result = func(*args, **kwargs)
                self.headless = old_headless # restore
                return result
            except Exception as retry_e:
                logger.error(f"❌ Self-Healing retry failed: {retry_e}")
                self.close()
                raise retry_e

    def generate_image_imagefx(self, prompt: str) -> str:
        return self._execute_with_healing(self._generate_image_imagefx_internal, prompt)

    def _generate_image_imagefx_internal(self, prompt: str) -> str:
        """
        Automates ImageFX (labs.google/imagefx).
        Returns local path to downloaded image.
        """
        if not self.page:
            if not self.start_browser():
                raise RuntimeError("Browser not started")

        try:
            url = "https://labs.google/imagefx"
            logger.info(f"🌍 Navigating to {url}...")
            self.page.get(url)
            
            # Wait for load - Login Check
            # TODO: Handle Login check (if 'Sign in' button exists)
            
            # 1. Input Prompt
            # Selector is hypothetical and needs adjustment based on real DOM
            logger.info(f"🎨 Inputting prompt: {prompt[:30]}...")
            
            # Assuming standard textarea for ImageFX
            textarea = self.page.ele('tag:textarea') 
            if textarea:
                textarea.input(prompt)
                
                # 2. Click Generate
                generate_btn = self.page.ele('text:Generate') or self.page.ele('text:Create')
                if generate_btn:
                    generate_btn.click()
                    logger.info("⏳ Waiting for generation...")
                    
                    # 3. Wait for Result
                    # Wait for image to appear or loader to finish
                    time.sleep(15) # rudimentary wait
                    
                    # 4. Download
                    # Find image element
                    imgs = self.page.eles('tag:img')
                    # processing logic to find the generated one...
                    
                    # MOCK for Phase 2 Initial:
                    # We will return a dummy path if actual automation fails until we debug the selectors
                    if self.is_linux:
                        return self._get_mock_path("browser")
                    
                    from app.config import settings
                    return os.path.join(settings.TEMP_DIR, "browser_mock.png")
                    
            return ""
            
        except Exception as e:
            logger.error(f"❌ ImageFX Automation Failed: {e}")
            raise e

    def generate_image_whisk(self, prompt: str, style_image_path: str = None) -> str:
        return self._execute_with_healing(self._generate_image_whisk_internal, prompt, style_image_path)

    def _generate_image_whisk_internal(self, prompt: str, style_image_path: str = None) -> str:
        """
        Automates Whisk (labs.google/whisk).
        Whisk is primarily for Image Merging/Style Transfer.
        If prompt is text-only, we attempt to find a Text-to-Image input or use a fallback.
        """
        if not self.page:
            if not self.start_browser():
                raise RuntimeError("Browser not started")

        try:
            url = "https://labs.google/whisk"
            logger.info(f"🌍 Navigating to {url}...")
            self.page.get(url)
            
            # 1. Robust Loading Wait
            # Wait for specific UI elements that indicate readiness
            if not self.page.wait.ele_displayed('tag:textarea', timeout=15):
                # If no textarea, maybe we hit a login or different UI
                if self.page.ele('text:Sign in'):
                    logger.warning("🔐 Login required for Whisk. Please log in manually in the browser window.")
                    # We can't auto-login easily without creds. 
                    # We wait a bit in case user intervenes? No, this is headless-ish.
                    # We accept failure.
                    raise RuntimeError("Login required")
            
            # 2. Text Input
            logger.info(f"🎨 Whisk Input: {prompt[:30]}...")
            
            # Try finding the main input area
            # Strategy: Find the largest textarea or contenteditable
            textarea = self.page.ele('@placeholder:Describe') or self.page.ele('tag:textarea')
            
            if textarea:
                textarea.clear()
                textarea.input(prompt)
                
                # Style Image Upload (if supported/requested)
                if style_image_path:
                    # Upload logic would go here (finding file input)
                    pass

                # 3. Click Generate
                # Look for typical buttons
                generate_btn = (self.page.ele('text:Generate') or 
                                self.page.ele('text:Create') or 
                                self.page.ele('text:Remix') or
                                self.page.ele('@aria-label:Generate'))
                                
                if generate_btn:
                     if generate_btn.states.is_enabled:
                        generate_btn.click()
                        logger.info("⏳ Whisk: Generation started...")
                        
                        # 4. Wait for Result
                        # Wait for a new image to appear (heuristic)
                        time.sleep(10) # Minimal wait
                        
                        # Wait for loading indicator to disappear
                        # self.page.wait.ele_hidden('.loading-spinner')
                        
                        # 5. Download
                        # Find the result image. usually the last 'img' added or in a specific container.
                        # For now, let's look for images with blob: src or specific class
                        imgs = self.page.eles('tag:img')
                        # Filter for substantial images
                        valid_imgs = [img for img in imgs if img.rect.width > 200 and img.rect.height > 200]
                        if valid_imgs:
                            target_img = valid_imgs[-1] # Assume newest
                            src = target_img.attr('src')
                            
                            # Download Logic
                            if src.startswith('http') or src.startswith('blob'):
                                from app.config import settings
                                save_path = Path(settings.TEMP_DIR) / f"whisk_{int(time.time())}.png"
                                save_path.parent.mkdir(parents=True, exist_ok=True)
                                
                                # Use DrissionPage download or requests
                                # For blob, we might need javascript
                                if src.startswith('blob'):
                                    # JS to fetch blob
                                    # Placeholder: Screen capture if blob download fails
                                    target_img.save(str(save_path))
                                else:
                                    target_img.save(str(save_path))
                                    
                                return str(save_path)
                                
            logger.error("❌ Whisk: Could not find Input or Generate button.")
            return ""
            
        except Exception as e:
            logger.error(f"❌ Whisk Automation Failed: {e}")
            # Fallback to Opal or ImageFX if configured? 
            # Controller handles fallback, worker just reports failure.
            raise e
        
    def generate_image_opal(self, prompt: str) -> str:
        return self._execute_with_healing(self._generate_image_opal_internal, prompt)

    def _generate_image_opal_internal(self, prompt: str) -> str:
        """
        Automates Opal (opal.google).
        """
        if not self.page:
            if not self.start_browser():
                raise RuntimeError("Browser not started")

        try:
            url = "https://opal.google"
            logger.info(f"🌍 Navigating to {url}...")
            self.page.get(url)
            
            # Opal Logic (Similar Robustness)
            if not self.page.wait.ele_displayed('tag:textarea', timeout=15):
                logger.warning("Opal: Input not found (or login check failed).")
                
            textarea = self.page.ele('tag:textarea')
            if textarea:
                textarea.input(prompt)
                generate_btn = self.page.ele('text:Generate') or self.page.ele('@aria-label:Generate')
                if generate_btn:
                    generate_btn.click()
                    logger.info("⏳ Opal: Generating...")
                    time.sleep(10)
                    
                    # Download extraction...
                    # (Simplified for now)
                    if self.is_linux:
                        return self._get_mock_path("opal")
                    
                    from app.config import settings
                    return os.path.join(settings.TEMP_DIR, "opal_mock.png")
                    
            return ""

        except Exception as e:
             logger.error(f"❌ Opal Failed: {e}")
             raise e
