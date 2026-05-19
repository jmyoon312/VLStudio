import requests
import os
import json
from enum import Enum

class SearchEngine(str, Enum):
    TAVILY = "tavily"
    SEARXNG = "searxng"
    AUTO = "auto" # Prioritize SearXNG (Free/Privacy) -> Tavily (Better parsing)

class SearchManager:
    def __init__(self):
        pass

    def search(self, query: str, engine: str = "auto", config: dict = None):
        """
        [v8.2] Unified Search with Circuit Breaker.
        Failover: SearXNG (Primary) -> Tavily (Backup) if 403/429 occurs.
        """
        if not config: config = {}
        tavily_key = config.get("tavily_key")
        searxng_url = config.get("searxng_url")
        
        primary = engine
        secondary = None

        if engine == "auto":
            primary = SearchEngine.SEARXNG if searxng_url else SearchEngine.TAVILY
            secondary = SearchEngine.TAVILY if (searxng_url and tavily_key) else None

        def attempt_search(target_engine):
            try:
                if target_engine == SearchEngine.TAVILY:
                    return self._search_tavily(query, tavily_key)
                elif target_engine == SearchEngine.SEARXNG:
                    return self._search_searxng(query, searxng_url)
                return {"error": f"Unknown engine: {target_engine}"}
            except Exception as e:
                return {"error": str(e)}

        # First Attempt
        result = attempt_search(primary)
        
        # [NEW] Circuit Breaker failover trigger
        error_msg = str(result.get("error", "")).lower()
        is_exhausted = any(x in error_msg for x in ["403", "429", "rate limit", "forbidden", "resisted"])
        
        if is_exhausted and secondary:
            import logging
            logger = logging.getLogger("viral_loop.search")
            logger.warning(f"⚠️ Search failover: {primary} reached limit. Switching to {secondary}...")
            return attempt_search(secondary)
            
        return result

    def _search_tavily(self, query, api_key):
        if not api_key: return {"error": "Tavily API Key missing"}
        
        url = "https://api.tavily.com/search"
        payload = {
            "query": query,
            "search_depth": "basic",
            "include_images": True,
            "include_answer": True,
            "max_results": 5
        }
        headers = {"content-type": "application/json"}
        
        resp = requests.post(url, json=payload, headers=headers)
        # Auth param handling for Tavily (API Key in payload)
        payload["api_key"] = api_key
        # Wait, Tavily usually expects key in payload, not header?
        # Re-sending with key
        resp = requests.post(url, json=payload, headers=headers) 
        
        if resp.status_code == 200:
            return resp.json()
        elif resp.status_code == 403: # Invalid Key
            return {"error": "Invalid Tavily Key"}
        else:
             return {"error": f"Tavily Error: {resp.text}"}

    def _search_searxng(self, query, instance_url):
        if not instance_url: return {"error": "SearXNG URL missing"}
        
        # Simple GET request to SearXNG JSON API
        # endpoint: /search?q=...&format=json
        try:
            params = {"q": query, "format": "json", "categories": "general"}
            resp = requests.get(instance_url, params=params, timeout=10)
            resp.raise_for_status()
            data = resp.json()
            
            # Normalize to match Tavily-like structure somewhat
            results = []
            for res in data.get("results", [])[:5]:
                results.append({
                    "title": res.get("title"),
                    "url": res.get("url"),
                    "content": res.get("content"),
                    "score": res.get("score")
                })
            
            return {
                "results": results, 
                "answer": "", # SearXNG rarely gives direct answer
                "source": "SearXNG"
            }
        except Exception as e:
            return {"error": f"SearXNG Error: {e}"}

search_manager = SearchManager()
