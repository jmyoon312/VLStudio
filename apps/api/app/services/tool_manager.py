import os
import json
import logging
import random
import requests
import time
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from ..models import Settings
from app.services.metrics import collector
from datetime import datetime

# Logger
logger = logging.getLogger(__name__)

# Try importing Tavily, but provide fallback if not installed/configured
try:
    from tavily import TavilyClient
    HAS_TAVILY = True
except ImportError:
    HAS_TAVILY = False
    logger.warning("Tavily Python SDK not found. Web Search will rely on SearXNG or Direct API calls.")

# Global Settings & Defaults
# Common User-Agents to prevent 403 Forbidden
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0"
]

# [STABILIZATION] Public SearXNG Instance Pool for high-availability
SEARXNG_INSTANCES = [
    "https://searx.be/search",
    "https://searxng.site/search",
    "https://search.gogloo.gleeze.com/search",
    "https://searx.work/search",
    "https://priv.au/search",
    "https://searx.org/search",
    "https://search.md4.org/search"
]

class WebSearchTool:
    def __init__(self, api_key: Optional[str] = None):
        self.manual_api_key = api_key
        
        # [NEW] Circuit Breaker State
        self.failure_tracker = {
            "searxng": {"last_fail": 0, "fail_count": 0},
            "tavily": {"last_fail": 0, "fail_count": 0}
        }
        self.COOLDOWN_SECONDS = 300 # 5 Minutes
        self.searxng_pool = list(SEARXNG_INSTANCES)
        random.shuffle(self.searxng_pool)
        self.current_searxng_idx = 0

    @property
    def current_searxng_url(self) -> str:
        """Returns the currently active SearXNG instance from the pool."""
        if not self.searxng_pool:
            return SEARXNG_INSTANCES[0]
        return self.searxng_pool[self.current_searxng_idx]

    def _get_tavily_key(self, db: Optional[Session] = None) -> Optional[str]:
        """Resolves a Tavily API Key from Manual/Env or DB Pool"""
        if self.manual_api_key:
            return self.manual_api_key
        if db:
            settings = db.query(Settings).first()
            if settings and settings.tavily_api_keys:
                return random.choice(settings.tavily_api_keys)
        return None

    def search(self, query: str, include_images: bool = True, db: Optional[Session] = None, settings: Optional[Any] = None, time_range: str = "month") -> Dict[str, Any]:
        """Executes a web search with Fallback Strategy"""
        
        # [NEW] Check for YouTube-specific discovery queries
        if "site:youtube.com" in query or "youtube channel" in query.lower():
            logger.info("📺 [Discovery] YouTube-specific query detected. Using yt-dlp direct search.")
            # Clean query for yt-dlp
            clean_kw = query.replace("site:youtube.com", "").replace('"', '').replace("@", "").strip()
            res = self._search_youtube_direct(clean_kw)
            if res: return res

        strategy = "searxng_first" 
        searxng_url = self.current_searxng_url
        
        if settings:
            if hasattr(settings, "web_search_engine") and settings.web_search_engine:
                strategy = settings.web_search_engine
            if hasattr(settings, "searxng_url") and settings.searxng_url:
                searxng_url = settings.searxng_url
        elif db:
            settings_db = db.query(Settings).first()
            if settings_db:
                if settings_db.web_search_engine:
                    strategy = settings_db.web_search_engine
                if settings_db.searxng_url:
                    searxng_url = settings_db.searxng_url
        
        logger.info(f"🚀 Using Search Strategy: {strategy}")
        
        if strategy == "searxng_first":
            if not self._should_skip_provider("searxng"):
                for _ in range(min(3, len(self.searxng_pool))):
                    target_url = self.searxng_pool[self.current_searxng_idx]
                    self.current_searxng_idx = (self.current_searxng_idx + 1) % len(self.searxng_pool)
                    res = self._search_searxng(query, time_range, target_url)
                    if res:
                        self._record_provider_success("searxng")
                        return res
                self._record_provider_failure("searxng")
            
            if not self._should_skip_provider("tavily"):
                logger.info("⚠️ [SearXNG] Failed. Falling back to Tavily.")
                res = self._search_tavily(query, include_images, db)
                if res:
                    self._record_provider_success("tavily")
                    return res
                self._record_provider_failure("tavily")

        elif strategy == "tavily_first":
            res = self._search_tavily(query, include_images, db)
            if res: return res
            logger.info("⚠️ [Tavily] Failed. Falling back to SearXNG.")
            res = self._search_searxng(query, time_range, searxng_url)
            if res: return res

        elif strategy == "searxng_only":
            res = self._search_searxng(query, time_range, searxng_url)
            if res: return res
            
        elif strategy == "tavily_only":
            res = self._search_tavily(query, include_images, db)
            if res: return res
            
        logger.info(f"🎭 [Mock] Returning dummy data for '{query}'")
        return self._get_mock_results(query, include_images)

    def _should_skip_provider(self, provider: str) -> bool:
        state = self.failure_tracker.get(provider)
        if not state or state["fail_count"] < 3: return False
        elapsed = time.time() - state["last_fail"]
        if elapsed < self.COOLDOWN_SECONDS:
            logger.warning(f"🛡️ [CircuitBreaker] Skipping {provider} (Cooldown: {int(self.COOLDOWN_SECONDS - elapsed)}s)")
            return True
        state["fail_count"] = 0
        return False

    def _record_provider_success(self, provider: str):
        state = self.failure_tracker.get(provider)
        if state: state["fail_count"] = 0

    def _record_provider_failure(self, provider: str):
        state = self.failure_tracker.get(provider)
        if state:
            state["fail_count"] += 1
            state["last_fail"] = time.time()

    def _search_youtube_direct(self, keyword: str) -> Optional[Dict[str, Any]]:
        """Scrapes YouTube search directly using yt-dlp (Free & Reliable)"""
        import subprocess
        import shutil
        try:
            logger.info(f"📡 [yt-dlp] Searching YouTube for: {keyword}")
            
            # [FIX] Find absolute path for yt-dlp to prevent WinError 2
            ytdlp_path = shutil.which("yt-dlp") or "yt-dlp"
            
            # Get up to 10 results
            cmd = [
                ytdlp_path,
                "--get-title", "--get-id", "--get-description",
                "--flat-playlist", "--print-json",
                f"ytsearch10:{keyword} channel"
            ]
            
            # Using subprocess directly to avoid complexity
            process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding="utf-8", errors="ignore")
            stdout, stderr = process.communicate(timeout=20)
            
            if process.returncode != 0:
                logger.error(f"yt-dlp search failed: {stderr}")
                return None
                
            results = []
            # yt-dlp --print-json output is one JSON object per line
            for line in stdout.splitlines():
                try:
                    entry = json.loads(line)
                    # We want to reconstruct a tool_output compatible format
                    # yt-dlp search returns videos, but we can extract channel info
                    results.append({
                        "title": entry.get("title", "Unknown"),
                        "url": f"https://www.youtube.com/watch?v={entry.get('id')}",
                        "content": entry.get("description", "")[:200],
                        "channel": entry.get("uploader", "Unknown"),
                        "channel_url": entry.get("uploader_url", "")
                    })
                except:
                    continue
            
            if results:
                logger.info(f"✅ [yt-dlp] Found {len(results)} potential candidates.")
                return {
                    "summary": f"Found {len(results)} results from YouTube direct search.",
                    "results": results,
                    "images": []
                }
        except Exception as e:
            logger.error(f"Error during yt-dlp direct search: {e}")
        return None

    def _search_searxng(self, query: str, time_range: str, target_url: str) -> Optional[Dict[str, Any]]:
        start_ts = datetime.now()
        try:
            logger.info(f"🔍 [SearXNG] Searching for '{query}' at {target_url}...")
            resp = requests.get(
                target_url,
                params={"q": query, "format": "json", "categories": "general,social_media", "time_range": time_range, "language": "all", "safesearch": 1},
                headers={"User-Agent": random.choice(USER_AGENTS)},
                timeout=10.0
            )
            if resp.status_code == 200:
                data = resp.json()
                results = data.get("results", [])
                if results:
                    latency = (datetime.now() - start_ts).total_seconds()
                    collector.record_event("search", "searxng", "success", {"provider": "searxng", "latency": latency, "count": len(results)})
                    logger.info(f"✅ [SearXNG] Found {len(results)} results.")
                    tool_output = {"summary": f"Found {len(results)} results from SearXNG.", "results": [], "images": []}
                    for res in results[:5]:
                        tool_output["results"].append({"title": res.get("title"), "url": res.get("url"), "content": res.get("content", "") or res.get("snippet", ""), "score": res.get("score", 1.0)})
                    return tool_output
        except Exception as e:
            logger.warning(f"⚠️ [SearXNG] Failed: {e}")
            collector.record_event("search", "searxng", "error", {"provider": "searxng", "error": str(e)})
        return None

    def _search_tavily(self, query: str, include_images: bool, db: Optional[Session]) -> Optional[Dict[str, Any]]:
        """Direct Tavily API Call using requests"""
        api_key = self._get_tavily_key(db)
        if not api_key: return None
        start_ts = datetime.now()
        try:
            logger.info(f"🔍 [Tavily] Searching for '{query}' (Direct API)...")
            payload = {"api_key": api_key, "query": query, "search_depth": "advanced", "include_images": include_images, "include_answer": True, "max_results": 5}
            resp = requests.post("https://api.tavily.com/search", json=payload, timeout=15.0)
            if resp.status_code == 200:
                response = resp.json()
                tool_output = {"summary": response.get("answer", ""), "results": [], "images": response.get("images", [])}
                for res in response.get("results", []):
                    tool_output["results"].append({"title": res.get("title"), "url": res.get("url"), "content": res.get("content"), "score": res.get("score")})
                latency = (datetime.now() - start_ts).total_seconds()
                collector.record_event("search", "tavily", "success", {"provider": "tavily", "latency": latency})
                logger.info(f"✅ [Tavily] Found {len(tool_output['results'])} results.")
                return tool_output
            else:
                logger.error(f"❌ [Tavily] API Error {resp.status_code}: {resp.text}")
        except Exception as e:
            logger.error(f"❌ [Tavily] Request Failed: {e}")
            collector.record_event("search", "tavily", "error", {"provider": "tavily", "error": str(e)})
        return None

    def _get_mock_results(self, query: str, include_images: bool, error_msg: str = "") -> Dict[str, Any]:
        mock_images = [
            "https://images.unsplash.com/photo-1546422904-90eab23c3d7e?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=800&q=80"
        ]
        return {
            "summary": f"This is a mock summary for '{query}'. {error_msg}",
            "results": [
                {"title": f"Mock Result 1 for {query}", "url": "https://example.com/1", "content": "This is mock content for testing.", "score": 0.95},
                {"title": f"Mock Result 2 for {query}", "url": "https://example.com/2", "content": "Another mock result content.", "score": 0.88}
            ],
            "images": mock_images if include_images else []
        }

tool_manager = WebSearchTool()
