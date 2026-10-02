"""
[OpenMontage Stock Footage Tool]
Sovereign free stock video and image harvesting engine.
Queries Pexels, Pixabay, Wikimedia Commons, and Internet Archive (Public Domain)
with local disk caching under %LOCALAPPDATA%/ViraLoop Studio/media/07_Downloads/stock/
Strict UTF-8, zero repository artifacts, atomic download streaming.
"""

import os
import sys
import json
import logging
import asyncio
import re
import aiohttp
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime

# Enforce UTF-8 on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

logger = logging.getLogger("stock_footage_tool")

LOCAL_APPDATA = os.environ.get("LOCALAPPDATA", str(Path.home() / "AppData" / "Local"))
STOCK_CACHE_DIR = Path(LOCAL_APPDATA) / "ViraLoop Studio" / "media" / "07_Downloads" / "stock"
STOCK_CACHE_DIR.mkdir(parents=True, exist_ok=True)


class OpenMontageStockTool:
    """
    Unified multi-source stock media harvester absorbing OpenMontage's stock sourcing layer.
    """

    def __init__(self):
        self.cache_dir = STOCK_CACHE_DIR
        self.session_timeout = aiohttp.ClientTimeout(total=25)

    def _sanitize_slug(self, text: str) -> str:
        clean = re.sub(r'[^a-zA-Z0-9_\-\uac00-\ud7a3]+', '_', text.strip())
        return clean[:40] or "stock_asset"

    async def search_wikimedia_commons(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Searches Wikimedia Commons for high-res public domain / CC video & images.
        Requires no API key.
        """
        endpoint = "https://commons.wikimedia.org/w/api.php"
        params = {
            "action": "query",
            "generator": "search",
            "gsrsearch": f"filetype:video|bitmap {query}",
            "gsrlimit": limit,
            "gsrnamespace": 6,  # File namespace
            "prop": "imageinfo",
            "iiprop": "url|mime|size|extmetadata",
            "format": "json"
        }
        results = []
        try:
            headers = {"User-Agent": "ViraLoopStudio/4.0 (Research Bot)"}
            async with aiohttp.ClientSession(timeout=self.session_timeout) as session:
                async with session.get(endpoint, params=params, headers=headers) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        pages = data.get("query", {}).get("pages", {})
                        for page_id, info in pages.items():
                            imageinfo = info.get("imageinfo", [{}])[0]
                            url = imageinfo.get("url")
                            mime = imageinfo.get("mime", "")
                            if url:
                                is_video = "video" in mime or url.lower().endswith((".mp4", ".webm", ".ogv"))
                                results.append({
                                    "source": "wikimedia_commons",
                                    "title": info.get("title", f"wiki_{page_id}"),
                                    "url": url,
                                    "mimeType": mime or ("video/mp4" if is_video else "image/jpeg"),
                                    "mediaType": "video" if is_video else "image",
                                    "width": imageinfo.get("width", 1920),
                                    "height": imageinfo.get("height", 1080),
                                    "license": "Creative Commons / Public Domain"
                                })
        except Exception as e:
            logger.warning(f"[StockTool] Wikimedia Commons search failed for '{query}': {e}")
        return results

    async def search_internet_archive(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Searches Internet Archive (archive.org) for historic and public domain stock footage.
        Requires no API key.
        """
        endpoint = "https://archive.org/advancedsearch.php"
        clean_query = f"{query} AND mediatype:(movies)"
        params = {
            "q": clean_query,
            "fl[]": "identifier,title,description,downloads",
            "sort[]": "downloads desc",
            "rows": limit,
            "output": "json"
        }
        results = []
        try:
            headers = {"User-Agent": "ViraLoopStudio/4.0 (Research Bot)"}
            async with aiohttp.ClientSession(timeout=self.session_timeout) as session:
                async with session.get(endpoint, params=params, headers=headers) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        docs = data.get("response", {}).get("docs", [])
                        for doc in docs:
                            identifier = doc.get("identifier")
                            if identifier:
                                video_url = f"https://archive.org/download/{identifier}/{identifier}_512kb.mp4"
                                results.append({
                                    "source": "internet_archive",
                                    "title": doc.get("title", identifier),
                                    "url": video_url,
                                    "mimeType": "video/mp4",
                                    "mediaType": "video",
                                    "license": "Public Domain / Archive.org"
                                })
        except Exception as e:
            logger.warning(f"[StockTool] Internet Archive search failed for '{query}': {e}")
        return results

    async def search_pexels_video(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Searches Pexels Video API if API key is configured.
        """
        api_key = os.environ.get("PEXELS_API_KEY")
        if not api_key:
            return []

        endpoint = "https://api.pexels.com/videos/search"
        params = {"query": query, "per_page": limit, "orientation": "portrait"}
        headers = {"Authorization": api_key}
        results = []
        try:
            async with aiohttp.ClientSession(timeout=self.session_timeout) as session:
                async with session.get(endpoint, params=params, headers=headers) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        for v in data.get("videos", []):
                            video_files = v.get("video_files", [])
                            # Pick high quality portrait/landscape file
                            best_file = next((f for f in video_files if f.get("quality") == "hd"), video_files[0] if video_files else None)
                            if best_file:
                                results.append({
                                    "source": "pexels",
                                    "title": f"Pexels Video {v.get('id')}",
                                    "url": best_file.get("link"),
                                    "mimeType": "video/mp4",
                                    "mediaType": "video",
                                    "width": best_file.get("width", 1080),
                                    "height": best_file.get("height", 1920),
                                    "durationSec": v.get("duration", 0),
                                    "license": "Pexels Free License"
                                })
        except Exception as e:
            logger.warning(f"[StockTool] Pexels video search failed for '{query}': {e}")
        return results

    async def search_stock_multi(self, query: str, limit_per_source: int = 3) -> List[Dict[str, Any]]:
        """
        Queries all available stock sources concurrently and returns combined results.
        """
        tasks = [
            self.search_wikimedia_commons(query, limit=limit_per_source),
            self.search_internet_archive(query, limit=limit_per_source),
            self.search_pexels_video(query, limit=limit_per_source)
        ]
        gathered = await asyncio.gather(*tasks, return_exceptions=True)
        aggregated: List[Dict[str, Any]] = []
        for res in gathered:
            if isinstance(res, list):
                aggregated.extend(res)

        return aggregated

    async def download_asset(self, url: str, asset_name: str) -> Optional[str]:
        """
        Streams and downloads a stock asset directly into %LOCALAPPDATA%/ViraLoop Studio/media/07_Downloads/stock/
        with atomic write.
        """
        try:
            slug = self._sanitize_slug(asset_name)
            ext = ".mp4" if ("video" in url or ".mp4" in url.lower()) else ".jpg"
            target_path = self.cache_dir / f"{slug}_{int(datetime.now().timestamp())}{ext}"
            temp_path = target_path.with_suffix(ext + ".part")

            headers = {"User-Agent": "ViraLoopStudio/4.0"}
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=60)) as session:
                async with session.get(url, headers=headers) as resp:
                    if resp.status == 200:
                        with open(temp_path, "wb") as f:
                            while True:
                                chunk = await resp.content.read(64 * 1024)
                                if not chunk:
                                    break
                                f.write(chunk)
                        temp_path.replace(target_path)
                        logger.info(f"[StockTool] Downloaded stock asset to: {target_path}")
                        return str(target_path).replace("\\", "/")
        except Exception as e:
            logger.error(f"[StockTool] Failed to download asset from {url}: {e}")
            if 'temp_path' in locals() and temp_path.exists():
                try:
                    temp_path.unlink()
                except Exception:
                    pass
        return None


stock_footage_tool = OpenMontageStockTool()
