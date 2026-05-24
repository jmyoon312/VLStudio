"""
local_browser.py
윈도우 네이티브 환경에서 CloakBrowser(Patchright 기반)를 직접 실행하는 스크립트.
cloakbrowser는 내부적으로 sync_playwright를 사용하므로 async 없이 동기 방식으로 실행.
"""
import sys
import os
import time
import logging
from cloakbrowser import launch_persistent_context

logger = logging.getLogger("LocalBrowser")

def main():
    if len(sys.argv) < 3:
        print("Usage: local_browser.py <profile_dir> <url> [proxy_port]")
        sys.exit(1)

    profile_dir = sys.argv[1]
    
    # Configure logging to file inside profile_dir
    log_file = os.path.join(profile_dir, "local_browser.log")
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_file, encoding='utf-8'),
            logging.StreamHandler(sys.stdout)
        ]
    )
    url = sys.argv[2]
    proxy_port = sys.argv[3] if len(sys.argv) >= 4 else None

    browser_args = [
        "--disable-quic",
        "--disable-ipv6",
        "--disable-background-networking",
        "--force-webrtc-ip-handling-policy=disable_non_proxied_udp",
        "--disable-webrtc-multiple-routes",
        "--use-fake-ui-for-media-stream",
        "--enable-features=DnsOverHttps",
        "--dns-over-https-templates=https://chrome.cloudflare-dns.com/dns-query",
        "--hide-crash-restore-bubble",
    ]

    proxy = None
    if proxy_port:
        proxy = f"socks5://127.0.0.1:{proxy_port}"

    logger.info(f"Launching CloakBrowser at '{profile_dir}' -> {url}")

    ctx = launch_persistent_context(
        user_data_dir=profile_dir,
        headless=False,
        proxy=proxy,
        args=browser_args,
    )

    if len(ctx.pages) > 0:
        page = ctx.pages[0]
    else:
        page = ctx.new_page()
        
    from cloakbrowser.human import patch_page
    patch_page(page)
    
    page.goto(url)

    # Check if credentials were provided
    if len(sys.argv) >= 6:
        email = sys.argv[4]
        password = sys.argv[5]
        
        logger.info(f"Credentials provided for {email}. Checking if login is required...")
        
        try:
            page.wait_for_load_state('networkidle', timeout=5000)
        except Exception:
            pass # Ignore networkidle timeout
            
        # If redirected to Google Sign-In
        if "accounts.google.com" in page.url or "signin" in page.url.lower():
            logger.info("Login page detected. Attempting to auto-login...")
            try:
                # Wait for email field to appear and be stable
                # Google might have hidden email fields. Find the visible one.
                email_selectors = ['input[type="email"]', 'input[name="identifier"]', '#identifierId']
                email_locator = None
                
                for _ in range(15):
                    for selector in email_selectors:
                        locators = page.locator(selector).all()
                        for loc in locators:
                            if loc.is_visible():
                                email_locator = loc
                                break
                        if email_locator:
                            break
                    if email_locator:
                        break
                    time.sleep(1)
                
                if email_locator:
                    # Small human-like delay before typing
                    time.sleep(1)
                    # Type email
                    email_locator.fill(email)
                    time.sleep(0.5)
                    email_locator.press('Enter')
                else:
                    logger.error("Email field never became visible.")
                    page.screenshot(path=os.path.join(profile_dir, "debug_login_email_error.png"))
                    return
                
                # Wait for the email transition to complete (Google animates this)
                try:
                    page.wait_for_load_state('networkidle', timeout=5000)
                except Exception:
                    pass
                time.sleep(2) # Give it a moment to render the new DOM elements
                
                # Check if we are still on the email page (maybe captcha?)
                page.screenshot(path=os.path.join(profile_dir, "debug_login_step1.png"))
                
                # Try finding the password input field robustly
                pwd_locator = None
                
                # Google usually uses name="Passwd"
                for selector in ['input[name="Passwd"]', 'input[type="password"]']:
                    try:
                        # Wait for the selector to be visible
                        loc = page.locator(selector).locator("visible=true").first
                        if loc.is_visible(timeout=5000):
                            pwd_locator = loc
                            break
                    except Exception:
                        pass
                
                if pwd_locator:
                    # Small human-like delay
                    time.sleep(1)
                    # Use click and type instead of fill to bypass actionability strictness
                    pwd_locator.click()
                    time.sleep(0.2)
                    pwd_locator.fill(password)
                    time.sleep(0.5)
                    pwd_locator.press('Enter')
                    logger.info("Login credentials submitted.")
                    time.sleep(3)
                    page.screenshot(path=os.path.join(profile_dir, "debug_login_step2.png"))
                else:
                    logger.error("Password field never became visible. Manual intervention may be required.")
                    page.screenshot(path=os.path.join(profile_dir, "debug_login_error.png"))
            except Exception as e:
                logger.error(f"Failed to auto-login: {e}")
                page.screenshot(path=os.path.join(profile_dir, "debug_login_exception.png"))

    logger.info("Browser launched. Keeping open for manual setup...")
    # 브라우저 창(탭)이 열려있는 동안 대기
    try:
        while len(ctx.pages) > 0:
            time.sleep(1)
    except Exception as e:
        logger.info(f"Context closed or error: {e}")

if __name__ == "__main__":
    main()
