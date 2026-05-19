import os
import json
import logging
import random
import requests
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from ..models import Settings

# Logger
logger = logging.getLogger(__name__)

# Try importing Tavily, but provide fallback if not installed/configured
try:
    from tavily import TavilyClient
    HAS_TAVILY = True
except ImportError:
    HAS_TAVILY = False
    logger.warning("Tavily Python SDK not found. Web Search will rely on SearXNG or Mock fallback.")

SEARXNG_URL = "https://search.gogloo.gleeze.com/search"

class WebSearchTool:
    def __init__(self, api_key: Optional[str] = None):
        self.manual_api_key = api_key or os.getenv("TAVILY_API_KEY")
        self.client = None
        # Client lazy or manually init if key provided
        if HAS_TAVILY and self.manual_api_key:
            try:
                self.client = TavilyClient(api_key=self.manual_api_key)
            except Exception as e:
                logger.error(f"Failed to initialize Tavily Client: {e}")

    def _get_tavily_client(self, db: Optional[Session] = None) -> Optional[Any]:
        """
        Resolves a TavilyClient instance:
        1. Manual/Env Key (Cached)
        2. DB Pool Rotation (New Instance per call to hit different keys)
        """
        # Priority 1: Manual/Env Key (if established)
        if self.client:
            return self.client
            
        # Priority 2: DB Pool
        if HAS_TAVILY and db:
            settings = db.query(Settings).first()
            if settings and settings.tavily_api_keys:
                # Rotation Logic: Pick Random for now (Stateless)
                key = random.choice(settings.tavily_api_keys)
                try:
                    return TavilyClient(api_key=key)
                except Exception as e:
                    logger.error(f"Failed to init Tavily from DB Pool: {e}")
                    return None
        return None

    def search(self, query: str, include_images: bool = True, db: Optional[Session] = None, time_range: str = "month") -> Dict[str, Any]:
        """
        Executes a web search with Fallback Strategy:
        1. SearXNG (Self-Hosted)
        2. Tavily (Commercial API)
        3. Mock Data (Development)
        """
        
        # --- Search Strategy Execution ---
        
        # Default Strategy
        strategy = "searxng_first" 
        searxng_url = SEARXNG_URL
        
        # Load Strategy from DB if available
        if db:
            settings = db.query(Settings).first()
            if settings:
                if settings.web_search_engine:
                    strategy = settings.web_search_engine
                if settings.searxng_url:
                    searxng_url = settings.searxng_url
        
        logger.info(f"🚀 Using Search Strategy: {strategy}")
        
        # Strategy Logic
        if strategy == "searxng_first":
            # 1. SearXNG
            res = self._search_searxng(query, time_range, searxng_url)
            if res: return res
            
            # 2. Fallback: Tavily
            logger.info("⚠️ [SearXNG] No results or failed. Falling back to Tavily.")
            res = self._search_tavily(query, include_images, db)
            if res: return res

        elif strategy == "tavily_first":
            # 1. Tavily
            res = self._search_tavily(query, include_images, db)
            if res: return res
            
            # 2. Fallback: SearXNG
            logger.info("⚠️ [Tavily] No results or failed. Falling back to SearXNG.")
            res = self._search_searxng(query, time_range, searxng_url)
            if res: return res

        elif strategy == "searxng_only":
            res = self._search_searxng(query, time_range, searxng_url)
            if res: return res
            
        elif strategy == "tavily_only":
            res = self._search_tavily(query, include_images, db)
            if res: return res
            
        # --- Strategy 3: Mock Data (Final Fallback) ---
        logger.info(f"🎭 [Mock] Returning dummy data for '{query}' (All strategies failed)")
        return self._get_mock_results(query, include_images)

    def _search_searxng(self, query: str, time_range: str, target_url: str) -> Optional[Dict[str, Any]]:
        """Helper for SearXNG Search"""
        try:
            logger.info(f"🔍 [SearXNG] Searching for '{query}' (Time: {time_range}) at {target_url}...")
            resp = requests.get(
                target_url,
                params={
                    "q": query,
                    "format": "json",
                    "categories": "general,social_media",
                    "time_range": time_range,
                    "language": "all",
                    "safesearch": 1
                },
                timeout=5 
            )
            
            if resp.status_code == 200:
                data = resp.json()
                results = data.get("results", [])
                
                if results:
                    logger.info(f"✅ [SearXNG] Found {len(results)} results.")
                    
                    tool_output = {
                        "summary": f"Found {len(results)} results from SearXNG.",
                        "results": [],
                        "images": [] 
                    }
                    
                    for res in results[:5]:
                        tool_output["results"].append({
                            "title": res.get("title"),
                            "url": res.get("url"),
                            "content": res.get("content", "") or res.get("snippet", ""),
                            "score": res.get("score", 1.0)
                        })
                        
                    return tool_output
                else:
                    logger.warning("⚠️ [SearXNG] No results found.")
            else:
                 logger.warning(f"⚠️ [SearXNG] Error {resp.status_code}: {resp.text}")

        except Exception as e:
            logger.warning(f"⚠️ [SearXNG] Request Failed: {e}")
        
        return None

    def _search_tavily(self, query: str, include_images: bool, db: Optional[Session]) -> Optional[Dict[str, Any]]:
        """Helper for Tavily Search"""
        tavily_client = self._get_tavily_client(db)
        if tavily_client:
            try:
                logger.info(f"🔍 [Tavily] Searching for '{query}'...")
                
                response = tavily_client.search(
                    query=query,
                    search_depth="advanced",
                    include_images=include_images,
                    include_answer=True,
                    max_results=5
                )
                
                tool_output = {
                    "summary": response.get("answer", ""),
                    "results": [],
                    "images": response.get("images", [])
                }
                
                for res in response.get("results", []):
                    tool_output["results"].append({
                        "title": res.get("title"),
                        "url": res.get("url"),
                        "content": res.get("content"),
                        "score": res.get("score")
                    })
                    
                return tool_output

            except Exception as e:
                logger.error(f"❌ [Tavily] API Error: {e}")
        return None


    def _get_mock_results(self, query: str, include_images: bool, error_msg: str = "") -> Dict[str, Any]:
        """
        Returns dummy data for testing UI flow without credit usage.
        """
        mock_images = [
            "https://images.unsplash.com/photo-1546422904-90eab23c3d7e?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?auto=format&fit=crop&w=800&q=80"
        ] if include_images else []

        return {
            "summary": f"[MOCK] AI Summary for '{query}': Recent reports indicate significant developments in this area.",
            "results": [
                {
                    "title": f"[Mock] Breaking News about {query}",
                    "url": "https://example.com/mock-news-1",
                    "content": f"This is a simulated news snippet regarding {query}. Ideally this would come from a real source.",
                    "score": 0.95
                },
                {
                    "title": f"[Mock] Analysis of {query} Market Trends",
                    "url": "https://example.com/mock-news-2",
                    "content": "Experts suggest that the trends are moving upwards due to recent technological shifts.",
                    "score": 0.88
                }
            ],
            "images": mock_images,
            "_is_mock": True,
            "_error": error_msg
        }

# Global Singleton
tool_manager = WebSearchTool()
