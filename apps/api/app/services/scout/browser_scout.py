import os
import time
import logging
import random
from typing import List, Dict
from patchright.sync_api import sync_playwright
from app.config import settings

logger = logging.getLogger(__name__)

class BrowserAssetScout:
    """
    Autonomous Browser Scout using Patchright to bypass bot detection.
    Scours TikTok/Instagram/Pinterest for trending assets.
    """
    def __init__(self, headless: bool = True):
        self.headless = headless
        self.playwright = None
        self.browser = None
        self.context = None
        self.page = None
        self.temp_dir = settings.TEMP_DIR
        os.makedirs(self.temp_dir, exist_ok=True)

    def _init_page(self):
        if not self.page:
            self.playwright = sync_playwright().start()
            self.browser = self.playwright.chromium.launch(
                headless=self.headless,
                args=['--no-sandbox', '--mute-audio']
            )
            self.context = self.browser.new_context()
            self.page = self.context.new_page()

    def scout_tiktok(self, query: str, limit: int = 5) -> List[Dict]:
        """
        Searches TikTok for a query and returns video links.
        """
        self._init_page()
        search_url = f"https://www.tiktok.com/search?q={query.replace(' ', '%20')}"
        logger.info(f"🌐 Scouting TikTok: {search_url}")
        
        self.page.goto(search_url)
        time.sleep(random.uniform(3, 5)) # Wait for hydration
        
        # Scroll to load more
        for _ in range(2):
            self.page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            time.sleep(2)
            
        results = []
        # Find video link elements (pattern depends on TikTok layout)
        video_links = self.page.locator('a').all()
        
        for link in video_links:
            href = link.get_attribute('href')
            if href and '/video/' in href:
                # Basic metadata extraction if possible
                title = link.get_attribute('title') or query
                if href not in [r['url'] for r in results]:
                    results.append({"url": href, "title": title, "source": "tiktok"})
            if len(results) >= limit:
                break
                
        logger.info(f"✅ Found {len(results)} candidate assets on TikTok")
        return results

    def download_asset(self, video_url: str) -> str:
        """
        Uses yt-dlp (headless) to download the video.
        """
        import yt_dlp
        
        output_tmpl = os.path.join(self.temp_dir, f"scout_{int(time.time())}.%(ext)s")
        ydl_opts = {
            'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            'outtmpl': output_tmpl,
            'quiet': True,
            'no_warnings': True,
        }
        
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(video_url, download=True)
                download_path = ydl.prepare_filename(info)
                logger.info(f"📥 Downloaded asset to: {download_path}")
                return download_path
        except Exception as e:
            logger.error(f"❌ Download failed for {video_url}: {e}")
            return ""

    def close(self):
        if self.page:
            try:
                self.page.close()
            except: pass
        if self.context:
            try:
                self.context.close()
            except: pass
        if self.browser:
            try:
                self.browser.close()
            except: pass
        if self.playwright:
            try:
                self.playwright.stop()
            except: pass

