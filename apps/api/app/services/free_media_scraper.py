import os
import re
import hashlib
import logging
import asyncio
from typing import List, Dict, Any, Optional
import httpx
from ..config import get_default_media_root

logger = logging.getLogger(__name__)

WATERMARK_BLOCKED_DOMAINS = [
    "shutterstock.com",
    "gettyimages.com",
    "istockphoto.com",
    "dreamstime.com",
    "stock.adobe.com",
    "alamy.com",
    "depositphotos.com",
    "123rf.com",
]

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
]


class FreeMediaScraper:
    """Zero-cost real photo and media scraper for Gunlimbo, Ssul, and Shorts production.
    Leverages DuckDuckGo high-res image index and Naver real-photo search.
    """

    def __init__(self):
        self.media_root = get_default_media_root()
        self.cache_dir = os.path.join(self.media_root, "cache", "free_media")
        os.makedirs(self.cache_dir, exist_ok=True)
        self.headers = {
            "User-Agent": USER_AGENTS[0],
            "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        }

    def _is_watermarked_or_junk(self, url: str, title: str) -> bool:
        lower_url = (url or "").lower()
        lower_title = (title or "").lower()
        for domain in WATERMARK_BLOCKED_DOMAINS:
            if domain in lower_url:
                return True
        if "watermark" in lower_url or "watermark" in lower_title:
            return True
        return False

    async def search_duckduckgo(self, query: str, limit: int = 15) -> List[Dict[str, Any]]:
        """Fetch high-res images via DuckDuckGo 0-cost API."""
        results: List[Dict[str, Any]] = []
        try:
            async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
                # 1. Fetch vqd token directly from search page
                token_resp = await client.get(f"https://duckduckgo.com/?q={query}", headers=self.headers)
                vqd_match = (
                    re.search(r'vqd="([0-9-]+)"', token_resp.text)
                    or re.search(r'vqd=([0-9-]+)&', token_resp.text)
                    or re.search(r'vqd="([^"]+)"', token_resp.text)
                )
                if not vqd_match:
                    logger.warning("[FreeMediaScraper] DuckDuckGo vqd token extraction failed")
                    return []
                vqd = vqd_match.group(1)

                # 2. Fetch images
                api_url = "https://duckduckgo.com/i.js"
                params = {
                    "q": query,
                    "o": "json",
                    "vqd": vqd,
                    "p": "1",
                }
                import urllib.parse
                quoted_query = urllib.parse.quote(query)
                api_headers = {
                    **self.headers,
                    "Referer": f"https://duckduckgo.com/?q={quoted_query}",
                    "Accept": "application/json, text/javascript, */*; q=0.01",
                    "X-Requested-With": "XMLHttpRequest",
                }
                api_resp = await client.get(api_url, params=params, headers=api_headers)
                if api_resp.status_code == 200:
                    data = api_resp.json()
                    raw_items = data.get("results", [])
                    for it in raw_items:
                        img_url = it.get("image")
                        if not img_url or not img_url.startswith("http"):
                            continue
                        title = it.get("title") or query
                        if self._is_watermarked_or_junk(img_url, title):
                            continue
                        width = it.get("width") or 0
                        height = it.get("height") or 0
                        results.append({
                            "provider": "duckduckgo",
                            "title": title,
                            "url": img_url,
                            "thumbnail": it.get("thumbnail") or img_url,
                            "width": width,
                            "height": height,
                            "source": it.get("url") or "",
                        })
                        if len(results) >= limit:
                            break
        except Exception as e:
            logger.warning(f"[FreeMediaScraper] DuckDuckGo search error for '{query}': {e}")
        return results

    async def search_naver(self, query: str, limit: int = 15) -> List[Dict[str, Any]]:
        """Fetch real Korean photos via Naver search."""
        results: List[Dict[str, Any]] = []
        # Attempt Playwright headless if available for modern dynamic DOM
        try:
            from playwright.async_api import async_playwright
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                page = await browser.new_page()
                url = f"https://search.naver.com/search.naver?where=image&sm=tab_jum&query={query}"
                await page.goto(url, timeout=12000)
                try:
                    await page.wait_for_selector("div.image_tile img, .image_group img, img._image", timeout=4000)
                except Exception:
                    pass

                raw_imgs = await page.eval_on_selector_all(
                    "img._image, div.image_tile img",
                    """elements => elements.slice(0, 30).map(el => ({
                        src: el.src,
                        alt: el.alt || ''
                    })).filter(x => x.src && x.src.startsWith('http'))"""
                )
                await browser.close()

                for item in raw_imgs:
                    img_url = item.get("src")
                    if not img_url or "static.naver.net" in img_url:
                        continue
                    title = item.get("alt") or query
                    if self._is_watermarked_or_junk(img_url, title):
                        continue
                    results.append({
                        "provider": "naver",
                        "title": title,
                        "url": img_url,
                        "thumbnail": img_url,
                        "width": 800,
                        "height": 600,
                        "source": "naver.com",
                    })
                    if len(results) >= limit:
                        break
        except Exception as e:
            logger.info(f"[FreeMediaScraper] Playwright Naver search fallback: {e}")
            # Fast HTTP fallback for Naver image HTML search
            try:
                async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
                    resp = await client.get(
                        f"https://search.naver.com/search.naver?where=image&sm=tab_jum&query={query}",
                        headers=self.headers
                    )
                    found_urls = re.findall(r'"originalUrl":"(https?://[^"]+)"', resp.text)
                    for u in found_urls:
                        clean_u = u.replace("\\/", "/")
                        if self._is_watermarked_or_junk(clean_u, query):
                            continue
                        results.append({
                            "provider": "naver_http",
                            "title": query,
                            "url": clean_u,
                            "thumbnail": clean_u,
                            "width": 800,
                            "height": 600,
                            "source": "naver.com",
                        })
                        if len(results) >= limit:
                            break
            except Exception as ex:
                logger.warning(f"[FreeMediaScraper] Naver HTTP fallback error: {ex}")
        return results

    async def search(self, query: str, limit: int = 15, provider: str = "all") -> List[Dict[str, Any]]:
        """Unified search across DuckDuckGo and Naver."""
        tasks = []
        if provider in ("all", "duckduckgo"):
            tasks.append(self.search_duckduckgo(query, limit=limit))
        if provider in ("all", "naver"):
            tasks.append(self.search_naver(query, limit=limit))

        gathered = await asyncio.gather(*tasks, return_exceptions=True)
        merged: List[Dict[str, Any]] = []
        seen_urls = set()

        for res in gathered:
            if isinstance(res, list):
                for item in res:
                    u = item.get("url")
                    if u and u not in seen_urls:
                        seen_urls.add(u)
                        merged.append(item)

        return merged[:limit]

    async def download_image(self, url: str, query_hint: str = "media") -> Dict[str, Any]:
        """Download image, validate magic bytes, and cache locally."""
        url_hash = hashlib.sha256(url.encode("utf-8")).hexdigest()[:16]
        # Determine extension from URL or fallback
        clean_name = re.sub(r'[^a-zA-Z0-9]', '_', query_hint)[:20]
        ext = ".jpg"
        if ".png" in url.lower():
            ext = ".png"
        elif ".webp" in url.lower():
            ext = ".webp"

        filename = f"{clean_name}_{url_hash}{ext}"
        local_path = os.path.join(self.cache_dir, filename)

        if os.path.exists(local_path) and os.path.getsize(local_path) > 1024:
            return {
                "file_path": local_path,
                "url": url,
                "cached": True,
                "size_bytes": os.path.getsize(local_path)
            }

        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            resp = await client.get(url, headers={"User-Agent": USER_AGENTS[0], "Referer": "https://www.google.com/"})
            if resp.status_code != 200:
                raise RuntimeError(f"Failed to download image: HTTP {resp.status_code}")
            data = resp.content
            if len(data) < 512:
                raise RuntimeError("Image content too small (< 512 bytes)")

            # Check magic bytes for JPEG / PNG / WEBP
            if data.startswith(b"\xff\xd8\xff"):
                ext = ".jpg"
            elif data.startswith(b"\x89PNG\r\n\x1a\n"):
                ext = ".png"
            elif data.startswith(b"RIFF") and b"WEBP" in data[:16]:
                ext = ".webp"

            filename = f"{clean_name}_{url_hash}{ext}"
            local_path = os.path.join(self.cache_dir, filename)

            with open(local_path, "wb") as f:
                f.write(data)

            return {
                "file_path": local_path,
                "url": url,
                "cached": False,
                "size_bytes": len(data)
            }


free_media_scraper = FreeMediaScraper()
